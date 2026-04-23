import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB — Vercel request body limit

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Parse multipart form
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ success: false, error: 'Only PDF files are supported' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, error: 'File size exceeds 4MB limit' }, { status: 400 })
  }

  // Extract text
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { text } = await pdfParse(buffer)

    const cleaned = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!cleaned || cleaned.length < 50) {
      return NextResponse.json(
        { success: false, error: 'Could not extract text from this PDF. Try copying and pasting your resume instead.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, text: cleaned })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to parse PDF. The file may be scanned or corrupted.' },
      { status: 422 }
    )
  }
}
