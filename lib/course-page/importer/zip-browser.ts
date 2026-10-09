export type PreparedZipWebsite = {
  html: string
  analysisHtml: string
  entryPath: string
  fileCount: number
  inlinedAssetCount: number
  warnings: string[]
}

type ZipEntry = {
  name: string
  flags: number
  method: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

const EOCD = 0x06054b50
const CENTRAL = 0x02014b50
const LOCAL = 0x04034b50

function decodeName(bytes: Uint8Array) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder().decode(bytes)
  }
}

function normalizePath(value: string) {
  const clean = value.replace(/\\/g, '/').replace(/^\.\//, '')
  const parts: string[] = []
  for (const part of clean.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function resolveZipPath(baseFile: string, ref: string) {
  const raw = ref.trim()
  if (!raw || raw.startsWith('#') || /^(?:data:|blob:|https?:|mailto:|tel:|javascript:|\/\/)/i.test(raw)) return null
  const noQuery = raw.split('#')[0].split('?')[0]
  if (!noQuery) return null
  const decoded = (() => {
    try { return decodeURIComponent(noQuery) } catch { return noQuery }
  })()
  const baseDir = normalizePath(baseFile).split('/').slice(0, -1).join('/')
  return normalizePath(decoded.startsWith('/') ? decoded.slice(1) : `${baseDir}/${decoded}`)
}

function mimeFor(path: string) {
  const ext = path.toLowerCase().split('.').pop() || ''
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
    gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml',
    ico: 'image/x-icon', css: 'text/css', js: 'application/javascript',
    mjs: 'application/javascript', json: 'application/json', woff: 'font/woff',
    woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
    mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', wav: 'audio/wav',
  }
  return map[ext] || 'application/octet-stream'
}

function toBase64(bytes: Uint8Array) {
  let out = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + chunk)))
  }
  return btoa(out)
}

function findEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const min = Math.max(0, bytes.length - 0x10000 - 22)
  let eocd = -1
  for (let i = bytes.length - 22; i >= min; i--) {
    if (view.getUint32(i, true) === EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Không đọc được cấu trúc ZIP (thiếu End of Central Directory).')

  const total = view.getUint16(eocd + 10, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  if (total === 0xffff || centralOffset === 0xffffffff) {
    throw new Error('ZIP64 chưa được hỗ trợ. Hãy nén lại file ZIP theo định dạng ZIP thông thường.')
  }

  const entries = new Map<string, ZipEntry>()
  let offset = centralOffset
  for (let index = 0; index < total; index++) {
    if (view.getUint32(offset, true) !== CENTRAL) throw new Error('Central Directory của ZIP không hợp lệ.')
    const flags = view.getUint16(offset + 8, true)
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const uncompressedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localHeaderOffset = view.getUint32(offset + 42, true)
    const name = normalizePath(decodeName(bytes.subarray(offset + 46, offset + 46 + nameLength)))
    if (name && !name.endsWith('/')) {
      entries.set(name, { name, flags, method, compressedSize, uncompressedSize, localHeaderOffset })
    }
    offset += 46 + nameLength + extraLength + commentLength
  }
  return { entries, buffer }
}

async function readEntry(zip: ReturnType<typeof findEntries>, entry: ZipEntry) {
  if (entry.flags & 0x1) throw new Error(`File ZIP được mã hóa nên không thể đọc: ${entry.name}`)
  const view = new DataView(zip.buffer)
  if (view.getUint32(entry.localHeaderOffset, true) !== LOCAL) throw new Error(`Local header không hợp lệ: ${entry.name}`)
  const nameLength = view.getUint16(entry.localHeaderOffset + 26, true)
  const extraLength = view.getUint16(entry.localHeaderOffset + 28, true)
  const start = entry.localHeaderOffset + 30 + nameLength + extraLength
  const compressed = new Uint8Array(zip.buffer, start, entry.compressedSize)

  if (entry.method === 0) return new Uint8Array(compressed)
  if (entry.method !== 8) throw new Error(`ZIP dùng kiểu nén chưa hỗ trợ (method ${entry.method}): ${entry.name}`)
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Trình duyệt chưa hỗ trợ giải nén ZIP. Hãy dùng Chrome/Edge phiên bản mới.')
  }

  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const output = new Uint8Array(await new Response(stream).arrayBuffer())
  if (entry.uncompressedSize && output.byteLength !== entry.uncompressedSize) {
    throw new Error(`Kích thước file sau giải nén không khớp: ${entry.name}`)
  }
  return output
}

function scoreHtml(path: string, size: number) {
  const lower = path.toLowerCase()
  let score = Math.min(size / 10000, 50)
  if (/(^|\/)index\.html?$/.test(lower)) score += 100
  if (/trang-day-du\/(index\.)?html?$/.test(lower)) score += 80
  if (/(^|\/)trang\.html?$/.test(lower)) score += 55
  if (/iframe/.test(lower)) score += 10
  if (/nhung-truc-tiep|embed|snippet|doan-ma-nhung/.test(lower)) score -= 80
  if (/__macosx|node_modules|dist\/.*index|build\/.*index/.test(lower)) score -= 40
  return score
}

async function rewriteCss(
  css: string,
  cssPath: string,
  loadAsset: (base: string, ref: string) => Promise<string | null>,
) {
  const matches = Array.from(css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi))
  let result = css
  for (const match of matches) {
    const ref = match[2]?.trim()
    if (!ref) continue
    const replacement = await loadAsset(cssPath, ref)
    if (replacement) result = result.split(match[0]).join(`url("${replacement}")`)
  }
  return result
}

