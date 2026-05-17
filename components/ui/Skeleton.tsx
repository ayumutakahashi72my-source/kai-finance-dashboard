type Variant = 'panel' | 'line-lg' | 'line-md' | 'line-sm' | 'block'

const SIZES: Record<Variant, string> = {
  panel:     'h-24 w-full rounded-[18px]',
  'line-lg': 'h-10 w-2/3 rounded-[8px]',
  'line-md': 'h-4 w-full rounded-[6px]',
  'line-sm': 'h-3 w-1/2 rounded-[5px]',
  block:     'h-16 w-full rounded-[14px]',
}

interface Props {
  variant?: Variant
  className?: string
}

export function Skeleton({ variant = 'line-md', className = '' }: Props) {
  return <div className={`skeleton-shimmer ${SIZES[variant]} ${className}`} />
}
