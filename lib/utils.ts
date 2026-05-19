import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Category } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** セレクト用: 親カテゴリ → その子（インデント付き）の順に並べた flat 配列を返す */
export function sortedCategoryOptions(
  flat: Category[]
): { cat: Category; indent: boolean; parentName?: string }[] {
  const parents  = flat.filter((c) => !c.parent_id)
  const byParent = new Map<string, Category[]>()
  for (const c of flat) {
    if (c.parent_id) {
      const arr = byParent.get(c.parent_id) ?? []
      arr.push(c)
      byParent.set(c.parent_id, arr)
    }
  }
  const result: { cat: Category; indent: boolean; parentName?: string }[] = []
  const added = new Set<string>()
  for (const p of parents) {
    result.push({ cat: p, indent: false })
    added.add(p.id)
    for (const child of byParent.get(p.id) ?? []) {
      result.push({ cat: child, indent: true, parentName: p.name })
      added.add(child.id)
    }
  }
  for (const c of flat) {
    if (!added.has(c.id)) result.push({ cat: c, indent: false })
  }
  return result
}

export function buildCategoryTree(flat: Category[]): Category[] {
  const map = new Map(flat.map((c) => [c.id, { ...c, children: [] as Category[] }]))
  const roots: Category[] = []
  for (const c of map.values()) {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(c)
    } else {
      roots.push(c)
    }
  }
  return roots
}
