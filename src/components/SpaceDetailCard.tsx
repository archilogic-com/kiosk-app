import {
  Armchair,
  Monitor,
  PenLine,
  Phone,
  Projector,
  Ruler,
} from 'lucide-react'
import { demoAmenities, type AmenityType } from '#/core/demo-data/amenities'
import type { Space } from '#/core/domain/types'

const AMENITY_ICONS: Record<AmenityType, typeof Monitor> = {
  screen: Monitor,
  whiteboard: PenLine,
  phone: Phone,
  projector: Projector,
}

const AMENITY_LABELS: Record<AmenityType, string> = {
  screen: 'Screen',
  whiteboard: 'Whiteboard',
  phone: 'Phone',
  projector: 'Projector',
}

interface SpaceDetailCardProps {
  space: Space
  isBooked?: boolean
  onBook?: (spaceId: string) => void
}

export function SpaceDetailCard({
  space,
  isBooked,
  onBook,
}: SpaceDetailCardProps) {
  const amenities = demoAmenities(space.category, space.seatCapacity)
  const hasSeats = space.seatCapacity != null && space.seatCapacity > 0
  const hasArea = space.area != null && space.area > 0
  const hasAmenities = amenities.length > 0

  const isMeetingRoom = space.category === 'meet'
  const isBookable = !isBooked

  if (!hasSeats && !hasArea && !hasAmenities && !isMeetingRoom) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {hasSeats && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground/70">
            <Armchair className="size-3.5" aria-hidden="true" />
            {space.seatCapacity} seats
          </span>
        )}
        {hasArea && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground/70">
            <Ruler className="size-3.5" aria-hidden="true" />
            {Math.round(space.area!)}m²
          </span>
        )}
        {amenities.map((amenity) => {
          const Icon = AMENITY_ICONS[amenity]
          return (
            <span
              key={amenity}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground/70"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {AMENITY_LABELS[amenity]}
            </span>
          )
        })}
      </div>
      {isMeetingRoom && (
        <button
          type="button"
          disabled={!isBookable}
          onClick={() => onBook?.(space.id)}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBookable ? 'Book room' : 'Booked'}
        </button>
      )}
    </div>
  )
}
