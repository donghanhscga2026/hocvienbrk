
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

// 1. Node Câu hỏi (Màu cam)
export const QuestionNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-orange-50 border-2 border-orange-500 min-w-[220px]">
      <div className="flex items-start">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-orange-500 text-white mr-2 text-xs shrink-0 mt-1">
          ❓
        </div>
        <div className="ml-2 text-black">
          <div className="text-[10px] font-bold text-orange-500 uppercase">Câu hỏi chính</div>
          <div className="text-sm font-bold leading-tight">{data.label || 'Chưa có nội dung'}</div>
          {data.description && (
            <div className="text-[9px] text-gray-500 mt-1 italic leading-tight border-t border-orange-200 pt-1">
              {data.description}
            </div>
          )}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-500" />
    </div>
  );
});

// 2. Node Đáp án (Màu xám)
export const OptionNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-gray-50 border-2 border-gray-400 min-w-[150px] relative">
      <div className="flex items-center text-black">
        <div className="text-sm font-medium">{data.label || 'Nhập đáp án...'}</div>
      </div>
      
      {/* Cổng Trên/Dưới: Kết nối với Câu hỏi hoặc Đích đến (Màu xám) */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-white border-2" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400 border-white border-2" />
      
      {/* Cổng Trái/Phải: Chuyên dùng để nối ra Khóa học (Màu tím nhạt) */}
      <Handle type="source" position={Position.Left} id="course-left" className="w-3 h-3 bg-purple-400 border-white border-2" />
      <Handle type="source" position={Position.Right} id="course-right" className="w-3 h-3 bg-purple-400 border-white border-2" />
    </div>
  );
});

// 3. Node Khóa học (Màu tím)
export const CourseNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-purple-50 border-2 border-purple-600 min-w-[200px]">
      <div className="flex items-center text-black">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-purple-600 text-white mr-2 text-xs">
          🎓
        </div>
        <div className="ml-2">
          <div className="text-[10px] font-bold text-purple-600 uppercase">Khóa học cấp ra</div>
          <div className="text-sm font-bold">{data.courseName || 'Chọn khóa học...'}</div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-600" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-600" />
    </div>
  );
});

// 4. Node Video/Tư vấn (Màu xanh dương)
export const AdviceNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-50 border-2 border-blue-500 min-w-[200px]">
      <div className="flex items-center text-black">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-500 text-white mr-2 text-xs">
          💡
        </div>
        <div className="ml-2">
          <div className="text-[10px] font-bold text-blue-500 uppercase">Video tư vấn</div>
          <div className="text-sm font-bold truncate max-w-[150px]">{data.label || 'Dán link video...'}</div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  );
});

// 5. Node Đích đến (Màu xanh ngọc) - MỚI
export const FinishNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-emerald-50 border-2 border-emerald-500 min-w-[180px]">
      <div className="flex items-center text-black">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-emerald-500 text-white mr-2 text-xs">
          🏁
        </div>
        <div className="ml-2 text-black">
          <div className="text-[10px] font-bold text-emerald-500 uppercase">Đích đến</div>
          <div className="text-sm font-bold">{data.label || 'Chốt mục tiêu'}</div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-emerald-500" />
    </div>
  );
});

QuestionNode.displayName = 'QuestionNode';
OptionNode.displayName = 'OptionNode';
CourseNode.displayName = 'CourseNode';
AdviceNode.displayName = 'AdviceNode';
FinishNode.displayName = 'FinishNode';
