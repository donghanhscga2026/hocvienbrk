import { canTeach, canUseTool, isContentTool, safeToolUrl, toolGroup, wi300ToolName, type PersonalTool, type SpaceNavGroup } from './personal-space'
import { defaultPageTitle } from './default-pages'

// Menu chỉ sắp xếp các công cụ đã được cấp quyền; API vẫn kiểm tra quyền riêng.
export function managementNavigation(role: string, tools: PersonalTool[]): SpaceNavGroup[] {
  const groups: SpaceNavGroup[] = [
    { id: 'home', label: 'Tổng quan', href: '/my-space', icon: 'LayoutGrid', items: [] },
    { id: 'training', label: 'Học tập & Đào tạo', href: '/my-space?tab=learning', icon: 'BookOpen', items: [
      { label: 'Khóa học của tôi', href: '/my-space?tab=learning', icon: 'BookOpen' },
      { label: 'Khóa đã hoàn thành', href: '/my-space?tab=learning&status=completed', icon: 'GraduationCap' },
      { label: 'Đăng ký chờ xử lý', href: '/my-space?tab=learning&status=pending', icon: 'CreditCard' },
      ...(canTeach(role) ? [{ label: 'Tổng quan giảng dạy', href: '/my-space?tab=teaching', icon: 'GraduationCap' }] : []),
    ] },
    { id: 'marketing', label: 'Khách hàng & Marketing', href: '/my-space?tab=teaching', icon: 'ContactRound', items: [] },
    { id: 'website', label: 'Website & Nội dung', href: '/my-space?tab=pages', icon: 'Globe', items: [] },
    { id: 'ecosystem', label: 'Hệ sinh thái Wi', href: '/my-space?tab=affiliate', icon: 'Network', items: role === 'guest' ? [] : [{ label: 'Affiliate', href: '/tools/affiliate', icon: 'Link2' }] },
    { id: 'tools', label: 'Công cụ', href: '/my-space?tab=tools', icon: 'LayoutGrid', items: [] },
    { id: 'settings', label: 'Cài đặt', href: '/my-space?tab=account', icon: 'Settings', items: [{ label: role === 'guest' ? 'Đăng nhập' : 'Tài khoản', href: role === 'guest' ? '/login' : '/account-settings', icon: 'UserRound' }, { label: 'Hỗ trợ', href: '/support', icon: 'LifeBuoy' }] },
  ]
  for (const tool of tools) {
    if (!tool?.isActive || !Array.isArray(tool.roles) || !canUseTool(role, tool.roles) || typeof tool.url !== 'string' || !safeToolUrl(tool.url) || typeof tool.name !== 'string') continue
    const slug = tool.slug || tool.url.split(/[?#]/)[0].split('/')[2]
    const category = toolGroup(tool)
    const groupId = slug === 'wi-projects' || ['members', 'payments'].includes(category) ? 'ecosystem' : isContentTool(tool) ? 'website' : category === 'training' ? 'training' : category === 'marketing' ? 'marketing' : category === 'system' ? 'settings' : 'tools'
    const group = groups.find(item => item.id === groupId)!
    if (!groups.some(item => item.items.some(link => link.href === tool.url))) group.items.push({ label: wi300ToolName(tool), href: tool.url, icon: tool.icon })
  }
  for (const group of groups) if (['marketing', 'website'].includes(group.id) && group.items.length) group.href = group.items[0].href
  return groups.filter(group => ['home', 'training', 'tools', 'settings'].includes(group.id) || group.items.length > 0)
}

export function isManagementRoute(path: string) {
  return (path === '/my-space' || path === '/tools' || path.startsWith('/tools/') || path === '/account-settings' || path === '/my-requests' || path === '/du-an/quan-ly' || path === '/du-an/noi-dung') && path !== '/tools/courses/templates/preview'
}

export type NavigationLocation = { groupId: string; title: string; crumbs: { label: string; href?: string }[]; back: { label: string; href: string } | null }
export function managementLocation(path: string, params: URLSearchParams, groups: SpaceNavGroup[]): NavigationLocation {
  const root = { label: 'Không gian của tôi', href: '/my-space' }
  const courseList = { label: 'Quản lý khóa học', href: '/tools/courses' }
  const courseId = params.get('courseId')
  const courseReturn = courseId && /^\d+$/.test(courseId) && Number.isSafeInteger(Number(courseId)) && Number(courseId) > 0 ? `/tools/courses/new?id=${courseId}&tab=sales` : null
  const exactTool = groups.flatMap(group => group.items.map(item => ({ ...item, groupId: group.id }))).filter(item => item.href.startsWith('/')).sort((a, b) => b.href.split('?')[0].length - a.href.split('?')[0].length).find(item => path === item.href.split('?')[0] || path.startsWith(item.href.split('?')[0] + '/'))
  let groupId = exactTool?.groupId || 'tools'
  let title = exactTool?.label || defaultPageTitle(path) || 'Không gian quản lý'
  let crumbs: NavigationLocation['crumbs'] = [root]
  let back: NavigationLocation['back'] = { label: 'Về Không gian của tôi', href: root.href }
  if (path === '/my-space') {
    const tab = params.get('tab') || 'home'
    groupId = ['learning', 'teaching'].includes(tab) ? 'training' : ['affiliate', 'business'].includes(tab) ? 'ecosystem' : ['account', 'admin'].includes(tab) ? 'settings' : tab === 'pages' ? 'website' : tab === 'home' ? 'home' : 'tools'
    title = tab === 'learning' ? 'Khóa học của tôi' : tab === 'teaching' ? 'Tổng quan giảng dạy' : tab === 'business' ? 'Quản lý dự án' : groups.find(group => group.id === groupId)?.label || 'Không gian của tôi'
    crumbs = tab === 'home' ? [{ label: root.label }] : [root, { label: title }]
    if (tab === 'home') back = null
  } else if (path.startsWith('/tools/courses')) {
    groupId = 'training'; crumbs.push(courseList)
    if (path === '/tools/courses') { title = courseList.label; crumbs[1] = { label: title } }
    else {
      back = { label: 'Về danh sách khóa học', href: courseList.href }
      if (path === '/tools/courses/new') {
        title = params.get('id') ? 'Chi tiết khóa học' : 'Tạo khóa học'
        crumbs.push({ label: title })
      } else {
        title = path.includes('/templates/legacy') ? 'Nhập mẫu nâng cao' : path.includes('/templates') ? 'Thư viện mẫu trang bán' : path.includes('/pages/') ? 'Chỉnh sửa trang bán' : 'Cài đặt khóa học'
        if (courseReturn) { crumbs.push({ label: params.get('name')?.slice(0, 120) || 'Khóa học đang chỉnh sửa', href: courseReturn }); back = { label: 'Về khóa học này', href: courseReturn } }
        crumbs.push({ label: title })
        const libraryCourse = path.match(/^\/tools\/courses\/(\d+)\/lib-access$/)?.[1]
        if (libraryCourse) back = { label: 'Về khóa học này', href: `/tools/courses/new?id=${libraryCourse}` }
      }
    }
  } else if (path.startsWith('/du-an/')) {
    groupId = 'ecosystem'; title = params.get('project') ? 'Quản lý dự án' : path.endsWith('/noi-dung') ? 'Nội dung dự án' : 'Danh sách dự án'
    crumbs.push({ label: 'Dự án', ...(params.get('project') ? { href: '/du-an/quan-ly' } : {}) })
    if (params.get('project')) { crumbs.push({ label: 'Dự án đang chỉnh sửa' }); back = { label: 'Về danh sách dự án', href: '/du-an/quan-ly' } }
    if (path.endsWith('/noi-dung') && params.get('project')) back = { label: 'Về dự án này', href: `/du-an/quan-ly?project=${encodeURIComponent(params.get('project')!)}` }
  } else {
    if (path === '/account-settings') { groupId = 'settings'; title = 'Cài đặt tài khoản' }
    if (path === '/my-requests') { groupId = 'training'; title = 'Yêu cầu của tôi' }
    const parent = exactTool?.href.split('?')[0]
    if (parent && path !== parent) { crumbs.push({ label: exactTool!.label, href: parent }); back = { label: `Về ${exactTool!.label.toLowerCase()}`, href: parent } }
    crumbs.push({ label: title })
  }
  return { groupId, title, crumbs, back }
}
