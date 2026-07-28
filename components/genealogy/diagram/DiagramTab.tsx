'use client'

import DiagramFlow from './DiagramFlow'

export default function DiagramTab({ selectedSystem }: { selectedSystem: number | null }) {
  return <DiagramFlow selectedSystem={selectedSystem} />
}
