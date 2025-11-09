export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  USER: 'USER',
  SALES: 'SALES',
  MARKETING: 'MARKETING',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Map base routes to allowed roles
const routePermissions: Record<string, Role[]> = {
  '/dashboard': [ROLES.SUPER_ADMIN, ROLES.SALES, ROLES.MARKETING],
  '/users': [ROLES.SUPER_ADMIN],
  '/collections': [ROLES.SUPER_ADMIN, ROLES.SALES, ROLES.MARKETING], // Updated to include MARKETING
  '/invoices': [ROLES.SUPER_ADMIN, ROLES.SALES],
  '/invoice-templates': [ROLES.SUPER_ADMIN],
  '/inspections': [ROLES.SUPER_ADMIN, ROLES.SALES],
  '/car-records': [ROLES.SUPER_ADMIN, ROLES.SALES],
  '/companies': [ROLES.SUPER_ADMIN, ROLES.SALES],
  '/port-infos': [ROLES.SUPER_ADMIN, ROLES.SALES],
  '/content': [ROLES.SUPER_ADMIN, ROLES.MARKETING],
  '/settings': [ROLES.SUPER_ADMIN],
  '/analytics': [ROLES.SUPER_ADMIN],
  '/reports': [ROLES.SUPER_ADMIN],
}

export function getBaseRoute(pathname: string): string | null {
  const parts = pathname.split('?')[0].split('#')[0].split('/')
  if (parts.length < 2) return '/'
  return `/${parts[1]}`
}

export function canAccessPath(role: string | undefined, pathname: string): boolean {
  if (!role) return false
  if (role === ROLES.SUPER_ADMIN) return true
  const base = getBaseRoute(pathname)
  if (!base) return false
  const allowed = routePermissions[base]
  if (!allowed) return true // if not mapped, allow
  return allowed.includes(role as Role)
}

export function filterNavByRole<T extends { href: string }>(role: string | undefined, items: T[]): T[] {
  return items.filter((item) => canAccessPath(role, item.href))
}


