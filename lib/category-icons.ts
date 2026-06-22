import {
  ShoppingCart,
  Train,
  Package,
  Zap,
  Heart,
  Utensils,
  Gamepad2,
  TrendingUp,
  CircleDot,
  Tv,
  Store,
  ShoppingBasket,
  Scissors,
  Dumbbell,
  Users,
  Shirt,
  Building2,
  Shield,
  BookOpen,
  Plane,
  Tag,
  Wallet,
  Car,
  Coffee,
  Music,
  Baby,
  PawPrint,
  Home,
  Smartphone,
  Wifi,
  Receipt,
  Flame,
  Droplets,
  Landmark,
  Gift,
  CreditCard,
  Truck,
  Bus,
  Bike,
  Pizza,
  Soup,
  Wine,
  ShoppingBag,
  Wrench,
  Stethoscope,
  GraduationCap,
  Camera,
  Headphones,
  MonitorSmartphone,
  Fuel,
  type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  /* ── 食費・飲食 ── */
  食費:              ShoppingCart,
  食料品:            ShoppingCart,
  スーパー:          ShoppingBasket,
  外食:              Utensils,
  レストラン:        Utensils,
  ランチ:            Utensils,
  ディナー:          Utensils,
  ファストフード:    Pizza,
  カフェ:            Coffee,
  コーヒー:          Coffee,
  ドリンク:          Coffee,
  飲食:              Utensils,
  飲み物:            Wine,
  お酒:              Wine,
  コンビニ:          Store,
  弁当:              Soup,

  /* ── 交通・移動 ── */
  交通費:            Train,
  交通:              Train,
  電車:              Train,
  バス:              Bus,
  地下鉄:            Train,
  タクシー:          Car,
  ガソリン:          Fuel,
  ガス代:            Fuel,
  車:                Car,
  駐車場:            Car,
  高速代:            Car,
  自動車:            Car,
  バイク:            Bike,
  自転車:            Bike,
  宅配:              Truck,

  /* ── 住居・住宅 ── */
  住宅:              Home,
  住居:              Home,
  家賃:              Home,
  住居費:            Home,
  マンション:        Building2,
  家:                Home,
  賃料:              Home,
  管理費:            Building2,

  /* ── 光熱費・通信 ── */
  光熱費:            Zap,
  電気代:            Zap,
  電気:              Zap,
  ガス:              Flame,
  水道:              Droplets,
  水道代:            Droplets,
  水道光熱費:        Zap,
  公共料金:          Zap,
  通信費:            Smartphone,
  通信:              Smartphone,
  携帯:              Smartphone,
  スマホ:            Smartphone,
  インターネット:    Wifi,
  'Wi-Fi':           Wifi,
  ネット:            Wifi,
  電話:              Smartphone,

  /* ── 医療・健康 ── */
  '医療・健康':      Heart,
  医療費:            Stethoscope,
  医療:              Stethoscope,
  病院:              Stethoscope,
  歯科:              Stethoscope,
  健康:              Heart,
  薬局:              Heart,
  薬:                Heart,
  ドラッグストア:    Heart,

  /* ── 日用品・生活 ── */
  日用品:            Package,
  雑費:              Package,
  生活用品:          Package,
  消耗品:            Package,
  掃除用品:          Package,
  洗剤:              Package,

  /* ── 衣服・美容 ── */
  被服費:            Shirt,
  衣服:              Shirt,
  洋服:              Shirt,
  ファッション:      ShoppingBag,
  アクセサリー:      ShoppingBag,
  美容院:            Scissors,
  美容:              Scissors,
  ヘアサロン:        Scissors,
  美容室:            Scissors,
  化粧品:            Scissors,

  /* ── 娯楽・趣味 ── */
  娯楽:              Gamepad2,
  ゲーム:            Gamepad2,
  趣味:              Gamepad2,
  音楽:              Music,
  ライブ:            Music,
  映画:              Camera,
  動画:              Tv,
  サブスク:          Tv,
  サブスクリプション: Tv,
  動画配信:          Tv,
  Netflix:           Tv,
  YouTube:           Tv,
  本:                BookOpen,
  書籍:              BookOpen,
  漫画:              BookOpen,
  電子書籍:          Headphones,
  旅行:              Plane,
  旅行費:            Plane,
  宿泊:              Plane,
  ホテル:            Plane,

  /* ── 交際・付き合い ── */
  交際費:            Users,
  飲み会:            Users,
  会食:              Users,
  プレゼント:        Gift,
  贈り物:            Gift,
  慶弔費:            Gift,

  /* ── 固定費・保険 ── */
  固定費:            Receipt,
  保険:              Shield,
  生命保険:          Shield,
  医療保険:          Shield,
  損害保険:          Shield,
  年金:              Landmark,
  税金:              Landmark,
  住民税:            Landmark,
  所得税:            Landmark,

  /* ── 教育・自己投資 ── */
  教育:              GraduationCap,
  教育費:            GraduationCap,
  学費:              GraduationCap,
  習い事:            GraduationCap,
  塾:                GraduationCap,
  資格:              GraduationCap,

  /* ── 仕事・デジタル ── */
  ジム:              Dumbbell,
  スポーツ:          Dumbbell,
  フィットネス:      Dumbbell,
  会費:              CreditCard,
  サービス:          CreditCard,
  サポート:          Wrench,
  修理:              Wrench,
  デジタル:          MonitorSmartphone,

  /* ── 子育て・ペット ── */
  子育て:            Baby,
  育児:              Baby,
  おもちゃ:          Baby,
  ペット:            PawPrint,
  ペット用品:        PawPrint,

  /* ── 収入 ── */
  収入:              TrendingUp,
  給料:              Wallet,
  給与:              Wallet,
  副収入:            Wallet,
  ボーナス:          Wallet,
  賞与:              Wallet,
  報酬:              Wallet,

  /* ── フォールバック ── */
  その他:            CircleDot,
}

