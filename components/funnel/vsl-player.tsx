'use client'

import { createElement, useEffect } from 'react'
import { VTURB_PLAYER_ID, VTURB_SCRIPT_SRC } from '@/lib/config'

type SmartplayerWindow = Window & {
  smartplayer?: { instances?: Array<{ video?: HTMLVideoElement }> }
}

export function VslPlayer({ onTime }: { onTime: (seconds: number) => void }) {
  useEffect(() => {
    if (!document.querySelector(`script[src="${VTURB_SCRIPT_SRC}"]`)) {
      const script = document.createElement('script')
      script.src = VTURB_SCRIPT_SRC
      script.async = true
      document.head.appendChild(script)
    }

    // VTurb no expone un evento de tiempo estable; leemos el <video> del player cada segundo.
    const interval = window.setInterval(() => {
      const video =
        (window as SmartplayerWindow).smartplayer?.instances?.[0]?.video ??
        document.querySelector<HTMLVideoElement>(`#vid-${VTURB_PLAYER_ID} video`)
      if (video && Number.isFinite(video.currentTime)) onTime(video.currentTime)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [onTime])

  return (
    <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl border border-line bg-black">
      {createElement(
        'vturb-smartplayer',
        {
          id: `vid-${VTURB_PLAYER_ID}`,
          style: { display: 'block', margin: '0 auto', width: '100%', maxWidth: '400px' },
        },
        <div
          className="vturb-player-placeholder"
          style={{ position: 'relative', width: '100%', padding: '177.77777777777777% 0 0', zIndex: 0, backgroundColor: 'black' }}
        />,
      )}
    </div>
  )
}
