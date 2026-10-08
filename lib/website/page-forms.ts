import {parse,parseFragment,serialize,type DefaultTreeAdapterMap} from 'parse5'
import {formBindingsSchema,type FormBinding,type PublicForm} from '@/lib/crm/form-shared'

type Node=DefaultTreeAdapterMap['node']
type Element=DefaultTreeAdapterMap['element']
const isElement=(node:Node):node is Element=>'tagName' in node
const walk=(node:Node):Element[]=>[...(isElement(node)?[node]:[]),...('childNodes' in node?node.childNodes.flatMap(walk):[])]
const attr=(node:Element,name:string)=>node.attrs.find(a=>a.name===name)?.value || ''
const set=(node:Element,name:string,value:string)=>{node.attrs=node.attrs.filter(a=>a.name!==name);node.attrs.push({name,value})}
const remove=(node:Element,name:string)=>{node.attrs=node.attrs.filter(a=>a.name!==name)}
const esc=(text:string)=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const plain=(node:Node):string=>node.nodeName==='#text' && 'value' in node?node.value:'childNodes' in node?node.childNodes.map(plain).join(''):''
const append=(node:Element,html:string)=>{for(const child of parseFragment(html).childNodes){child.parentNode=node;node.childNodes.push(child)}}
const controls=(node:Element)=>walk(node).filter(n=>['input','select','textarea'].includes(n.tagName) && !['hidden','password','submit','button','reset','file','image'].includes(attr(n,'type').toLowerCase()) && !n.attrs.some(a=>a.name==='disabled'))
const safeJson=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')

export function inspectTemplateForms(html:string){
  const doc=parse(html),nodes=walk(doc),labels=nodes.filter(n=>n.tagName==='label')
  return nodes.filter(n=>n.tagName==='form').slice(0,100).map((node,index)=>({index,label:attr(node,'id') || 'Form '+(index+1),controls:controls(node).slice(0,200).map((control,index)=>{
    let label=labels.find(n=>attr(n,'for')===attr(control,'id') && !!attr(control,'id'))
    let parent:Node|null=control.parentNode
    while(!label && parent && parent!==node){if(isElement(parent) && parent.tagName==='label')label=parent;parent='parentNode' in parent?parent.parentNode:null}
    const values=control.tagName==='select'?walk(control).filter(n=>n.tagName==='option').map(n=>attr(n,'value') || plain(n)).filter(Boolean).slice(0,30):['radio','checkbox'].includes(attr(control,'type'))?[attr(control,'value') || 'on']:[]
    return {index,type:attr(control,'type') || control.tagName,label:(label?plain(label).trim():attr(control,'placeholder') || attr(control,'name') || attr(control,'id') || 'Ô '+(index+1)).slice(0,100),values}
  })}))
}

