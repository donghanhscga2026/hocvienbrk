'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Home, User, ChevronRight, X, Network, Zap, ChevronDown } from 'lucide-react'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  NodeProps,
  useReactFlow,
  ReactFlowProvider,
  useStore,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getGenealogyTreeAction, getGenealogyChildrenAction, GenealogyNode } from '@/app/actions/admin-actions'

// --- Types ---
interface NodeData extends Record<string, unknown> {
  id: number
  name: string | null
  totalSubCount: number
  f1aCount: number
  f1bCount: number
  f1cCount: number
  groupA: any[]
  groupB: any[]
  onToggleExpand?: (id: number) => void
  onOpenGroup?: (type: 'A' | 'B', data: any[]) => void
}

// --- Components ---

const GenealogyCard = (props: NodeProps) => {
  const data = props.data as NodeData
  const hasChildren = data.f1cCount > 0 || data.f1aCount > 0 || data.f1bCount > 0
  
  return (
    <div className={`bg-white border-2 border-slate-200 rounded-2xl p-0 min-w-[200px] shadow-xl hover:shadow-indigo-100 transition-all overflow-visible ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />
      <div className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center text-slate-900 font-black text-[12px]">
          <span>#{data.id}</span>
          <span>TS: {data.totalSubCount || 0}</span>
        </div>
        <div className="text-slate-800 font-bold text-[13px] truncate py-1.5 text-center border-y border-slate-50 uppercase tracking-tighter">
          {data.name || 'Học viên'}
        </div>
        <div className="flex justify-between items-center mt-1 relative h-10 px-0">
          <button 
            onClick={(e) => { e.stopPropagation(); if (data.f1aCount > 0) data.onOpenGroup?.('A', data.groupA); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black border-2 border-white shadow-sm transition-transform -ml-2 ${data.f1aCount > 0 ? 'bg-emerald-500 text-white hover:scale-110 cursor-pointer' : 'bg-slate-100 text-slate-300 cursor-default pointer-events-none'}`}
          >
            {data.f1aCount}
          </button>
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); if (data.f1cCount > 0) data.onToggleExpand?.(data.id); }}
              className={`w-11 h-11 rounded-full flex items-center justify-center gap-0.5 text-[11px] font-black border-4 border-white shadow-md transition-transform ${data.f1cCount > 0 ? 'bg-rose-500 text-white hover:scale-110 cursor-pointer' : 'bg-slate-100 text-slate-300 cursor-default pointer-events-none'}`}
            >
              <User className="w-4 h-4" />
              <span>{data.f1cCount}</span>
            </button>
            <Handle type="source" position={Position.Bottom} className={`${data.f1cCount > 0 ? '!bg-rose-500' : '!bg-slate-300'} !w-3 !h-3 !border-2 !border-white !-bottom-1`} />
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); if (data.f1bCount > 0) data.onOpenGroup?.('B', data.groupB); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black border-2 border-white shadow-sm transition-transform -mr-2 ${data.f1bCount > 0 ? 'bg-sky-500 text-white hover:scale-110 cursor-pointer' : 'bg-slate-100 text-slate-300 cursor-default pointer-events-none'}`}
          >
            {data.f1bCount}
          </button>
        </div>
      </div>
    </div>
  )
}

const nodeTypes = { genealogyCard: GenealogyCard }

// --- Main Flow Logic ---

function GenealogyFlow() {
  const { fitView, setCenter } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [fullTree, setFullTree] = useState<GenealogyNode | null>(null)
  const [activeFocusMap, setActiveFocusMap] = useState<Map<number, number>>(new Map()) // parentId -> activeChildId
  const [modalData, setModalData] = useState<{ users: any[], title: string, type: 'A' | 'B' } | null>(null)
  const [expandedF2Id, setExpandedF2Id] = useState<number | null>(null)
  const lastExpandedIdRef = useRef<number | null>(null)

  // Hàm ghép cây thông minh
  const mergeSubtree = useCallback((root: GenealogyNode, subtree: GenealogyNode): GenealogyNode => {
    if (root.id === subtree.id) return { ...root, ...subtree }
    if (root.children) {
      return { ...root, children: root.children.map(c => mergeSubtree(c, subtree)) }
    }
    return root
  }, [])

  // Tính vị trí của node trong cây (dựa trên thuật toán layout giống generateGraphNodes)
  const getNodePosition = useCallback((tree: GenealogyNode, targetId: number, px: number = 0, py: number = 0, focusMap: Map<number, number> = new Map(), isParentVisibleAndExpanded: boolean = true): { x: number; y: number } | null => {
    if (tree.id === targetId) return { x: px, y: py }
    
    if (isParentVisibleAndExpanded && tree.children && tree.children.length > 0) {
      for (let i = 0; i < tree.children.length; i++) {
        const child = tree.children[i]
        const childX = px + (i - (tree.children.length - 1) / 2) * 350
        const childY = py + 300
        const subIsExpanded = focusMap.get(tree.id) === child.id
        const pos = getNodePosition(child, targetId, childX, childY, focusMap, subIsExpanded)
        if (pos) return pos
      }
    }
    return null
  }, [])

  // Hàm vẽ cây chuẩn logic
  const generateGraphNodes = useCallback((
    parent: GenealogyNode, 
    px: number, 
    py: number, 
    actions: any,
    currentFocusMap: Map<number, number>,
    isParentVisibleAndExpanded: boolean = true
  ) => {
    const resNodes: Node[] = []
    const resEdges: Edge[] = []
    const nodeId = `node-${parent.id}`

    // 1. Luôn vẽ Node hiện tại (vì hàm này chỉ được gọi cho node cần vẽ)
    resNodes.push({
      id: nodeId,
      type: 'genealogyCard',
      position: { x: px, y: py },
      data: { 
        ...parent,
        onToggleExpand: actions.onToggleExpand,
        onOpenGroup: (type: 'A' | 'B', data: any[]) => setModalData({ users: data, title: type === 'A' ? 'Nhóm F1 Trống (A)' : 'Nhóm F1 Cạn (B)', type })
      },
    })

    // 2. Kiểm tra xem có cần vẽ các con của Node này không
    // Điều kiện: Node hiện tại là Gốc HOẶC Node hiện tại là node đang được Focus bởi cha nó
    const isRoot = parent.id === fullTree?.id;
    const isFocusNode = isParentVisibleAndExpanded;

    if (isFocusNode && parent.children && parent.children.length > 0) {
      parent.children.forEach((child, index) => {
        const childX = px + (index - (parent.children.length - 1) / 2) * 350
        const childY = py + 300
        
        // Xác định xem đứa con này có được mở rộng tiếp không (để vẽ cháu của nó)
        const subIsExpanded = currentFocusMap.get(parent.id) === child.id
        
        // Đệ quy vẽ con
        const sub = generateGraphNodes(child, childX, childY, actions, currentFocusMap, subIsExpanded)
        resNodes.push(...sub.resNodes); resEdges.push(...sub.resEdges)
        
        // Nối dây
        resEdges.push({
          id: `edge-${parent.id}-${child.id}`,
          source: nodeId,
          target: `node-${child.id}`,
          style: { stroke: '#f43f5e', strokeWidth: 3 },
          type: 'smoothstep'
        })
      })
    }
    return { resNodes, resEdges }
  }, [])

  // Xử lý Toggle Nhánh (Tải dữ liệu và cập nhật Lộ trình)
  const handleToggleExpand = useCallback(async (id: number) => {
    console.log(`[Action] Trigger Toggle Expand for Node #${id}`);
    setLoading(true)
    console.log(`[DEBUG] Setting lastExpandedIdRef to ${id}`);
    lastExpandedIdRef.current = id
    
    try {
      const result = await getGenealogyChildrenAction(id, 3)
      console.log(`[API] Fetch children for #${id} result:`, result.success ? 'Success' : 'Failed');
      
      if (result.success && result.tree && fullTree) {
        // 1. Cập nhật dữ liệu cây (ghép nhánh mới vào)
        setFullTree(prev => {
          const updatedTree = mergeSubtree(prev!, result.tree!);
          return { ...updatedTree };
        });

        // 2. Tìm cha của node vừa click để cập nhật Focus Map
        const findParentId = (node: GenealogyNode, targetId: number): number | null => {
          if (node.children?.some(c => c.id === targetId)) return node.id;
          for (const c of (node.children || [])) {
            const p = findParentId(c, targetId);
            if (p !== null) return p;
          }
          return null;
        };

        const pId = findParentId(fullTree, id);
        console.log(`[Logic] Parent of #${id} is #${pId !== null ? pId : 'Unknown'}`);

        if (pId !== null) {
          setActiveFocusMap(prev => {
            const next = new Map(prev);
            if (next.get(pId) === id) {
              console.log(`[Focus] Collapsing Node #${id}`);
              next.delete(pId);
            } else {
              console.log(`[Focus] Expanding Node #${id}, auto-collapsing siblings`);
              next.set(pId, id);
            }
            return next;
          });
        }
      }
    } catch (e) {
      console.error("[Fatal] Error in handleToggleExpand:", e);
    }
    setLoading(false);
  }, [fullTree, mergeSubtree])

  // Khởi tạo
  const initTree = useCallback(async (rootId: number = 0) => {
    setLoading(true); setError(null); setActiveFocusMap(new Map()); lastExpandedIdRef.current = null
    const result = await getGenealogyTreeAction(rootId, 1)
    if (result.success && result.tree) {
      setFullTree(result.tree)
    } else setError(result.error || 'Lỗi tải dữ liệu')
    setLoading(false)
  }, [])

  useEffect(() => { initTree(0) }, [])

  // Render Effect
  useEffect(() => {
    if (fullTree) {
      const { resNodes, resEdges } = generateGraphNodes(fullTree, 0, 0, { onToggleExpand: handleToggleExpand }, activeFocusMap, true)
      setNodes(resNodes); setEdges(resEdges)
      
      setTimeout(() => {
        const lastExpandedId = lastExpandedIdRef.current
        console.log(`[DEBUG useEffect] lastExpandedIdRef.current = ${lastExpandedId}, fullTree.id = ${fullTree.id}`);
        console.log(`[DEBUG useEffect] activeFocusMap =`, Object.fromEntries(activeFocusMap));
        
        if (lastExpandedId) {
          // Tính vị trí node từ cấu trúc cây (cùng logic với generateGraphNodes)
          const pos = getNodePosition(fullTree, lastExpandedId, 0, 0, activeFocusMap, true)
          console.log(`[DEBUG useEffect] getNodePosition result:`, pos);
          
          if (pos) {
            console.log(`[DEBUG useEffect] Calling setCenter to (${pos.x + 100}, ${pos.y + 150}) with zoom 1.2`);
            const zoom = 1.2
            setCenter(pos.x + 100, pos.y + 150, { zoom, duration: 600 })
          } else {
            console.log(`[DEBUG useEffect] pos is null, falling back to fitView`);
            fitView({ padding: 0.2, duration: 800 })
          }
        } else {
          console.log(`[DEBUG useEffect] No lastExpandedId, calling fitView`);
          fitView({ padding: 0.2, duration: 800 })
        }
      }, 150)
    }
  }, [fullTree, activeFocusMap, generateGraphNodes, handleToggleExpand, setNodes, setEdges, fitView, setCenter, getNodePosition])

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900">
      <header className="bg-slate-900 text-white shadow-sm flex-shrink-0 z-20 border-b border-white/10">
        <div className="flex items-center justify-between p-4 w-full">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="text-xl font-black uppercase tracking-tight italic text-white">Nhân Mạch Pro <span className="text-rose-500 not-italic ml-2">V6.5 Stable</span></h1>
          </div>
          <button onClick={() => initTree(0)} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white text-slate-900 text-xs font-black shadow-lg hover:bg-rose-50 transition-all"><Home className="h-4 w-4 text-rose-600" /> RESET</button>
        </div>
      </header>

      <div className="flex-1 relative w-full h-full">
        {loading && nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full w-full absolute inset-0 z-30 text-center"><Zap className="w-8 h-8 text-rose-500 animate-pulse mb-4 mx-auto" /><p className="text-slate-400 font-black text-xs tracking-widest uppercase">Initializing Genealogy Network...</p></div>
        ) : (
          <div className="w-full h-full">
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.001} maxZoom={2}>
              <Background color="#e2e8f0" gap={40} size={1} />
              <Controls className="!bg-white !shadow-xl !rounded-2xl !border-slate-100" />
            </ReactFlow>
            {loading && nodes.length > 0 && (
              <div className="absolute top-8 right-8 z-50 bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-slate-200 shadow-xl flex items-center gap-3">
                <div className="h-3 w-3 rounded-full border-2 border-rose-500 border-t-transparent animate-spin"></div>
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter">Updating Tree...</span>
              </div>
            )}
            <div className="absolute bottom-8 left-8 z-10 bg-white border border-slate-200 rounded-[32px] p-6 shadow-2xl min-w-[240px]">
              <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Quy ước tương tác</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4"><div className="w-4 h-4 rounded-full bg-emerald-500"></div><div><div className="text-xs font-black uppercase">Nhóm A (Xanh lá)</div><div className="text-[9px] text-slate-400 font-bold uppercase">Click xem danh sách F1 trống</div></div></div>
                <div className="flex items-center gap-4"><div className="w-4 h-4 rounded-full bg-sky-500"></div><div><div className="text-xs font-black uppercase">Nhóm B (Xanh dương)</div><div className="text-[9px] text-slate-400 font-bold uppercase">Click xem F1 có F2 (có xem trước)</div></div></div>
                <div className="flex items-center gap-4"><div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-white"><User className="w-2 h-2" /></div><div><div className="text-xs font-black uppercase text-rose-600">Nhóm C (Đỏ)</div><div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Mở rộng node và thu gọn nhánh khác</div></div></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {modalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div><h2 className="text-2xl font-black tracking-tight">{modalData.title}</h2><p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">Gồm {modalData.users.length} thành viên</p></div>
              <button onClick={() => { setModalData(null); setExpandedF2Id(null); }} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 border-r border-slate-100 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
                <div className="grid grid-cols-1 gap-2">
                  {modalData.users.map(u => (
                    <div key={u.id} className="mb-1">
                      <div 
                        onClick={() => { if (modalData.type === 'B') setExpandedF2Id(expandedF2Id === u.id ? null : u.id); }}
                        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${expandedF2Id === u.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-white hover:shadow-sm'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs">#{u.id}</div>
                          <div><div className="text-sm font-black text-slate-900">{u.name || 'Học viên'}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-emerald-600">TS: {u.totalSubCount}</div></div>
                        </div>
                        {modalData.type === 'B' && <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${expandedF2Id === u.id ? 'rotate-180 text-sky-500' : ''}`} />}
                      </div>
                      {expandedF2Id === u.id && modalData.type === 'B' && (
                        <div className="p-2 pl-14 space-y-1 animate-in slide-in-from-top-2">
                          {u.children?.map((f2: any) => (
                            <div key={f2.id} className="p-3 bg-white border border-sky-100 rounded-2xl flex items-center justify-between shadow-sm">
                              <span className="text-[10px] font-black text-sky-600">#{f2.id}</span>
                              <span className="text-xs font-bold text-slate-600">{f2.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-1/2 bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center opacity-40">
                <Network className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-xs font-bold text-slate-400 px-10 leading-relaxed uppercase tracking-widest italic">Hệ thống đang mở rộng tiêu điểm để bạn quan sát sâu nhất có thể</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  )
}

export default function GenealogyPage() {
  return (
    <ReactFlowProvider>
      <GenealogyFlow />
    </ReactFlowProvider>
  )
}
