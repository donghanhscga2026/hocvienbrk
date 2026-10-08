import {parse,type DefaultTreeAdapterMap} from 'parse5'

type Node=DefaultTreeAdapterMap['node']
type RawRange={from:number;to:number;content:string}

function rawRanges(source:string):RawRange[]{
  const found:RawRange[]=[]
  const visit=(node:Node)=>{
    if('tagName' in node && /^(script|style|pre|textarea|xmp|noscript)$/.test(node.tagName)){
      const location=node.sourceCodeLocation
      if(location?.startTag && location.endTag){
        const from=location.startTag.endOffset,to=location.endTag.startOffset
        found.push({from,to,content:source.slice(from,to)});return
      }
    }
    if('childNodes' in node)node.childNodes.forEach(visit)
    if('content' in node)visit(node.content)
  }
  visit(parse(source,{sourceCodeLocationInfo:true}))
  return found.sort((a,b)=>a.from-b.from)
}

export async function formatTemplateHtml(source:string):Promise<string>{
  const [{format},html]=await Promise.all([import('prettier/standalone'),import('prettier/plugins/html')])
  const protectedParts=rawRanges(source)
  let prefix='__MFC_FORMAT_RAW_'
  while(source.includes(prefix))prefix+='X_'
  let masked=source
  // Không để bộ định dạng thay đổi chuỗi JS, CSS hoặc nội dung giữ khoảng trắng.
  for(let i=protectedParts.length-1;i>=0;i--){
    const part=protectedParts[i]
    masked=masked.slice(0,part.from)+prefix+i+'__'+masked.slice(part.to)
  }
  let result=await format(masked,{parser:'html',plugins:[html],tabWidth:2,printWidth:100,htmlWhitespaceSensitivity:'css',embeddedLanguageFormatting:'off'})
  const formattedParts=rawRanges(result)
  if(formattedParts.length!==protectedParts.length)throw new Error('Không thể định dạng an toàn. Mã gốc được giữ nguyên.')
  for(let i=formattedParts.length-1;i>=0;i--){
    const part=formattedParts[i]
    if(part.content.trim()!==prefix+i+'__')throw new Error('Không thể định dạng an toàn. Mã gốc được giữ nguyên.')
    result=result.slice(0,part.from)+protectedParts[i].content+result.slice(part.to)
  }
  return result
}
