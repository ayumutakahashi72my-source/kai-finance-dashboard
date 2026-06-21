export const FIXED_CATEGORY_KEYWORDS = [
  '光熱', '水道', '電気', 'ガス', '住居', '家賃', '通信', '保険',
  '食費', '食料', '日用品', 'ローン', '教育', '医療',
]

export const FIXED_PAYEE_KEYWORDS = [
  '電気', '電力', 'でんき',
  'ガス',
  '水道',
  '光熱',
  '家賃', '賃料', '管理費', '共益費',
  '保険', '生命保険', '損保',
  '通信', '携帯', 'ドコモ', 'ソフトバンク', '楽天モバイル',
  'インターネット', 'フレッツ', 'NURO',
  'NHK', '受信料',
  'スーパー', 'イオン', 'ライフ', 'マルエツ', 'オーケー', '西友', 'コープ', '生協', 'マックスバリュ',
  'ローン', '返済',
  '駐車場', '月極',
  'ジム', 'フィットネス',
  '新聞',
]

export function matchesFixedPayee(payee: string): boolean {
  const lower = payee.toLowerCase()
  return FIXED_PAYEE_KEYWORDS.some((kw) => {
    const kwLower = kw.toLowerCase()
    if (kwLower.length <= 2) {
      const re = new RegExp(`(^|[^a-z])${kwLower}([^a-z]|$)`)
      return re.test(lower)
    }
    return lower.includes(kwLower)
  })
}

export function matchesFixedCategory(catName: string): boolean {
  return FIXED_CATEGORY_KEYWORDS.some((kw) => catName.includes(kw))
}

export function threeMonthsAgoDate(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 3)
  return d.toISOString().slice(0, 10)
}
