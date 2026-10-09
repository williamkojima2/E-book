export const PITCH_TIME_SECONDS = 194
export const PREVIEW_MODE = false

export const VTURB_PLAYER_ID = '6abda8735cd352c8993b9818'
export const VTURB_SCRIPT_SRC = `https://scripts.converteai.net/7f3fcd43-660b-42df-a7ef-1acc8cfb4924/players/${VTURB_PLAYER_ID}/v4/player.js`

export const META_PIXEL_ID = '637178892282743'
export const META_PIXEL_ENABLED = true

export const HOTMART_MAIN_URL = 'https://pay.hotmart.com/G107824701L?checkoutMode=10'
export const HOTMART_SCRATCH_URL = 'https://pay.hotmart.com/G107824701L?off=z1b6dydx&checkoutMode=10'

export const CHECKOUT_MAIN_PATH = '/checkout?offer=main'
export const CHECKOUT_DISCOUNT_PATH = '/checkout?offer=discount'

export const PRICE_MAIN = 34900
export const PRICE_SCRATCH = 24900
export const PRICE_BEFORE = 79900
export const PRICE_BUMP = 9900
export const PRICE_BUMP_BEFORE = 49900

/** Email de soporte mostrado en el pie del checkout. Vacío = no se muestra. */
export const SUPPORT_EMAIL = ''

export const CHECKOUT_CONFIG = {
  processorName: 'XPag',
  productName: 'LoteSmart Colombia',
  bumpName: 'Bonos LoteSmart',
}

export const ACCESS_URL = 'https://lotesmartpremium.vercel.app/'

/** Archivos dentro de private/pdfs/. "bonus" solo se entrega si el cliente compró el order bump. */
export const DELIVERABLE_PDFS = {
  main: { file: 'lotesmart-colombia.pdf', label: 'Bienvenido a LoteSmart Premium (PDF)' },
  bonus: { file: 'bonos-lotesmart.pdf', label: 'Tus 6 Bonos + contraseña de acceso (PDF)' },
} as const
export type PdfKey = keyof typeof DELIVERABLE_PDFS
export const PRODUCTION_URL = 'https://lotesmartx-nu.vercel.app'

/** Número de WhatsApp de soporte con indicativo, solo dígitos. Ej.: "573001234567". */
export const SUPPORT_WHATSAPP = ''

export const DATA_SOURCE_URL = 'https://lotesmartpremium.vercel.app/api/results?scope=full'
export const FREQUENCY_WINDOW = 100
export const EXIT_INTENT_MOBILE_SECONDS = 25
