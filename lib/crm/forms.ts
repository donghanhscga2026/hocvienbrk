import {createHmac} from 'node:crypto'
import {Prisma,PrismaClient} from '@prisma/client'
import {z} from 'zod'
import {formConfigSchema,validateFormAnswers,type FormBinding,type PublicForm} from './form-shared'
import {contactFields} from './validation'
import {identityConflict} from './phase-two'
import {canUseCrm} from './shared'
import {CrmError} from './service'
import {pageTemplateKey,pageTemplateSchema} from '@/lib/website/page-template'

type Profile={id:number;userId?:number|null}
export const formCommand=z.discriminatedUnion('action',[
  z.object({action:z.literal('create'),name:z.string().trim().min(1).max(100),config:formConfigSchema}).strict(),
  z.object({action:z.literal('update'),id:z.uuid(),version:z.number().int().positive(),name:z.string().trim().min(1).max(100),active:z.boolean(),config:formConfigSchema}).strict(),
])
export async function listForms(db:PrismaClient,profile:Profile) {
  const rows=await db.crmForm.findMany({where:{ownerId:profile.userId ?? -1,profileId:profile.id},orderBy:{updatedAt:'desc'},take:100,include:{_count:{select:{submissions:true}}}})
  return rows.map(({config,_count,...row})=>({...row,config:formConfigSchema.parse(config),submissions:_count.submissions}))
}
export async function saveForm(db:PrismaClient,profile:Profile,raw:unknown) {
  if(profile.userId==null)throw new CrmError('Page chưa có chủ sở hữu.',403)
  const input=formCommand.parse(raw),ownerId=profile.userId
  return db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420308, ${ownerId}::integer)`
    if(input.action==='create'){
      if(await tx.crmForm.count({where:{ownerId,profileId:profile.id}})>=100)throw new CrmError('Mỗi Page hỗ trợ tối đa 100 form.')
      return {form:await tx.crmForm.create({data:{ownerId,profileId:profile.id,name:input.name,config:input.config}})}
    }
    const result=await tx.crmForm.updateMany({where:{id:input.id,version:input.version,ownerId,profileId:profile.id},data:{name:input.name,config:input.config,active:input.active,version:{increment:1}}})
    if(!result.count)throw new CrmError('Form đã thay đổi hoặc không thuộc Page của bạn. Hãy tải lại.',409)
    return {form:await tx.crmForm.findUniqueOrThrow({where:{id:input.id}})}
  })
}
export async function boundForms(db:PrismaClient,profile:Profile,bindings:FormBinding[]):Promise<PublicForm[]> {
  if(!bindings.length || profile.userId==null)return []
  const rows=await db.crmForm.findMany({where:{id:{in:bindings.map(b=>b.formId)},profileId:profile.id,ownerId:profile.userId,active:true}})
  return rows.flatMap(row=>{const parsed=formConfigSchema.safeParse(row.config);return parsed.success?[{id:row.id,version:row.version,config:parsed.data}]:[]})
}
export const submissionInput=z.object({
  slug:z.string().min(1).max(150),formId:z.uuid(),version:z.number().int().positive(),key:z.uuid(),
  answers:z.unknown(),consent:z.literal(true),website:z.string().max(100).default(''),
}).strict()
export async function submitForm(db:PrismaClient,raw:unknown,address:string,domainProfileId?:number) {
  const input=submissionInput.parse(raw)
  if(input.website)return {received:true}
  const secret=process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if(!secret)throw new CrmError('Form chưa được cấu hình.',503)
  const hash=(value:string)=>createHmac('sha256',secret).update(value).digest('hex')
  await db.$transaction(async tx=>{
    // Only this owner's concurrent writes are serialized; teachers do not block each other.
    const profile=await tx.siteProfile.findUnique({where:{slug:input.slug},include:{user:{select:{role:true}}}})
    if(!profile?.isActive || profile.userId==null || !profile.user || !canUseCrm(profile.user.role) || domainProfileId!==undefined && profile.id!==domainProfileId)throw new CrmError('Form không thuộc trang đang mở.',404)
    const ownerId=profile.userId
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420308, ${ownerId}::integer)`
    const entry=await tx.systemConfig.findUnique({where:{key:pageTemplateKey(profile.id)}})
    const parsed=pageTemplateSchema.safeParse(entry?.value)
    if(!parsed.success || !parsed.data.active || !(parsed.data.forms || []).some(b=>b.formId===input.formId))throw new CrmError('Form chưa được kết nối với Page.',404)
    const form=await tx.crmForm.findFirst({where:{id:input.formId,profileId:profile.id,ownerId,active:true}})
    if(!form)throw new CrmError('Form đã tạm dừng nhận đăng ký.',404)
    const key=hash('page-form:'+ownerId+':'+form.id+':'+input.key)
    // Retry a committed submission even after the form's questions change.
    if(await tx.crmFormSubmission.findUnique({where:{key}}))return
    if(form.version!==input.version)throw new CrmError('Form vừa thay đổi. Hãy tải lại trang trước khi gửi.',409)
    const config=formConfigSchema.parse(form.config)
    let answers:ReturnType<typeof validateFormAnswers>
    try{answers=validateFormAnswers(config,input.answers)}catch(e){throw new CrmError(e instanceof Error?e.message:'Câu trả lời không hợp lệ.')}
    const data=contactFields.parse({name:answers.name,email:answers.email || '',phone:answers.phone || '',source:('Page: '+profile.slug).slice(0,100),needs:'',tags:[],ownerId,archived:false})
    const ipHash=hash('page-form-rate:'+address),since=new Date(Date.now()-3600000)
    if(await tx.crmFormSubmission.count({where:{ownerId,ipHash,createdAt:{gte:since}}})>=10 || await tx.crmFormSubmission.count({where:{ownerId,createdAt:{gte:since}}})>=1000)throw new CrmError('Có quá nhiều đăng ký. Vui lòng thử lại sau.',429)
    const found=await tx.crmContact.findMany({where:{ownerId,studentProfile:false,OR:[...(data.email?[{email:{equals:data.email,mode:'insensitive' as const}}]:[]),...(data.phone?[{phone:data.phone}]:[])]}})
    const conflict=found.length>1 || !!(found[0] && (found[0].archived || identityConflict(found[0],data)))
    const contact=conflict?null:found[0] || await tx.crmContact.create({data:{...data,createdBy:-1}})
    const summary=config.fields.filter(f=>!['name','email','phone'].includes(f.id)).map(f=>f.label+': '+(Array.isArray(answers[f.id])?(answers[f.id] as string[]).join(', '):answers[f.id] || '—')).join('\n')
    const request=await tx.crmRequest.create({data:{key:hash('page-form-request:'+key),ownerId,contactId:contact?.id,category:'CONSULTATION',content:(config.title+'\n'+summary).slice(0,2000),name:data.name,email:data.email,phone:data.phone,source:('Form Page: '+form.name).slice(0,200),ipHash}})
    await tx.crmFormSubmission.create({data:{key,formId:form.id,ownerId,profileId:profile.id,contactId:contact?.id,requestId:request.id,formVersion:form.version,definitionSnapshot:config,answers:{...answers,consent:true},identityStatus:conflict?'CONFLICT':'RECEIVED',ipHash}})
    if(contact){
      // Existing profiles, marketing consent, account links and opportunities are never overwritten.
      if(!await tx.crmOpportunity.findFirst({where:{contactId:contact.id,stage:{notIn:['WON','LOST']}},select:{id:true}}))await tx.crmOpportunity.create({data:{contactId:contact.id,title:config.title.slice(0,200)}})
      await tx.crmActivity.create({data:{contactId:contact.id,type:'FORM',authorId:-1,authorName:'Form Page',content:'Nhận đăng ký từ '+form.name+'; xem câu trả lời đầy đủ trong yêu cầu '+request.id+'.'}})
    }
  },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted,timeout:15000})
  // Do not reveal customer identity matches, private IDs or conflict status.
  return {received:true}
}
