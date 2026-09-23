import { Component } from 'react'
import type { ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Catches a floor that failed to load and says so in place of the kiosk. */
export class FloorPlanErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-background"
        role="alert"
      >
        <div className="max-w-sm rounded-2xl border border-destructive/50 bg-card p-8 text-center">
          <p className="font-medium text-destructive">
            Failed to load floor plan
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.state.error.message}
          </p>
        </div>
      </div>
    )
  }
}