/** Run on the compiled/sandboxed Page, before any template script can handle submit. */
export function connectPageForms(html:string,rawBindings:FormBinding[],forms:PublicForm[],strict=false){
  const bindings=formBindingsSchema.parse(rawBindings)
  if(!bindings.length)return html
  const doc=parse(html),nodes=walk(doc),originalForms=nodes.filter(n=>n.tagName==='form'),head=nodes.find(n=>n.tagName==='head')!,body=nodes.find(n=>n.tagName==='body')!
  const bound=new Set<Element>(),runtime:{binding:string;formId:string;version:number;fields:Record<string,string>;successMessage:string}[]=[]
  for(const binding of bindings){
    const definition=forms.find(f=>f.id===binding.formId)
    let target:Element|undefined
    if(binding.mode==='existing'){
      const stamped=originalForms.some(f=>f.attrs.some(a=>a.name==='data-system-template-form-index'))
      const matches=stamped?originalForms.filter(f=>attr(f,'data-system-template-form-index')===String(binding.index)):[originalForms[binding.index]].filter(Boolean)
      if(matches.length===1)target=matches[0]
    }
    if(!definition){
      if(strict)throw new Error('Chọn form đang nhận đăng ký và thuộc Page của bạn.')
      if(target){set(target,'data-system-form-unavailable','true');append(target,'<p role="status">Form đang tạm dừng nhận đăng ký.</p>')}
      continue
    }
    const config=definition.config
    let mapping:Record<string,number[]>
    if(binding.mode==='generated'){
      const matches=binding.region==='__append__'?[body]:nodes.filter(n=>attr(n,'id')===binding.region)
      if(matches.length!==1 || !['div','section','main','article','body'].includes(matches[0].tagName) || binding.region!=='__append__' && walk(matches[0]).some(n=>n.tagName==='form') || originalForms.some(f=>walk(f).includes(matches[0]))){
        if(strict)throw new Error('Chọn vùng duy nhất chưa chứa form để chèn form hệ thống.')
        continue
      }
      const markup=config.fields.map(field=>{
        const id='sf-'+runtime.length+'-'+field.id,required=field.required?' required':'',base=`name="${esc(field.id)}" id="${id}"${required}`
        const input=field.type==='textarea'?`<textarea ${base} maxlength="2000" rows="3"></textarea>`:['select','multiselect'].includes(field.type)?`<select ${base}${field.type==='multiselect'?' multiple':''}>${field.type==='select'?'<option value="">Chọn một mục</option>':''}${field.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`:`<input ${base} type="${field.type}" maxlength="${field.id==='name'?150:field.type==='email'?254:field.type==='tel'?40:2000}">`
        return `<label for="${id}">${esc(field.label)}${field.required?' *':''}${input}</label>`
      }).join('')
      append(matches[0],`<form class="system-lead-form" data-system-form-theme="${binding.theme}"><h3>${esc(config.title)}</h3>${markup}<button type="submit">${esc(config.submitLabel)}</button></form>`)
      target=matches[0].childNodes.at(-1) as Element
      mapping=Object.fromEntries(config.fields.map((f,index)=>[f.id,[index]]))
    }else mapping=binding.mapping
    try{
      if(!target || bound.has(target))throw new Error('Mỗi form trong template chỉ kết nối với một form hệ thống.')
      const inputs=controls(target),used=new Set<number>(),known=new Set(config.fields.map(f=>f.id))
      if(Object.keys(mapping).some(key=>!known.has(key)))throw new Error('Form đã đổi câu hỏi. Hãy ghép lại các ô trong template.')
      for(const field of config.fields){
        const indices=mapping[field.id] || []
        if((field.required || field.id==='name') && !indices.length)throw new Error('Chưa ghép ô: '+field.label)
        if(indices.length>1 && indices.some(index=>!inputs[index] || !['radio','checkbox'].includes(attr(inputs[index],'type'))))throw new Error('Chỉ nhóm radio hoặc checkbox được ghép nhiều ô cho một câu hỏi.')
        for(const index of indices){
          if(!inputs[index] || used.has(index))throw new Error('Mỗi ô phải thuộc đúng form và chỉ được ghép một lần.')
          used.add(index)
          set(inputs[index],'data-system-form-field',field.id)
          if(inputs[index].tagName==='select' && ['select','multiselect'].includes(field.type)){
            inputs[index].childNodes=[]
            if(field.type==='multiselect')set(inputs[index],'multiple','');else remove(inputs[index],'multiple')
            append(inputs[index],(field.type==='select'?'<option value="">Chọn một mục</option>':'')+field.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join(''))
          }
          if(field.required && !['checkbox','radio'].includes(attr(inputs[index],'type')))set(inputs[index],'required','')
        }
      }
      if(!mapping.email?.length && !mapping.phone?.length)throw new Error('Cần ghép ít nhất email hoặc số điện thoại.')
      bound.add(target);set(target,'data-system-lead-form','true');remove(target,'action');remove(target,'target');remove(target,'onsubmit')
      set(target,'data-system-form-binding',String(runtime.length))
      // Add fresh explicit contact permission. Marketing permission remains disabled.
      append(target,`<label class="system-form-consent"><input type="checkbox" data-system-form-consent required> ${esc(config.consentLabel)}</label><input type="text" data-system-form-honeypot tabindex="-1" autocomplete="off" aria-hidden="true" style="display:none"><p data-system-form-status role="status" aria-live="polite"></p>`)
      runtime.push({binding:String(runtime.length),formId:definition.id,version:definition.version,fields:Object.fromEntries(config.fields.filter(f=>mapping[f.id]?.length).map(f=>[f.id,f.type])),successMessage:config.successMessage})
    }catch(e){
      if(strict)throw e
      if(target){set(target,'data-system-form-unavailable','true');append(target,'<p role="alert">Form cần được giảng viên kết nối lại trước khi nhận đăng ký.</p>')}
    }
  }
  const injected=head.childNodes.length
  append(head,`<script data-system-form-bridge>
(function(){
var configs=${safeJson(runtime)},pending={};
function inputs(form){return Array.from(form.querySelectorAll('input,select,textarea')).filter(function(n){return !n.disabled&&!['hidden','password','submit','button','reset','file','image'].includes((n.getAttribute('type')||'').toLowerCase())&&!n.hasAttribute('data-system-form-consent')&&!n.hasAttribute('data-system-form-honeypot')})}
function unlock(p){clearTimeout(p.timer);p.buttons.forEach(function(b){b.disabled=false});delete pending[p.key]}
document.addEventListener('click',function(e){var button=e.target.closest&&e.target.closest('button,input[type="submit"]');if(!button||button.type!=='submit'||!button.form||!button.form.hasAttribute('data-system-lead-form'))return;e.preventDefault();e.stopImmediatePropagation();button.form.requestSubmit(button)},true);
document.addEventListener('submit',function(e){
var form=e.target;if(!form||form.tagName!=='FORM')return;
e.preventDefault();e.stopImmediatePropagation();
if(form.hasAttribute('data-system-form-unavailable'))return;
var config=configs.find(function(c){return form.getAttribute('data-system-form-binding')===c.binding});if(!config)return;
var status=form.querySelector('[data-system-form-status]');
if(Object.values(pending).some(function(p){return p.form===form}))return;
if(!form.reportValidity())return;
var consent=form.querySelector('[data-system-form-consent]');if(!consent.checked){status.textContent='Vui lòng đồng ý cho giảng viên liên hệ.';return}
var nodes=inputs(form),answers={};
Object.keys(config.fields).forEach(function(id){var selected=nodes.filter(function(n){return n.getAttribute('data-system-form-field')===id});var values=selected.flatMap(function(n){if(n.type==='checkbox'||n.type==='radio')return n.checked?[n.value]:[];if(n.tagName==='SELECT'&&n.multiple)return Array.from(n.selectedOptions).map(function(o){return o.value});return [n.value]});answers[id]=config.fields[id]==='multiselect'?values:values[0]||''});
var key=form.getAttribute('data-system-form-key');if(!key){key=crypto.randomUUID();form.setAttribute('data-system-form-key',key)}
var buttons=Array.from(form.querySelectorAll('button:not([type="button"]),input[type="submit"]')).filter(function(b){return !b.disabled});buttons.forEach(function(b){b.disabled=true});status.textContent='Đang gửi đăng ký…';
var p={key:key,form:form,buttons:buttons,status:status,config:config};pending[key]=p;
p.timer=setTimeout(function(){unlock(p);status.textContent='Chưa nhận được phản hồi. Bạn có thể gửi lại; đăng ký sẽ không bị tạo trùng.'},35000);
parent.postMessage({source:'system-page-form',key:key,formId:config.formId,version:config.version,answers:answers,consent:true,website:form.querySelector('[data-system-form-honeypot]').value},'*');
},true);
window.addEventListener('message',function(e){if(e.source!==parent||e.data?.source!=='system-page-form-result')return;var p=pending[e.data.key];if(!p)return;unlock(p);p.status.textContent=e.data.ok?p.config.successMessage:e.data.error||'Không gửi được đăng ký. Hãy thử lại.';if(e.data.ok){p.form.reset();p.form.removeAttribute('data-system-form-key')}});
})();</script>`)
  // Prepend only our script: the compiled CSP remains the first head element.
  const bridge=head.childNodes.splice(injected,1)[0]
  head.childNodes.splice(1,0,bridge)
  append(head,'<style data-system-form-style>.system-lead-form{box-sizing:border-box;max-width:640px;padding:28px;border-radius:20px;background:#fff;color:#172033;border:1px solid #e2e8f0;text-align:left;font:16px/1.5 system-ui}.system-lead-form[data-system-form-theme="dark"]{background:#151b2a;color:#f8fafc;border-color:#334155}.system-lead-form h3{font-size:24px;margin:0 0 20px}.system-lead-form label{display:block;margin:14px 0;font-weight:500}.system-lead-form input:not([type="checkbox"]),.system-lead-form select,.system-lead-form textarea{box-sizing:border-box;display:block;width:100%;margin-top:6px;padding:12px;border:1px solid #94a3b8;border-radius:10px;background:#fff;color:#172033;font:inherit}.system-lead-form button{background:#6d28d9;color:white;border:0;border-radius:10px;padding:12px 20px;cursor:pointer;font:inherit}.system-form-consent{display:block;margin:16px 0;font-size:14px;line-height:1.6}.system-form-consent input{width:auto!important;display:inline!important}[data-system-form-status]{white-space:pre-wrap;font-size:14px;line-height:1.6}form[data-system-form-unavailable] button[type="submit"]{opacity:.5}</style>')
  return '<!doctype html>\n'+serialize(doc)
}
