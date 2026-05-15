const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const EMBED_MODEL = 'voyage-3-lite' // 512次元、日本語対応、最安値

interface VoyageResponse {
  data: Array<{ embedding: number[] }>
}

/**
 * 複数テキストを一括でベクトル化して返す。
 * Voyage AI voyage-3-lite: 512次元、$0.02/1M tokens。
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []

  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) throw new Error('VOYAGE_API_KEY が設定されていません')

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: texts, model: EMBED_MODEL }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Voyage API error ${res.status}: ${body}`)
  }

  const json = (await res.json()) as VoyageResponse
  return json.data.map((d) => d.embedding)
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text])
  return vec
}
