import type { GenealogyNode } from '@/app/actions/admin-actions'
import * as d3 from 'd3-hierarchy'
import { NODE_WIDTH, HORIZONTAL_SPACING, VERTICAL_SPACING } from './genealogy-constants'

export type D3Node = { id: number; data: GenealogyNode; children: D3Node[] }

export interface MemberDetailInfo {
  show: boolean
  userId: number
  data?: {
    user: any
    tca: any
    enrollment?: any
    systemData?: {
      systemName: string
      level: number | null
      totalPoints: number | null
      personalScore: number
      seq: number | null
      status: string | null
      teamTotalBrkd: number
      teamTotalVnd: number
      joinedAt: Date | string | null
      levelUpdatedAt?: Date | string | null
      teamSize?: number
      upline1?: { id: number; name: string | null } | null
      upline2?: { id: number; name: string | null } | null
      wallet: {
        balance: number
        brkd: number
        voucherBalance: number
        mbvBalance: number
        totalEarned: number
        totalWithdrawn: number
      } | null
    }
  }
  loading: boolean
}

export const buildD3Tree = (
  node: GenealogyNode,
  isFullMode: boolean,
  currentFocusMap?: Map<number, number>,
  isParentVisibleAndExpanded: boolean = true
): D3Node | null => {
  const isFocusNode = isFullMode || isParentVisibleAndExpanded
  if (!isFocusNode) return { id: node.id, data: node, children: [] }

  let childrenToRender = isFullMode
    ? [...(node.groupA || []), ...(node.groupB || []), ...(node.children || [])]
    : node.children || []

  if (childrenToRender) {
    childrenToRender = Array.from(new Map(childrenToRender.map(c => [c.id, c])).values())
  }

  const d3Children: D3Node[] = []
  if (childrenToRender && childrenToRender.length > 0) {
    childrenToRender.forEach(child => {
      const subIsExpanded = isFullMode || (currentFocusMap?.get(node.id) === child.id)
      const childD3Node = buildD3Tree(child as GenealogyNode, isFullMode, currentFocusMap, subIsExpanded)
      if (childD3Node) d3Children.push(childD3Node)
    })
  }

  return { id: node.id, data: node, children: d3Children }
}

export const calculateNodePositions = (
  root: GenealogyNode,
  isFullMode: boolean,
  currentFocusMap?: Map<number, number>
): Map<number, { x: number; y: number }> => {
  const positions = new Map<number, { x: number; y: number }>()

  const hierarchyRootObj = buildD3Tree(root, isFullMode, currentFocusMap, true)
  if (!hierarchyRootObj) return positions

  const rootHierarchy = d3.hierarchy(hierarchyRootObj, d => d.children)
  const treeLayout = d3.tree<D3Node>().nodeSize([NODE_WIDTH + HORIZONTAL_SPACING, VERTICAL_SPACING])
  treeLayout(rootHierarchy)

  const rootX = rootHierarchy.x || 0

  rootHierarchy.each(node => {
    positions.set(node.data.id, { x: (node.x || 0) - rootX, y: node.y || 0 })
  })

  return positions
}

export const filterToActiveTree = (node: GenealogyNode): GenealogyNode | null => {
  const filteredChildren = (node.children || [])
    .map(c => filterToActiveTree(c))
    .filter(Boolean) as GenealogyNode[]

  const filteredGroupA = (node.groupA || [])
    .map(c => filterToActiveTree(c))
    .filter(Boolean) as GenealogyNode[]

  const filteredGroupB = (node.groupB || [])
    .map(c => filterToActiveTree(c))
    .filter(Boolean) as GenealogyNode[]

  const allFilteredChildren = [...filteredChildren, ...filteredGroupA, ...filteredGroupB]

  if (node.personalScore != null && Number(node.personalScore) > 0) {
    return { ...node, children: filteredChildren, groupA: filteredGroupA, groupB: filteredGroupB }
  }

  if (allFilteredChildren.length > 0) {
    return { ...node, children: filteredChildren, groupA: filteredGroupA, groupB: filteredGroupB }
  }

  return null
}

export const getLevelColor = (level?: number, isRoot?: boolean) => {
  if (isRoot) return 'from-red-600 to-red-800 ring-red-300 border-red-900'
  const colors = [
    'from-amber-400 to-orange-500 ring-amber-200 border-amber-600',
    'from-emerald-400 to-teal-500 ring-emerald-200 border-emerald-600',
    'from-blue-400 to-indigo-500 ring-blue-200 border-blue-600',
    'from-violet-400 to-purple-500 ring-violet-200 border-violet-600',
    'from-rose-400 to-pink-500 ring-rose-200 border-rose-600',
  ]
  return colors[Math.min(level || 0, colors.length - 1)]
}

export const getLevelBadgeColor = (level?: number) => {
  const colors = [
    'bg-teal-500 text-white',
    'bg-amber-500 text-white',
    'bg-rose-500 text-white',
    'bg-emerald-500 text-white',
    'bg-sky-500 text-white',
  ]
  return colors[Math.min(level || 0, colors.length - 1)]
}

export const getChucDanhStyle = (chucDanh?: string | null) => {
  if (!chucDanh) return 'bg-white'
  switch (chucDanh.toUpperCase()) {
    case 'C5': return 'bg-orange-400'
    case 'C20': return 'bg-yellow-100'
    case 'DHTT': return 'bg-pink-300'
    default: return 'bg-white'
  }
}
