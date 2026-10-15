'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { trackPixels } from '@/lib/tracking'

// The inline pixel script tracks the first PageView; this covers client-side route changes.
export function PixelPageView() {
  const pathname = usePathname()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    trackPixels('PageView')
  }, [pathname])
  return null
}
