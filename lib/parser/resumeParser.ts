// ─────────────────────────────────────────────────────────────────────────────
// Resume parser — PDF (via unpdf) + DOCX (via mammoth)
// Returns structured result with confidence scoring and human-readable warnings.
// ─────────────────────────────────────────────────────────────────────────────

import { extractText, getDocumentProxy } from 'unpdf'

// Lazy-require mammoth so the WASM pdf bundle isn't bloated on non-DOCX paths
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getMammoth = () => require('mammoth') as typeof import('mammoth')

export type ParseConfidence = 'high' | 'medium' | 'low'
export type FileType = 'pdf' | 'docx'

export interface ParseResult {
  text:       string
  confidence: ParseConfidence
  warnings:   string[]
  fileType:   FileType
}

// ─── Text cleaning ────────────────────────────────────────────────────────────

const LIGATURES: [RegExp, string][] = [
  [/ﬁ/g, 'fi'],
  [/ﬂ/g, 'fl'],
  [/ﬀ/g, 'ff'],
  [/ﬃ/g, 'ffi'],
  [/ﬄ/g, 'ffl'],
  [/ﬅ/g, 'st'],
  [/ﬆ/g, 'st'],
]

const SMART_QUOTES: [RegExp, string][] = [
  [/[\u2018\u2019\u201A\u201B]/g, "'"],  // curly single quotes
  [/[\u201C\u201D\u201E\u201F]/g, '"'],  // curly double quotes
  [/\u2013/g, '-'],                       // en dash
  [/\u2014/g, '--'],                      // em dash
  [/\u2026/g, '...'],                     // ellipsis
  [/\u00A0/g, ' '],                       // non-breaking space
]

// Standalone page numbers: a line that is only digits (possibly with whitespace)
const PAGE_NUMBER_LINE = /^\s*\d{1,3}\s*$/

export function cleanText(raw: string): string {
  let text = raw

  // Normalise line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Fix ligatures
  for (const [pattern, replacement] of LIGATURES) {
    text = text.replace(pattern, replacement)
  }

  // Fix smart quotes / dashes
  for (const [pattern, replacement] of SMART_QUOTES) {
    text = text.replace(pattern, replacement)
  }

  // Remove standalone page-number lines
  const lines = text.split('\n')
  const filtered = lines.filter((line) => !PAGE_NUMBER_LINE.test(line))

  // Trim each line
  const trimmed = filtered.map((l) => l.trimEnd())

  // Collapse 3+ consecutive blank lines into 2
  text = trimmed.join('\n').replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

// ─── Confidence detection ─────────────────────────────────────────────────────

export function detectConfidence(text: string): ParseConfidence {
  if (text.length < 200) return 'low'

  const lines      = text.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return 'low'

  const shortLines = lines.filter((l) => l.trim().length < 10)
  const shortRatio = shortLines.length / lines.length

  if (shortRatio > 0.30) return 'medium'
  return 'high'
}

// ─── PDF parser ───────────────────────────────────────────────────────────────

async function parsePDF(buffer: Uint8Array): Promise<ParseResult> {
  const warnings: string[] = []

  let rawText: string
  try {
    const pdf = await getDocumentProxy(buffer)
    const { text } = await extractText(pdf, { mergePages: true })
    rawText = Array.isArray(text) ? text.join('\n') : text
  } catch {
    throw new Error('Failed to read PDF structure. The file may be corrupted.')
  }

  const text = cleanText(rawText)

  if (text.length < 50) {
    throw new Error(
      'Could not extract text from this PDF. It may be a scanned image — try a text-based PDF or paste your resume instead.'
    )
  }

  const confidence = detectConfidence(text)

  if (confidence === 'low') {
    warnings.push(
      'This PDF appears to be a scanned image. Text extraction may be incomplete — results could be less accurate. Try a text-based PDF for best results.'
    )
  } else if (confidence === 'medium') {
    warnings.push(
      'We had trouble reading this PDF clearly. It may use a multi-column layout. Results may be less accurate — try a text-based PDF for best results.'
    )
  }

  return { text, confidence, warnings, fileType: 'pdf' }
}

// ─── DOCX parser ──────────────────────────────────────────────────────────────

async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  const mammoth = getMammoth()

  let rawText: string
  try {
    const result = await mammoth.extractRawText({ buffer })
    rawText = result.value
  } catch {
    throw new Error('Failed to read DOCX file. The file may be corrupted or password-protected.')
  }

  const text = cleanText(rawText)

  if (text.length < 50) {
    throw new Error('Could not extract text from this DOCX. Try pasting your resume instead.')
  }

  const warnings: string[] = []
  const confidence = detectConfidence(text)

  if (confidence === 'low') {
    warnings.push(
      'Very little text was extracted from this document. Results may be less accurate.'
    )
  } else if (confidence === 'medium') {
    warnings.push(
      'We had trouble reading this document clearly. Results may be less accurate.'
    )
  }

  return { text, confidence, warnings, fileType: 'docx' }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function parseResume(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase()
  const isPDF  = file.type === 'application/pdf' || name.endsWith('.pdf')
  const isDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              || name.endsWith('.docx')

  if (!isPDF && !isDOCX) {
    throw new Error('Only PDF and DOCX files are supported.')
  }

  const arrayBuffer = await file.arrayBuffer()

  if (isPDF) {
    return parsePDF(new Uint8Array(arrayBuffer))
  }

  return parseDOCX(Buffer.from(arrayBuffer))
}
