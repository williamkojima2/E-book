'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { track } from '@/lib/tracking'

// The inline pixel script tracks the first PageView; this covers client-side route changes.
export function PixelPageView() {
  const pathname = usePathname()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    track('PageView')
  }, [pathname])
  return null
}

export function PixelPurchase({ orderRef, value }: { orderRef: string; value: number }) {
  useEffect(() => {
    if (!window.fbq) return
    const key = `ls_purchase_${orderRef}`
    try {
      if (window.localStorage.getItem(key)) return
      window.localStorage.setItem(key, '1')
    } catch {}
    // eventID lets Meta deduplicate if the buyer reloads in another browser/tab.
    window.fbq('track', 'Purchase', { value, currency: 'COP', content_name: 'LoteSmart Colombia' }, { eventID: orderRef })
  }, [orderRef, value])
  return null
}
