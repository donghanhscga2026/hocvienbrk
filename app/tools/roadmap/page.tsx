'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { QuestionNode, OptionNode, CourseNode, AdviceNode, FinishNode } from '@/components/admin/roadmap/CustomNodes';
import { 
  getAllSurveys, createSurvey, 
  saveSurveyFlow, activateSurvey, deleteSurvey, 
  getCoursesForBuilder, getSurveyFlow
} from '@/app/actions/roadmap-actions';
import { surveyQuestions } from '@/lib/survey-data';
import Link from 'next/link'
import { Loader2, ArrowLeft, Plus, CheckCircle, Trash2, Edit3, Settings, Save, RefreshCw, X, ChevronUp, ChevronDown } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';

const nodeTypes = {
  questionNode: QuestionNode,
  optionNode: OptionNode,
  courseNode: CourseNode,
  adviceNode: AdviceNode,
  finishNode: FinishNode,
};

let idCounter = 0;
const getId = () => `node_${Date.now()}_${idCounter++}`;

const RoadmapBuilderContent = () => {
  const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST');
  const [currentSurveyId, setCurrentSurveyId] = useState<number | null>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showMobileProps, setShowMobileProps] = useState(false);

  const reactFlowWrapper = useRef<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSurveys();
    loadCourses();
  }, []);

  const loadSurveys = async () => {
    try {
        setIsInitializing(true);
        const list = await getAllSurveys();
        if (list.length === 0) {
            const res = await createSurvey('Lộ trình Zero 2 Hero (Bản gốc)');
            if (res.success) loadSurveys();
        } else {
            setSurveys(list);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsInitializing(false);
    }
  };

  const loadCourses = async () => {
    const list = await getCoursesForBuilder();
    setCourses(list || []);
  };

  const handleCreateNew = async () => {
    const name = window.prompt('Nhập tên cho bài khảo sát mới:');
    if (!name) return;
    const res = await createSurvey(name);
    if (res.success) loadSurveys();
  };

  const handleEdit = async (survey: any) => {
    setCurrentSurveyId(survey.id);
    setView('EDITOR');
    setSelectedNode(null);
    setIsInitializing(true);
    
    try {
      const flowData = await getSurveyFlow(survey.id);
      const flow = flowData?.flow as any;
      setNodes(Array.isArray(flow?.nodes) ? flow.nodes : []);
      setEdges(Array.isArray(flow?.edges) ? flow.edges : []);
    } catch (err) {
      console.error('Error loading flow:', err);
      setNodes([]);
      setEdges([]);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleActivate = async (id: number) => {
    if (window.confirm('Kích hoạt bài khảo sát này?')) {
      const res = await activateSurvey(id);
      if (res.success) loadSurveys();
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Xóa vĩnh viễn bài này?')) {
      const res = await deleteSurvey(id);
      if (res.success) loadSurveys();
    }
  };

  const onSave = async () => {
    if (!currentSurveyId) return;
    setIsSaving(true);
    const result = await saveSurveyFlow(currentSurveyId, { nodes, edges });
    if (result.success) {
      alert('Đã lưu thành công!');
      const updatedSurveys = await getAllSurveys();
      setSurveys(updatedSurveys);
    } else {
      alert('Lỗi: ' + result.error);
    }
    setIsSaving(false);
  };

  const onConnect = useCallback((params: any) => setEdges((eds: any) => addEdge(params, eds)), [setEdges]);

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: any) => {
    event.preventDefault();
    if (!reactFlowInstance) return;
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode = {
      id: getId(),
      type,
      position,
      data: { label: `Nội dung mới...` },
    };
    setNodes((nds: any) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  const updateNodeData = (newData: any) => {
    if (!selectedNode) return;
    setNodes((nds: any) => nds.map((node: any) => node.id === selectedNode.id ? { ...node, data: { ...node.data, ...newData } } : node));
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...newData } });
  };

  const getOrderedNodes = useCallback(() => {
    if (nodes.length === 0) return nodes;

    const nodeOrderMap = new Map<string, number>();
    const visited = new Set<string>();
    let currentOrder = 1;

    const targetIds = new Set(edges.map((e: any) => e.target));
    const rootNodes = nodes.filter((n: any) => n.type === 'questionNode' && !targetIds.has(n.id));
    
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find((n: any) => n.id === nodeId);
      if (node && (node.type === 'questionNode' || node.type === 'finishNode')) {
        nodeOrderMap.set(nodeId, currentOrder++);
      }

      const outEdges = edges.filter((e: any) => e.source === nodeId);
      for (const edge of outEdges) {
        traverse(edge.target);
      }
    };

    rootNodes.forEach(root => traverse(root.id));

    return nodes.map((n: any) => ({
      ...n,
      data: { ...n.data, orderIndex: nodeOrderMap.get(n.id) }
    }));
  }, [nodes, edges]);

  const nodesWithOrder = getOrderedNodes();

  const onMigrateFromOldVersion = () => {
    if (!window.confirm('CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ sơ đồ hiện tại và nạp lại dữ liệu từ file code gốc. Bạn có chắc chắn?')) return;
    
    const newNodes: any[] = [];
    const newEdges: any[] = [];
    let x = 100, y = 100, spacingX = 450, spacingY = 200;

    const questions = surveyQuestions as any;
    Object.keys(questions).forEach((qId, qIndex) => {
      const q = questions[qId];
      
      newNodes.push({ 
        id: qId, 
        type: 'questionNode', 
        position: { x: x + qIndex * spacingX, y }, 
        data: { label: q.question, type: q.type }
      });

      if (Array.isArray(q.options)) {
        q.options.forEach((opt: any, optIndex: number) => {
          const optNodeId = `opt_${qId}_${opt.id}`;
          newNodes.push({ 
            id: optNodeId, 
            type: 'optionNode', 
            position: { x: x + qIndex * spacingX + (optIndex * 180 - 150), y: y + spacingY }, 
            data: { label: opt.label }
          });
          newEdges.push({ id: `e_${qId}_${optNodeId}`, source: qId, target: optNodeId });
          if (opt.nextQuestionId && opt.nextQuestionId !== 'done') {
              newEdges.push({ id: `e_${optNodeId}_${opt.nextQuestionId}`, source: optNodeId, target: opt.nextQuestionId });
          }
        });
      }
    });
    setNodes(newNodes);
    setEdges(newEdges);
  };

  useEffect(() => {
    if (selectedNode) setShowMobileProps(true);
  }, [selectedNode]);

  if (isInitializing) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-yellow-400" /></div>;

  if (view === 'LIST') return (
    <div className="min-h-screen bg-gray-50">
      <ToolHeader title="LỘ TRÌNH" backUrl="/tools" />
      <div className="space-y-6 animate-in fade-in duration-500 text-black mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-black uppercase tracking-tight">Quản lý khảo sát</h2>
          <button onClick={handleCreateNew} className="w-full md:w-auto bg-black text-yellow-400 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg">
            <Plus className="w-3 h-3" /> Tạo mới
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surveys.map((survey) => (
          <div key={survey.id} className={`bg-white rounded-[2.5rem] p-6 border-2 transition-all ${survey.isActive ? 'border-green-500 shadow-xl' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${survey.isActive ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {survey.isActive ? 'Đang chạy' : 'Bản nháp'}
              </span>
              <button onClick={() => handleDelete(survey.id)} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
            <h3 className="text-lg font-black text-black mb-4 uppercase truncate">{survey.name}</h3>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => handleEdit(survey)} className="w-full bg-zinc-900 text-white py-3 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2">
                <Edit3 className="w-3 h-3" /> Thiết kế sơ đồ
              </button>
              {!survey.isActive && (
                <button onClick={() => handleActivate(survey.id)} className="w-full bg-green-50 text-green-600 py-3 rounded-xl font-black uppercase text-[9px] border border-green-100">
                  Kích hoạt ngay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] md:relative md:h-[calc(100vh-150px)] flex flex-col bg-[#F8F9FA] overflow-hidden text-black">
      <div className="bg-black p-3 md:p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
            <button onClick={() => setView('LIST')} className="p-2 bg-white/10 text-white rounded-xl"><ArrowLeft className="w-4 h-4" /></button>
            <div className="hidden md:block">
                <h2 className="text-white font-black uppercase text-sm italic">
                    {surveys.find(s => s.id === currentSurveyId)?.name}
                </h2>
            </div>
            <button 
                onClick={onMigrateFromOldVersion} 
                className="bg-white/10 text-white border border-white/20 px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2"
            >
                <RefreshCw className="w-3 h-3" /> <span className="hidden sm:inline">Nạp bản cũ</span>
            </button>
        </div>
        <button onClick={onSave} disabled={isSaving} className="bg-yellow-400 text-black px-5 md:px-8 py-2 md:py-2.5 rounded-xl font-black uppercase text-[9px] md:text-[11px] shadow-lg active:scale-95">
          {isSaving ? '...' : <div className="flex items-center gap-2"><Save className="w-3 h-3 md:w-4 md:h-4" /> Lưu</div>}
        </button>
      </div>

      <div className="bg-white border-b border-gray-200 p-2 overflow-x-auto flex flex-row gap-2 no-scrollbar shrink-0 md:hidden">
        {[
          { type: 'questionNode', color: 'orange', label: '❓ CÂU HỎI' },
          { type: 'optionNode', color: 'zinc', label: '🔘 ĐÁP ÁN' },
          { type: 'courseNode', color: 'purple', label: '🎓 KHÓA' },
          { type: 'adviceNode', color: 'blue', label: '💡 TƯ VẤN' },
          { type: 'finishNode', color: 'emerald', label: '🏁 ĐÍCH' }
        ].map(tool => (
          <div 
            key={tool.type} 
            className="shrink-0 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-[9px] uppercase active:bg-yellow-50 active:border-yellow-400 transition-colors"
            onClick={() => {
                const newNode = {
                    id: getId(),
                    type: tool.type,
                    position: reactFlowInstance ? reactFlowInstance.getViewport() : { x: 100, y: 100 },
                    data: { label: `Nội dung mới...` },
                };
                setNodes((nds: any) => nds.concat(newNode));
            }}
          >
            {tool.label}
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="hidden md:flex w-72 bg-gray-50 border-r border-gray-200 p-6 flex-col gap-4 overflow-y-auto">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-2">Thư viện khối</div>
          <div className="grid grid-cols-1 gap-3">
            {[
              { type: 'questionNode', label: '❓ CÂU HỎI', desc: 'Nội dung khảo sát' },
              { type: 'optionNode', label: '🔘 ĐÁP ÁN', desc: 'Các lựa chọn rẽ nhánh' },
              { type: 'courseNode', label: '🎓 KHÓA HỌC', desc: 'Khóa học được cấp' },
              { type: 'adviceNode', label: '💡 TƯ VẤN', desc: 'Video định hướng' },
              { type: 'finishNode', label: '🏁 ĐÍCH ĐẾN', desc: 'Chốt mục tiêu' }
            ].map(tool => (
              <div key={tool.type} className="p-4 bg-white border-2 border-gray-100 rounded-2xl cursor-grab hover:border-gray-500 transition-all shadow-sm" onDragStart={(e) => e.dataTransfer.setData('application/reactflow', tool.type)} draggable>
                <div className="text-zinc-600 text-[11px] font-black uppercase">{tool.label}</div>
                <div className="text-[9px] text-gray-400 font-bold mt-1 uppercase italic">{tool.desc}</div>
              </div>
            ))}
          </div>
          {selectedNode && (
            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200 space-y-4">
              <div className="text-[10px] font-black uppercase text-black">Thuộc tính</div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1 italic">Câu hỏi chính</label>
                <textarea className="w-full p-4 text-xs font-bold border-2 border-gray-50 rounded-2xl outline-none focus:border-yellow-400 text-black" value={selectedNode.data?.label || ''} onChange={(e) => updateNodeData({ label: e.target.value })} rows={3} />
              </div>

              {selectedNode.type === 'questionNode' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-1 italic">Mô tả chi tiết (Tùy chọn)</label>
                  <textarea className="w-full p-4 text-xs font-bold border-2 border-gray-50 rounded-2xl outline-none focus:border-orange-400 text-black" value={selectedNode.data?.description || ''} onChange={(e) => updateNodeData({ description: e.target.value })} rows={2} placeholder="Giúp học viên hiểu rõ câu hỏi hơn..." />
                </div>
              )}

              {selectedNode.type === 'questionNode' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-orange-500 ml-1 italic">Loại nhập liệu</label>
                  <select 
                    className="w-full p-4 text-xs font-bold border-2 border-orange-50 rounded-2xl outline-none focus:border-orange-500 text-black bg-white" 
                    value={selectedNode.data?.type || 'CHOICE'} 
                    onChange={(e) => updateNodeData({ type: e.target.value })}
                  >
                    <option value="CHOICE">🔘 Các nút Lựa chọn</option>
                    <option value="INPUT_ACCOUNT">📱 Form Thông tin kênh</option>
                    <option value="INPUT_GOAL">🏁 Form Cam kết mục tiêu</option>
                    <option value="FREE_TEXT">📝 Form Tự nhập câu trả lời</option>
                  </select>
                </div>
              )}

              {selectedNode.type === 'finishNode' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-emerald-500 ml-1 italic">Loại hiển thị cuối</label>
                  <select 
                    className="w-full p-4 text-xs font-bold border-2 border-emerald-50 rounded-2xl outline-none focus:border-emerald-500 text-black bg-white" 
                    value={selectedNode.data?.type || 'FINISH'} 
                    onChange={(e) => updateNodeData({ type: e.target.value })}
                  >
                    <option value="FINISH">🏁 Kết thúc mặc định</option>
                    <option value="INPUT_GOAL">📜 Hiện Form Cam kết mục tiêu</option>
                  </select>
                </div>
              )}

              {selectedNode.type === 'courseNode' && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-1 italic">Chọn khóa học</label>
                    <select 
                      className="w-full p-4 text-xs font-bold border-2 border-gray-50 rounded-2xl outline-none text-black bg-white" 
                      value={selectedNode.data?.courseId || ''} 
                      onChange={(e) => {
                          const courseId = parseInt(e.target.value);
                          const course = courses.find(c => c.id === courseId);
                          updateNodeData({ courseId, courseName: course?.name_lop });
                      }}
                    >
                      <option value="">-- Chọn khóa học --</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name_lop}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-purple-600 ml-1 italic">Gắn vào Nút Timeline (1-9)</label>
                    <select 
                      className="w-full p-4 text-xs font-bold border-2 border-purple-50 rounded-2xl outline-none focus:border-purple-500 text-black bg-white" 
                      value={selectedNode.data?.pointId || ''} 
                      onChange={(e) => updateNodeData({ pointId: e.target.value ? parseInt(e.target.value) : null })}
                    >
                      <option value="">-- Không gắn nút --</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <option key={num} value={num}>Nút số {num}</option>
                      ))}
                    </select>
                    <p className="text-[8px] text-gray-400 px-1 italic">Học viên đi qua khối này sẽ được chốt đích đến tại Nút này.</p>
                  </div>
                </div>
              )}
              <button onClick={() => { setNodes((nds: any) => nds.filter((n: any) => n.id !== selectedNode.id)); setSelectedNode(null); }} className="w-full py-4 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-2xl border-2 border-red-100 hover:bg-red-500 hover:text-white transition-all">Xóa khối</button>
            </div>
          )}
        </aside>

        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow nodes={nodesWithOrder} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver} onNodeClick={(_, node) => setSelectedNode(node)} nodeTypes={nodeTypes} fitView minZoom={0.1} maxZoom={2} panOnScroll={true} selectionOnDrag={true}>
            <Background color="#E5E7EB" variant={"dots" as any} gap={20} size={1} />
            <Controls className="!bg-white !border-gray-200 !rounded-xl md:!rounded-2xl !shadow-2xl overflow-hidden" />
          </ReactFlow>
        </div>

        {selectedNode && (
            <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[150] transition-transform duration-300 transform ${showMobileProps ? 'translate-y-0' : 'translate-y-[85%]'}`}>
                <div className="bg-white rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] border-t border-gray-100">
                    <button onClick={() => setShowMobileProps(!showMobileProps)} className="w-full py-4 flex flex-col items-center gap-1 border-b border-gray-50">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{showMobileProps ? 'Gạt xuống để ẩn' : 'Gạt lên để sửa'}</span>
                    </button>
                    <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-yellow-600 bg-yellow-50 px-4 py-1.5 rounded-xl border border-yellow-100">{selectedNode.type}</span>
                            <button onClick={() => { setNodes((nds: any) => nds.filter((n: any) => n.id !== selectedNode.id)); setSelectedNode(null); }} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nội dung hiển thị</label>
                            <textarea className="w-full p-4 text-sm font-bold border-2 border-gray-100 rounded-[1.5rem] outline-none focus:border-yellow-400 text-black bg-gray-50" value={selectedNode.data?.label || ''} onChange={(e) => updateNodeData({ label: e.target.value })} rows={3} placeholder="Nhập chữ..." />
                        </div>
                        {selectedNode.type === 'questionNode' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Loại nhập liệu</label>
                                <select className="w-full p-4 text-sm font-bold border-2 border-gray-100 rounded-[1.5rem] outline-none text-black bg-gray-50" value={selectedNode.data?.type || 'CHOICE'} onChange={(e) => updateNodeData({ type: e.target.value })}>
                                    <option value="CHOICE">Lựa chọn (Choice)</option>
                                    <option value="INPUT_ACCOUNT">Thông tin kênh (Account)</option>
                                    <option value="INPUT_GOAL">Cam kết mục tiêu (Goal)</option>
                                </select>
                            </div>
                        )}
                        {selectedNode.type === 'courseNode' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Chọn khóa học</label>
                                    <select className="w-full p-4 text-sm font-bold border-2 border-gray-100 rounded-[1.5rem] outline-none text-black bg-gray-50" value={selectedNode.data?.courseId || ''} onChange={(e) => {
                                        const courseId = parseInt(e.target.value);
                                        const course = courses.find(c => c.id === courseId);
                                        updateNodeData({ courseId, courseName: course?.name_lop });
                                    }}><option value="">-- Chọn khóa --</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name_lop}</option>)}</select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-purple-600 uppercase ml-1">Gắn vào Nút Timeline (1-9)</label>
                                    <select 
                                        className="w-full p-4 text-sm font-bold border-2 border-purple-100 rounded-[1.5rem] outline-none text-black bg-purple-50" 
                                        value={selectedNode.data?.pointId || ''} 
                                        onChange={(e) => updateNodeData({ pointId: e.target.value ? parseInt(e.target.value) : null })}
                                    >
                                        <option value="">-- Không gắn nút --</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                            <option key={num} value={num}>Nút số {num}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                        <div className="py-4"></div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default function RoadmapBuilder() {
    return (
        <ReactFlowProvider>
            <RoadmapBuilderContent />
        </ReactFlowProvider>
    );
}