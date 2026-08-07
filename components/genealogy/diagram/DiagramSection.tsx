'use client'

import { ReactFlowProvider } from '@xyflow/react'
import DiagramTab from './DiagramTab'

// [OPTIMIZE] Gộp ReactFlowProvider + DiagramTab thành 1 module để next/dynamic
// hoãn tải toàn bộ thư viện @xyflow/react cho tới khi admin thực sự bấm sang
// tab "Sơ đồ" — tab mặc định hiện ra là "Tổng quan" (Dashboard), không cần
// thư viện này.
export default function DiagramSection({
  selectedSystem,
  diagramViewKey,
}: {
  selectedSystem: number | null
  diagramViewKey?: number
}) {
  return (
    <ReactFlowProvider>
      <DiagramTab selectedSystem={selectedSystem} diagramViewKey={diagramViewKey} />
    </ReactFlowProvider>
  )
}
