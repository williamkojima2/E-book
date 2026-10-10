import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Oswald } from 'next/font/google'
import Script from 'next/script'
import { PixelPageView } from '@/components/pixel-events'
import { META_ORIGIN_PARAMS, META_ORIGIN_PIXELS, META_PIXEL_ENABLED, META_PIXEL_ID } from '@/lib/config'
import './globals.css'

// Lee el origen de la URL (o el guardado en la sesión), inicia el pixel general y, si aplica, el del origen,
// y manda el PageView a cada uno con trackSingle.
const pixelBootstrap = `(function(){var o=null;try{var q=new URLSearchParams(location.search),k=${JSON.stringify(
  META_ORIGIN_PARAMS,
)};for(var i=0;i<k.length;i++){if(q.get(k[i])){o=q.get(k[i]);break}}if(o)sessionStorage.setItem('ls_origin',o);else o=sessionStorage.getItem('ls_origin')}catch(e){}var m=${JSON.stringify(
  META_ORIGIN_PIXELS,
)},ids=['${META_PIXEL_ID}'];if(o&&m[o])ids.push(m[o]);window.__lsPixels=ids;for(var j=0;j<ids.length;j++){fbq('init',ids[j]);fbq('trackSingle',ids[j],'PageView')}})();`

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald' })

export const metadata: Metadata = {
  title: 'LoteSmart Colombia — Estadísticas del Baloto, Revancha y Miloto',
  description: 'Revisa el historial oficial del Baloto, la Revancha y el Miloto antes de tu próximo sorteo.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0c',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" className={`${bebas.variable} ${oswald.variable}`}>
      <body className="antialiased">
        {META_PIXEL_ENABLED && (
          // beforeInteractive guarantees fbq exists before hydration effects (InitiateCheckout, Purchase) run,
          // and lets Next place it in <head> without hydration mismatches from injected head scripts.
          <Script
            id="meta-pixel"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');${pixelBootstrap}`,
            }}
          />
        )}
        {children}
        {META_PIXEL_ENABLED && (
          <>
            <PixelPageView />
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                alt=""
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        )}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
