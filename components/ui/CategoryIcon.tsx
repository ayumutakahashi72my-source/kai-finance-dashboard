'use client'

import {
  ShoppingCart, Utensils, Car, Train, Home, Zap, Droplets,
  Wifi, Smartphone, Heart, Shirt, BookOpen, Gamepad2, Music,
  Coffee, Beer, Dumbbell, Scissors, Baby, GraduationCap,
  Gift, Plane, PawPrint, Wrench, ShoppingBag, CreditCard,
  Banknote, Building2, Sun, Tv, Package, Pizza, Briefcase,
  Landmark, Bus, Bike, Camera, MapPin, Star,
  Soup, Wine, Store, ShoppingBasket, Fuel, Truck,
  Flame, Receipt, Shield, Wallet, Headphones, MonitorSmartphone,
  Stethoscope, CircleDot, Tag, Users,
  Activity, Pill, Salad, Apple, IceCream2, Sandwich,
  Palette, Trophy, Target, Dice1,
  Library, PenTool, Settings, Monitor, Cat, Dog,
  Sparkles, Hash, Theater, PartyPopper,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  /* 食・飲 */
  ShoppingCart, Utensils, Pizza, Coffee, Wine, Beer, Soup,
  Salad, IceCream2, Sandwich, Apple, Store, ShoppingBasket,
  /* 交通 */
  Train, Car, Bus, Bike, Plane, Fuel, Truck,
  /* 住居・光熱 */
  Home, Building2, Zap, Flame, Droplets, Wifi, Smartphone,
  /* 医療・健康 */
  Heart, Stethoscope, Pill, Activity, Dumbbell,
  /* 日用品・衣服 */
  Package, Shirt, ShoppingBag, Scissors, Sparkles,
  /* 娯楽・趣味 */
  Gamepad2, Music, Camera, Tv, BookOpen, Headphones,
  Dice1, Palette, Theater, Trophy, Target,
  /* 交際 */
  Users, Gift, PartyPopper,
  /* 固定費・金融 */
  Receipt, Shield, Landmark, CreditCard, Wallet, Banknote,
  /* 教育 */
  GraduationCap, Library, PenTool,
  /* ペット・子育て */
  Baby, PawPrint, Cat, Dog,
  /* 仕事・デジタル */
  Briefcase, Monitor, MonitorSmartphone, Wrench, Settings,
  /* その他 */
  Star, Hash, Tag, CircleDot, MapPin, Sun,
}

export function CategoryIcon({
  name,
  size = 14,
  color,
  strokeWidth = 1.8,
}: {
  name?: string | null
  size?: number
  color?: string
  strokeWidth?: number
}) {
  if (!name) return null
  const Icon = ICON_MAP[name]
  if (!Icon) return null
  return <Icon size={size} strokeWidth={strokeWidth} color={color} />
}

export const LUCIDE_ICON_NAMES_LIST = Object.keys(ICON_MAP)
export const LUCIDE_ICON_NAMES = LUCIDE_ICON_NAMES_LIST.join(', ')
