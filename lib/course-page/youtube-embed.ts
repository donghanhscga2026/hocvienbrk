/** Only single-video HTTPS embeds on exact YouTube hosts are accepted. */
export function youtubeEmbedUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) return null
    const match = /^\/embed\/([\w-]{11})$/.exec(url.pathname)
    if (!match) return null
    const host = url.hostname.endsWith('youtube-nocookie.com') ? 'www.youtube-nocookie.com' : 'www.youtube.com'
    const result = new URL(`https://${host}/embed/${match[1]}`)
    result.searchParams.set('playsinline', '1')
    for (const key of ['start', 'end']) {
      const number = url.searchParams.get(key)
      if (number && /^\d{1,7}$/.test(number)) result.searchParams.set(key, number)
    }
    for (const key of ['rel', 'controls', 'cc_load_policy', 'mute']) {
      const flag = url.searchParams.get(key)
      if (flag === '0' || flag === '1') result.searchParams.set(key, flag)
    }
    return result.href
  } catch { return null }
}

/** Reserve the original layout; the trusted parent renders the actual player.
 * Never grant same-origin access to an HTML template that runs author scripts.
 */
export function prepareYouTubeSlot(node: { tagName: string; nodeName: string; attrs: { name: string; value: string }[]; childNodes: unknown[] }) {
  if (node.tagName !== 'iframe') return false
  const get = (name: string) => node.attrs.find(item => item.name === name)?.value || ''
  const src = youtubeEmbedUrl(get('src'))
  if (!src) return false
  const width = Number(get('width')) || 560, height = Number(get('height')) || 315
  const ratio = width > 0 && height > 0 ? width / height : 16 / 9
  const style = `display:block;width:100%;aspect-ratio:${ratio};border-radius:inherit;${get('style')}`
  const title = get('title') || 'Video YouTube'
  node.attrs = node.attrs.filter(item => ['id', 'class'].includes(item.name))
  node.attrs.push({ name: 'style', value: style }, { name: 'data-mfc-youtube', value: src }, { name: 'aria-label', value: title })
  node.tagName = node.nodeName = 'div'
  node.childNodes = []
  return true
}

// Only geometry and an allowlisted URL cross the sandbox boundary.
export const YOUTUBE_BRIDGE = `<script data-mfc-youtube-bridge>
(function(){
  var scheduled=false,previous='';
  function report(){
    scheduled=false;
    var slots=[];
    document.querySelectorAll('[data-mfc-youtube]').forEach(function(el,index){
      if(index>=12)return;
      var r=el.getBoundingClientRect(),css=getComputedStyle(el);
      if(!r.width||!r.height||css.visibility==='hidden'||!el.getClientRects().length)return;
      var clip={top:0,left:0,right:innerWidth,bottom:innerHeight};
      for(var p=el.parentElement;p;p=p.parentElement){
        var s=getComputedStyle(p),b=p.getBoundingClientRect();
        if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return;
        if(/hidden|clip|auto|scroll/.test(s.overflowX)){clip.left=Math.max(clip.left,b.left);clip.right=Math.min(clip.right,b.right);}
        if(/hidden|clip|auto|scroll/.test(s.overflowY)){clip.top=Math.max(clip.top,b.top);clip.bottom=Math.min(clip.bottom,b.bottom);}
      }
      slots.push({id:String(index),src:el.getAttribute('data-mfc-youtube'),title:el.getAttribute('aria-label'),left:r.left,top:r.top,width:r.width,height:r.height,radius:css.borderRadius,clip:[Math.max(0,clip.top-r.top),Math.max(0,r.right-clip.right),Math.max(0,r.bottom-clip.bottom),Math.max(0,clip.left-r.left)]});
    });
    var message=JSON.stringify(slots);
    if(message===previous)return;previous=message;
    parent.postMessage({source:'mfc-youtube-slots',slots:slots},'*');
  }
  function schedule(){if(!scheduled){scheduled=true;(window.requestAnimationFrame||function(fn){return setTimeout(fn,16);})(report);}}
  addEventListener('message',function(e){if(e.source===parent&&e.data&&e.data.source==='mfc-youtube-parent'){previous='';schedule();}});
  addEventListener('load',schedule,true);addEventListener('resize',schedule);addEventListener('scroll',schedule,true);
  function start(){
    if(!document.querySelector('[data-mfc-youtube]'))return;
    schedule();
    if(window.ResizeObserver)new ResizeObserver(schedule).observe(document.documentElement);
    if(window.MutationObserver)new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true});
    if(document.fonts)document.fonts.ready.then(schedule);
  }
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',start);else start();
})();
<\/script>`
