import { Component, Suspense, use, useState, useSyncExternalStore } from 'react'
import type { AnimationEvent, ReactNode } from 'react'
import { VIEWPORT_INSETS } from '#/config'
import type { FloorPlanLoader, LoadStage } from '#/floor-plan/engine'
import { Kiosk } from '#/Kiosk'
import { DashboardSkeleton } from '#/components/Dashboard'

/**
 * The plan itself is plain HTML underneath the React root (see index.html),
 * so this tree is only the overlays: the kiosk once loaded, a skeleton until
 * then, and an error if it never does. The skeleton is not the Suspense
 * fallback so it can fade out over the loaded kiosk rather than vanish the
 * instant the engine is ready.
 */
export function App({ loader }: { loader: FloorPlanLoader }) {
  return (
    <div
      className="pointer-events-none relative h-screen w-screen overflow-hidden"
      role="application"
      aria-label="Interactive floor plan kiosk"
    >
      {/* Inline so url(#liquid-glass) resolves against the document; from a
          stylesheet the fragment reference breaks in production builds.
          Only Chromium can use an SVG filter as a backdrop. Safari reads the
          -webkit- line, which comes last, and gets the frosted blur alone. */}
      <style>{`.floating-panel,
      .kiosk-pin {
        backdrop-filter: blur(16px) saturate(1.4) url(#liquid-glass);
        -webkit-backdrop-filter: blur(16px) saturate(1.4);
      }`}</style>
      <LiquidGlassFilter />

      <ErrorBoundary>
        <Suspense fallback={null}>
          <LoadedKiosk loader={loader} />
        </Suspense>
      </ErrorBoundary>
      <LoadingOverlay loader={loader} />
    </div>
  )
}

/** Suspends until the floor is drawn, then hands the kiosk an engine that exists. */
function LoadedKiosk({ loader }: { loader: FloorPlanLoader }) {
  const { floorPlan, floor } = use(loader.ready)
  return <Kiosk floorPlan={floorPlan} floor={floor} />
}

/** Frosted glass for the floating panels: a blur, refracted through noise. */
function LiquidGlassFilter() {
  return (
    <svg className="absolute size-0" aria-hidden="true">
      <defs>
        <filter id="liquid-glass" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves="3"
            seed="2"
            result="noise"
          />
          <feDisplacementMap
            in="blur"
            in2="noise"
            scale="14"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feColorMatrix in="displaced" type="saturate" values="1.5" />
        </filter>
      </defs>
    </svg>
  )
}

/** Catches a floor that failed to load and says so in place of the kiosk. */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div
        className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-background"
        role="alert"
      >
        <div className="max-w-sm rounded-2xl border border-destructive/50 bg-card p-8 text-center">
          <p className="font-medium text-destructive">
            Failed to load floor plan
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }
}

const STAGE_LABEL: Record<LoadStage, string> = {
  engine: 'Loading the renderer',
  floor: 'Loading the floor plan',
  ready: 'Floor plan ready',
  error: 'Floor plan failed to load',
}

const STEPS: LoadStage[] = ['engine', 'floor']

/**
 * What the visitor sees while the floor loads: the dashboard in its final
 * layout, with everything the floor will fill in shimmering, and a progress
 * pill where the plan is about to appear.
 */
function LoadingOverlay({ loader }: { loader: FloorPlanLoader }) {
  const stage = useSyncExternalStore(loader.subscribe, loader.getStage)
  const [gone, setGone] = useState(false)
  if (gone || stage === 'error') return null

  const leaving = stage === 'ready'
  const done = leaving ? STEPS.length : STEPS.indexOf(stage)
  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === 'loading-fade-out') setGone(true)
  }

  return (
    <div
      className={`absolute inset-0 z-30 bg-background ${
        leaving ? 'loading-exit pointer-events-none' : 'pointer-events-auto'
      }`}
      role="status"
      aria-live="polite"
      aria-hidden={leaving}
      onAnimationEnd={onAnimationEnd}
    >
      <span className="sr-only">{STAGE_LABEL[stage]}</span>
      <div className="dashboard-enter absolute top-4 left-4">
        <DashboardSkeleton />
      </div>
      <div
        className="absolute inset-y-0 flex items-center justify-center"
        style={{ left: VIEWPORT_INSETS.left, right: VIEWPORT_INSETS.right }}
        aria-hidden="true"
      >
        <div
          className="floating-panel flex items-center gap-4 py-2.5 pr-5 pl-4"
          style={{ borderRadius: 9999 }}
        >
          <div className="flex items-center gap-1.5">
            {STEPS.map((step, i) => (
              <span
                key={step}
                className={`h-1.5 w-6 rounded-full transition-colors duration-500 ${
                  i < done
                    ? 'bg-primary'
                    : i === done
                      ? 'animate-pulse bg-primary/50'
                      : 'bg-foreground/10'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {STAGE_LABEL[stage]}
          </span>
        </div>
      </div>
    </div>
  )
}
