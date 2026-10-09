import 'server-only'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

/** Fuera de /public para que nadie pueda descargarlos sin un pago confirmado. */
const PDF_DIR = path.join(process.cwd(), 'private', 'pdfs')

const resolve = (file: string) => path.join(PDF_DIR, path.basename(file))

export async function pdfExists(file: string) {
  try {
    await access(resolve(file))
    return true
  } catch {
    return false
  }
}

export async function readPdf(file: string) {
  try {
    return await readFile(resolve(file))
  } catch {
    return null
  }
}
