import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { DirectionStep } from '#/core/wayfinding/directions'
import { stepIcon } from '#/components/search/shared'

/**
 * Turn-by-turn steps behind a toggle. Shrinks to whatever height its parent
 * leaves it and scrolls the steps within that, so a long route never pushes
 * the panel off the screen. `footer` sits below the steps when they are open.
 */
export function DirectionsPanel({
  directions,
  loading = false,
  expanded,
  onToggle,
  footer,
}: {
  directions: DirectionStep[]
  /** The route is still being computed; the header stays, the toggle waits. */
  loading?: boolean
  expanded: boolean
  onToggle: () => void
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-col border-t border-border/30">
      <button
        onClick={onToggle}
        disabled={loading}
        aria-expanded={expanded}
        aria-busy={loading}
        className="flex w-full shrink-0 items-center justify-between px-5 py-3 text-left transition-colors hover:bg-accent/50 disabled:hover:bg-transparent"
      >
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {loading ? (
            <>
              Directions
              <span className="skeleton inline-block h-3 w-14 rounded-sm" />
            </>
          ) : (
            `Directions (${directions.length} steps)`
          )}
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
      {expanded && !loading && (
        <>
          <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto px-5 pb-5">
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
          {footer && (
            <div className="shrink-0 border-t border-border/30 px-5 py-3">
              {footer}
            </div>
          )}
        </>
      )}
    </div>
  )
}
