'use client'

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  getAllSurveys, createSurvey,
  activateSurvey, deleteSurvey,
} from '@/app/actions/roadmap-actions';
import { Loader2, Plus, Trash2, Edit3 } from 'lucide-react';
import MainHeader from '@/components/layout/MainHeader';

// [OPTIMIZE] @xyflow/react (~vài trăm KB) chỉ cần khi thực sự vào chế độ
// thiết kế sơ đồ. Trang danh sách (view mặc định) không cần tải thư viện này.
const RoadmapEditor = dynamic(() => import('@/components/admin/roadmap/RoadmapEditor'), {
  ssr: false,
  loading: () => <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-yellow-400" /></div>,
});

export default function RoadmapBuilder() {
  const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST');
  const [currentSurveyId, setCurrentSurveyId] = useState<number | null>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    loadSurveys();
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

  const handleCreateNew = async () => {
    const name = window.prompt('Nhập tên cho bài khảo sát mới:');
    if (!name) return;
    const res = await createSurvey(name);
    if (res.success) loadSurveys();
  };

  const handleEdit = (survey: any) => {
    setCurrentSurveyId(survey.id);
    setView('EDITOR');
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

  if (isInitializing) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-yellow-400" /></div>;

  if (view === 'EDITOR' && currentSurveyId !== null) {
    return (
      <RoadmapEditor
        surveyId={currentSurveyId}
        surveyName={surveys.find(s => s.id === currentSurveyId)?.name}
        onBack={() => setView('LIST')}
        onSaved={loadSurveys}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="LỘ TRÌNH" toolSlug="roadmap" />
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
}
