import re

with open('app/tools/genealogy/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Clean the duplicate comment if exists
text = text.replace('// Đếm số con trực tiếp của nodeếm số con trực tiếp của node', '// Đếm số con trực tiếp của node')

# 2. Replace countDirectChildren and calculateNodePositions
start_idx = text.find('const countDirectChildren =')
end_str = 'return positions\n}'
end_idx = text.find(end_str, start_idx)
if start_idx != -1 and end_idx != -1:
    end_idx += len(end_str)
    new_layout = """// Hàm đệ quy build D3 Tree object
type D3Node = { id: number; data: GenealogyNode; children: D3Node[] };

const buildD3Tree = (node: GenealogyNode, isFullMode: boolean, currentFocusMap?: Map<number, number>, isParentVisibleAndExpanded: boolean = true): D3Node | null => {
  const isFocusNode = isFullMode || isParentVisibleAndExpanded;
  if (!isFocusNode) return { id: node.id, data: node, children: [] };
  
  let childrenToRender = isFullMode
    ? [...(node.groupA || []), ...(node.groupB || []), ...(node.children || [])]
    : node.children || []
    
  if (childrenToRender) {
    childrenToRender = Array.from(new Map(childrenToRender.map(c => [c.id, c])).values())
  }
  
  const d3Children: D3Node[] = [];
  if (childrenToRender && childrenToRender.length > 0) {
    childrenToRender.forEach(child => {
      const subIsExpanded = isFullMode || (currentFocusMap?.get(node.id) === child.id);
      const childD3Node = buildD3Tree(child as GenealogyNode, isFullMode, currentFocusMap, subIsExpanded);
      if (childD3Node) d3Children.push(childD3Node);
    });
  }
  
  return { id: node.id, data: node, children: d3Children };
}

// Build position map với thuật toán d3-hierarchy chuẩn xác
const calculateNodePositions = (root: GenealogyNode, isFullMode: boolean, currentFocusMap?: Map<number, number>): Map<number, { x: number; y: number }> => {
  const positions = new Map<number, { x: number; y: number }>()
  
  const hierarchyRootObj = buildD3Tree(root, isFullMode, currentFocusMap, true);
  if (!hierarchyRootObj) return positions;

  const rootHierarchy = d3.hierarchy(hierarchyRootObj, d => d.children);
  const treeLayout = d3.tree<D3Node>().nodeSize([NODE_WIDTH + HORIZONTAL_SPACING, VERTICAL_SPACING]);
  treeLayout(rootHierarchy);

  const rootX = rootHierarchy.x || 0;

  rootHierarchy.each(node => {
     positions.set(node.data.id, { x: node.x - rootX, y: node.y });
  });

  return positions;
}"""
    text = text[:start_idx] + new_layout + text[end_idx:]
else:
    print("Could not find countDirectChildren block.")

# 3. Replace GenealogyCard
start_idx = text.find('const GenealogyCard = (props: NodeProps) => {')
end_str = 'const SearchNodeCard = (props: NodeProps) => {'
end_idx = text.find(end_str, start_idx)

if start_idx != -1 and end_idx != -1:
    new_card = """const getLevelColor = (level?: number) => {
  const colors = [
    'from-amber-400 to-orange-500 ring-amber-200 border-amber-600', // Root - Gold/Yellow
    'from-emerald-400 to-teal-500 ring-emerald-200 border-emerald-600', // F1 - Green
    'from-blue-400 to-indigo-500 ring-blue-200 border-blue-600', // F2 - Blue
    'from-violet-400 to-purple-500 ring-violet-200 border-violet-600', // F3 - Purple
    'from-rose-400 to-pink-500 ring-rose-200 border-rose-600' // F4+ - Pink
  ]
  return colors[Math.min(level || 0, colors.length - 1)]
}

const getLevelBadgeColor = (level?: number) => {
  const colors = [
    'bg-amber-500 text-white',
    'bg-emerald-500 text-white',
    'bg-blue-500 text-white',
    'bg-violet-500 text-white',
    'bg-rose-500 text-white'
  ]
  return colors[Math.min(level || 0, colors.length - 1)]
}

const GenealogyCard = (props: NodeProps) => {
  const data = props.data as unknown as GenealogyNode & {
    isRoot?: boolean;
    isSearchTarget?: boolean;
    editMode?: boolean;
    displayMode?: 'default' | 'full';
    level?: number;
    onToggleExpand?: (id: number) => void;
    onOpenGroup?: (type: 'A' | 'B', data: any[], totalSub: number) => void;
    onAddChild?: (parentId: number) => void;
    onDeleteNode?: (nodeId: number) => void;
  }
  
  const hasChildren = data.f1cCount > 0 || data.f1aCount > 0 || data.f1bCount > 0
  const isActuallyRoot = data.isRoot
  const isTarget = data.isSearchTarget
  const isFullMode = data.displayMode === 'full'

  const levelStr = data.level === 0 ? 'ROOT' : `F${data.level || 0}`;

  return (
    <div className={`
      relative flex flex-col items-center justify-center w-[180px]
      ${hasChildren ? 'cursor-pointer' : 'cursor-default'}
      transition-all duration-300 transform group hover:-translate-y-1
    `}>
      {!isActuallyRoot && <Handle type="target" position={Position.Top} className="!opacity-0 !w-full !h-full !absolute pointer-events-none" style={{ top: -10 }} />}

      {/* Avatar Circle Container */}
      <div className={`
        relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg border-2
        bg-gradient-to-br ${getLevelColor(data.level)}
        ${isTarget ? 'ring-4 ring-offset-2 animate-pulse' : ''}
      `}>
        <User className="w-8 h-8 opacity-90" />
        
        {/* Level Badge */}
        <div className={`absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider border-2 border-white shadow-sm whitespace-nowrap ${getLevelBadgeColor(data.level)}`}>
          {levelStr}
        </div>
      </div>
      
      {/* Information Box */}
      <div className="bg-white px-3 pb-3 pt-6 -mt-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 w-full text-center relative z-0 flex flex-col items-center">
        <div className="font-bold text-[13px] text-slate-800 line-clamp-2 leading-tight uppercase mb-1">
          {data.name || 'Học viên'}
        </div>
        <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md mb-2 flex items-center gap-1 w-fit">
          <span>#{data.id}</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="text-emerald-500">TS: {data.totalSubCount || 0}</span>
        </div>

        {/* Edit buttons */}
        {data.editMode && (
          <div className="flex gap-2 w-full justify-center mb-2">
            <button
              onClick={(e) => { e.stopPropagation(); data.onAddChild?.(data.id); }}
              className="flex-1 max-w-[60px] py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-500 hover:text-white transition-colors"
            >
              +F1
            </button>
            {!data.isRoot && (
              <button
                onClick={(e) => { e.stopPropagation(); data.onDeleteNode?.(data.id); }}
                className="w-7 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center"
              >
                X
              </button>
            )}
          </div>
        )}

        {/* Action groups (chỉ hiện khi default mode) */}
        {!isFullMode && (
           <div className="flex justify-between items-center w-full mt-1 gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); if (data.f1aCount > 0) data.onOpenGroup?.('A', data.groupA || [], data.groupATotalSub || 0); }}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border border-white shadow-sm transition-transform ${data.f1aCount > 0 ? 'bg-emerald-100 text-emerald-700 hover:scale-110 cursor-pointer' : 'bg-slate-50 text-slate-300 cursor-default pointer-events-none opacity-50'}`}
              title="F1 Trống (Đã duyệt)"
            >
              {data.f1aCount}
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); if (data.f1cCount > 0) data.onToggleExpand?.(data.id); }}
              className={`flex-1 rounded-2xl flex flex-col items-center justify-center gap-0 text-[10px] h-auto py-1 font-black shadow-sm transition-all ${data.f1cCount > 0 ? (props.selected ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer') : 'bg-slate-50 text-slate-300 cursor-default pointer-events-none opacity-50'}`}
            >
              <User className="w-3 h-3 mb-0" />
              <span>{data.f1cCount}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); if (data.f1bCount > 0) data.onOpenGroup?.('B', data.groupB || [], data.groupBTotalSub || 0); }}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border border-white shadow-sm transition-transform ${data.f1bCount > 0 ? 'bg-sky-100 text-sky-700 hover:scale-110 cursor-pointer' : 'bg-slate-50 text-slate-300 cursor-default pointer-events-none opacity-50'}`}
              title="F1 Cạn (Chưa duyệt)"
            >
              {data.f1bCount}
            </button>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-full !h-full !absolute pointer-events-none" style={{ bottom: -10 }} />
    </div>
  )
}

"""
    text = text[:start_idx] + new_card + text[end_idx:]
else:
    print("Could not find GenealogyCard block.")

# 4. Modify edge styling from smoothstep to step and color
text = text.replace("style: { stroke: '#f43f5e', strokeWidth: 3 },", "style: { stroke: '#0ea5e9', strokeWidth: 2 },")
text = text.replace("type: 'smoothstep'", "type: 'step'")

# 5. Modify generateGraphNodes signatures properly
# Find the exact signature of generateGraphNodes
generate_str = """  const generateGraphNodes = useCallback((
    parent: GenealogyNode,
    px: number,
    py: number,
    actions: any,
    currentFocusMap: Map<number, number>,
    isParentVisibleAndExpanded: boolean = true,
    nodeEditMode?: boolean,
    nodeDisplayMode?: 'default' | 'full',
    positionMap?: Map<number, { x: number; y: number }>"""

generate_str_new = """  const generateGraphNodes = useCallback((
    parent: GenealogyNode,
    px: number,
    py: number,
    actions: any,
    currentFocusMap: Map<number, number>,
    isParentVisibleAndExpanded: boolean = true,
    nodeEditMode?: boolean,
    nodeDisplayMode?: 'default' | 'full',
    positionMap?: Map<number, { x: number; y: number }>,
    level: number = 0"""

if generate_str in text:
    text = text.replace(generate_str, generate_str_new)
else:
    print("Could not find generateGraphNodes signature")

text = text.replace("editMode: nodeEditMode ?? editMode,", "editMode: nodeEditMode ?? editMode,\n          displayMode: nodeDisplayMode ?? displayMode,\n          level,")

text = text.replace("const sub = generateGraphNodes(child, childX, childY, actions, currentFocusMap, subIsExpanded, nodeEditMode, nodeDisplayMode, positionMap)", 
                   "const sub = generateGraphNodes(child, childX, childY, actions, currentFocusMap, subIsExpanded, nodeEditMode, nodeDisplayMode, positionMap, level + 1)")

# 6. Update the usage of `calculateNodePositions` to insert `activeFocusMapRef.current`
calc_usage = "const newMap = calculateNodePositions(fullTree, isFullMode)"
calc_usage_new = "const newMap = calculateNodePositions(fullTree, isFullMode, activeFocusMapRef.current)"

text = text.replace(calc_usage, calc_usage_new)

with open('app/tools/genealogy/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done replacing.")