export const BRIDGE = `
<script data-mfc-zip-bridge>
(function(){
  if (window.__MFC_ZIP_BRIDGE__) return;
  window.__MFC_ZIP_BRIDGE__ = true;
  var cfg = { selectedBlockKeys: null, registrationBlockKeys: [], syncStickyNavigation: false };
  var navigation = [], viewportTop = 0;
  // Iframe mở rộng không tự cuộn: nhận viewport của trang cha cho menu sticky gốc.
  function collectNavigation(){
    navigation.forEach(function(item){item.el.style.top=item.originalTop;});
    navigation=[];
    if(!cfg.syncStickyNavigation)return;
    document.querySelectorAll('header,nav').forEach(function(el){
      if(el.closest('[data-mfc-hidden="true"]') || el.hidden || !el.querySelector('a[href]'))return;
      if(navigation.some(function(item){return item.el.contains(el);}))return;
      var css=getComputedStyle(el), top=parseFloat(css.top);
      if((css.position!=='sticky' && css.position!=='fixed') || !Number.isFinite(top) || top>160)return;
      navigation.push({el:el,originalTop:el.style.top,baseTop:top});
      var nav=el.tagName==='NAV'?el:el.querySelector('nav');
      if(nav){nav.setAttribute('data-mfc-sticky-navigation','');if(nav.parentElement!==el)nav.parentElement.setAttribute('data-mfc-navigation-wrap','');}
    });
    if(navigation.length && !document.querySelector('[data-mfc-navigation-style]')){
      var style=document.createElement('style');style.setAttribute('data-mfc-navigation-style','');
      style.textContent='@media(max-width:900px){[data-mfc-navigation-wrap]{flex-wrap:wrap!important;height:auto!important;padding-block:8px}[data-mfc-sticky-navigation]{display:flex!important;order:3;flex:0 0 100%;width:100%;gap:16px;overflow-x:auto;padding-block:8px;white-space:nowrap}[data-mfc-sticky-navigation] a{flex-shrink:0}}';
      document.head.appendChild(style);
    }
    syncNavigation(viewportTop);
  }
  function syncNavigation(top){
    viewportTop=Number.isFinite(top)?Math.max(0,top):0;
    if(!cfg.syncStickyNavigation)return;
    navigation.forEach(function(item){item.el.style.top=(viewportTop+item.baseTop)+'px';});
    var height=navigation.reduce(function(max,item){return Math.max(max,item.el.getBoundingClientRect().height+item.baseTop);},0);
    post({type:'navigation_metrics',height:height});
  }
  function post(payload){ try { parent.postMessage(Object.assign({source:'mfc-zip-source'}, payload), '*'); } catch(e){} }
  function blocks(){ return Array.from(document.querySelectorAll('[data-mfc-block]')); }
  function keyOf(el){ return el && el.getAttribute ? (el.getAttribute('data-mfc-block') || '') : ''; }
  function autoRegistration(el){
    if(!el || !el.querySelector) return false;
    if(el.querySelector('form')) return true;
    var text=((el.id||'')+' '+(el.className||'')+' '+((el.querySelector('h1,h2,h3')||{}).textContent||'')).toLowerCase();
    return /dang[-_ ]?ky|đăng\\s*ký|register|registration|signup|sign[-_ ]?up|enroll/.test(text);
  }
  function sendHeight(){
    var b=document.body,d=document.documentElement;
    var h=Math.max(b?b.scrollHeight:0,d?d.scrollHeight:0,b?b.offsetHeight:0,d?d.offsetHeight:0);
    post({type:'height',height:h});
  }
  function applyConfig(){
    var selected = Array.isArray(cfg.selectedBlockKeys) ? cfg.selectedBlockKeys : null;
    var registrations = Array.isArray(cfg.registrationBlockKeys) ? cfg.registrationBlockKeys : [];
    blocks().forEach(function(el){
      var key=keyOf(el);
      var isReg=registrations.indexOf(key)>=0 || autoRegistration(el);
      var visible=!isReg && (!selected || selected.indexOf(key)>=0);
      el.hidden=!visible;
      if(!visible) el.setAttribute('data-mfc-hidden','true'); else el.removeAttribute('data-mfc-hidden');
    });
    sendHeight();
  }
  function isRegistrationAnchor(anchor){
    return /dang[-_ ]?ky|register|registration|signup|sign[-_ ]?up|enroll/i.test(anchor||'');
  }
  function targetForAnchor(anchor){
    var decoded=anchor||'';
    try{decoded=decodeURIComponent(decoded);}catch(err){}
    return document.getElementById(decoded) || document.getElementById(anchor||'');
  }
  function configureLinks(data){
    var page;
    try{page=new URL(data.pageUrl);if(page.origin!==location.origin||!/^\\/khoa-hoc\\/[A-Za-z0-9_-]+$/.test(page.pathname))return;}catch(err){return;}
    document.querySelectorAll('a[href]').forEach(function(el){
      var href=el.getAttribute('href')||'';
      var anchor=el.getAttribute('data-mfc-anchor')||(href.charAt(0)==='#'?href.slice(1):'');
      if(!anchor)return;
      el.setAttribute('data-mfc-anchor',anchor);
      var course=el.getAttribute('data-course');
      var target=data.courseLinks && data.courseLinks[course];
      if(typeof target==='string' && /^\\/khoa-hoc\\/[A-Za-z0-9_-]+$/.test(target)){
        el.setAttribute('data-mfc-course-link',target);
        el.setAttribute('href',page.origin+target);
      }else{
        el.removeAttribute('data-mfc-course-link');
        el.setAttribute('href',page.origin+page.pathname+'#'+anchor);
      }
    });
  }
  function navigateAnchor(anchor,updateHash){
    if(!anchor)return;
    if(isRegistrationAnchor(anchor)){
      post({type:'action',actionType:'open_registration',anchor:anchor,updateHash:updateHash!==false});
      return;
    }
    var target=targetForAnchor(anchor);
    if(!target || target.hidden || target.closest('[data-mfc-hidden="true"]'))return;
    var top=target.getBoundingClientRect().top + window.scrollY;
    post({type:'scroll',top:Math.max(0,top),anchor:anchor,updateHash:updateHash!==false});
  }
  addEventListener('message',function(e){
    if(e.source!==parent)return;
    var data=e.data||{};
    if(data.source!=='mfc-zip-parent') return;
    if(data.type==='configure'){
      cfg.selectedBlockKeys=Array.isArray(data.selectedBlockKeys)?data.selectedBlockKeys:null;
      cfg.registrationBlockKeys=Array.isArray(data.registrationBlockKeys)?data.registrationBlockKeys:[];
      cfg.syncStickyNavigation=data.syncStickyNavigation===true;
      configureLinks(data);
      applyConfig();
      collectNavigation();
      return;
    }
    if(data.type==='viewport'){syncNavigation(data.top);return;}
    if(data.type==='navigate_anchor' && typeof data.anchor==='string'){
      navigateAnchor(data.anchor,false);
    }
  });
  document.addEventListener('submit', function(e){
    e.preventDefault();
    e.stopImmediatePropagation();
    var data={};
    try {
      new FormData(e.target).forEach(function(v,k){ if(typeof v==='string' && v.length<500) data[k]=v; });
    } catch(err){}
    post({type:'action',actionType:'open_registration',formData:data});
  }, true);
  document.addEventListener('click', function(e){
    var el=e.target && e.target.closest ? e.target.closest('a[href],button[data-mfc-register],[data-mfc-action="register"]') : null;
    if(!el)return;
    var courseLink=el.getAttribute('data-mfc-course-link');
    if(courseLink){
      e.preventDefault();e.stopImmediatePropagation();
      post({type:'action',actionType:'course_link',target:courseLink});return;
    }
    var sourceAnchor=el.getAttribute('data-mfc-anchor');
    if(sourceAnchor){
      e.preventDefault();
      if(!cfg.syncStickyNavigation || isRegistrationAnchor(sourceAnchor) || el.hasAttribute('data-course'))e.stopImmediatePropagation();
      navigateAnchor(sourceAnchor,true);return;
    }
    if(el.matches && el.matches('button[data-mfc-register],[data-mfc-action="register"]')){
      e.preventDefault();e.stopImmediatePropagation();post({type:'action',actionType:'open_registration'});return;
    }
    var href=el.getAttribute && (el.getAttribute('href')||'');
    if(!href)return;
    if(href.charAt(0)==='#'){
      e.preventDefault();
      if(!cfg.syncStickyNavigation || isRegistrationAnchor(href.slice(1)))e.stopImmediatePropagation();
      navigateAnchor(href.slice(1),true);
      return;
    }
    if(/^javascript:/i.test(href)){
      e.preventDefault();e.stopImmediatePropagation();post({type:'action',actionType:'open_registration'});return;
    }
    try{
      var u=new URL(href,location.href);
      var sameDocument=u.origin===location.origin && u.pathname===location.pathname && u.search===location.search;
      if(sameDocument && u.hash){
        e.preventDefault();
        if(!cfg.syncStickyNavigation || isRegistrationAnchor(u.hash.slice(1)))e.stopImmediatePropagation();
        navigateAnchor(u.hash.slice(1),true);
        return;
      }
      if(['http:','https:','tel:','mailto:'].indexOf(u.protocol)>=0){
        e.preventDefault();e.stopImmediatePropagation();
        post({type:'action',actionType:'external_link',target:u.href});
      }
    }catch(err){}
  }, true);
  addEventListener('load',function(){applyConfig();setTimeout(applyConfig,100);setTimeout(applyConfig,800);});
  addEventListener('resize',function(){collectNavigation();sendHeight();});
  if(window.ResizeObserver){ try { new ResizeObserver(sendHeight).observe(document.documentElement); } catch(e){} }
})();
<\/script>`

