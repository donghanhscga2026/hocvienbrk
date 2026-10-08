import {z} from 'zod'
import {pageTemplateSchema} from './page-template'

// Đường dẫn chức năng hệ thống luôn được dành riêng, không được đặt tên trang trùng.
const reserved=new Set(['api','tools','admin','my-space','dashboard','site-domain','page','land','landing','du-an','account','account-settings','login','register','forgot-password','reset-password','complete-profile','courses','khoa-hoc','cong-cu','tai-khoan','ung-dung','manifest','sw'])
export const pageSlugSchema=z.string().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).refine(value=>!reserved.has(value),'Đường dẫn này dành cho chức năng hệ thống.')
export const websitePagesKey=(id:number)=>`website-pages:${id}:v1`
export const contentTemplateKey=(id:number,slug:string)=>`website-page-template:${id}:page:${slug}:v1`
export const contentTemplateSchema=pageTemplateSchema.extend({region:pageTemplateSchema.shape.region.nullable()})
export type ContentTemplate=z.infer<typeof contentTemplateSchema>
export const websitePageSchema=z.object({slug:pageSlugSchema,title:z.string().trim().min(1).max(120),description:z.string().max(500),body:z.string().max(20000),published:z.boolean(),showInMenu:z.boolean()}).strict()
export type WebsitePage=z.infer<typeof websitePageSchema>
export const systemTargets=['home','courses','tools','account','login'] as const
const target=z.string().max(90).refine(v=>(systemTargets as readonly string[]).includes(v) || (v.startsWith('page:') && pageSlugSchema.safeParse(v.slice(5)).success),'Chọn trang hoặc chức năng hợp lệ.')
export const menuItemSchema=z.object({label:z.string().trim().min(1).max(80),target,visible:z.boolean(),match:z.string().max(180).refine(v=>!v || /^#[A-Za-z][\w:.-]*$/.test(v) || /^\/(?!\/)[A-Za-z0-9/_.-]*$/.test(v),'Nhập liên kết gốc trong mẫu, ví dụ #ve-chung-toi hoặc /about.html.')}).strict()
export const websitePagesSchema=z.object({version:z.literal(1),revision:z.number().int().nonnegative(),pages:z.array(websitePageSchema).max(30),menu:z.array(menuItemSchema).max(40)}).strict().superRefine((value,ctx)=>{
  if(new Set(value.pages.map(p=>p.slug)).size!==value.pages.length)ctx.addIssue({code:'custom',message:'Đường dẫn trang bị trùng.'})
  if(new Set(value.menu.map(p=>p.target)).size!==value.menu.length)ctx.addIssue({code:'custom',message:'Mỗi trang hoặc chức năng chỉ xuất hiện một lần trong menu.'})
  const matches=value.menu.filter(m=>m.match).map(m=>m.match)
  if(new Set(matches).size!==matches.length)ctx.addIssue({code:'custom',message:'Mỗi liên kết gốc chỉ kết nối với một mục menu.'})
  for(const item of value.menu)if(item.target.startsWith('page:') && !value.pages.some(p=>p.slug===item.target.slice(5)))ctx.addIssue({code:'custom',message:'Menu liên kết tới trang chưa được tạo.'})
})
export type WebsitePages=z.infer<typeof websitePagesSchema>
export const blankWebsitePages=():WebsitePages=>({version:1,revision:0,pages:[],menu:[]})
export type WebsiteLink={title:string;href:string;match:string}
export function websiteNavigation(value:WebsitePages,profileSlug:string,customDomain:boolean,modules:{courses:boolean;tools?:boolean}) {
  const base=customDomain?'':'/page/'+encodeURIComponent(profileSlug)
  const hrefs:Record<string,string>={home:base || '/',courses:customDomain?'/khoa-hoc':'https://giautoandien.io.vn/khoa-hoc',tools:customDomain?'/cong-cu':'/tools',account:customDomain?'/tai-khoan':'/account-settings',login:'/login'}
  const links:WebsiteLink[]=[]
  if(!value.menu.length && value.pages.some(p=>p.published)){
    links.push({title:'Trang chủ',href:hrefs.home,match:''})
    if(modules.courses)links.push({title:'Khóa học',href:hrefs.courses,match:''})
    if(modules.tools!==false)links.push({title:'Công cụ',href:hrefs.tools,match:''})
  }
  for(const item of value.menu){
    if(!item.visible || (item.target==='courses' && !modules.courses) || (item.target==='tools' && modules.tools===false))continue
    const slug=item.target.startsWith('page:')?item.target.slice(5):null
    if(slug && !value.pages.some(p=>p.slug===slug && p.published))continue
    const href=slug?base+'/'+slug:hrefs[item.target]
    if(href)links.push({title:item.label,href,match:item.match})
  }
  // Trang mới có thể tự xuất hiện trên menu; menu đã cấu hình được quyền ẩn riêng từng mục.
  for(const page of value.pages)if(page.published && page.showInMenu && !value.menu.some(m=>m.target==='page:'+page.slug))links.push({title:page.title,href:base+'/'+page.slug,match:''})
  return links
}
