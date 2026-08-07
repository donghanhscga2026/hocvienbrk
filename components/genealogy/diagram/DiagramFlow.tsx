'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Zap, Search, X } from 'lucide-react'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  getGenealogyTreeAction,
  getGenealogyChildrenAction,
  getSystemTreeAction,
  getSystemChildrenAction,
  searchGenealogyByIdAction,
  getCurrentUserRoleAction,
  createSystemRootAction,
  getMemberDetailsAction,
  getSystemPromotionLogicAction,
  switchSystemPromotionLogicAction,
  getSharingSponsorTreeAction,
  getSystemMemberListAction,
  GenealogyNode,
} from '@/app/actions/admin-actions'
import { Role } from '@prisma/client'
import { nodeTypes } from './GenealogyCard'
import { calculateNodePositions, filterToActiveTree, MemberDetailInfo } from '@/components/genealogy/lib/genealogy-helpers'
import { NODE_WIDTH, NODE_HEIGHT, HORIZONTAL_SPACING, VERTICAL_SPACING } from '@/components/genealogy/lib/genealogy-constants'
import GroupModal, { GroupMember } from '@/components/genealogy/modals/GroupModal'
import MemberDetailsModal from '@/components/genealogy/modals/MemberDetailsModal'
import SlidePanel from '@/components/genealogy/ui/SlidePanel'
import DiagramHeader from './DiagramHeader'
import DiagramToolbar from './DiagramToolbar'
export default function DiagramFlow({ selectedSystem, diagramViewKey }: { selectedSystem: number | null; diagramViewKey?: number }) {
  const { fitView, setCenter } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const [fullTree, setFullTree] = useState<GenealogyNode | null>(null)
  // v8.4.0: State cho filter Active
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false)
  // v8.7.0: State cho "Đội của tôi"
  const [showMyTeamOnly, setShowMyTeamOnly] = useState<boolean>(false)
  const [canToggleMyTeam, setCanToggleMyTeam] = useState<boolean>(true)
  const [showMyTeamCheckbox, setShowMyTeamCheckbox] = useState<boolean>(true)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [promotionLogic, setPromotionLogic] = useState<'A' | 'B'>('B')
  const [switchingLogic, setSwitchingLogic] = useState<boolean>(false)

  // v8.4.0: Computed tree - lọc tại nguồn data khi showActiveOnly thay đổi
  const filteredTree = useMemo(() => {
    if (!fullTree) return null
    if (!showActiveOnly) return fullTree
    return filterToActiveTree(fullTree)
  }, [fullTree, showActiveOnly])
  const [modalData, setModalData] = useState<{ users: GroupMember[], type: 'A' | 'B', totalSub: number } | null>(null)
  const [expandedF2Id, setExpandedF2Id] = useState<number | null>(null)
  const [sharingTreeModal, setSharingTreeModal] = useState<{ show: boolean, userId: number, userName: string | null } | null>(null)
  const [sharingTreeData, setSharingTreeData] = useState<{ totalDescendants: number, flatTree: any[] } | null>(null)
  const [loadingSharingTree, setLoadingSharingTree] = useState(false)
  const [membersListModalOpen, setMembersListModalOpen] = useState(false)
  const [membersList, setMembersList] = useState<any[]>([])
  const [membersListLoading, setMembersListLoading] = useState(false)
  const [membersSort, setMembersSort] = useState<'join' | 'referral' | 'sales' | 'income'>('join')
  const lastExpandedIdRef = useRef<number | null>(null)
  const activeFocusMapRef = useRef<Map<number, number>>(new Map())
  const [isTreeEmpty, setIsTreeEmpty] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [displayMode, setDisplayMode] = useState<'default' | 'full'>('default')
  const focusMapSizeRef = useRef<number>(0)
  // Lưu nodeId vừa được expand để auto-center sau render
  const pendingCenterNodeIdRef = useRef<number | null>(null)
  // Focus Subtree Mode: tạm dùng 1 node làm root, hiển thị toàn bộ cây con
  const [focusedSubtreeNode, setFocusedSubtreeNode] = useState<GenealogyNode | null>(null)
  const [focusedNodeName, setFocusedNodeName] = useState<string | null>(null)

  // Load Promotion Logic configuration when system changes
  useEffect(() => {
    if (selectedSystem) {
      getSystemPromotionLogicAction(selectedSystem).then(res => {
        if (res.success && res.logic) {
          setPromotionLogic(res.logic as 'A' | 'B')
        }
      })
    }
  }, [selectedSystem])

  const handleSwitchPromotionLogic = async (method: 'A' | 'B') => {
    if (!selectedSystem || selectedSystem !== 4) return
    if (switchingLogic) return

    const confirmMsg = `Bạn có chắc chắn muốn chuyển sang ${method === 'A'
      ? 'Phương án A (Real-time thăng cấp & 3 ngày cân nhắc)'
      : 'Phương án B (Daily thăng cấp lúc 00:00 & 24h cân nhắc)'
      }? Hệ thống sẽ tiến hành xóa sạch và tính toán lại toàn bộ dữ liệu từ ngày 02/07/2026.`

    if (!confirm(confirmMsg)) return

    setSwitchingLogic(true)
    try {
      const res = await switchSystemPromotionLogicAction(selectedSystem, method)
      if (res.success) {
        setPromotionLogic(method)
        alert("Đã chuyển đổi phương án và tính toán lại toàn bộ dữ liệu thành công!")
        window.location.reload()
      } else {
        alert("Lỗi: " + (res.error || "Không thể chuyển đổi."))
      }
    } catch (err: any) {
      alert("Lỗi hệ thống: " + err.message)
    } finally {
      setSwitchingLogic(false)
    }
  }

  // Load current user role
  useEffect(() => {
    async function loadUserRole() {
      const result = await getCurrentUserRoleAction()
      console.log('[Genealogy] User role result:', result)
      if (result.success) {
        if (result.role === 'ADMIN') setIsAdmin(true)
        setCurrentUserId(result.userId ?? null)
        console.log('[Genealogy] Current User ID:', result.userId)
      }
    }
    loadUserRole()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const sysInfo = params.get('sysInfo')
      if (sysInfo) {
        alert(`Chào mừng bạn! Bạn đã tham gia vào hệ thống kinh doanh ${sysInfo.toUpperCase()}.`)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])
  const [focusMapVersion, setFocusMapVersion] = useState(0) // trigger re-render

  // Position map cho tree layout (Reingold-Tilford)
  const positionMapRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const [positionVersion, setPositionVersion] = useState(0)
  // Ref đồng bộ displayMode để initTree không bị stale closure khi gọi từ toggle
  const displayModeRef = useRef(displayMode)
  displayModeRef.current = displayMode
  // Ref chặn effect render khi displayMode đang được toggle (đợi fetch xong)
  const displayModeToggleRef = useRef(false)

  // Add F1 and delete node modals
  const [addF1Modal, setAddF1Modal] = useState<{ parentId: number, show: boolean }>({ parentId: 0, show: false })
  const [createRootModal, setCreateRootModal] = useState<{ show: boolean, systemId: number | null }>({ show: false, systemId: null })
  const [deleteNodeModal, setDeleteNodeModal] = useState<{ nodeId: number, show: boolean }>({ nodeId: 0, show: false })

  const [searchInput, setSearchInput] = useState<string>('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false)
  const [searchResult, setSearchResult] = useState<{
    path: { id: number; name: string | null }[];
    targetId: number;
  } | null>(null)

  // Edit and display modes
  const [editMode, setEditMode] = useState<boolean>(false)

  // User list for Add F1 modal
  const [usersList, setUsersList] = useState<{ id: number; name: string | null; email: string | null }[]>([])
  const [userSearch, setUserSearch] = useState<string>('')
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false)

  // v8.5.0: Member Details Modal
  const [memberDetail, setMemberDetail] = useState<MemberDetailInfo>({ show: false, userId: 0, loading: false })

  const handleShowDetails = useCallback(async (userId: number) => {
    setMemberDetail({ show: true, userId, loading: true })
    const res = await getMemberDetailsAction(userId, selectedSystem || undefined)
    if (res.success) {
      setMemberDetail({ show: true, userId, data: { user: res.user, tca: res.tca, systemData: res.systemData || undefined, enrollment: res.enrollment }, loading: false })
    } else {
      setMemberDetail(prev => ({ ...prev, loading: false }))
    }
  }, [selectedSystem])
  const handleShowSharingTree = useCallback(async (userId: number, userName: string | null) => {
    setSharingTreeModal({ show: true, userId, userName })
    setSharingTreeData(null)
    setLoadingSharingTree(true)
    try {
      const res = await getSharingSponsorTreeAction(userId)
      if (res.success && res.flatTree) {
        setSharingTreeData({ totalDescendants: res.totalDescendants || 0, flatTree: res.flatTree })
      } else {
        alert(res.error || 'Lỗi khi tải sơ đồ chia sẻ')
      }
    } catch (e) {
      alert('Lỗi kết nối')
    } finally {
      setLoadingSharingTree(false)
    }
  }, [])

  const mergeSubtree = useCallback((root: GenealogyNode, subtree: GenealogyNode): GenealogyNode => {
    if (root.id === subtree.id) return { ...root, ...subtree }
    if (root.children) {
      return { ...root, children: root.children.map(c => mergeSubtree(c, subtree)) }
    }
    return root
  }, [])

  const getNodePosition = useCallback((tree: GenealogyNode, targetId: number, px: number = 0, py: number = 0, focusMap: Map<number, number> = new Map(), isParentVisibleAndExpanded: boolean = true): { x: number; y: number } | null => {
    if (tree.id === targetId) return { x: px, y: py }

    if (isParentVisibleAndExpanded && tree.children && tree.children.length > 0) {
      for (let i = 0; i < tree.children.length; i++) {
        const child = tree.children[i]
        const childX = px + (i - (tree.children.length - 1) / 2) * 200
        const childY = py + 300
        const subIsExpanded = focusMap.get(tree.id) === child.id
        const pos = getNodePosition(child, targetId, childX, childY, focusMap, subIsExpanded)
        if (pos) return pos
      }
    }
    return null
  }, [])

  const generateGraphNodes = useCallback((
    parent: GenealogyNode,
    px: number,
    py: number,
    actions: any,
    currentFocusMap: Map<number, number>,
    isParentVisibleAndExpanded: boolean = true,
    nodeEditMode?: boolean,
    nodeDisplayMode?: 'default' | 'full',
    positionMap?: Map<number, { x: number; y: number }>,
    level: number = 0
  ) => {
    const resNodes: Node[] = []
    const resEdges: Edge[] = []
    const nodeId = `node-${parent.id}`

    // Xác định vị trí thực tế của node
    let actualX = px
    let actualY = py
    if (positionMap && positionMap.has(parent.id)) {
      const pos = positionMap.get(parent.id)!
      actualX = pos.x
      actualY = pos.y
    }

    // Dành cho ReactFlow xử lý draggable
    const nodePosition = { x: actualX, y: actualY }

    // Tránh duplicate node keys
    if (!resNodes.some(n => n.id === nodeId)) {
      resNodes.push({
        id: nodeId,
        type: 'genealogyCard',
        position: nodePosition,
        draggable: true,
        data: {
          ...parent,
          editMode: nodeEditMode ?? editMode,
          displayMode: nodeDisplayMode ?? displayMode,
          treeDepth: level,   // depth trong cây (0=root) - dùng cho màu avatar
          onToggleExpand: actions.onToggleExpand,
          onFocusSubtree: (id: number, name?: string | null) => {
            setFocusedNodeName(name || null)
            setFocusedSubtreeNode(parent)
            pendingCenterNodeIdRef.current = null
            handleFocusSubtree(id, name)
          },
          onOpenGroup: (type: 'A' | 'B', data: any[], totalSub: number) => setModalData({ users: data as GroupMember[], type, totalSub }),
          onAddChild: (parentId: number) => setAddF1Modal({ parentId, show: true }),
          onDeleteNode: (nodeId: number) => setDeleteNodeModal({ nodeId, show: true }),
          onShowDetails: handleShowDetails,
          onSearchNode: handleSearchNodeClick,
          onShowSharingTree: actions.onShowSharingTree,
          currentUserId: currentUserId
        },
      })
    }

    const isRoot = parent.id === fullTree?.id;
    const isFullMode = (nodeDisplayMode ?? displayMode) === 'full'
    // Full mode: luôn expand tất cả (hiển thị toàn bộ cây)
    // Default mode: chỉ hiển thị khi được click expand
    const isFocusNode = isFullMode || isParentVisibleAndExpanded;

    // Full mode: hiển thị toàn bộ cây từ children (không phân nhóm A/B/C)
    // Default mode: chỉ group C (có F3) là children
    let childrenToRender = isFullMode
      ? [...(parent.groupA || []), ...(parent.groupB || []), ...(parent.children || [])]
      : parent.children

    if (childrenToRender) {
      // Loại bỏ duplicate children để không tạo ra duplicate ReactFlow nodes/edges
      childrenToRender = Array.from(new Map(childrenToRender.map(c => [c.id, c])).values())
    }

    if (isFocusNode && childrenToRender && childrenToRender.length > 0) {
      // Sử dụng positionMap nếu có (Reingold-Tilford)
      childrenToRender.forEach((child, index) => {
        let childX: number, childY: number

        if (positionMap && positionMap.has(child.id)) {
          const pos = positionMap.get(child.id)!
          childX = pos.x
          childY = pos.y
        } else {
          // Fallback: tính khoảng cách dựa trên số lượng children
          const nodeWidth = Math.max(NODE_WIDTH + HORIZONTAL_SPACING, NODE_WIDTH + HORIZONTAL_SPACING * childrenToRender.length)
          childX = px + (index - (childrenToRender.length - 1) / 2) * nodeWidth
          childY = py + VERTICAL_SPACING
        }

        const subIsExpanded = currentFocusMap.get(parent.id) === child.id

        const sub = generateGraphNodes(child, childX, childY, actions, currentFocusMap, subIsExpanded, nodeEditMode, nodeDisplayMode, positionMap, level + 1)
        resNodes.push(...sub.resNodes); resEdges.push(...sub.resEdges)

        // Tránh duplicate edge keys
        const edgeId = `edge-${parent.id}-${child.id}`
        if (!resEdges.some(e => e.id === edgeId)) {
          resEdges.push({
            id: edgeId,
            source: nodeId,
            target: `node-${child.id}`,
            style: { stroke: '#0ea5e9', strokeWidth: 2 },
            type: 'smoothstep'
          })
        }
      })
    }
    return { resNodes, resEdges }
  }, [editMode, displayMode, setAddF1Modal, setDeleteNodeModal, setModalData])

  // Focus Subtree: lấy node đó làm root, expand toàn bộ cây con
  const handleFocusSubtree = useCallback(async (nodeId: number, nodeName?: string | null) => {
    console.log(`[FocusSubtree] Focusing on node #${nodeId}`);
    setLoading(true)
    try {
      let result;
      if (selectedSystem === null || selectedSystem === 0) {
        result = await getGenealogyChildrenAction(nodeId)
      } else {
        result = await getSystemChildrenAction(nodeId, selectedSystem)
      }
      if (result.success && result.tree) {
        setFocusedNodeName(nodeName || `#${nodeId}`)
        pendingCenterNodeIdRef.current = null
        console.log(`[FocusSubtree] Loaded subtree for #${nodeId}, children: ${result.tree.children?.length}`);
      } else {
        console.log(`[FocusSubtree] Failed:`, result.error)
      }
    } catch (e) {
      console.error('[FocusSubtree] Error:', e)
    }
    setLoading(false)
  }, [selectedSystem])

  // Thoát Focus Subtree Mode, quay về cây đầy đủ
  const handleExitFocusSubtree = useCallback(() => {
    setFocusedSubtreeNode(null)
    setFocusedNodeName(null)
    pendingCenterNodeIdRef.current = null
    setFocusMapVersion(v => v + 1)
  }, [])

  const handleToggleExpand = useCallback(async (id: number) => {
    console.log(`[Action] Trigger Toggle Expand for Node #${id}`);
    setLoading(true)
    lastExpandedIdRef.current = id

    try {
      let result;
      if (selectedSystem === null || selectedSystem === 0) {
        result = await getGenealogyChildrenAction(id)
      } else {
        result = await getSystemChildrenAction(id, selectedSystem)
      }
      console.log(`[API] Fetch children for #${id} result:`, result.success ? 'Success' : 'Failed');

      if (result.success && result.tree && fullTree) {
        console.log(`[Tree] FullTree root:`, fullTree.id);

        setFullTree(prev => {
          const updatedTree = mergeSubtree(prev!, result.tree!);
          console.log(`[Tree] Merged, root children count:`, updatedTree.children?.length);
          return { ...updatedTree };
        });

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
          if (activeFocusMapRef.current.get(pId) === id) {
            console.log(`[Focus] Collapsing Node #${id}`);
            activeFocusMapRef.current.delete(pId);
            pendingCenterNodeIdRef.current = null  // Collapse → không center
          } else {
            console.log(`[Focus] Expanding Node #${id}, auto-collapsing siblings`);
            activeFocusMapRef.current.set(pId, id);
            pendingCenterNodeIdRef.current = id  // Đánh dấu center vào node này
          }
          focusMapSizeRef.current = activeFocusMapRef.current.size;
          setFocusMapVersion(v => v + 1);
        }
      } else {
        console.log(`[API] Failed or no tree: fullTree=`, !!fullTree);
      }
    } catch (e) {
      console.error("[Fatal] Error in handleToggleExpand:", e);
    }
    setLoading(false);
  }, [fullTree, mergeSubtree, selectedSystem])

  const handleSearch = useCallback(async (forcedId?: number, forcedSystemId?: number | null, forceLimitAncestors: boolean = false) => {
    const idStr = forcedId ? `#${forcedId}` : searchInput
    const id = parseInt(idStr.replace('#', ''))
    if (isNaN(id)) {
      setSearchError('ID không hợp lệ')
      return
    }
    setSearchError(null)
    setIsSearchMode(true)
    setLoading(true)
    setSearchResult(null)

    try {
      const activeSystemId = forcedSystemId !== undefined ? forcedSystemId : selectedSystem
      const systemIdForSearch = activeSystemId === 0 ? undefined : (activeSystemId ?? undefined)
      console.log('[SEARCH] Searching for ID:', id, 'systemId:', systemIdForSearch)

      // v8.7.0: Nêu là "Đội của tôi" thì chỉ lấy 2 tầng cha. Hỗ trợ forceLimitAncestors khi click vào ô chữ nhật node.
      const limitAncestors = ((forcedId && showMyTeamOnly) || forceLimitAncestors) ? 2 : null
      const result = await searchGenealogyByIdAction(id, systemIdForSearch, limitAncestors)
      console.log('[SEARCH] Result success:', result.success)

      if (result.success && result.mergedTree) {
        // v8.5.0: Dùng mergedTree để hiển thị trọn vẹn (Ancestors + Subtree)
        setFullTree(result.mergedTree as GenealogyNode)
        setIsSearchMode(true)
        setDisplayMode('full')

        if (result.path) {
          setSearchResult({
            path: result.path,
            targetId: result.targetId
          })

          // Xây dựng focus map từ path
          activeFocusMapRef.current = new Map()
          for (let i = 0; i < result.path.length - 1; i++) {
            activeFocusMapRef.current.set(result.path[i].id, result.path[i + 1].id)
          }
          focusMapSizeRef.current = activeFocusMapRef.current.size
          setFocusMapVersion(v => v + 1)
        }

        setError(null)
      } else {
        console.log('[SEARCH] Not found:', result.error)
        setSearchError(result.error || `Không tìm thấy mã #${id}`)
        setIsSearchMode(false)
        setSearchResult(null)
      }
    } catch (e) {
      console.error('[SEARCH] Error:', e)
      setSearchError('Lỗi khi tìm kiếm')
      setIsSearchMode(false)
      setSearchResult(null)
    }
    setLoading(false)
  }, [searchInput, selectedSystem, mergeSubtree, showMyTeamOnly])

  const handleSearchNodeClick = useCallback(async (nodeId: number) => {
    setSearchInput(`#${nodeId}`)
    await handleSearch(nodeId, undefined, true)
  }, [handleSearch])

  const handleSystemChange = useCallback(async (systemId: number | null) => {
    setLoading(true)
    setError(null)
    setIsTreeEmpty(false)
    activeFocusMapRef.current = new Map()
    focusMapSizeRef.current = 0
    setFocusMapVersion(v => v + 1)
    lastExpandedIdRef.current = null
    setIsSearchMode(false)
    setSearchResult(null)
    setFocusedSubtreeNode(null)
    setFocusedNodeName(null)

    // Lấy userId hiện tại và kiểm tra vai trò hệ thống
    const roleResult = await getCurrentUserRoleAction(systemId || undefined)
    const currentUserIdLocal = roleResult.userId || 0
    const isAdminNow = roleResult.success && roleResult.role === Role.ADMIN

    // CẬP NHẬT LOGIC CHECKBOX "ĐỘI CỦA TÔI" THEO QUY TẮC MỚI:
    let shouldShowMyTeamLocal = false
    if (roleResult.success) {
      if (roleResult.isRoot) {
        // 1. Nếu là Root (Admin 0 hoặc Root Hệ thống) -> Ẩn hoàn toàn Checkbox
        setShowMyTeamCheckbox(false)
        setShowMyTeamOnly(false)
        shouldShowMyTeamLocal = false
      } else {
        setShowMyTeamCheckbox(true)
        setShowMyTeamOnly(true)
        shouldShowMyTeamLocal = true // Mặc định là Đội của tôi cho C5 và User thường

        if (roleResult.canViewFull) {
          // Nếu có quyền xem Full (C5 hoặc Admin) -> Cho phép bỏ tích
          setCanToggleMyTeam(true)
        } else {
          // Thành viên thường -> Khóa (disabled)
          setCanToggleMyTeam(false)
        }
      }
    }

    if (shouldShowMyTeamLocal) {
      setSearchInput(`#${currentUserIdLocal}`)
      await handleSearch(currentUserIdLocal, systemId)
      setLoading(false)
      return
    }

    // Tính toán displayMode hợp lý ngay trong hàm để tránh lỗi state cũ
    const intendedDisplayMode = (systemId !== null && systemId !== 0) ? 'full' : 'default'

    try {
      if (systemId === null) {
        setFullTree(null)
      } else if (systemId === 0) {
        // Hệ thống Thành viên - lấy từ user đang đăng nhập
        const result = await getGenealogyTreeAction(currentUserIdLocal)
        if (result.success && result.tree) {
          setFullTree(result.tree)
          setIsTreeEmpty(false)
        } else {
          setFullTree(null)
          setIsTreeEmpty(true)
          alert('Chưa có dữ liệu nhân mạch. Hãy bắt đầu giới thiệu thành viên để xây dựng cây.')
        }
      } else {
        // Hệ thống TCA/KTC - gọi với forceFull theo intendedDisplayMode
        const result = await getSystemTreeAction(systemId, intendedDisplayMode === 'full')
        if (result.success && result.tree) {
          setFullTree(result.tree)
          setIsTreeEmpty(false)
        } else {
          const errMsg = result.error || ''
          // Nếu lỗi là "không tìm thấy root" hoặc "không thuộc hệ thống"
          const isNoRootError = errMsg.includes('root') || errMsg.includes('thuộc')

          if (isAdminNow && isNoRootError) {
            // Admin + hệ thống chưa có root
            setFullTree(null)
            setIsTreeEmpty(true)
            alert('Hệ thống chưa có dữ liệu. Nhấn nút + để tạo cây sơ đồ với bạn làm root.')
          } else if (!isAdminNow) {
            // User thường: nếu không có root hoặc không thuộc hệ thống
            setFullTree(null)
            alert('Bạn chưa tham gia hệ thống đã chọn')
          } else {
            // Admin: Nếu có lỗi khác thì chỉ set null, không alert "chưa tham gia"
            setFullTree(null)
          }
        }
      }
    } catch (e) {
      setFullTree(null)
      setError("Lỗi khi tải dữ liệu")
    }
    setDisplayMode(intendedDisplayMode)
    setLoading(false)
  }, [handleSearch])

  // Sync: when selectedSystem prop changes, trigger internal handler
  const prevSelectedSystemRef = useRef<number | null>(null)
  useEffect(() => {
    if (selectedSystem !== prevSelectedSystemRef.current) {
      prevSelectedSystemRef.current = selectedSystem
      handleSystemChange(selectedSystem)
    }
  }, [selectedSystem, handleSystemChange])

  // v8.8.0: Quay về cây chính (Root Admin -> Full System, User -> My Team)
  const handleResetToRoot = useCallback(async () => {
    if (selectedSystem === null) return
    await handleSystemChange(selectedSystem)
  }, [selectedSystem, handleSystemChange])

  const initTree = useCallback(async (rootId: number = 0) => {
    setLoading(true); setError(null); setIsTreeEmpty(false); activeFocusMapRef.current = new Map(); focusMapSizeRef.current = 0; lastExpandedIdRef.current = null

    let result;
    if (selectedSystem === null) {
      setLoading(false)
      return
    } else if (selectedSystem === 0) {
      result = await getGenealogyTreeAction(rootId)
    } else {
      // Hệ thống TCA/KTC - gọi với forceFull theo displayMode hiện tại (từ ref)
      result = await getSystemTreeAction(selectedSystem, displayModeRef.current === 'full')
    }

    if (result && result.success && result.tree) {
      setFullTree(result.tree)
      setIsTreeEmpty(false)
    } else if (result) {
      // Khi không tìm thấy cây (root không tồn tại)
      setFullTree(null)
      setIsTreeEmpty(true)
      setError(null)
    }
    setLoading(false)
  }, [selectedSystem])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setSearchError(null)
    setIsSearchMode(false)
    setSearchResult(null)
    initTree(0)
  }, [initTree])

  useEffect(() => {
    if (displayModeToggleRef.current) {
      displayModeToggleRef.current = false
      return
    }
    if (filteredTree) {
      const treeToRender = focusedSubtreeNode ?? filteredTree
      if (!treeToRender) return

      const isFocusMode = focusedSubtreeNode !== null
      const isFullMode = isFocusMode || displayMode === 'full'
      try {
        const newMap = calculateNodePositions(treeToRender, isFullMode, activeFocusMapRef.current)
        positionMapRef.current = newMap
        setPositionVersion(v => v + 1)
      } catch (e) {
        console.error('[Tree] Position map error:', e)
      }

      const { resNodes, resEdges } = generateGraphNodes(treeToRender, 0, 0, { onToggleExpand: handleToggleExpand, onFocusSubtree: handleFocusSubtree, onShowDetails: handleShowDetails, onShowSharingTree: handleShowSharingTree }, activeFocusMapRef.current, true, editMode, isFocusMode ? 'full' : displayMode, positionMapRef.current)

      const uniqueNodes = Array.from(new Map(resNodes.map(item => [item.id, item])).values())
      const uniqueEdges = Array.from(new Map(resEdges.map(item => [item.id, item])).values())

      setNodes(uniqueNodes); setEdges(uniqueEdges)

      const centerNodeId = pendingCenterNodeIdRef.current
      if (centerNodeId !== null && positionMapRef.current.has(centerNodeId)) {
        const pos = positionMapRef.current.get(centerNodeId)!
        setTimeout(() => {
          setCenter(pos.x + NODE_WIDTH / 2, pos.y + NODE_HEIGHT * 2, { zoom: 1.2, duration: 600 })
        }, 150)
        pendingCenterNodeIdRef.current = null
      } else {
        setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 200)
        setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 800)
      }
    }
  }, [filteredTree, focusedSubtreeNode, focusMapVersion, generateGraphNodes, handleToggleExpand, setNodes, setEdges, fitView, setCenter, getNodePosition, editMode, displayMode])

  // Fetch users when Add F1 modal opens
  useEffect(() => {
    if (addF1Modal.show && usersList.length === 0) {
      setLoadingUsers(true)
      fetch('/api/admin/users/list')
        .then(res => res.json())
        .then(data => {
          if (data.users) setUsersList(data.users)
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false))
    }
  }, [addF1Modal.show, usersList.length])

  // Fetch users when Create Root modal opens
  useEffect(() => {
    if (createRootModal.show && usersList.length === 0) {
      setLoadingUsers(true)
      fetch('/api/admin/users/list')
        .then(res => res.json())
        .then(data => {
          if (data.users) setUsersList(data.users)
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false))
    }
  }, [createRootModal.show, usersList.length])

  // Filtered users based on search
  const filteredUsers = userSearch.trim()
    ? usersList.filter(u =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      String(u.id).includes(userSearch)
    )
    : usersList

  // Handle add child
  const handleAddChild = async (childId: number) => {
    if (!selectedSystem) return
    try {
      const res = await fetch('/api/system-tree/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onSystem: selectedSystem, parentId: addF1Modal.parentId, childId })
      })
      const data = await res.json()
      if (data.success) {
        setAddF1Modal({ parentId: 0, show: false })
        initTree(0)
      } else {
        alert(data.error || 'Lỗi khi thêm F1')
      }
    } catch (e) {
      alert('Lỗi khi thêm F1')
    }
  }

  // Handle delete node
  const handleDeleteNode = async () => {
    if (!selectedSystem) return
    try {
      const res = await fetch('/api/system-tree/delete-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onSystem: selectedSystem, nodeId: deleteNodeModal.nodeId })
      })
      const data = await res.json()
      if (data.success) {
        setDeleteNodeModal({ nodeId: 0, show: false })
        initTree(0)
      } else {
        alert(data.error || 'Lỗi khi xóa node')
      }
    } catch (e) {
      alert('Lỗi khi xóa node')
    }
  }

  useEffect(() => {
    if (searchResult) {
      setTimeout(() => {
        fitView({ padding: 0.3, duration: 500 })
      }, 100)
    }
  }, [searchResult, fitView])

  const handleMyTeamToggle = useCallback((checked: boolean) => {
    if (!canToggleMyTeam) return
    setShowMyTeamOnly(checked)
    if (checked && currentUserId) {
      setSearchInput(`#${currentUserId}`)
      handleSearch(currentUserId)
    } else if (!checked) {
      handleClearSearch()
    }
  }, [canToggleMyTeam, currentUserId, handleSearch, handleClearSearch, setShowMyTeamOnly])

  const handleToolbarDisplayMode = useCallback((newMode: 'default' | 'full') => {
    displayModeRef.current = newMode
    setDisplayMode(newMode)
    if (selectedSystem !== null && selectedSystem !== 0) {
      displayModeToggleRef.current = true
      setNodes([])
      setEdges([])
      initTree(0)
    }
  }, [selectedSystem, initTree, setNodes, setEdges, setDisplayMode])

  const handleToolbarCreateRoot = useCallback(() => {
    setCreateRootModal({ show: true, systemId: selectedSystem })
  }, [selectedSystem])

  const handleOpenMembersList = useCallback(async () => {
    if (!selectedSystem || selectedSystem === 0) {
      setMembersListModalOpen(true)
      setMembersList([])
      return
    }

    setMembersListModalOpen(true)
    setMembersListLoading(true)
    try {
      const res = await getSystemMemberListAction(selectedSystem)
      if (res.success) {
        setMembersList(res.members || [])
      } else {
        setMembersList([])
        alert(res.error || 'Không tải được danh sách thành viên')
      }
    } catch (error) {
      console.error('Member list error:', error)
      setMembersList([])
    } finally {
      setMembersListLoading(false)
    }
  }, [selectedSystem])

  const sortedMembers = useMemo(() => {
    const list = [...membersList]
    switch (membersSort) {
      case 'referral':
        return list.sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))
      case 'sales':
        return list.sort((a, b) => (b.sales || 0) - (a.sales || 0))
      case 'income':
        return list.sort((a, b) => (b.income || 0) - (a.income || 0))
      case 'join':
      default:
        return list.sort((a, b) => (a.joinOrder || 0) - (b.joinOrder || 0))
    }
  }, [membersList, membersSort])

  useEffect(() => {
    if (diagramViewKey) {
      setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 180)
    }
  }, [diagramViewKey, fitView])

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <DiagramHeader
        selectedSystem={selectedSystem}
        focusedSubtreeNode={focusedSubtreeNode}
        focusedNodeName={focusedNodeName}
        totalMembers={fullTree?.stats?.total ?? fullTree?.totalSubCount ?? 0}
        onExitFocus={handleExitFocusSubtree}
        onResetToRoot={handleResetToRoot}
        onOpenSettings={() => setPanelOpen(true)}
        onOpenMembersList={handleOpenMembersList}
      />

      {error && (
        <div className="bg-red-500 text-white px-4 py-2 text-xs font-bold shrink-0">
          {error}
        </div>
      )}

      {/* Khu vực hiển thị cây */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {loading && nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full h-full text-center bg-slate-50/50 backdrop-blur-sm z-10">
            <Zap className="w-8 h-8 text-rose-500 animate-pulse mb-4 mx-auto" />
            <p className="text-slate-400 font-black text-xs tracking-widest uppercase">
              {selectedSystem !== null ? 'ĐANG TẢI DỮ LIỆU NHÂN MẠCH...' : 'HÃY CHỌN 1 HỆ THỐNG ĐỂ XEM NHÂN MẠCH & NHÂN DUYÊN CỦA BẠN...'}
            </p>
          </div>
        ) : (
          <div className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              defaultEdgeOptions={{ type: 'straight' }}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.1}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#e2e8f0" gap={40} size={1} />
              <Controls className="!bg-white !shadow-xl !rounded-2xl !border-slate-100 !top-4 !left-4 !bottom-auto" />
            </ReactFlow>
            {loading && (
              <div className="absolute top-8 right-8 z-50 bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-slate-200 shadow-xl flex items-center gap-3">
                <div className="h-3 w-3 rounded-full border-2 border-rose-500 border-t-transparent animate-spin"></div>
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter">Updating Tree...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {membersListModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-800">Danh sách thành viên</h2>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sắp xếp theo tiêu chí bạn chọn</p>
              </div>
              <button onClick={() => setMembersListModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {([
                ['join', 'Tham gia'],
                ['referral', 'Top giới thiệu'],
                ['sales', 'Top doanh số'],
                ['income', 'Top thu nhập']
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setMembersSort(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition-all ${membersSort === value ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {membersListLoading ? (
              <div className="flex-1 flex items-center justify-center py-10 text-sm text-slate-400">Đang tải danh sách...</div>
            ) : sortedMembers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-10 text-sm text-slate-400">Chưa có dữ liệu thành viên cho hệ thống này.</div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                {sortedMembers.map((member, index) => (
                  <div key={`${member.id}-${member.joinOrder}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-black shrink-0">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-800 truncate">{member.name}</div>
                        <div className="text-[11px] font-semibold text-slate-400">#{member.id} • Thứ tự tham gia: {member.joinOrder}</div>
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-bold text-slate-600 whitespace-nowrap">
                      <div>Giới thiệu: {member.referralCount ?? 0}</div>
                      <div>Doanh số: {Number(member.sales || 0).toLocaleString('vi-VN')}</div>
                      <div>Thu nhập: {Number(member.income || 0).toLocaleString('vi-VN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setMembersListModalOpen(false)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-black text-sm mt-4 transition-colors">
              Đóng
            </button>
          </div>
        </div>
      )}

      {modalData && (
        <GroupModal
          users={modalData.users}
          type={modalData.type}
          totalSub={modalData.totalSub}
          editMode={editMode}
          onClose={() => { setModalData(null); setExpandedF2Id(null); }}
          onAddChild={(parentId) => setAddF1Modal({ parentId, show: true })}
          onDeleteNode={(nodeId) => setDeleteNodeModal({ nodeId, show: true })}
        />
      )}

      {/* Sharing Tree Modal */}
      {sharingTreeModal?.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-slate-800">Cây chia sẻ của #{sharingTreeModal.userId}</h2>
              <button 
                onClick={() => { setSharingTreeModal(null); setSharingTreeData(null); }} 
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">
              {sharingTreeModal.userName || 'Thành viên'}
            </div>

            {loadingSharingTree ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-slate-400">Đang tải sơ đồ chia sẻ...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <div className="bg-emerald-50 text-emerald-700 rounded-xl p-3 mb-4 text-xs font-bold flex items-center justify-between">
                  <span>TỔNG SỐ THÀNH VIÊN PHÁT TRIỂN:</span>
                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[11px]">
                    {sharingTreeData?.totalDescendants || 0} người
                  </span>
                </div>

                {(!sharingTreeData || sharingTreeData.totalDescendants === 0) ? (
                  <div className="text-center text-slate-400 text-xs py-8 font-medium">
                    Thành viên này chưa phát triển được thành viên nào qua nhân mạch chia sẻ.
                  </div>
                ) : (
                  <div className="space-y-1.5 py-1">
                    {sharingTreeData.flatTree.map((member) => (
                      <div 
                        key={member.userId}
                        className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                        style={{ paddingLeft: `${(member.depth - 1) * 20 + 12}px` }}
                      >
                        {/* Connector line indicator */}
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                        
                        {member.image ? (
                          <img 
                            src={member.image} 
                            alt={member.name} 
                            className="w-6 h-6 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                            {member.name.substring(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-bold text-slate-700 truncate leading-snug">
                            {member.name}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 tracking-tighter leading-none">
                            #{member.userId} • F{member.depth} chia sẻ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={() => { setSharingTreeModal(null); setSharingTreeData(null); }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold mt-4 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* Add F1 Modal */}
      {addF1Modal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">Thêm F1 cho #{addF1Modal.parentId}</h2>
              <button onClick={() => { setAddF1Modal({ parentId: 0, show: false }); setUserSearch(''); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Tìm user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-bold"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              {loadingUsers ? (
                <div className="text-center py-4 text-sm text-gray-400">Đang tải...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-400">Không tìm thấy user</div>
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleAddChild(u.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs">#{u.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{u.name || 'HV'}</div>
                      <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button onClick={() => { setAddF1Modal({ parentId: 0, show: false }); setUserSearch(''); }} className="w-full py-2 bg-gray-200 rounded-lg font-bold mt-3">Đóng</button>
          </div>
        </div>
      )}

      {/* Delete Node Modal */}
      {deleteNodeModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-red-600">Xóa node #{deleteNodeModal.nodeId}</h2>
              <button onClick={() => setDeleteNodeModal({ nodeId: 0, show: false })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">Bạn có chắc chắn muốn xóa node này không?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteNodeModal({ nodeId: 0, show: false })} className="flex-1 py-2 bg-gray-200 rounded-lg font-bold">Hủy</button>
              <button onClick={handleDeleteNode} className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600">Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Root Modal (Admin Only) */}
      {createRootModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-brk-surface w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col border border-brk-outline">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-brk-primary">Khởi tạo hệ thống #{createRootModal.systemId}</h2>
              <button onClick={() => { setCreateRootModal({ show: false, systemId: null }); setUserSearch(''); }} className="p-2 hover:bg-brk-bg rounded-lg transition-colors">
                <X className="w-5 h-5 text-brk-on-surface" />
              </button>
            </div>
            <p className="text-xs text-brk-muted mb-4 font-bold uppercase tracking-tight">Chọn một người dùng để làm Root (gốc) cho hệ thống này.</p>

            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Tìm user theo tên hoặc ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-brk-bg border border-brk-outline text-brk-on-surface rounded-lg text-sm font-bold focus:ring-2 focus:ring-brk-primary outline-none transition-all"
              />
              <Search className="w-4 h-4 text-brk-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar min-h-[200px]">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-6 h-6 border-2 border-brk-primary border-t-transparent animate-spin rounded-full"></div>
                  <span className="text-xs font-bold text-brk-muted">Đang tải danh sách...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-sm text-brk-muted font-bold">Không tìm thấy người dùng phù hợp</div>
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={async () => {
                      if (!createRootModal.systemId) return;
                      setLoading(true);
                      setCreateRootModal({ show: false, systemId: null });
                      const res = await createSystemRootAction(createRootModal.systemId, u.id);
                      if (res.success) {
                        handleSystemChange(createRootModal.systemId);
                      } else {
                        alert(res.error || 'Lỗi khi tạo root');
                        setLoading(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brk-bg border border-transparent hover:border-brk-outline transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-brk-bg text-brk-muted flex items-center justify-center font-black text-sm group-hover:bg-brk-primary group-hover:text-brk-on-primary transition-colors">#{u.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-brk-on-surface truncate">{u.name || 'Thành viên'}</div>
                      <div className="text-[10px] font-bold text-brk-muted truncate uppercase tracking-widest">{u.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-brk-outline mt-2">
              <button
                onClick={() => { setCreateRootModal({ show: false, systemId: null }); setUserSearch(''); }}
                className="w-full py-2.5 bg-brk-bg text-brk-on-surface rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-80 transition-all border border-brk-outline"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Member Details Modal */}
      {memberDetail.show && (
        <MemberDetailsModal info={memberDetail} onClose={() => setMemberDetail(prev => ({ ...prev, show: false }))} selectedSystem={selectedSystem} />
      )}

      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        direction="right"
        title="Bộ lọc & Cài đặt"
      >
        <DiagramToolbar
          showActiveOnly={showActiveOnly}
          setShowActiveOnly={setShowActiveOnly}
          showMyTeamOnly={showMyTeamOnly}
          setShowMyTeamOnly={setShowMyTeamOnly}
          onMyTeamToggle={handleMyTeamToggle}
          showMyTeamCheckbox={showMyTeamCheckbox}
          canToggleMyTeam={canToggleMyTeam}
          displayMode={displayMode}
          setDisplayMode={handleToolbarDisplayMode}
          editMode={editMode}
          setEditMode={setEditMode}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          searchError={searchError}
          onSearch={handleSearch}
          isTreeEmpty={isTreeEmpty}
          selectedSystem={selectedSystem}
          onCreateRoot={handleToolbarCreateRoot}
          isAdmin={isAdmin}
          promotionLogic={promotionLogic}
          switchingLogic={switchingLogic}
          onSwitchLogic={handleSwitchPromotionLogic}
        />
      </SlidePanel>

    </div>
  )
}