const ICON_NAME_MAP: Record<string, string> = {
  食費: 'ShoppingCart', 食料品: 'ShoppingCart', スーパー: 'ShoppingBasket',
  外食: 'Utensils', レストラン: 'Utensils', ランチ: 'Utensils', ディナー: 'Utensils',
  ファストフード: 'Pizza', カフェ: 'Coffee', コーヒー: 'Coffee', ドリンク: 'Coffee',
  飲食: 'Utensils', 飲み物: 'Wine', お酒: 'Wine', コンビニ: 'Store', 弁当: 'Soup',
  交通費: 'Train', 交通: 'Train', 電車: 'Train', バス: 'Bus', 地下鉄: 'Train',
  タクシー: 'Car', ガソリン: 'Fuel', ガス代: 'Fuel', 車: 'Car', 駐車場: 'Car',
  高速代: 'Car', 自動車: 'Car', バイク: 'Bike', 自転車: 'Bike', 宅配: 'Truck',
  住宅: 'Home', 住居: 'Home', 家賃: 'Home', 住居費: 'Home', マンション: 'Building2',
  家: 'Home', 賃料: 'Home', 管理費: 'Building2',
  光熱費: 'Zap', 電気代: 'Zap', 電気: 'Zap', ガス: 'Flame', 水道: 'Droplets',
  水道代: 'Droplets', 水道光熱費: 'Zap', 公共料金: 'Zap',
  通信費: 'Smartphone', 通信: 'Smartphone', 携帯: 'Smartphone', スマホ: 'Smartphone',
  インターネット: 'Wifi', 'Wi-Fi': 'Wifi', ネット: 'Wifi', 電話: 'Smartphone',
  '医療・健康': 'Heart', 医療費: 'Stethoscope', 医療: 'Stethoscope', 病院: 'Stethoscope',
  歯科: 'Stethoscope', 健康: 'Heart', 薬局: 'Pill', 薬: 'Pill', ドラッグストア: 'Pill',
  日用品: 'Package', 雑費: 'Package', 生活用品: 'Package', 消耗品: 'Package',
  掃除用品: 'Package', 洗剤: 'Package',
  被服費: 'Shirt', 衣服: 'Shirt', 洋服: 'Shirt', ファッション: 'ShoppingBag',
  アクセサリー: 'ShoppingBag', 美容院: 'Scissors', 美容: 'Scissors',
  ヘアサロン: 'Scissors', 美容室: 'Scissors', 化粧品: 'Sparkles',
  娯楽: 'Gamepad2', ゲーム: 'Gamepad2', 趣味: 'Gamepad2', 音楽: 'Music',
  ライブ: 'Music', 映画: 'Camera', 動画: 'Tv', サブスク: 'Tv',
  サブスクリプション: 'Tv', 動画配信: 'Tv', Netflix: 'Tv', YouTube: 'Tv',
  本: 'BookOpen', 書籍: 'BookOpen', 漫画: 'BookOpen', 電子書籍: 'Headphones',
  旅行: 'Plane', 旅行費: 'Plane', 宿泊: 'Plane', ホテル: 'Plane',
  交際費: 'Users', 飲み会: 'Users', 会食: 'Users',
  プレゼント: 'Gift', 贈り物: 'Gift', 慶弔費: 'Gift',
  固定費: 'Receipt', 保険: 'Shield', 生命保険: 'Shield', 医療保険: 'Shield',
  損害保険: 'Shield', 年金: 'Landmark', 税金: 'Landmark', 住民税: 'Landmark',
  所得税: 'Landmark',
  教育: 'GraduationCap', 教育費: 'GraduationCap', 学費: 'GraduationCap',
  習い事: 'GraduationCap', 塾: 'GraduationCap', 資格: 'GraduationCap',
  ジム: 'Dumbbell', スポーツ: 'Dumbbell', フィットネス: 'Dumbbell',
  会費: 'CreditCard', サービス: 'CreditCard', サポート: 'Wrench', 修理: 'Wrench',
  デジタル: 'MonitorSmartphone',
  子育て: 'Baby', 育児: 'Baby', おもちゃ: 'Baby',
  ペット: 'PawPrint', ペット用品: 'PawPrint',
  収入: 'Star', 給料: 'Wallet', 給与: 'Wallet', 副収入: 'Wallet',
  ボーナス: 'Wallet', 賞与: 'Wallet', 報酬: 'Wallet',
  その他: 'CircleDot',
}

