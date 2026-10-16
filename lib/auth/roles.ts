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
