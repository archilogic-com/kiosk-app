import { Building2 } from 'lucide-react'

interface WelcomeHeaderProps {
  companyName: string
  date: string
  time: string
}

export function WelcomeHeader({ companyName, date, time }: WelcomeHeaderProps) {
  return (
    <div className="floating-panel px-6 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-xl bg-primary/10"
            aria-hidden="true"
          >
            <Building2 className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{companyName}</h1>
            <p className="text-sm text-muted-foreground">{date}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">{time}</p>
        </div>
      </div>
    </div>
  )
}
