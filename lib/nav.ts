import type { IconName } from '@/components/kai/shared'

export interface NavItem {
  href: string
  icon: IconName
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/',              icon: 'grid',     label: 'ホーム' },
  { href: '/transactions',  icon: 'list',     label: '収支' },
  { href: '/analytics',     icon: 'barChart', label: '分析' },
  { href: '/summary',       icon: 'sparkle',  label: 'AI' },
]

export const BOTTOM_LEFT: NavItem[] = NAV_ITEMS.slice(0, 2)

export const BOTTOM_RIGHT: NavItem[] = NAV_ITEMS.slice(2)

export const SIDEBAR_NAV: NavItem[] = [
  ...NAV_ITEMS.slice(0, 3),
  { href: '/budget', icon: 'bag', label: '予算' },
  NAV_ITEMS[3],
]

export function isNavActive(
  href: string,
  pathname: string,
  searchParams?: URLSearchParams,
): boolean {
  if (href.includes('?')) {
    const [path, qs] = href.split('?')
    const params = new URLSearchParams(qs)
    if (pathname !== path) return false
    for (const [k, v] of params) {
      if (searchParams?.get(k) !== v) return false
    }
    return true
  }
  return pathname === href
}