export function resolveIconName(categoryName: string): string | null {
  if (ICON_NAME_MAP[categoryName]) return ICON_NAME_MAP[categoryName]

  if (categoryName.includes('食') || categoryName.includes('飲')) return 'Utensils'
  if (categoryName.includes('交通') || categoryName.includes('電車')) return 'Train'
  if (categoryName.includes('車') || categoryName.includes('ガソリン')) return 'Car'
  if (categoryName.includes('住') || categoryName.includes('家賃')) return 'Home'
  if (categoryName.includes('通信') || categoryName.includes('携帯')) return 'Smartphone'
  if (categoryName.includes('光熱') || categoryName.includes('電気')) return 'Zap'
  if (categoryName.includes('医') || categoryName.includes('健康')) return 'Heart'
  if (categoryName.includes('保険')) return 'Shield'
  if (categoryName.includes('教育') || categoryName.includes('学')) return 'GraduationCap'
  if (categoryName.includes('旅')) return 'Plane'
  if (categoryName.includes('娯楽') || categoryName.includes('趣味')) return 'Gamepad2'
  if (categoryName.includes('美容')) return 'Scissors'
  if (categoryName.includes('衣') || categoryName.includes('服')) return 'Shirt'
  if (categoryName.includes('税') || categoryName.includes('年金')) return 'Landmark'
  if (categoryName.includes('固定') || categoryName.includes('月額')) return 'Receipt'
  if (categoryName.includes('ペット')) return 'PawPrint'
  if (categoryName.includes('子') || categoryName.includes('育')) return 'Baby'

  return null
}

export function getCategoryIcon(categoryName: string): LucideIcon {
  if (MAP[categoryName]) return MAP[categoryName]

  /* 部分一致フォールバック */
  const lower = categoryName
  if (lower.includes('食') || lower.includes('飲'))  return Utensils
  if (lower.includes('交通') || lower.includes('電車')) return Train
  if (lower.includes('車') || lower.includes('ガソリン')) return Car
  if (lower.includes('住') || lower.includes('家賃')) return Home
  if (lower.includes('通信') || lower.includes('携帯')) return Smartphone
  if (lower.includes('光熱') || lower.includes('電気')) return Zap
  if (lower.includes('医') || lower.includes('健康')) return Heart
  if (lower.includes('保険'))                          return Shield
  if (lower.includes('教育') || lower.includes('学'))  return GraduationCap
  if (lower.includes('旅'))                            return Plane
  if (lower.includes('娯楽') || lower.includes('趣味')) return Gamepad2
  if (lower.includes('美容'))                          return Scissors
  if (lower.includes('衣') || lower.includes('服'))    return Shirt
  if (lower.includes('税') || lower.includes('年金'))  return Landmark
  if (lower.includes('固定') || lower.includes('月額')) return Receipt
  if (lower.includes('ペット'))                        return PawPrint
  if (lower.includes('子') || lower.includes('育'))    return Baby

  return Tag
}
