'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { purchaseCustomData, purchaseEvents } from '@/lib/meta'
import type { Offer } from '@/lib/pricing'
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

/** Un Purchase por producto, con el mismo eventID que envía el webhook por CAPI para que Meta deduplique. */
export function PixelPurchase({ paymentId, offer, bump }: { paymentId: string; offer: Offer; bump: boolean }) {
  useEffect(() => {
    for (const event of purchaseEvents(paymentId, offer, bump)) {
      const key = `ls_${event.eventId}`
      try {
        if (window.localStorage.getItem(key)) continue
        window.localStorage.setItem(key, '1')
      } catch {}
      trackPixels('Purchase', purchaseCustomData(event), event.eventId)
    }
  }, [paymentId, offer, bump])
  return null
}
