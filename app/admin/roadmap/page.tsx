
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

import { QuestionNode, OptionNode, CourseNode, AdviceNode } from '@/components/admin/roadmap/CustomNodes';
import { 
  getAllSurveys, getSurveyById, createSurvey, 
  saveSurveyFlow, activateSurvey, deleteSurvey, 
  getCoursesForBuilder 
} from '@/app/actions/roadmap-actions';
import { surveyQuestions } from '@/lib/survey-data';
import { Loader2, ArrowLeft, Plus, CheckCircle, Trash2, Edit3, Settings } from 'lucide-react';

// Định nghĩa các loại Node tùy chỉnh
const nodeTypes = {
  questionNode: QuestionNode,
  optionNode: OptionNode,
  courseNode: CourseNode,
  adviceNode: AdviceNode,
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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
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
    const list = await getAllSurveys();
    setSurveys(list);
    setIsInitializing(false);
  };

  const loadCourses = async () => {
    const list = await getCoursesForBuilder();
    setCourses(list);
  };

  // ─── XỬ LÝ DANH SÁCH ──────────────────────────────────────────────────
  const handleCreateNew = async () => {
    const name = window.prompt('Nhập tên cho bài khảo sát mới:');
    if (!name) return;
    const res = await createSurvey(name);
    if (res.success) {
      loadSurveys();
    }
  };

  const handleEdit = async (survey: any) => {
    setCurrentSurveyId(survey.id);
    setNodes(survey.flow?.nodes || []);
    setEdges(survey.flow?.edges || []);
    setView('EDITOR');
  };

  const handleActivate = async (id: number) => {
    if (window.confirm('Bạn có muốn kích hoạt bài khảo sát này và tạm dừng bài hiện tại không?')) {
      const res = await activateSurvey(id);
      if (res.success) loadSurveys();
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Xóa vĩnh viễn bài khảo sát này?')) {
      const res = await deleteSurvey(id);
      if (res.success) loadSurveys();
    }
  };

  // ─── XỬ LÝ EDITOR (REAC FLOW) ─────────────────────────────────────────
  const onSave = async () => {
    if (!currentSurveyId) return;
    setIsSaving(true);
    const result = await saveSurveyFlow(currentSurveyId, { nodes, edges });
    if (result.success) {
      alert('Đã lưu bài khảo sát thành công!');
      loadSurveys();
    } else {
      alert('Lỗi: ' + result.error);
    }
    setIsSaving(false);
  };

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `Mới (${type})` },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onMigrateFromOldVersion = () => {
    if (!window.confirm('Bạn có muốn xóa dữ liệu hiện tại và nạp lại từ bản gốc không?')) return;
    const newNodes: any[] = [];
    const newEdges: any[] = [];
    let x = 100, y = 100, spacingX = 400, spacingY = 150;

    Object.keys(surveyQuestions).forEach((qId, qIndex) => {
      const q = (surveyQuestions as any)[qId];
      newNodes.push({ id: qId, type: 'questionNode', position: { x: x + qIndex * spacingX, y }, data: { label: q.question, type: q.type }});
      if (q.options) {
        q.options.forEach((opt: any, optIndex: number) => {
          const optNodeId = `opt_${qId}_${opt.id}`;
          newNodes.push({ id: optNodeId, type: 'optionNode', position: { x: x + qIndex * spacingX + (optIndex * 150 - 100), y: y + spacingY }, data: { label: opt.label }});
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
    setNodes((nds) => nds.map((node) => node.id === selectedNode.id ? { ...node, data: { ...node.data, ...newData } } : node));
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...newData } });
  };

  if (isInitializing) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-yellow-400" /></div>;

  // VIEW: LIST SURVYES
  if (view === 'LIST') return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight italic">Quản lý các bài khảo sát</h2>
          <p className="text-gray-400 text-xs font-bold uppercase">Bạn có thể tạo nhiều bản nháp và chọn bản tốt nhất để chạy.</p>
        </div>
        <button onClick={handleCreateNew} className="bg-black text-yellow-400 px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:scale-105 transition-all shadow-xl">
          <Plus className="w-4 h-4" /> Tạo bài khảo sát mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surveys.map((survey) => (
          <div key={survey.id} className={`bg-white rounded-[2.5rem] p-8 border-2 transition-all group ${survey.isActive ? 'border-green-500 shadow-xl shadow-green-500/10' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${survey.isActive ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {survey.isActive ? 'Đang hoạt động' : 'Bản nháp'}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => handleDelete(survey.id)} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h3 className="text-xl font-black text-black mb-2 uppercase tracking-tight">{survey.name}</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase mb-8 italic">Cập nhật: {new Date(survey.updatedAt).toLocaleDateString()}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleEdit(survey)} className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-black hover:text-white transition-all">
                <Edit3 className="w-3 h-3" /> Chỉnh sửa
              </button>
              {!survey.isActive && (
                <button onClick={() => handleActivate(survey.id)} className="flex items-center justify-center gap-2 bg-green-50 text-green-600 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-green-500 hover:text-white transition-all">
                  <CheckCircle className="w-3 h-3" /> Kích hoạt
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // VIEW: EDITOR
  return (
    <div className="h-[calc(100vh-150px)] flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-black p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <button onClick={() => setView('LIST')} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"><ArrowLeft className="w-4 h-4" /></button>
            <h2 className="text-white font-black uppercase tracking-tighter text-sm italic">Thiết kế: {surveys.find(s => s.id === currentSurveyId)?.name}</h2>
            <button onClick={onMigrateFromOldVersion} className="bg-white/10 text-white border border-white/20 px-3 py-1 rounded-lg font-bold text-[10px] hover:bg-white/20 transition-all">🔄 Nạp từ bản cũ</button>
        </div>
        <div className="flex gap-3">
            <button onClick={onSave} disabled={isSaving} className="bg-yellow-400 text-black px-6 py-2 rounded-xl font-black uppercase text-[10px] hover:scale-105 transition-all disabled:opacity-50">
              {isSaving ? 'Đang lưu...' : 'Lưu sơ đồ'}
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" ref={reactFlowWrapper}>
        <aside className="w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-3 overflow-y-auto">
          <div className="text-[10px] font-black text-gray-400 uppercase mb-2">Thêm khối mới</div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { type: 'questionNode', color: 'orange', label: '❓ CÂU HỎI' },
              { type: 'optionNode', color: 'gray', label: '🔘 ĐÁP ÁN' },
              { type: 'courseNode', color: 'purple', label: '🎓 KHÓA HỌC' },
              { type: 'adviceNode', color: 'blue', label: '💡 TƯ VẤN' }
            ].map(tool => (
              <div key={tool.type} className={`p-3 bg-white border-2 border-${tool.color}-500 rounded-xl cursor-grab active:cursor-grabbing text-${tool.color}-500 text-[10px] font-bold`} onDragStart={(e) => e.dataTransfer.setData('application/reactflow', tool.type)} draggable>
                {tool.label}
              </div>
            ))}
          </div>

          {selectedNode && (
            <div className="mt-8 pt-8 border-t border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] font-black text-gray-400 uppercase">Thuộc tính: {selectedNode.type}</div>
              <textarea className="w-full p-3 text-xs border rounded-xl outline-none focus:ring-2 ring-yellow-400" value={selectedNode.data.label || ''} onChange={(e) => updateNodeData({ label: e.target.value })} rows={4} placeholder="Nhập nội dung..." />
              {selectedNode.type === 'courseNode' && (
                <select className="w-full p-3 text-xs border rounded-xl" value={selectedNode.data.courseId || ''} onChange={(e) => {
                  const course = courses.find(c => c.id === parseInt(e.target.value));
                  updateNodeData({ courseId: parseInt(e.target.value), courseName: course?.name_lop });
                }}>
                  <option value="">-- Chọn khóa học --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name_lop}</option>)}
                </select>
              )}
              <button onClick={() => { setNodes(nds => nds.filter(n => n.id !== selectedNode.id)); setSelectedNode(null); }} className="w-full py-2 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-all">Xóa khối này</button>
            </div>
          )}
        </aside>

        <div className="flex-1 relative">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver} onNodeClick={(_, node) => setSelectedNode(node)} nodeTypes={nodeTypes} fitView>
            <Background color="#ccc" variant={"dots" as any} />
            <Controls />
            <MiniMap />
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
