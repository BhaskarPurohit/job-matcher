import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Upload,
  FileText,
  BarChart3,
  Zap,
  Target,
  Lightbulb,
  FileCheck,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-zinc-100">
      {/* Nav */}
      <header className="border-b border-border sticky top-0 z-50 bg-bg/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-accent font-mono text-lg font-bold tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              match//
            </span>
            <span className="text-zinc-100 font-semibold text-sm tracking-tight">ai</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#how-it-works" className="text-sm text-muted hover:text-zinc-100 transition-colors">How it works</Link>
            <Link href="#features" className="text-sm text-muted hover:text-zinc-100 transition-colors">Features</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted hover:text-zinc-100 hover:bg-surface" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent-hover text-black font-semibold" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <Badge className="mb-8 bg-surface text-accent border-accent/30 font-mono text-xs tracking-widest uppercase px-3 py-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          AI-powered resume analysis
        </Badge>
        <h1 className="text-5xl md:text-7xl font-normal text-zinc-100 leading-[1.05] tracking-tight mb-6 max-w-4xl mx-auto" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Your Resume,{" "}<span className="text-accent italic">Analyzed</span> Against Every Job
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your resume, paste a job description. Get a precision match score, skill gap analysis, and tailored suggestions — in under 15 seconds.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" className="bg-accent hover:bg-accent-hover text-black font-semibold h-12 px-8 text-base" asChild>
            <Link href="/signup">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-border bg-transparent text-zinc-300 hover:bg-surface hover:text-zinc-100 h-12 px-8 text-base" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        {/* Score ring preview */}
        <div className="mt-16 flex justify-center">
          <div className="relative">
            <div className="w-72 h-44 bg-surface border border-border rounded-xl flex items-center justify-center gap-8 px-8">
              <div className="flex flex-col items-center">
                <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                  <circle cx="36" cy="36" r="30" stroke="#1F1F23" strokeWidth="5" />
                  <circle cx="36" cy="36" r="30" stroke="#22C55E" strokeWidth="5" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset="37.7" transform="rotate(-90 36 36)" style={{ filter: "drop-shadow(0 0 4px rgba(34,197,94,0.4))" }} />
                  <text x="36" y="40" textAnchor="middle" fill="#22C55E" fontSize="16" fontFamily="'JetBrains Mono', monospace" fontWeight="bold">80</text>
                </svg>
                <span className="text-[10px] text-muted mt-1 font-mono uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>match score</span>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-2 bg-accent/20 rounded-full w-full" />
                <div className="h-2 bg-accent-dim rounded-full w-3/4" />
                <div className="h-2 bg-[#F59E0B]/20 rounded-full w-full mt-1" />
                <div className="h-2 bg-warning-dim rounded-full w-1/2" />
              </div>
            </div>
            <div className="absolute -top-2 -right-2">
              <Badge className="bg-accent text-black text-xs font-mono font-bold px-2 py-0.5">Strong Match</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-border bg-surface/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-10">
            {[
              { value: "Free", label: "while in beta" },
              { value: "Dev→Dev", label: "built by a developer, for developers" },
              { value: "New", label: "cover letter generation" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-zinc-100 font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stat.value}</div>
                <div className="text-xs text-muted mt-0.5 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Process</p>
          <h2 className="text-4xl font-normal text-zinc-100" style={{ fontFamily: "'DM Serif Display', serif" }}>Three steps to clarity</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { step: "01", icon: Upload, title: "Upload Resume", desc: "Drop your PDF or DOCX. We extract and structure your experience, skills, and education automatically." },
            { step: "02", icon: FileText, title: "Paste Job Description", desc: "Copy the job listing directly. Add the title and company for context-aware analysis." },
            { step: "03", icon: BarChart3, title: "Get Your Analysis", desc: "Receive a precision match score, skill gaps, tailored summary, and actionable improvements." },
          ].map((item) => (
            <div key={item.step} className="bg-surface border border-border rounded-xl p-6 group hover:border-accent/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-accent-dim border border-accent/20 rounded-lg flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-accent" />
                </div>
                <span className="text-xs font-mono text-border group-hover:text-accent/30 transition-colors font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.step}</span>
              </div>
              <h3 className="font-semibold text-zinc-100 mb-2">{item.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="bg-border max-w-6xl mx-auto" />

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Features</p>
          <h2 className="text-4xl font-normal text-zinc-100" style={{ fontFamily: "'DM Serif Display', serif" }}>Everything you need to land the role</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: Target, title: "Precision Match Score", desc: "A single 0–100 score derived from ATS keyword analysis, skill overlap, and experience alignment.", tag: "Core", tagColor: "text-accent bg-accent-dim border-accent/20" },
            { icon: Zap, title: "Skill Gap Analysis", desc: "See exactly which required and preferred skills are missing from your resume. Prioritized by importance to the role.", tag: "Insights", tagColor: "text-warning bg-warning-dim border-warning/20" },
            { icon: FileCheck, title: "Tailored Summary", desc: "A job-specific professional summary, written to pass ATS filters and resonate with hiring managers.", tag: "AI-generated", tagColor: "text-accent bg-accent-dim border-accent/20" },
            { icon: Lightbulb, title: "Actionable Suggestions", desc: "Section-by-section recommendations: what to add, what to rephrase, and why.", tag: "Improvements", tagColor: "text-warning bg-warning-dim border-warning/20" },
          ].map((feature) => (
            <div key={feature.title} className="bg-surface border border-border rounded-xl p-7 group hover:border-border hover:bg-surface-hover transition-all">
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 bg-bg border border-border rounded-xl flex items-center justify-center group-hover:border-accent/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
                </div>
                <Badge className={`text-xs font-mono border ${feature.tagColor} px-2 py-0.5`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{feature.tag}</Badge>
              </div>
              <h3 className="font-semibold text-zinc-100 text-base mb-2">{feature.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-surface border border-border rounded-2xl p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-[#22C55E]/40 to-transparent" />
          <p className="text-xs font-mono text-accent uppercase tracking-widest mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Start now — it's free</p>
          <h2 className="text-4xl md:text-5xl font-normal text-zinc-100 mb-5 max-w-2xl mx-auto leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>Stop guessing. Start matching.</h2>
          <p className="text-muted mb-8 max-w-md mx-auto text-sm leading-relaxed">Your first 5 analyses are free. No credit card. No fluff. Just signal.</p>
          <Button size="lg" className="bg-accent hover:bg-accent-hover text-black font-semibold h-12 px-10 text-base" asChild>
            <Link href="/signup">
              Analyze your resume now
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-accent font-mono font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>match//ai</span>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Contact"].map((link) => (
              <Link key={link} href={`/${link.toLowerCase()}`} className="text-xs text-muted hover:text-zinc-100 transition-colors">{link}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
