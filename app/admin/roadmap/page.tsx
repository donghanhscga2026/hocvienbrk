
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
  getCoursesForBuilder 
} from '@/app/actions/roadmap-actions';
import { surveyQuestions } from '@/lib/survey-data';
import { Loader2, ArrowLeft, Plus, CheckCircle, Trash2, Edit3, Settings, Save, RefreshCw } from 'lucide-react';

// Định nghĩa các loại Node tùy chỉnh
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

  // Editor states
  const reactFlowWrapper = useRef<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load danh sách ban đầu
  useEffect(() => {
    loadSurveys();
    loadCourses();
  }, []);

  const loadSurveys = async () => {
    try {
        setIsInitializing(true);
        const list = await getAllSurveys();
        
        // TỰ ĐỘNG KHỞI TẠO BẢN GỐC NẾU CHƯA CÓ BÀI NÀO
        if (list.length === 0) {
            console.log('🌱 Đang tự động khởi tạo bài khảo sát bản gốc...');
            const newNodes: any[] = [];
            const newEdges: any[] = [];
            let x = 100, y = 100, spacingX = 400, spacingY = 180;
            const questions = surveyQuestions as any;
            
            Object.keys(questions).forEach((qId, qIndex) => {
              const q = questions[qId];
              newNodes.push({ id: qId, type: 'questionNode', position: { x: x + qIndex * spacingX, y }, data: { label: q.question, type: q.type }});
              if (Array.isArray(q.options)) {
                q.options.forEach((opt: any, optIndex: number) => {
                  const optNodeId = `opt_${qId}_${opt.id}`;
                  newNodes.push({ id: optNodeId, type: 'optionNode', position: { x: x + qIndex * spacingX + (optIndex * 160 - 120), y: y + spacingY }, data: { label: opt.label }});
                  newEdges.push({ id: `e_${qId}_${optNodeId}`, source: qId, target: optNodeId });
                  if (opt.nextQuestionId && opt.nextQuestionId !== 'done') {
                      newEdges.push({ id: `e_${optNodeId}_${opt.nextQuestionId}`, source: optNodeId, target: opt.nextQuestionId });
                  }
                });
              }
            });
            
            const res = await createSurvey('Lộ trình Zero 2 Hero (Bản gốc)');
            if (res.success && res.survey) {
                await saveSurveyFlow(res.survey.id, { nodes: newNodes, edges: newEdges });
                await activateSurvey(res.survey.id);
                const updatedList = await getAllSurveys();
                setSurveys(updatedList);
            }
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
    try {
        const list = await getCoursesForBuilder();
        setCourses(list || []);
    } catch (err) {
        console.error(err);
    }
  };

  // ─── XỬ LÝ DANH SÁCH ──────────────────────────────────────────────────
  const handleCreateNew = async () => {
    const name = window.prompt('Nhập tên cho bài khảo sát mới:');
    if (!name) return;
    try {
        const res = await createSurvey(name);
        if (res.success) {
          loadSurveys();
        } else {
          alert(res.error);
        }
    } catch (err) {
        alert('Lỗi hệ thống khi tạo mới');
    }
  };

  const handleEdit = (survey: any) => {
    setCurrentSurveyId(survey.id);
    const flow = survey.flow as any;
    setNodes(Array.isArray(flow?.nodes) ? flow.nodes : []);
    setEdges(Array.isArray(flow?.edges) ? flow.edges : []);
    setView('EDITOR');
    setSelectedNode(null);
  };

  const handleActivate = async (id: number) => {
    if (window.confirm('Bạn có muốn kích hoạt bài khảo sát này và tạm dừng bài hiện tại không?')) {
      try {
          const res = await activateSurvey(id);
          if (res.success) {
              loadSurveys();
          } else {
              alert(res.error);
          }
      } catch (err) {
          alert('Lỗi khi kích hoạt');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Xóa vĩnh viễn bài khảo sát này? Thao tác không thể hoàn tác.')) {
      try {
          const res = await deleteSurvey(id);
          if (res.success) {
              loadSurveys();
          } else {
              alert(res.error);
          }
      } catch (err) {
          alert('Lỗi khi xóa');
      }
    }
  };

  // ─── XỬ LÝ EDITOR (REACT FLOW) ─────────────────────────────────────────
  const onSave = async () => {
    if (!currentSurveyId) return;
    setIsSaving(true);
    try {
        const result = await saveSurveyFlow(currentSurveyId, { nodes, edges });
        if (result.success) {
          alert('Đã lưu bài khảo sát thành công!');
          const updatedSurveys = await getAllSurveys();
          setSurveys(updatedSurveys);
        } else {
          alert('Lỗi: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Lỗi hệ thống khi lưu');
    } finally {
        setIsSaving(false);
    }
  };

  const onConnect = useCallback(
    (params: any) => setEdges((eds: any) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault();
      if (!reactFlowInstance || !event.dataTransfer) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `Nội dung ${type === 'questionNode' ? 'câu hỏi' : type === 'finishNode' ? 'Đích đến' : 'mới'}...` },
      };
      setNodes((nds: any) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onMigrateFromOldVersion = () => {
    if (!window.confirm('CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ sơ đồ hiện tại và nạp lại dữ liệu từ file code gốc. Bạn có chắc chắn?')) return;
    
    const newNodes: any[] = [];
    const newEdges: any[] = [];
    let x = 100, y = 100, spacingX = 400, spacingY = 180;

    const questions = surveyQuestions as any;
    Object.keys(questions).forEach((qId, qIndex) => {
      const q = questions[qId];
      newNodes.push({ id: qId, type: 'questionNode', position: { x: x + qIndex * spacingX, y }, data: { label: q.question, type: q.type }});
      if (Array.isArray(q.options)) {
        q.options.forEach((opt: any, optIndex: number) => {
          const optNodeId = `opt_${qId}_${opt.id}`;
          newNodes.push({ id: optNodeId, type: 'optionNode', position: { x: x + qIndex * spacingX + (optIndex * 160 - 120), y: y + spacingY }, data: { label: opt.label }});
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

  const updateNodeData = (newData: any) => {
    if (!selectedNode) return;
    setNodes((nds: any) => nds.map((node: any) => 
        node.id === selectedNode.id ? { ...node, data: { ...node.data, ...newData } } : node
    ));
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...newData } });
  };

  if (isInitializing) return (
    <div className="p-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-400" />
        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Đang khởi tạo hệ thống...</p>
    </div>
  );

  // VIEW: LIST SURVYES
  if (view === 'LIST') return (
    <div className="space-y-8 animate-in fade-in duration-500 text-black max-w-6xl mx-auto">
      <div className="flex justify-between items-end border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-3">
            <Settings className="w-8 h-8 text-yellow-400" /> Quản lý bài khảo sát
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2 ml-1">Hệ thống Lộ trình cá nhân hóa BRK</p>
        </div>
        <button onClick={handleCreateNew} className="bg-black text-yellow-400 px-8 py-4 rounded-[2rem] font-black uppercase text-xs flex items-center gap-2 hover:scale-105 transition-all shadow-2xl hover:shadow-yellow-400/20 active:scale-95">
          <Plus className="w-5 h-5" /> Tạo bài khảo sát mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {surveys.map((survey) => (
          <div key={survey.id} className={`bg-white rounded-[3rem] p-8 border-2 transition-all group relative overflow-hidden ${survey.isActive ? 'border-green-500 shadow-2xl shadow-green-500/10' : 'border-gray-100 hover:border-gray-300'}`}>
            {survey.isActive && (
                <div className="absolute top-0 right-0 bg-green-500 text-white px-6 py-1.5 rounded-bl-[1.5rem] text-[9px] font-black uppercase tracking-widest shadow-lg">Đang chạy</div>
            )}
            <div className="mb-8">
                <h3 className="text-2xl font-black text-black mb-2 uppercase tracking-tight line-clamp-1">{survey.name}</h3>
                <div className="flex items-center gap-2 text-gray-400 text-[9px] font-black uppercase italic">
                    <RefreshCw className="w-3 h-3" />
                    Cập nhật: {new Date(survey.updatedAt).toLocaleDateString('vi-VN')}
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => handleEdit(survey)} className="flex items-center justify-center gap-3 bg-zinc-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-black/10">
                <Edit3 className="w-4 h-4" /> Chỉnh sửa sơ đồ
              </button>
              <div className="grid grid-cols-2 gap-3">
                  {!survey.isActive ? (
                    <button onClick={() => handleActivate(survey.id)} className="flex items-center justify-center gap-2 bg-green-50 text-green-600 py-4 rounded-2xl font-black uppercase text-[9px] tracking-tighter hover:bg-green-500 hover:text-white transition-all active:scale-95">
                      <CheckCircle className="w-3.5 h-3.5" /> Kích hoạt ngay
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-tighter cursor-default">
                      <CheckCircle className="w-3.5 h-3.5" /> Đang sử dụng
                    </div>
                  )}
                  <button onClick={() => handleDelete(survey.id)} className="flex items-center justify-center gap-2 bg-red-50 text-red-500 py-4 rounded-2xl font-black uppercase text-[9px] tracking-tighter hover:bg-red-500 hover:text-white transition-all active:scale-95">
                    <Trash2 className="w-3.5 h-3.5" /> Xóa bài
                  </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-150px)] flex flex-col bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 text-black relative">
      <div className="bg-black p-5 flex justify-between items-center z-50">
        <div className="flex items-center gap-6">
            <button onClick={() => setView('LIST')} className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all active:scale-90"><ArrowLeft className="w-5 h-5" /></button>
            <div>
                <h2 className="text-white font-black uppercase tracking-tighter text-sm italic flex items-center gap-2"><span className="text-yellow-400">Thiết kế:</span> {surveys.find(s => s.id === currentSurveyId)?.name}</h2>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Dựng lộ trình rẽ nhánh cho học viên</p>
            </div>
            <button onClick={onMigrateFromOldVersion} className="bg-white/10 text-white border border-white/20 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2"><RefreshCw className="w-3 h-3" /> Nạp từ bản cũ</button>
        </div>
        <div className="flex items-center gap-4">
            {isSaving && <span className="text-yellow-400 text-[9px] font-black uppercase animate-pulse">Đang đồng bộ...</span>}
            <button onClick={onSave} disabled={isSaving} className="bg-yellow-400 text-black px-10 py-3 rounded-2xl font-black uppercase text-[11px] hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-yellow-400/20 active:scale-95">
              <Save className="w-4 h-4" /> Lưu sơ đồ
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" ref={reactFlowWrapper}>
        <aside className="w-72 bg-gray-50 border-r border-gray-200 p-6 flex flex-col gap-4 overflow-y-auto no-scrollbar">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-2">Thư viện khối kiến trúc</div>
          <div className="grid grid-cols-1 gap-3">
            {[
              { type: 'questionNode', color: 'orange', label: '❓ CÂU HỎI', desc: 'Nhập nội dung khảo sát' },
              { type: 'optionNode', color: 'zinc', label: '🔘 ĐÁP ÁN', desc: 'Các lựa chọn rẽ nhánh' },
              { type: 'courseNode', color: 'purple', label: '🎓 KHÓA HỌC', desc: 'Khóa học được cấp ra' },
              { type: 'adviceNode', color: 'blue', label: '💡 TƯ VẤN', desc: 'Video/Nội dung định hướng' },
              { type: 'finishNode', color: 'emerald', label: '🏁 ĐÍCH ĐẾN', desc: 'Chốt mục tiêu & Nộp bài' }
            ].map(tool => (
              <div key={tool.type} className={`p-4 bg-white border-2 border-gray-100 rounded-2xl cursor-grab active:cursor-grabbing hover:border-gray-500 transition-all group shadow-sm`} onDragStart={(e) => e.dataTransfer.setData('application/reactflow', tool.type)} draggable>
                <div className={`text-zinc-600 text-[11px] font-black uppercase group-hover:scale-105 transition-transform`}>{tool.label}</div>
                <div className="text-[9px] text-gray-400 font-bold mt-1 uppercase italic">{tool.desc}</div>
              </div>
            ))}
          </div>

          {selectedNode && (
            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200 space-y-5">
              <div className="flex justify-between items-center">
                <div className="text-[10px] font-black text-black uppercase tracking-widest bg-yellow-400 px-3 py-1 rounded-lg">Cấu hình khối</div>
                <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-black transition-colors text-[10px] font-black uppercase">Đóng</button>
              </div>
              <div className="space-y-4 bg-white p-5 rounded-[2rem] border-2 border-gray-100">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-1 italic">Nội dung hiển thị</label>
                    <textarea className="w-full p-4 text-xs font-bold border-2 border-gray-50 rounded-2xl outline-none focus:ring-4 ring-yellow-400/20 focus:border-yellow-400 transition-all text-black" value={selectedNode.data?.label || ''} onChange={(e) => updateNodeData({ label: e.target.value })} rows={4} placeholder="Nhập nội dung cho khối này..." />
                  </div>
                  {selectedNode.type === 'questionNode' && (
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1 italic">Loại nhập liệu</label>
                        <select className="w-full p-4 text-xs font-bold border-2 border-gray-50 rounded-2xl outline-none focus:border-orange-500 text-black bg-white" value={selectedNode.data?.type || 'CHOICE'} onChange={(e) => updateNodeData({ type: e.target.value })}>
                            <option value="CHOICE">Lựa chọn (Choice)</option>
                            <option value="INPUT_ACCOUNT">Thông tin kênh (Account)</option>
                            <option value="INPUT_GOAL">Cam kết mục tiêu (Goal)</option>
                        </select>
                    </div>
                  )}
                  {selectedNode.type === 'courseNode' && (
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1 italic">Chọn khóa học</label>
                        <select className="w-full p-4 text-xs font-bold border-2 border-gray-50 rounded-2xl outline-none focus:border-purple-500 text-black bg-white" value={selectedNode.data?.courseId || ''} onChange={(e) => {
                            const courseId = parseInt(e.target.value);
                            const course = courses.find(c => c.id === courseId);
                            updateNodeData({ courseId, courseName: course?.name_lop });
                        }}>
                            <option value="">-- Chọn khóa học --</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name_lop}</option>)}
                        </select>
                    </div>
                  )}
                  <button onClick={() => { setNodes((nds: any) => nds.filter((n: any) => n.id !== selectedNode.id)); setSelectedNode(null); }} className="w-full py-4 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-2xl border-2 border-red-100 hover:bg-red-500 hover:text-white transition-all active:scale-95">Xóa khối này</button>
              </div>
            </div>
          )}
        </aside>

        <div className="flex-1 relative bg-[#F8F9FA]">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver} onNodeClick={(_, node) => setSelectedNode(node)} nodeTypes={nodeTypes} fitView>
            <Background color="#E5E7EB" variant={"dots" as any} gap={20} size={1} />
            <Controls className="!bg-white !border-gray-200 !rounded-2xl !shadow-2xl overflow-hidden" />
            <MiniMap nodeStrokeColor={(n: any) => n.type === 'questionNode' ? '#f97316' : n.type === 'courseNode' ? '#9333ea' : n.type === 'finishNode' ? '#10b981' : '#9ca3af'} nodeColor={(n: any) => n.type === 'questionNode' ? '#fff7ed' : n.type === 'courseNode' ? '#faf5ff' : n.type === 'finishNode' ? '#ecfdf5' : '#f9fafb'} className="!bg-white !rounded-[2rem] !border-2 !border-gray-100 !shadow-2xl" />
            <Panel position="top-right" className="bg-black/80 p-4 rounded-2xl text-[9px] font-black uppercase text-yellow-400 border border-white/10 shadow-2xl backdrop-blur-xl tracking-widest italic"><p>💡 Click: Sửa • Kéo: Nối • Del: Xóa dây</p></Panel>
          </ReactFlow>
        </div>
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
