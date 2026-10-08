import {z} from 'zod'

export const formFieldSchema=z.object({
  id:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),label:z.string().trim().min(1).max(120),
  type:z.enum(['text','textarea','email','tel','select','multiselect']),required:z.boolean(),
  options:z.array(z.string().trim().min(1).max(120)).max(30).default([]),
}).strict()
export const formConfigSchema=z.object({
  title:z.string().trim().min(1).max(160),submitLabel:z.string().trim().min(1).max(80),
  successMessage:z.string().trim().min(1).max(500),consentLabel:z.string().trim().min(1).max(300),
  fields:z.array(formFieldSchema).min(2).max(20),
}).strict().superRefine((value,ctx)=>{
  const ids=value.fields.map(f=>f.id)
  const bad=(message:string)=>ctx.addIssue({code:'custom',message})
  if(new Set(ids).size!==ids.length)bad('Mã câu hỏi phải khác nhau.')
  if(!value.fields.some(f=>f.id==='name' && f.type==='text' && f.required))bad('Cần trường họ tên bắt buộc.')
  if(!value.fields.some(f=>f.id==='email' && f.type==='email' || f.id==='phone' && f.type==='tel'))bad('Cần email hoặc số điện thoại để liên hệ.')
  for(const f of value.fields){
    if(f.id==='email' && f.type!=='email' || f.id==='phone' && f.type!=='tel')bad('Loại trường liên hệ không hợp lệ.')
    if(['select','multiselect'].includes(f.type) && (!f.options.length || new Set(f.options).size!==f.options.length))bad('Lựa chọn cần có các giá trị khác nhau.')
    if(!['select','multiselect'].includes(f.type) && f.options.length)bad('Chỉ câu hỏi lựa chọn được có danh sách đáp án.')
    if(['__proto__','constructor','prototype','consent','website'].includes(f.id))bad('Mã câu hỏi được dành riêng.')
  }
})
export type FormConfig=z.infer<typeof formConfigSchema>
export type PublicForm={id:string;version:number;config:FormConfig}
export type ManagedForm=PublicForm&{name:string;active:boolean;createdAt:string;updatedAt:string;submissions:number}
export const formBindingSchema=z.discriminatedUnion('mode',[
  z.object({mode:z.literal('existing'),formId:z.uuid(),index:z.number().int().nonnegative().max(99),submit:z.number().int().nonnegative().max(99).optional(),mapping:z.record(z.string(),z.array(z.number().int().nonnegative().max(199)).min(1).max(30))}).strict(),
  z.object({mode:z.literal('generated'),formId:z.uuid(),region:z.string().regex(/^(?:__append__|[A-Za-z][\w:.-]{0,159})$/),theme:z.enum(['light','dark'])}).strict(),
])
export type FormBinding=z.infer<typeof formBindingSchema>
export const formBindingsSchema=z.array(formBindingSchema).max(10)
export const defaultForm:FormConfig={title:'Đăng ký tư vấn',submitLabel:'Gửi đăng ký',successMessage:'Đã nhận đăng ký của bạn. Chúng tôi sẽ liên hệ trong thời gian sớm nhất.',consentLabel:'Tôi đồng ý gửi thông tin này cho giảng viên để được liên hệ về yêu cầu của mình.',fields:[
  {id:'name',label:'Họ và tên',type:'text',required:true,options:[]},
  {id:'phone',label:'Số điện thoại',type:'tel',required:false,options:[]},
  {id:'email',label:'Email',type:'email',required:false,options:[]},
  {id:'needs',label:'Bạn cần tư vấn điều gì?',type:'textarea',required:false,options:[]},
]}

export function validateFormAnswers(config:FormConfig,raw:unknown) {
  const input=z.record(z.string(),z.union([z.string().max(2000),z.array(z.string().max(120)).max(30)])).parse(raw)
  const known=new Set(config.fields.map(f=>f.id))
  if(Object.keys(input).some(id=>!known.has(id)))throw new Error('Có câu hỏi không thuộc form.')
  const answers:Record<string,string|string[]>={}
  for(const field of config.fields){
    const value=input[field.id] ?? (field.type==='multiselect'?[]:'')
    if(field.type==='multiselect'){
      if(!Array.isArray(value) || new Set(value).size!==value.length || value.some(v=>!field.options.includes(v)))throw new Error('Lựa chọn không hợp lệ: '+field.label)
      if(field.required && !value.length)throw new Error('Vui lòng điền: '+field.label)
      answers[field.id]=value
    }else{
      if(typeof value!=='string')throw new Error('Dữ liệu không hợp lệ: '+field.label)
      const text=value.trim(),limit=field.id==='name'?150:field.type==='email'?254:field.type==='tel'?40:2000
      if(text.length>limit || field.required && !text)throw new Error('Vui lòng kiểm tra: '+field.label)
      if(field.type==='select' && text && !field.options.includes(text))throw new Error('Lựa chọn không hợp lệ: '+field.label)
      if(field.type==='email' && text && !z.email().safeParse(text).success)throw new Error('Email không hợp lệ: '+field.label)
      answers[field.id]=text
    }
  }
  return answers
}
