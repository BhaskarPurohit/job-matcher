'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowRight, CheckCircle2, Loader2,
  Upload, FileText, X, AlignLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnalyze } from '@/lib/hooks/useAnalyze'

const MAX_RESUME_CHARS = 15000
const MAX_JD_CHARS = 8000

type Step = 1 | 2 | 3
type ResumeMode = 'upload' | 'paste'

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1 as Step, label: 'Resume' },
    { n: 2 as Step, label: 'Job Details' },
    { n: 3 as Step, label: 'Analyze' },
  ]
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold border transition-all',
                step.n < current
                  ? 'bg-accent/20 border-accent/40 text-accent'
                  : step.n === current
                  ? 'bg-accent border-accent text-black'
                  : 'bg-transparent border-border text-muted'
              )}
            >
              {step.n < current ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.n}
            </div>
            <span className={cn(
              'text-xs font-medium transition-colors hidden sm:block',
              step.n === current ? 'text-zinc-100' : step.n < current ? 'text-accent' : 'text-muted'
            )}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('w-8 sm:w-12 h-px mx-2 sm:mx-3 transition-colors', step.n < current ? 'bg-accent/30' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function AnalyzePage() {
  const router = useRouter()
  const { state, analyze, fieldError } = useAnalyze()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [resumeMode, setResumeMode] = useState<ResumeMode>('upload')
  const [resumeText, setResumeText] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [parsing, setParsing] = useState(false)

  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [jobDescription, setJobDescription] = useState('')

  const isResumeReady = resumeText.trim().length >= 100
  const isJobReady = jobTitle.trim().length > 0 && jobDescription.trim().length >= 50
  const canAnalyze = isResumeReady && isJobReady
  const isLoading = state.status === 'loading'

  const currentStep: Step = !isResumeReady ? 1 : !isJobReady ? 2 : 3

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    setUploadedFile(file)
    setParsing(true)
    setResumeText('')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/resume/parse', { method: 'POST', body: form })
      const json = await res.json()
      if (!json.success) {
        setUploadError(json.error)
        setUploadedFile(null)
      } else {
        setResumeText(json.text)
      }
    } catch {
      setUploadError('Failed to parse PDF. Please try pasting your resume instead.')
      setUploadedFile(null)
    } finally {
      setParsing(false)
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function clearFile() {
    setUploadedFile(null)
    setResumeText('')
    setUploadError('')
  }

  async function handleAnalyze() {
    if (!canAnalyze || isLoading) return
    const result = await analyze({ resumeText, jobDescription, jobTitle, companyName: company || undefined })
    if (result) router.push(`/analysis/${result.id}`)
  }

  return (
    <>
      {/* Top bar */}
      <div className="h-14 border-b border-border flex items-center px-4 sm:px-8">
        <StepIndicator current={currentStep} />
      </div>

      <div className="p-4 sm:p-8 max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-normal text-zinc-100" style={{ fontFamily: "'DM Serif Display', serif" }}>
            New Analysis
          </h1>
          <p className="text-sm text-muted mt-1">
            Upload or paste your resume, then add the job details.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* ── Left: Resume ── */}
          <Card className="bg-surface border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted bg-bg border border-border rounded px-1.5 py-0.5">01</span>
                  Resume
                </h2>
                {isResumeReady && <CheckCircle2 className="w-4 h-4 text-accent" />}
              </div>

              {/* Mode toggle */}
              <div className="flex gap-1 mb-4 bg-bg border border-border rounded-lg p-1">
                <button
                  onClick={() => { setResumeMode('upload'); clearFile() }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
                    resumeMode === 'upload'
                      ? 'bg-surface text-zinc-100 shadow-sm'
                      : 'text-muted hover:text-zinc-100'
                  )}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload PDF
                </button>
                <button
                  onClick={() => { setResumeMode('paste'); clearFile() }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
                    resumeMode === 'paste'
                      ? 'bg-surface text-zinc-100 shadow-sm'
                      : 'text-muted hover:text-zinc-100'
                  )}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  Paste Text
                </button>
              </div>

              {/* Upload mode */}
              {resumeMode === 'upload' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="resume-upload"
                  />

                  {!uploadedFile && !parsing && (
                    <label
                      htmlFor="resume-upload"
                      className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all"
                    >
                      <Upload className="w-8 h-8 text-muted mb-2" />
                      <p className="text-sm font-medium text-zinc-100">Click to upload PDF</p>
                      <p className="text-xs text-muted mt-1">Max 4MB</p>
                    </label>
                  )}

                  {parsing && (
                    <div className="flex flex-col items-center justify-center w-full h-40 border border-border rounded-lg">
                      <Loader2 className="w-6 h-6 text-accent animate-spin mb-2" />
                      <p className="text-sm text-muted">Extracting text…</p>
                    </div>
                  )}

                  {uploadedFile && !parsing && (
                    <div className="border border-accent/20 bg-accent/5 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-100 truncate">{uploadedFile.name}</p>
                          <p className="text-xs text-accent mt-0.5">
                            {isResumeReady ? `${resumeText.length.toLocaleString()} characters extracted` : 'Extracting…'}
                          </p>
                        </div>
                        <button onClick={clearFile} className="text-muted hover:text-danger transition-colors shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {isResumeReady && (
                        <label
                          htmlFor="resume-upload"
                          className="mt-3 text-xs text-muted hover:text-zinc-100 cursor-pointer underline-offset-2 hover:underline block"
                        >
                          Replace with a different file
                        </label>
                      )}
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-xs text-danger bg-danger-dim border border-danger/20 rounded-lg px-3 py-2 mt-2">
                      {uploadError}
                    </p>
                  )}
                </div>
              )}

              {/* Paste mode */}
              {resumeMode === 'paste' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-muted font-medium">
                      Paste your resume <span className="text-danger">*</span>
                    </label>
                    <span className={cn('text-[11px] font-mono', resumeText.length > MAX_RESUME_CHARS * 0.9 ? 'text-warning' : 'text-muted')}>
                      {resumeText.length.toLocaleString()} / {MAX_RESUME_CHARS.toLocaleString()}
                    </span>
                  </div>
                  <Textarea
                    placeholder="Copy and paste your full resume text here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value.slice(0, MAX_RESUME_CHARS))}
                    rows={12}
                    className="bg-bg border-border text-zinc-100 placeholder:text-muted focus-visible:ring-accent/30 focus-visible:border-accent/40 text-sm resize-none leading-relaxed"
                  />
                  {fieldError('resumeText') && (
                    <p className="text-xs text-danger mt-1.5">{fieldError('resumeText')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Right: Job details ── */}
          <Card className="bg-surface border-border">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted bg-bg border border-border rounded px-1.5 py-0.5">02</span>
                  Job Details
                </h2>
                {isJobReady && <CheckCircle2 className="w-4 h-4 text-accent" />}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted font-medium mb-1.5 block">
                    Job Title <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Senior Frontend Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="bg-bg border-border text-zinc-100 placeholder:text-muted focus-visible:ring-accent/30 focus-visible:border-accent/40 text-sm h-9"
                  />
                  {fieldError('jobTitle') && (
                    <p className="text-xs text-danger mt-1">{fieldError('jobTitle')}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted font-medium mb-1.5 block">Company</label>
                  <Input
                    placeholder="e.g. Stripe"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="bg-bg border-border text-zinc-100 placeholder:text-muted focus-visible:ring-accent/30 focus-visible:border-accent/40 text-sm h-9"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-muted font-medium">
                      Job Description <span className="text-danger">*</span>
                    </label>
                    <span className={cn('text-[11px] font-mono', jobDescription.length > MAX_JD_CHARS * 0.9 ? 'text-warning' : 'text-muted')}>
                      {jobDescription.length.toLocaleString()} / {MAX_JD_CHARS.toLocaleString()}
                    </span>
                  </div>
                  <Textarea
                    placeholder="Paste the full job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value.slice(0, MAX_JD_CHARS))}
                    rows={10}
                    className="bg-bg border-border text-zinc-100 placeholder:text-muted focus-visible:ring-accent/30 focus-visible:border-accent/40 text-sm resize-none leading-relaxed"
                  />
                  {fieldError('jobDescription') && (
                    <p className="text-xs text-danger mt-1">{fieldError('jobDescription')}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error banner */}
        {state.status === 'error' && state.fieldErrors.length === 0 && (
          <div className="mb-4 text-sm text-danger bg-danger-dim border border-danger/20 rounded-lg px-4 py-3">
            {state.error}
          </div>
        )}

        {/* Analyze button */}
        <Button
          size="lg"
          disabled={!canAnalyze || isLoading}
          onClick={handleAnalyze}
          className={cn(
            'w-full h-12 text-base font-semibold transition-all',
            canAnalyze && !isLoading
              ? 'bg-accent hover:bg-accent-hover text-black'
              : 'bg-surface border border-border text-muted cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing…</>
          ) : canAnalyze ? (
            <>Analyze Match<ArrowRight className="ml-2 h-5 w-5" /></>
          ) : (
            <>
              Analyze Match
              <span className="ml-2 text-sm font-mono opacity-60">
                {!isResumeReady ? '— add resume first' : '— add job details'}
              </span>
            </>
          )}
        </Button>
      </div>
    </>
  )
}
