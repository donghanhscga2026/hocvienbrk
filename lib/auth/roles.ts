// TEACHER is the canonical teaching role. Keep the old spelling readable until
// the separately reviewed data conversion has completed.
export function normalizeRole<T extends string | null | undefined>(role: T): T {
  return (role === 'INSTRUCTOR' ? 'TEACHER' : role) as T
}

export function normalizeRoles(roles: readonly string[]) {
  return [...new Set(roles.map(normalizeRole))]
}

export function isTeachingRole(role?: string | null) {
  return normalizeRole(role) === 'TEACHER'
}

export function canCreateProfile(role?: string | null) {
  return role === 'ADMIN' || isTeachingRole(role)
}

// An ID alone never grants admin privileges.
export function isHighestAdmin(id: string | number | null | undefined, role?: string | null) {
  return role === 'ADMIN' && ['0', '26', '3773'].includes(String(id))
}

export function isProfileTool(tool: { slug?: string; url: string }) {
  const slug = tool.url.split(/[?#]/)[0].split('/')[2]
  return ['pages', 'page', 'my-site', 'site-profiles', 'landings'].includes(slug || tool.slug || '')
}

// Id các tài khoản root — DUY NHẤT được phân quyền thành viên thành Quản trị (ADMIN).
export const ROOT_ADMIN_IDS = ['0', '3773']

export function isRootAdmin(id: string | number | null | undefined, role?: string | null) {
  return role === 'ADMIN' && ROOT_ADMIN_IDS.includes(String(id))
}

/** Các vai trò "cộng sự" mà Giáo viên/Giảng viên được phép gán cho người trong lớp mình. */
export const COLLABORATOR_ROLES: readonly string[] = ['STUDENT', 'AFFILIATE']

/** Toàn bộ vai trò có thể gán qua UI phân quyền (INSTRUCTOR đã gộp vào TEACHER). */
export const ASSIGNABLE_ROLES: readonly string[] = ['STUDENT', 'TEACHER', 'AFFILIATE', 'DEVELOPER', 'ADMIN']

/**
 * Ma trận phân quyền gán vai trò thành viên — dùng chung cho server action và UI.
 * Trả về danh sách role mà actor được phép gán cho target,
 * hoặc null khi actor không được thay đổi vai trò của target này.
 *
 * - Root (id 0/3773): toàn quyền — duy nhất được gán/thu hồi quyền Quản trị (ADMIN).
 * - Quản trị thường: được gán mọi vai trò TRỪ Quản trị; không được đổi quyền của
 *   người đang là Quản trị (kể cả 2 tài khoản root).
 * - Giáo viên/Giảng viên: chỉ được gán Cộng sự (AFFILIATE) hoặc Thành viên (STUDENT)
 *   cho người đang là Thành viên/Cộng sự. Phạm vi "trong lớp mình" do server kiểm tra thêm.
 */
export function getAssignableRoles(
  actorId: string | number | null | undefined,
  actorRole: string | null | undefined,
  targetId: string | number | null | undefined,
  targetRole: string | null | undefined,
): readonly string[] | null {
  const actorIsRoot = isRootAdmin(actorId, actorRole)
  const actorIsAdmin = actorRole === 'ADMIN'
  const actorIsTeacher = isTeachingRole(actorRole)
  if (!actorIsRoot && !actorIsAdmin && !actorIsTeacher) return null

  // Không ai (trừ root) được đụng vào vai trò của tài khoản root
  if (!actorIsRoot && ROOT_ADMIN_IDS.includes(String(targetId))) return null

  if (actorIsRoot) return ASSIGNABLE_ROLES
  if (actorIsAdmin) {
    // Quản trị thường không được thay đổi vai trò của Quản trị viên khác
    if (targetRole === 'ADMIN') return null
    return ASSIGNABLE_ROLES.filter((r) => r !== 'ADMIN')
  }
  // Giáo viên/Giảng viên: chỉ phân quyền cộng sự — target phải đang là Thành viên/Cộng sự
  if (!COLLABORATOR_ROLES.includes(normalizeRole(targetRole ?? ''))) return null
  return COLLABORATOR_ROLES
}
