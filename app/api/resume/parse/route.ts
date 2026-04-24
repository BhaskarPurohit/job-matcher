import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseResume } from '@/lib/parser/resumeParser'

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB

const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

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

  const name = file.name.toLowerCase()
  const typeOk = ACCEPTED_TYPES.has(file.type) || name.endsWith('.pdf') || name.endsWith('.docx')
  if (!typeOk) {
    return NextResponse.json(
      { success: false, error: 'Only PDF and DOCX files are supported' },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, error: 'File size exceeds 4MB limit' },
      { status: 400 }
    )
  }

  try {
    const result = await parseResume(file)
    return NextResponse.json({
      success:    true,
      text:       result.text,
      confidence: result.confidence,
      warnings:   result.warnings,
      fileType:   result.fileType,
    })
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Failed to parse file. Try pasting your resume instead.'
    return NextResponse.json({ success: false, error: message }, { status: 422 })
  }
}
