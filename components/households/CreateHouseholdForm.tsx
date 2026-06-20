'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createHousehold } from '@/app/actions/households'

export function CreateHouseholdForm() {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.set('name', name.trim())

    startTransition(async () => {
      const result = await createHousehold({}, formData)
      if (!result.success) {
        setError(result.errors?.name?.[0] ?? result.message ?? 'エラーが発生しました')
      }
    })
  }

  return (
    <div className="min-h-screen bg-[var(--kai-bg)] flex items-center justify-center px-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#fb9477]/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[#a78bfa]/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="bg-gradient-to-r from-[#fb9477] to-[#22d3ee] bg-clip-text font-mono text-4xl font-bold tracking-tight text-transparent">
            KAI
          </span>
          <p className="mt-2 text-sm text-[var(--kai-text3)]">家計簿管理システム</p>
        </div>

        <div className="rounded-[18px] border border-[var(--kai-border2)] bg-[var(--kai-bg-panel)] p-8 shadow-2xl backdrop-blur-[24px]">
          <h1 className="mb-1 text-lg font-semibold text-[var(--kai-text1)]">世帯を作成</h1>
          <p className="mb-6 text-sm text-[var(--kai-text3)]">
            家計管理をはじめるために、世帯名を設定してください。
          </p>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-[var(--kai-text3)] text-xs">
                世帯名
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="例：田中家"
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="bg-[var(--kai-bg)] border-[var(--kai-border2)] text-[var(--kai-text1)] placeholder:text-[var(--kai-text4)] focus-visible:border-[#fb9477]/50 focus-visible:ring-[#fb9477]/20"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[#fb7185]/20 bg-[#fb7185]/5 px-3 py-2 text-xs text-[#fb7185]">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="w-full bg-[#fb9477] text-[#0a0a10] font-semibold hover:bg-[#fb9477]/90 disabled:opacity-50"
            >
              {isPending ? '作成中…' : '世帯を作成する'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
