import { ArrowLeft, MapPin } from 'lucide-react'
import type { DirectionStep } from '#/core/wayfinding/directions'
import type { NavigableItem, Space } from '#/core/domain/types'
import { CATEGORY_LABELS, KIOSK_COLORS } from '#/core/domain/types'
import { avatarColor, getInitials } from '#/core/domain/avatar'
import { formatSpaceType, formatWalkingTime } from '#/core/domain/format'
import { SpaceDetailCard } from '#/components/SpaceDetailCard'
import { CopyLinkButton } from '#/components/search/CopyLinkButton'
import { DirectionsPanel } from '#/components/search/DirectionsPanel'

interface DestinationDetailProps {
  selectedItem: NavigableItem
  backButtonRef: React.RefObject<HTMLButtonElement | null>
  onBack: () => void
  distance: number | null
  pathError: string | null
  directions: DirectionStep[]
  directionsExpanded: boolean
  setDirectionsExpanded: (value: boolean) => void
  destinationNameOverride?: string | null
  destinationSpace?: Space | null
  bookedSpaceIds?: Set<string>
  onBook?: (spaceId: string) => void
}

export function DestinationDetail({
  selectedItem,
  backButtonRef,
  onBack,
  distance,
  pathError,
  directions,
  directionsExpanded,
  setDirectionsExpanded,
  destinationNameOverride,
  destinationSpace,
  bookedSpaceIds,
  onBook,
}: DestinationDetailProps) {
  const itemSpace =
    destinationSpace ??
    (selectedItem.type === 'space' ? selectedItem.data : null)
  const label =
    destinationNameOverride ??
    (selectedItem.type === 'workstation'
      ? (selectedItem.data.occupantName ?? selectedItem.data.id)
      : selectedItem.data.name)

  const icon =
    selectedItem.type === 'workstation' && selectedItem.data.occupantName ? (
      <div
        className="flex size-12 items-center justify-center rounded-full text-base font-semibold"
        style={{
          backgroundColor: avatarColor(selectedItem.data.occupantName),
          color: KIOSK_COLORS.avatarText,
        }}
        aria-hidden="true"
      >
        {getInitials(selectedItem.data.occupantName)}
      </div>
    ) : (
      <div
        className="flex size-12 items-center justify-center rounded-xl bg-primary/10"
        aria-hidden="true"
      >
        <MapPin className="size-6 text-primary" aria-hidden="true" />
      </div>
    )

  return (
    <section
      className="floating-panel kiosk-fade-in flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden"
      aria-label={`Directions to ${label}`}
    >
      {/* Back button */}
      <button
        ref={backButtonRef}
        onClick={onBack}
        className="flex h-12 w-full shrink-0 items-center gap-2 px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-[0.98]"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
        Back to search
      </button>

      {/* Destination info */}
      <div className="shrink-0 px-5 pb-5">
        <div className="flex items-center gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{label}</h2>
            {itemSpace && (
              <p className="text-sm text-muted-foreground">
                {CATEGORY_LABELS[itemSpace.category] ??
                  formatSpaceType(itemSpace.subCategory)}
              </p>
            )}
            {selectedItem.type === 'workstation' &&
              selectedItem.data.employeeId && (
                <p className="text-sm text-muted-foreground">
                  {selectedItem.data.employeeId}
                </p>
              )}
          </div>
        </div>

        <RouteSummary distance={distance} pathError={pathError} />

        {itemSpace && (
          <div className="mt-4">
            <SpaceDetailCard
              space={itemSpace}
              isBooked={bookedSpaceIds?.has(itemSpace.id)}
              onBook={onBook}
              reserveBookingSlot
            />
          </div>
        )}
      </div>

      {!pathError && (
        <DirectionsPanel
          directions={directions}
          loading={distance == null}
          expanded={directionsExpanded}
          onToggle={() => setDirectionsExpanded(!directionsExpanded)}
          footer={<CopyLinkButton item={selectedItem} directionsOpen />}
        />
      )}
    </section>
  )
}

/**
 * Distance and walking time, holding their space while the route is still
 * being computed so the panel does not jump when it arrives.
 */
function RouteSummary({
  distance,
  pathError,
}: {
  distance: number | null
  pathError: string | null
}) {
  if (pathError) {
    return (
      <p
        className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        role="status"
      >
        {pathError}
      </p>
    )
  }
  return (
    <div className="mt-4 flex items-center gap-3" aria-busy={distance == null}>
      {distance != null ? (
        <>
          <div className="rounded-xl bg-primary/10 px-4 py-2">
            <p className="text-lg font-semibold text-primary">
              {distance.toFixed(0)}m
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatWalkingTime(distance)}
          </p>
        </>
      ) : (
        <>
          <span className="skeleton h-11 w-20 rounded-xl" />
          <span className="skeleton h-4 w-24 rounded-md" />
        </>
      )}
    </div>
  )
}
