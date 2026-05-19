// normalizeKeyword 出力で動作するキーワードルール群。
// KEYWORD_RULES のコピーはこのファイルだけに置く — テストも本番もここから import する。

export type KeywordRule = { patterns: RegExp[]; category: string }

export const KEYWORD_RULES: KeywordRule[] = [
  // ── コンビニ ──
  { patterns: [/7.?eleven|seven|ｾﾌﾞﾝ|セブン|ファミリーマート|familymart|ローソン|lawson|コンビニ|ミニストップ|デイリーヤマザキ|newdays|ニューデイズ/], category: '食費' },
  // ── スーパー ──
  { patterns: [/イオン|aeon|イトーヨーカドー|ito.yokado|西友|seiyu|ライフ|marlife|マルエツ|ベルク|サミット|業務スーパー|コストコ|costco|ヤオコー|yaoko|オーケー|oksupermarket|ピアゴ|ユニー|uny|マックスバリュ|フードワン|ロピア|オオゼキ|東急ストア|サンエー|ミスター\w+/], category: '食費' },
  // ── 外食 ──
  { patterns: [/吉野家|松屋|すき家|マクドナルド|mcdonald|モスバーガー|mosburger|スターバックス|starbucks|ドトール|サイゼリヤ|ガスト|デニーズ|denny|くら寿司|はま寿司|かっぱ寿司|丸亀|marugame|ケンタッキー|kfc|ピザ|pizza|出前館|ubereats|uber.?eats|wolt|menu|出前|デリバリー/], category: '食費' },
  // ── ガソリン ──
  { patterns: [/eneos|出光|idemitsu|コスモ石油|cosmo|昭和シェル|jx|apollostation|apollostation|モービル|エネオス/], category: '交通費' },
  // ── 交通系IC・鉄道・タクシー ──
  { patterns: [/suica|pasmo|icoca|manaca|nimoca|hayakaken|チャージ/], category: '交通費' },
  { patterns: [/東京メトロ|tokyometro|jr|東日本旅客|小田急|odakyu|東急|tokyu|西武|seibu|京急|keikyu|相鉄|sotetsu|京王|keio|タクシー|taxi|駐車場|parking|レンタカー|カーシェア|times|タイムズ|go.?タクシー|didi/], category: '交通費' },
  // ── 日用品・ホームセンター ──
  { patterns: [/マツキヨ|matsukiyo|ウエルシア|welcia|ツルハ|tsuruha|カワチ|kawachi|コーナン|cainz|カインズ|ニトリ|nitori|無印|muji|ダイソー|daiso|セリア|seria|キャンドゥ|cando|スギ薬局|sugi|ドラッグストア|ハンズ|loft|ロフト/], category: '日用品' },
  // ── 光熱費 ──
  { patterns: [/東京電力|tepco|関西電力|kepco|東京ガス|tokyo.?gas|大阪ガス|osaka.?gas|電力|水道局|下水道|九州電力|北海道電力|中部電力|東北電力|四国電力|中国電力/], category: '光熱費' },
  // ── 通信費 ──
  { patterns: [/softbank|ソフトバンク|docomo|ドコモ|\bau\b|楽天モバイル|rakutenmobile|\bntt\b|フレッツ|\bocn\b|\buq\b|ymobile|イーモバイル|povo|ahamo|linemo/], category: '通信費' },
  // ── 娯楽 ──
  { patterns: [/netflix|spotify|amazon.?prime|appletv|apple.?tv|disney|unext|steam|nintendo|ニンテンドー|映画|cinema|toho|bookoff|\bgeo\b|カラオケ|karaoke|tiktok|youtube.?premium|dazn|hulu/], category: '娯楽費' },
  // ── 衣服 ──
  { patterns: [/ユニクロ|uniqlo|\bgu\b|\bzara\b|\bhm\b|しまむら|shimamura|青山|aoyama|abcマート|abcmart|ワークマン|workman|アダストリア|ハニーズ|オルビス/], category: '衣服費' },
  // ── 医療・美容 ──
  { patterns: [/クリニック|clinic|内科|歯科|眼科|整形|病院|hospital|薬局|pharmacy|調剤|スポーツジム|gym|コナミ|konami|エニタイム|anytime|ルネサンス|renaissance/], category: '医療費' },
  // ── 教育 ──
  { patterns: [/公文|kumon|学研|gakken|進研|英会話|スクール|school|塾|juku|cram|ベネッセ|benesse|z会|進学塾/], category: '教育費' },
  // ── 保険 ──
  { patterns: [/保険|insurance|生命保険|損保|共済|日本生命|nipponlife|明治安田|住友生命|第一生命|東京海上|損保ジャパン|au損保/], category: '保険料' },
  // ── 美容 ──
  { patterns: [/美容院|ヘアサロン|hair.?salon|カット|カラー|パーマ|ネイル|nail|エステ|まつ毛|眉毛/], category: '美容費' },
  // ── ECサイト（日用品扱い） ──
  { patterns: [/amazon|楽天|rakuten|yahoo.?ショッピング|ヤフーショッピング|qoo10|メルカリ|mercari|ラクマ|paypayモール/], category: '日用品' },
  // ── 収入 ──
  { patterns: [/給与|賞与|salary|bonus|振込|還付/], category: '収入' },
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
