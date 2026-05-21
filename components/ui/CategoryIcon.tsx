'use client'

import {
  ShoppingCart, Utensils, Car, Train, Home, Zap, Droplets,
  Wifi, Smartphone, Heart, Shirt, BookOpen, Gamepad2, Music,
  Coffee, Beer, Dumbbell, Scissors, Baby, GraduationCap,
  Gift, Plane, PawPrint, Wrench, ShoppingBag, CreditCard,
  Banknote, Building2, Sun, Tv, Package, Pizza, Briefcase,
  Landmark, Bus, Bike, Camera, MapPin, Star, type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart, Utensils, Car, Train, Home, Zap, Droplets,
  Wifi, Smartphone, Heart, Shirt, BookOpen, Gamepad2, Music,
  Coffee, Beer, Dumbbell, Scissors, Baby, GraduationCap,
  Gift, Plane, PawPrint, Wrench, ShoppingBag, CreditCard,
  Banknote, Building2, Sun, Tv, Package, Pizza, Briefcase,
  Landmark, Bus, Bike, Camera, MapPin, Star,
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

export const LUCIDE_ICON_NAMES = Object.keys(ICON_MAP).join(', ')
