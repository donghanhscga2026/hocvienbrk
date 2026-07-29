'use client'

import DiagramFlow from './DiagramFlow'

export default function DiagramTab({ selectedSystem, diagramViewKey }: { selectedSystem: number | null; diagramViewKey?: number }) {
  return <DiagramFlow selectedSystem={selectedSystem} diagramViewKey={diagramViewKey} />
}
