// normalizeKeyword 出力で動作するキーワードルール群。
// KEYWORD_RULES のコピーはこのファイルだけに置く — テストも本番もここから import する。

export type KeywordRule = { patterns: RegExp[]; category: string }

export const KEYWORD_RULES: KeywordRule[] = [
  { patterns: [/7.?eleven|seven|ｾﾌﾞﾝ|セブン|ファミリーマート|familymart|ローソン|lawson|コンビニ|ミニストップ|デイリーヤマザキ/], category: '食費' },
  { patterns: [/イオン|aeon|イトーヨーカドー|ito.yokado|西友|seiyu|ライフ|マルエツ|ベルク|サミット|業務スーパー|コストコ|costco/], category: '食費' },
  { patterns: [/吉野家|松屋|すき家|マクドナルド|mcdonald|モスバーガー|mosburger|スターバックス|starbucks|ドトール|サイゼリヤ|ガスト|デニーズ|denny|くら寿司|はま寿司/], category: '食費' },
  { patterns: [/eneos|出光|idemitsu|コスモ石油|cosmo|昭和シェル|jx/], category: '交通費' },
  { patterns: [/suica|pasmo|icoca|manaca|nimoca|hayakaken|チャージ/], category: '交通費' },
  { patterns: [/東京メトロ|tokyometro|jr|東日本旅客|小田急|odakyu|東急|tokyu|西武|seibu|京急|keikyu|相鉄|sotetsu|京王|keio|タクシー|taxi|駐車場|parking|レンタカー|カーシェア/], category: '交通費' },
  { patterns: [/マツキヨ|matsukiyo|ウエルシア|welcia|ツルハ|tsuruha|カワチ|kawachi|コーナン|cainz|カインズ|ニトリ|nitori|無印|muji|ダイソー|daiso|セリア|seria|キャンドゥ|cando/], category: '日用品' },
  { patterns: [/東京電力|tepco|関西電力|kepco|東京ガス|tokyo.?gas|大阪ガス|osaka.?gas|電力|水道局|下水道/], category: '光熱費' },
  { patterns: [/softbank|ソフトバンク|docomo|ドコモ|\bau\b|楽天モバイル|rakutenmobile|\bntt\b|フレッツ|\bocn\b|\buq\b|ymobile/], category: '通信費' },
  { patterns: [/netflix|spotify|amazon.?prime|appletv|disney|unext|steam|nintendo|ニンテンドー|映画|cinema|toho|bookoff|\bgeo\b|カラオケ|karaoke/], category: '娯楽費' },
  { patterns: [/ユニクロ|uniqlo|\bgu\b|\bzara\b|\bhm\b|しまむら|shimamura|青山|aoyama|abcマート|abcmart/], category: '衣服費' },
  { patterns: [/クリニック|clinic|内科|歯科|眼科|整形|病院|hospital|薬局|pharmacy|調剤|スポーツジム|gym|コナミ|konami/], category: '医療費' },
  { patterns: [/公文|kumon|学研|gakken|進研|英会話|スクール|school|塾|juku|cram/], category: '教育費' },
  { patterns: [/amazon|楽天|rakuten|yahoo|ヤフー/], category: '日用品' },
  { patterns: [/給与|賞与|salary|bonus|振込/], category: '収入' },
]

// normalizeKeyword 済みの文字列を受け取りカテゴリ名を返す。マッチなしは null。
export function classifyByKeyword(normalized: string): string | null {
  for (const rule of KEYWORD_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) return rule.category
    }
  }
  return null
}
