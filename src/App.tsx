import { Suspense } from 'react'
import type { FloorPlanLoader } from '#/core/sdk/load-floor-plan'
import { useFloorPlan } from '#/hooks/useFloorPlan'
import { Kiosk } from '#/Kiosk'
import { FloorPlanErrorBoundary } from '#/components/FloorPlanErrorBoundary'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'

/** Suspends until the floor is drawn, then hands the kiosk an engine that exists. */
function LoadedKiosk({ loader }: { loader: FloorPlanLoader }) {
  return <Kiosk floorPlan={useFloorPlan(loader)} />
}

/**
 * The plan itself is plain HTML underneath the React root (see index.html),
 * so this tree is only the overlays: the kiosk once loaded, the skeleton
 * until then, and the error if it never does. The skeleton is not the
 * Suspense fallback so it can fade out over the loaded kiosk rather than
 * vanish the instant the engine is ready.
 */
export function App({ loader }: { loader: FloorPlanLoader }) {
  return (
    <div
      className="pointer-events-none relative h-screen w-screen overflow-hidden"
      role="application"
      aria-label="Interactive floor plan kiosk"
    >
      {/* Inline style so url(#liquid-glass) resolves against the document,
          not an external CSS file where fragment refs break in production */}
      <style>{`.floating-panel,
      .kiosk-pin {
        backdrop-filter: blur(16px) saturate(1.4) url(#liquid-glass);
        -webkit-backdrop-filter: blur(16px) saturate(1.4) url(#liquid-glass);
      }`}</style>

      {/* Liquid glass SVG filter definitions */}
      <svg
        className="absolute"
        style={{ width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id="liquid-glass" x="-5%" y="-5%" width="110%" height="110%">
            {/* Frosted blur, strong enough to read text over any background */}
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />

            {/* Organic noise pattern used as displacement source */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="3"
              seed="2"
              result="noise"
            />

            {/* Refract the blurred backdrop through the noise */}
            <feDisplacementMap
              in="blur"
              in2="noise"
              scale="14"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />

            {/* Boost color vibrancy of refracted content */}
            <feColorMatrix in="displaced" type="saturate" values="1.5" />
          </filter>
        </defs>
      </svg>

      <FloorPlanErrorBoundary>
        <Suspense fallback={null}>
          <LoadedKiosk loader={loader} />
        </Suspense>
      </FloorPlanErrorBoundary>
      <LoadingSkeleton loader={loader} />
    </div>
  )
}
