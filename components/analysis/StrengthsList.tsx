import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface StrengthsListProps {
  strengths: string[]
}

export function StrengthsList({ strengths }: StrengthsListProps) {
  if (!strengths.length) return null

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-zinc-100">Key Strengths</h2>
          <span className="text-xs font-mono text-muted ml-auto">
            {strengths.length} identified
          </span>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-5 pt-4">
        <ul className="space-y-2">
          {strengths.map((strength, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
              <span
                className="text-[10px] font-mono text-muted bg-bg border border-border rounded px-1.5 py-0.5 mt-0.5 shrink-0"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {strength}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
