import { promises as dns } from 'node:dns'
import { get } from 'node:https'
import { isIP, BlockList } from 'node:net'

const blocked=new BlockList()
const globalV6=new BlockList(); globalV6.addSubnet('2000::',3,'ipv6')
for(const [ip,prefix] of [['2001:db8::',32],['2001::',32],['2001:2::',48],['2001:10::',28],['2001:20::',28],['2002::',16],['3fff::',20]] as const) blocked.addSubnet(ip,prefix,'ipv6')
for(const [ip,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const) blocked.addSubnet(ip,prefix,'ipv4')
export function publicAddress(ip: string) {
  if(isIP(ip)===4) return !blocked.check(ip,'ipv4')
  // Chỉ nhận IPv6 global unicast; loại cả địa chỉ mapped/NAT64/loopback.
  return isIP(ip)===6 && globalV6.check(ip,'ipv6') && !blocked.check(ip,'ipv6')
}
function bounded<T>(task: Promise<T>): Promise<T> { return new Promise((resolve,reject)=>{ const timer=setTimeout(()=>reject(new Error('DNS timeout')),4000); task.then(value=>{ clearTimeout(timer);resolve(value) },error=>{ clearTimeout(timer);reject(error) }) }) }
/** Pin IP sau DNS lookup, không redirect và không gửi cookie: chống DNS rebinding/SSRF. */
export async function verifyDomain(hostname: string, token: string) {
  let txt: string[][]
  try { txt=await bounded(dns.resolveTxt('_giautoandien.'+hostname)) }
  catch { return { valid:false,message:'Chưa thấy bản ghi TXT xác minh. Kiểm tra DNS rồi thử lại.' } }
  if(!txt.some(parts=>parts.join('')==='gau-domain='+token)) return { valid:false,message:'Bản ghi TXT chưa khớp mã xác minh của website này.' }
  let addresses: {address:string;family:number}[]
  try { addresses=await bounded(dns.lookup(hostname,{ all:true })) }
  catch { return { valid:false,message:'Chưa tìm thấy địa chỉ DNS của tên miền.' } }
  if(!addresses.length || addresses.some(a=>!publicAddress(a.address))) return { valid:false,message:'DNS của tên miền không trỏ đến địa chỉ công khai hợp lệ.' }
  const pinned=addresses[0]
  const proof=await new Promise<boolean>(resolve=>{
    let finished=false
    const done=(valid: boolean)=>{ if(!finished) { finished=true; resolve(valid) } }
    const req=get({ hostname,servername:hostname,path:'/.well-known/giautoandien-domain/'+token,port:443,timeout:8000,agent:false,family:pinned.family,lookup:(_host,_options,callback)=>callback(null,pinned.address,pinned.family) },response=>{
      if(response.statusCode!==200) { response.resume(); done(false); return }
      let body=''; let size=0
      response.on('data',(chunk: Buffer)=>{ size+=chunk.length; if(size>4096) { response.destroy(); done(false) } else body+=chunk.toString('utf8') })
      response.on('end',()=>done(body.trim()===token)); response.on('error',()=>done(false))
    })
    req.on('timeout',()=>{ req.destroy(); done(false) }); req.on('error',()=>done(false))
  })
  return proof ? { valid:true,message:'Đã xác minh DNS, HTTPS và kết nối website.' } : { valid:false,message:'TXT đã đúng. Hãy thêm domain vào dự án hocvienbrk trên Vercel, cấu hình DNS và chờ HTTPS sẵn sàng.' }
}