// Upgrade the importer-owned bridge in already saved ZIPs without changing assets.
export function upgradeZipBridge(html: string): string {
  return html.replace(/<script\b[^>]*\bdata-mfc-zip-bridge(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?[^>]*>[\s\S]*?<\/script\s*>/i, () => BRIDGE.trim())
}

export async function prepareWebsiteZip(file: File): Promise<PreparedZipWebsite> {
  if (!file.name.toLowerCase().endsWith('.zip')) throw new Error('Vui lòng chọn file .zip')
  const buffer = await file.arrayBuffer()
  const zip = findEntries(buffer)
  const htmlEntries = Array.from(zip.entries.values()).filter(entry => /\.html?$/i.test(entry.name))
  if (!htmlEntries.length) throw new Error('Không tìm thấy file HTML trong ZIP.')

  htmlEntries.sort((a, b) => scoreHtml(b.name, b.uncompressedSize) - scoreHtml(a.name, a.uncompressedSize))
  const main = htmlEntries[0]
  const rawHtml = new TextDecoder('utf-8').decode(await readEntry(zip, main))
  const parser = new DOMParser()
  const doc = parser.parseFromString(rawHtml, 'text/html')
  const warnings: string[] = []
  let inlinedAssetCount = 0

  const structuralSelector = 'header,section,footer,nav'
  const structuralBlocks = Array.from(doc.querySelectorAll<HTMLElement>(structuralSelector))
    .filter(el => !el.parentElement?.closest(structuralSelector))
  const usedBlockKeys = new Set<string>()
  structuralBlocks.forEach((el, index) => {
    const preferred = (el.id || '').trim()
    const base = preferred && !usedBlockKeys.has(preferred) ? preferred : `mfc-block-${index + 1}`
    let key = base
    let suffix = 2
    while (usedBlockKeys.has(key)) key = `${base}-${suffix++}`
    usedBlockKeys.add(key)
    el.setAttribute('data-mfc-block', key)
  })
  const analysisHtml = '<!doctype html>\n' + doc.documentElement.outerHTML

  const loadAsset = async (baseFile: string, ref: string) => {
    const resolved = resolveZipPath(baseFile, ref)
    if (!resolved) return null
    const entry = zip.entries.get(resolved)
    if (!entry) {
      warnings.push(`Không tìm thấy asset trong ZIP: ${resolved}`)
      return null
    }
    const bytes = await readEntry(zip, entry)
    inlinedAssetCount += 1
    return `data:${mimeFor(resolved)};base64,${toBase64(bytes)}`
  }

  for (const link of Array.from(doc.querySelectorAll('link[rel~="stylesheet"][href]'))) {
    const href = link.getAttribute('href') || ''
    const resolved = resolveZipPath(main.name, href)
    const entry = resolved ? zip.entries.get(resolved) : null
    if (!entry) continue
    const css = new TextDecoder('utf-8').decode(await readEntry(zip, entry))
    const rewritten = await rewriteCss(css, resolved!, loadAsset)
    const style = doc.createElement('style')
    style.setAttribute('data-mfc-inlined-from', resolved!)
    style.textContent = rewritten
    link.replaceWith(style)
    inlinedAssetCount += 1
  }

  for (const style of Array.from(doc.querySelectorAll('style'))) {
    style.textContent = await rewriteCss(style.textContent || '', main.name, loadAsset)
  }

  for (const el of Array.from(doc.querySelectorAll<HTMLElement>('[style*="url("]'))) {
    const current = el.getAttribute('style') || ''
    el.setAttribute('style', await rewriteCss(current, main.name, loadAsset))
  }

  const assetAttrs: Array<[string, string]> = [
    ['img[src]', 'src'], ['source[src]', 'src'], ['video[src]', 'src'], ['audio[src]', 'src'],
    ['video[poster]', 'poster'], ['link[rel~="icon"][href]', 'href'], ['link[rel="apple-touch-icon"][href]', 'href'],
  ]
  for (const [selector, attr] of assetAttrs) {
    for (const el of Array.from(doc.querySelectorAll(selector))) {
      const value = el.getAttribute(attr)
      if (!value) continue
      const data = await loadAsset(main.name, value)
      if (data) el.setAttribute(attr, data)
    }
  }

  for (const el of Array.from(doc.querySelectorAll('[srcset]'))) {
    const srcset = el.getAttribute('srcset') || ''
    const rewritten: string[] = []
    for (const part of srcset.split(',')) {
      const bits = part.trim().split(/\s+/)
      const ref = bits.shift() || ''
      const data = await loadAsset(main.name, ref)
      rewritten.push([data || ref, ...bits].join(' '))
    }
    el.setAttribute('srcset', rewritten.join(', '))
  }

  for (const script of Array.from(doc.querySelectorAll<HTMLScriptElement>('script[src]'))) {
    const src = script.getAttribute('src') || ''
    const resolved = resolveZipPath(main.name, src)
    const entry = resolved ? zip.entries.get(resolved) : null
    if (!entry) {
      if (/^https?:\/\//i.test(src) || src.startsWith('//')) {
        script.remove()
        warnings.push(`Đã loại script ngoài ZIP để bảo mật: ${src}`)
      }
      continue
    }
    const js = new TextDecoder('utf-8').decode(await readEntry(zip, entry))
    script.removeAttribute('src')
    script.setAttribute('data-mfc-inlined-from', resolved!)
    script.textContent = js
    inlinedAssetCount += 1
  }

  let head = doc.head
  if (!head) {
    head = doc.createElement('head')
    doc.documentElement.prepend(head)
  }
  head.querySelector('meta[http-equiv="Content-Security-Policy"]')?.remove()
  const csp = doc.createElement('meta')
  csp.setAttribute('http-equiv', 'Content-Security-Policy')
  csp.setAttribute('content', "default-src 'none'; img-src data: blob: https:; style-src 'unsafe-inline' https:; font-src data: https:; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'")
  head.prepend(csp)
  head.insertAdjacentHTML('beforeend', BRIDGE)

  const html = '<!doctype html>\n' + doc.documentElement.outerHTML
  if (new Blob([html]).size > 8 * 1024 * 1024) {
    throw new Error('Trang sau khi đóng gói vượt 8MB. Hãy bỏ bớt video/file lớn khỏi ZIP hoặc dùng bản HTML nhẹ hơn.')
  }

  return {
    html,
    analysisHtml,
    entryPath: main.name,
    fileCount: zip.entries.size,
    inlinedAssetCount,
    warnings: Array.from(new Set(warnings)).slice(0, 20),
  }
}
