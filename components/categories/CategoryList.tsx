'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { createCategory, createSubCategory, updateCategory, deleteCategory } from '@/app/actions/categories'
import type { Category } from '@/lib/types'
import { buildCategoryTree } from '@/lib/utils'
import { PencilIcon, Trash2Icon, PlusIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#fb9477', '#22d3ee', '#a78bfa', '#fbbf24',
  '#4ade80', '#f97316', '#fb7185', '#60a5fa',
  '#e879f9', '#8b8ba0',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          className={cn(
            'h-6 w-6 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
            value === c && 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a10]'
          )}
          style={{ backgroundColor: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  )
}

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initial?: Category
  onSave: (name: string, color: string) => void
  isPending: boolean
  error: string | null
}

function CategoryDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSave,
  isPending,
  error,
}: CategoryDialogProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setColor(initial?.color ?? PRESET_COLORS[0])
      setLocalError(null)
    }
  }, [open, initial?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setLocalError('カテゴリ名を入力してください')
      return
    }
    setLocalError(null)
    onSave(name.trim(), color)
  }

  const displayError = localError ?? error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#14161e] border-white/10 text-[#f0f0f5]">
        <DialogHeader>
          <DialogTitle className="text-[#f0f0f5]">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cat-name" className="text-[#8b8ba0] text-xs">
              カテゴリ名
            </Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：食費"
              maxLength={30}
              required
              autoFocus
              className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] placeholder:text-[#5e5e72] focus-visible:border-[#fb9477]/50 focus-visible:ring-[#fb9477]/20"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[#8b8ba0] text-xs">色</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          {displayError && (
            <p className="rounded-lg border border-[#fb7185]/20 bg-[#fb7185]/5 px-3 py-2 text-xs text-[#fb7185]">
              {displayError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 text-[#8b8ba0] hover:text-[#f0f0f5]"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#fb9477] text-[#0a0a10] font-semibold hover:bg-[#fb9477]/90 disabled:opacity-50"
            >
              {isPending ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteConfirmProps {
  cat: Category
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirm({ cat, isPending, onConfirm, onCancel }: DeleteConfirmProps) {
  const hasChildren = (cat.children?.length ?? 0) > 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#8b8ba0]">
        {hasChildren
          ? `${cat.children!.length}件のサブカテゴリが親なしになりますが削除しますか？`
          : '削除しますか？'}
      </span>
      <Button
        size="xs"
        variant="destructive"
        disabled={isPending}
        onClick={onConfirm}
      >
        削除
      </Button>
      <Button
        size="xs"
        variant="ghost"
        onClick={onCancel}
        className="text-[#8b8ba0]"
      >
        キャンセル
      </Button>
    </div>
  )
}

export function CategoryList({ initial, showTitle = true }: { initial: Category[]; showTitle?: boolean }) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [addSubParentId, setAddSubParentId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const roots = buildCategoryTree(initial)

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function handleAdd(name: string, color: string) {
    startTransition(async () => {
      const result = await createCategory({ name, color })
      if (result.success) {
        setAddOpen(false)
        setFormError(null)
        router.refresh()
      } else {
        setFormError(result.message ?? 'エラーが発生しました')
      }
    })
  }

  function handleAddSub(name: string, color: string) {
    if (!addSubParentId) return
    const parentId = addSubParentId
    startTransition(async () => {
      const result = await createSubCategory(parentId, { name, color })
      if (result.success) {
        setAddSubParentId(null)
        setFormError(null)
        router.refresh()
      } else {
        setFormError(result.message ?? 'エラーが発生しました')
      }
    })
  }

  function handleEdit(name: string, color: string) {
    if (!editTarget) return
    const id = editTarget.id
    startTransition(async () => {
      const result = await updateCategory(id, { name, color })
      if (result.success) {
        setEditTarget(null)
        setFormError(null)
        router.refresh()
      } else {
        setFormError(result.message ?? 'エラーが発生しました')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCategory(id)
      setDeleteTargetId(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        {showTitle && <h1 className="text-lg font-semibold text-[#f0f0f5]">カテゴリ管理</h1>}
        <Button
          onClick={() => {
            setFormError(null)
            setAddOpen(true)
          }}
          size="sm"
          className={`bg-[#fb9477] text-[#0a0a10] font-semibold hover:bg-[#fb9477]/90 ${!showTitle ? 'ml-auto' : ''}`}
        >
          <PlusIcon className="h-3.5 w-3.5 mr-1" />
          カテゴリを追加
        </Button>
      </div>

      {roots.length === 0 ? (
        <p className="text-center text-sm text-[#8b8ba0] py-8">カテゴリがありません</p>
      ) : (
        <ul className="space-y-2">
          {roots.map((cat) => {
            const isExpanded = expanded.has(cat.id)
            const hasChildren = (cat.children?.length ?? 0) > 0
            return (
              <li key={cat.id}>
                {/* 親カテゴリ行 */}
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a0a10]/40 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => hasChildren && toggleExpand(cat.id)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                    aria-expanded={isExpanded}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color ?? '#8b8ba0' }}
                    />
                    <span className="flex-1 text-sm text-[#f0f0f5] text-left">{cat.name}</span>
                    {hasChildren && (
                      isExpanded
                        ? <ChevronDownIcon className="h-3.5 w-3.5 text-[#8b8ba0] shrink-0" />
                        : <ChevronRightIcon className="h-3.5 w-3.5 text-[#8b8ba0] shrink-0" />
                    )}
                  </button>

                  {deleteTargetId === cat.id ? (
                    <DeleteConfirm
                      cat={cat}
                      isPending={isPending}
                      onConfirm={() => handleDelete(cat.id)}
                      onCancel={() => setDeleteTargetId(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setFormError(null)
                          setAddSubParentId(cat.id)
                        }}
                        className="text-[#8b8ba0] hover:text-[#f0f0f5] text-[10px] px-1.5"
                      >
                        +サブ
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          setFormError(null)
                          setEditTarget(cat)
                        }}
                        className="text-[#8b8ba0] hover:text-[#f0f0f5]"
                      >
                        <PencilIcon />
                        <span className="sr-only">編集</span>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setDeleteTargetId(cat.id)}
                        className="text-[#8b8ba0] hover:text-[#fb7185]"
                      >
                        <Trash2Icon />
                        <span className="sr-only">削除</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* サブカテゴリ行（展開時のみ） */}
                {isExpanded && hasChildren && (
                  <ul className="mt-1 space-y-1 pl-6">
                    {cat.children!.map((child) => (
                      <li
                        key={child.id}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#0a0a10]/20 px-4 py-2.5"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: child.color ?? '#8b8ba0' }}
                        />
                        <span className="flex-1 text-sm text-[#c4c4d0]">{child.name}</span>

                        {deleteTargetId === child.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#8b8ba0]">削除しますか？</span>
                            <Button
                              size="xs"
                              variant="destructive"
                              disabled={isPending}
                              onClick={() => handleDelete(child.id)}
                            >
                              削除
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setDeleteTargetId(null)}
                              className="text-[#8b8ba0]"
                            >
                              キャンセル
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => {
                                setFormError(null)
                                setEditTarget(child)
                              }}
                              className="text-[#8b8ba0] hover:text-[#f0f0f5]"
                            >
                              <PencilIcon />
                              <span className="sr-only">編集</span>
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setDeleteTargetId(child.id)}
                              className="text-[#8b8ba0] hover:text-[#fb7185]"
                            >
                              <Trash2Icon />
                              <span className="sr-only">削除</span>
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* 親カテゴリ追加ダイアログ */}
      <CategoryDialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o)
          if (!o) setFormError(null)
        }}
        title="カテゴリを追加"
        onSave={handleAdd}
        isPending={isPending}
        error={formError}
      />

      {/* サブカテゴリ追加ダイアログ */}
      <CategoryDialog
        open={addSubParentId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setAddSubParentId(null)
            setFormError(null)
          }
        }}
        title="サブカテゴリを追加"
        onSave={handleAddSub}
        isPending={isPending}
        error={formError}
      />

      {/* 編集ダイアログ */}
      <CategoryDialog
        open={editTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setEditTarget(null)
            setFormError(null)
          }
        }}
        title="カテゴリを編集"
        initial={editTarget ?? undefined}
        onSave={handleEdit}
        isPending={isPending}
        error={formError}
      />
    </>
  )
}
