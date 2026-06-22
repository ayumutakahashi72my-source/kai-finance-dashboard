'use client'

const ICON_EMOJI: Record<string, string> = {
  ShoppingCart: '🛒', Utensils: '🍽️', Pizza: '🍕', Coffee: '☕',
  Wine: '🍷', Beer: '🍺', Soup: '🍱', Salad: '🥗',
  IceCream2: '🍦', Sandwich: '🥪', Apple: '🍎',
  Store: '🏪', ShoppingBasket: '🧺',
  Train: '🚃', Car: '🚗', Bus: '🚌', Bike: '🚲',
  Plane: '✈️', Fuel: '⛽', Truck: '🚚',
  Home: '🏠', Building2: '🏢', Zap: '⚡', Flame: '🔥',
  Droplets: '💧', Wifi: '📶', Smartphone: '📱',
  Heart: '❤️', Stethoscope: '🏥', Pill: '💊',
  Activity: '💓', Dumbbell: '🏋️',
  Package: '📦', Shirt: '👔', ShoppingBag: '🛍️',
  Scissors: '💇', Sparkles: '💄',
  Gamepad2: '🎮', Music: '🎵', Camera: '🎬', Tv: '📺',
  BookOpen: '📖', Headphones: '🎧', Dice1: '🎲',
  Palette: '🎨', Theater: '🎭', Trophy: '🏆', Target: '🎯',
  Users: '👥', Gift: '🎁', PartyPopper: '🎉',
  Receipt: '🧾', Shield: '🛡️', Landmark: '🏛️',
  CreditCard: '💳', Wallet: '💰', Banknote: '💵',
  GraduationCap: '🎓', Library: '📚', PenTool: '✏️',
  Baby: '👶', PawPrint: '🐾', Cat: '🐱', Dog: '🐶',
  Briefcase: '💼', Monitor: '🖥️', MonitorSmartphone: '💻',
  Wrench: '🔧', Settings: '⚙️',
  Star: '⭐', Hash: '#️⃣', Tag: '🏷️', CircleDot: '⚬',
  MapPin: '📍', Sun: '☀️', TrendingUp: '📈',
}

export function CategoryIcon({
  name,
  size = 14,
}: {
  name?: string | null
  size?: number
  color?: string
  strokeWidth?: number
}) {
  if (!name) return null
  const emoji = ICON_EMOJI[name]
  if (!emoji) return null
  return <span style={{ fontSize: size, lineHeight: 1 }}>{emoji}</span>
}

export const LUCIDE_ICON_NAMES_LIST = Object.keys(ICON_EMOJI)
export const LUCIDE_ICON_NAMES = LUCIDE_ICON_NAMES_LIST.join(', ')
