'use client'

import {useEffect,useRef,useState} from 'react'
import type {EditorView} from '@codemirror/view'

type Props={value:string;disabled:boolean;onChange:(value:string)=>void}

export default function TemplateCodeEditor({value,disabled,onChange}:Props){
  const host=useRef<HTMLDivElement>(null),view=useRef<EditorView|null>(null)
  const latest=useRef({value,disabled,onChange})
  const setReadOnly=useRef<((disabled:boolean)=>void)|null>(null)
  const [failed,setFailed]=useState(false)
  useEffect(()=>{latest.current={value,disabled,onChange}},[value,disabled,onChange])
  useEffect(()=>{
    let active=true
    // Chỉ tải trình soạn thảo khi người dùng mở phần sửa mã.
    void Promise.all([import('@codemirror/view'),import('@codemirror/state'),import('@codemirror/lang-html'),import('@codemirror/commands'),import('@codemirror/language')]).then(([ui,state,language,commands,syntax])=>{
      if(!active || !host.current)return
      const readOnly=new state.Compartment()
      const access=(locked:boolean)=>[state.EditorState.readOnly.of(locked),ui.EditorView.editable.of(!locked)]
      view.current=new ui.EditorView({parent:host.current,state:state.EditorState.create({doc:latest.current.value,extensions:[
        ui.lineNumbers(),ui.highlightActiveLineGutter(),ui.highlightActiveLine(),ui.EditorView.lineWrapping,
        language.html(),syntax.syntaxHighlighting(syntax.defaultHighlightStyle),commands.history(),
        ui.keymap.of([...commands.defaultKeymap,...commands.historyKeymap,commands.indentWithTab]),
        ui.EditorView.contentAttributes.of({'aria-label':'Mã HTML của template'}),
        readOnly.of(access(latest.current.disabled)),
        ui.EditorView.updateListener.of(update=>{if(update.docChanged)latest.current.onChange(update.state.doc.toString())}),
        ui.EditorView.theme({
          '&':{height:'28rem',fontSize:'14px',backgroundColor:'#f8fafc'},
          '.cm-scroller':{overflow:'auto',fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',lineHeight:'1.6'},
          '.cm-content':{padding:'12px 0'},'.cm-line':{padding:'0 12px'},
          '.cm-gutters':{backgroundColor:'#eef2ff',color:'#64748b',borderRight:'1px solid #cbd5e1'},
          '.cm-activeLine,.cm-activeLineGutter':{backgroundColor:'#ede9fe66'},
          '&.cm-focused':{outline:'2px solid #8b5cf6'},
        }),
      ]})})
      setReadOnly.current=locked=>view.current?.dispatch({effects:readOnly.reconfigure(access(locked))})
    }).catch(()=>{if(active)setFailed(true)})
    return()=>{active=false;view.current?.destroy();view.current=null;setReadOnly.current=null}
  },[])
  useEffect(()=>{
    const editor=view.current
    if(editor && editor.state.doc.toString()!==value){
      editor.dispatch({changes:{from:0,to:editor.state.doc.length,insert:value}})
    }
  },[value])
  useEffect(()=>{
    // Khóa thao tác sửa trong lúc áp dụng hoặc định dạng mã.
    setReadOnly.current?.(disabled)
  },[disabled])
  return failed?<textarea aria-label="Mã HTML của template" className="h-96 w-full whitespace-pre-wrap rounded-xl border p-4 font-mono text-sm [overflow-wrap:anywhere]" value={value} disabled={disabled} spellCheck={false} wrap="soft" onChange={event=>onChange(event.target.value)}/>:<div ref={host} className="overflow-hidden rounded-xl border border-slate-300"/>
}

