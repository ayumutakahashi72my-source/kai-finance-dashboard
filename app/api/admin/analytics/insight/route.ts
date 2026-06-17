import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import Anthropic from '@anthropic-ai/sdk'
import { getEnvKey } from '@/lib/api-keys'

interface InsightRequest {
  summary: {
    total: number
    hitRate: number
    totalApiCalls: number
    avgLatency: number
    avgConfidence: number
    avgSimilarity: number
  }
  methodBreakdown: Record<string, number>
  cost: {
    totalCostJpy: number
    byFeature: Record<string, number>
  }
  coverage: {
    golden: { rate: number; misses: string[] }
    live: { failedRate: number }
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ requireAdmin: true })
  if (!auth.ok) return auth.response

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI機能が設定されていません' }, { status: 503 })
  }

  const body = (await req.json()) as InsightRequest
  const { summary, methodBreakdown, cost, coverage } = body

  const methodLines = Object.entries(methodBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([m, c]) => `  ${m}: ${c}件 (${summary.total > 0 ? ((c / summary.total) * 100).toFixed(1) : 0}%)`)
    .join('\n')

  const prompt = `AI分類システムの運用データを分析して、日本語で3〜5点の改善インサイトをください。

## 直近の運用データ
- 総分類件数: ${summary.total.toLocaleString()}件
- キャッシュヒット率: ${(summary.hitRate * 100).toFixed(1)}%（高いほどコスト削減）
- API呼び出し合計: ${summary.totalApiCalls.toLocaleString()}回
- 平均レイテンシ: ${summary.avgLatency}ms
- 平均信頼度: ${summary.avgConfidence > 0 ? summary.avgConfidence.toFixed(3) : 'データなし'}
- 平均類似度(vector経路): ${summary.avgSimilarity > 0 ? summary.avgSimilarity.toFixed(3) : 'データなし（vector未使用）'}
- 分類失敗率: ${(coverage.live.failedRate * 100).toFixed(1)}%
- 過去30日コスト: ¥${cost.totalCostJpy.toLocaleString()}

## 分類メソッド内訳
${methodLines || '  データなし'}

## Goldenデータセットカバレッジ
- カバー率: ${(coverage.golden.rate * 100).toFixed(1)}%
- 未カバー店舗: ${coverage.golden.misses.slice(0, 5).join('、') || 'なし'}${coverage.golden.misses.length > 5 ? `（他${coverage.golden.misses.length - 5}件）` : ''}

## 出力形式（必ず守ること）
- 必ず「- 」（ハイフン半角スペース）で始める箇条書きのみ。見出し（#）は使わない
- 良い点は「✓ 」、要対応は「⚠ 」、優先改善は「🔴 」をハイフンの後につける
- 数値を必ず引用して具体的に書く
- 各行に改善アクションを含める`

  const client = new Anthropic({ apiKey: getEnvKey('ANTHROPIC_API_KEY') })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  if (!text) return NextResponse.json({ error: '生成に失敗しました' }, { status: 500 })

  return NextResponse.json({ insight: text })
}
