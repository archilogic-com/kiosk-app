import { ChevronDown, ChevronUp } from 'lucide-react'
import type { DirectionStep } from '#/core/wayfinding/directions'
import { stepIcon } from '#/components/search/shared'

export function DirectionsPanel({
  directions,
  expanded,
  onToggle,
}: {
  directions: DirectionStep[]
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-t border-border/30">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Directions ({directions.length} steps)
        </span>
        {expanded ? (
          <ChevronUp
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </button>
      {expanded && (
        <ol className="space-y-1 px-5 pb-5">
          {directions.map((step, i) => (
            <li key={i} className="flex items-start gap-3 py-2">
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                {stepIcon(step.kind)}
              </span>
              <span className="text-sm leading-snug">{step.instruction}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
