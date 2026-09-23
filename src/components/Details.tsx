import { useState } from 'react'
import type { Ref } from 'react'
import {
  Armchair,
  ArrowLeft,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CornerUpLeft,
  CornerUpRight,
  Heart,
  Link,
  MapPin,
  MapPinCheck,
  Monitor,
  Navigation,
  PenLine,
  Phone,
  Projector,
  Ruler,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { demoAmenities } from '#/demo-data'
import type { Amenity } from '#/demo-data'
import type { Route, StepKind } from '#/floor-plan/wayfinding'
import {
  CATEGORY_LABELS,
  KIOSK_COLORS,
  avatarColor,
  buildDeepLink,
  formatSpaceType,
  formatWalkingTime,
  getInitials,
  labelFor,
} from '#/kiosk-state'
import type {
  EventCategory,
  NavigableItem,
  ScheduledEvent,
  Space,
} from '#/kiosk-state'

// ── Shared pieces ───────────────────────────────────────────────────────

const AVATAR_SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
}

export function Avatar({
  name,
  size,
}: {
  name: string
  size: keyof typeof AVATAR_SIZES
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${AVATAR_SIZES[size]}`}
      style={{
        backgroundColor: avatarColor(name),
        color: KIOSK_COLORS.avatarText,
      }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  )
}

const AMENITIES: Record<Amenity, { icon: LucideIcon; label: string }> = {
  screen: { icon: Monitor, label: 'Screen' },
  whiteboard: { icon: PenLine, label: 'Whiteboard' },
  phone: { icon: Phone, label: 'Phone' },
  projector: { icon: Projector, label: 'Projector' },
}

function Pill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground/70">
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

/** Seats, area and equipment, and a way to book it if it is a meeting room. */
export function SpaceDetailCard({
  space,
  bookedSpaceIds,
  onBook,
  reserveBookingSlot = false,
}: {
  space: Space
  bookedSpaceIds: Set<string>
  onBook: (spaceId: string) => void
  /** Keep the booking button's space even when this space cannot be booked. */
  reserveBookingSlot?: boolean
}) {
  const amenities = demoAmenities(space)
  const seats = space.seatCapacity ?? 0
  const area = space.area ?? 0
  const isMeetingRoom = space.category === 'meet'
  const isBooked = bookedSpaceIds.has(space.id)

  if (!seats && !area && amenities.length === 0 && !isMeetingRoom) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {seats > 0 && <Pill icon={Armchair} label={`${seats} seats`} />}
        {area > 0 && <Pill icon={Ruler} label={`${Math.round(area)}m²`} />}
        {amenities.map((amenity) => (
          <Pill key={amenity} {...AMENITIES[amenity]} />
        ))}
      </div>
      {isMeetingRoom ? (
        <button
          type="button"
          disabled={isBooked}
          onClick={() => onBook(space.id)}
          className="h-9 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBooked ? 'Booked' : 'Book room'}
        </button>
      ) : (
        reserveBookingSlot && <div className="h-9" aria-hidden="true" />
      )}
    </div>
  )
}

export const EVENT_STYLES: Record<
  EventCategory,
  { badge: string; dot: string; icon: LucideIcon }
> = {
  wellness: {
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-400',
    icon: Heart,
  },
  meeting: {
    badge: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-400',
    icon: Briefcase,
  },
  social: {
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-400',
    icon: Sparkles,
  },
  review: {
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-400',
    icon: Clock,
  },
}

export function EventBadge({ category }: { category: EventCategory }) {
  const { badge, icon: Icon } = EVENT_STYLES[category]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge}`}
    >
      <Icon className="size-2.5" aria-hidden="true" />
      {category}
    </span>
  )
}

const ATTENDEE_HUES = [260, 330, 155, 30]

function AttendeeStack({ count }: { count: number }) {
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2" aria-hidden="true">
        {ATTENDEE_HUES.slice(0, count).map((hue) => (
          <div
            key={hue}
            className="size-6 rounded-full border-2 border-white"
            style={{ backgroundColor: `oklch(0.88 0.04 ${hue})` }}
          />
        ))}
      </div>
      <span className="ml-2 text-xs text-muted-foreground">
        {count} attending
      </span>
    </div>
  )
}

/**
 * The body of an event, wherever it is shown: what it is, the room, who runs
 * it, and a way to get there.
 */
export function EventInfo({
  event,
  bookedSpaceIds,
  onBook,
  onNavigate,
}: {
  event: ScheduledEvent
  bookedSpaceIds: Set<string>
  onBook: (spaceId: string) => void
  onNavigate: (space: Space) => void
}) {
  const { space } = event
  return (
    <>
      <p className="px-5 py-3 text-sm leading-relaxed text-foreground/80">
        {event.description}
      </p>
      {space && (
        <div className="border-t border-border/30 px-5 py-3">
          <SpaceDetailCard
            space={space}
            bookedSpaceIds={bookedSpaceIds}
            onBook={onBook}
          />
        </div>
      )}
      <div className="flex items-center justify-between border-t border-border/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <Avatar name={event.organizer} size="sm" />
          <div>
            <p className="text-xs font-medium">{event.organizer}</p>
            <p className="text-[10px] text-muted-foreground">Organizer</p>
          </div>
        </div>
        <AttendeeStack count={event.attendeeCount} />
      </div>
      {space && (
        <div className="border-t border-border/30 px-5 py-3">
          <button
            onClick={() => onNavigate(space)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 active:scale-[0.97]"
          >
            <Navigation className="size-4" aria-hidden="true" />
            Navigate to {space.name}
          </button>
        </div>
      )}
    </>
  )
}

function BackButton({
  ref,
  onClick,
}: {
  ref: Ref<HTMLButtonElement>
  onClick: () => void
}) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className="flex h-12 w-full shrink-0 items-center gap-2 px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-[0.98]"
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
      Back to search
    </button>
  )
}

// ── A destination ───────────────────────────────────────────────────────

/** Where the visitor is going, how far it is, and how to get there. */
export function DestinationDetail({
  item,
  route,
  destinationName,
  directionsOpen,
  onToggleDirections,
  backButtonRef,
  onBack,
  bookedSpaceIds,
  onBook,
}: {
  item: NavigableItem
  route: Route
  /** Where a dragged destination pin was dropped, if it was. */
  destinationName: string | null
  directionsOpen: boolean
  onToggleDirections: () => void
  backButtonRef: Ref<HTMLButtonElement>
  onBack: () => void
  bookedSpaceIds: Set<string>
  onBook: (spaceId: string) => void
}) {
  const space =
    route.destinationSpace ?? (item.type === 'space' ? item.data : null)
  const label = destinationName ?? labelFor(item)
  const occupant = item.type === 'workstation' ? item.data.occupantName : null

  return (
    <section
      className="floating-panel kiosk-fade-in flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden"
      aria-label={`Directions to ${label}`}
    >
      <BackButton ref={backButtonRef} onClick={onBack} />

      <div className="shrink-0 px-5 pb-5">
        <div className="flex items-center gap-3">
          {occupant ? (
            <Avatar name={occupant} size="lg" />
          ) : (
            <div
              className="flex size-12 items-center justify-center rounded-xl bg-primary/10"
              aria-hidden="true"
            >
              <MapPin className="size-6 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{label}</h2>
            {space && (
              <p className="text-sm text-muted-foreground">
                {CATEGORY_LABELS[space.category] ??
                  formatSpaceType(space.subCategory)}
              </p>
            )}
            {item.type === 'workstation' && item.data.employeeId && (
              <p className="text-sm text-muted-foreground">
                {item.data.employeeId}
              </p>
            )}
          </div>
        </div>

        <RouteSummary route={route} />

        {space && (
          <div className="mt-4">
            <SpaceDetailCard
              space={space}
              bookedSpaceIds={bookedSpaceIds}
              onBook={onBook}
              reserveBookingSlot
            />
          </div>
        )}
      </div>

      {!route.pathError && (
        <Directions
          route={route}
          open={directionsOpen}
          onToggle={onToggleDirections}
          item={item}
        />
      )}
    </section>
  )
}

/**
 * Distance and walking time, holding their space while the route is still
 * being computed so the panel does not jump when it arrives.
 */
function RouteSummary({ route: { distance, pathError } }: { route: Route }) {
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

const STEP_ICONS: Record<StepKind, LucideIcon> = {
  walk: ArrowUp,
  'turn-left': CornerUpLeft,
  'turn-right': CornerUpRight,
  'slight-left': ArrowUpLeft,
  'slight-right': ArrowUpRight,
  arrive: MapPinCheck,
}

/**
 * Turn-by-turn steps behind a toggle. Shrinks to whatever height the panel
 * leaves it and scrolls the steps within that, so a long route never pushes
 * the panel off the screen.
 */
function Directions({
  route: { distance, directions },
  open,
  onToggle,
  item,
}: {
  route: Route
  open: boolean
  onToggle: () => void
  item: NavigableItem
}) {
  // The header stays while the route is computed; the toggle waits for it.
  const loading = distance == null
  const Chevron = open ? ChevronUp : ChevronDown
  return (
    <div className="flex min-h-0 flex-col border-t border-border/30">
      <button
        onClick={onToggle}
        disabled={loading}
        aria-expanded={open}
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
        <Chevron className="size-4 text-muted-foreground" aria-hidden="true" />
      </button>
      {open && !loading && (
        <>
          <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto px-5 pb-5">
            {directions.map((step, i) => {
              const Icon = STEP_ICONS[step.kind]
              const tone =
                step.kind === 'arrive'
                  ? 'text-primary'
                  : 'text-muted-foreground'
              return (
                <li key={i} className="flex items-start gap-3 py-2">
                  <span
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center"
                    aria-hidden="true"
                  >
                    <Icon className={`size-4 ${tone}`} />
                  </span>
                  <span className="text-sm leading-snug">
                    {step.instruction}
                  </span>
                </li>
              )
            })}
          </ol>
          <div className="shrink-0 border-t border-border/30 px-5 py-3">
            <CopyLinkButton item={item} />
          </div>
        </>
      )}
    </div>
  )
}

/** A link that reopens the kiosk on these directions, for a phone or an invite. */
function CopyLinkButton({ item }: { item: NavigableItem }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const copy = () => {
    navigator.clipboard
      .writeText(buildDeepLink(item, true))
      .then(() => {
        setStatus('copied')
        setTimeout(() => setStatus('idle'), 2000)
      })
      .catch(() => setStatus('failed'))
  }

  return (
    <button
      onClick={copy}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary/60 px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-secondary active:scale-[0.97]"
    >
      {status === 'copied' ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Link className="size-4" aria-hidden="true" />
      )}
      {status === 'copied'
        ? 'Copied!'
        : status === 'failed'
          ? "Couldn't copy. Use the address bar."
          : 'Copy link to directions'}
    </button>
  )
}

// ── An event ────────────────────────────────────────────────────────────

export function EventDetail({
  event,
  backButtonRef,
  onBack,
  onNavigate,
  bookedSpaceIds,
  onBook,
}: {
  event: ScheduledEvent
  backButtonRef: Ref<HTMLButtonElement>
  onBack: () => void
  onNavigate: (space: Space) => void
  bookedSpaceIds: Set<string>
  onBook: (spaceId: string) => void
}) {
  return (
    <section
      className="floating-panel kiosk-fade-in overflow-hidden"
      aria-label={`Event: ${event.title}`}
    >
      <BackButton ref={backButtonRef} onClick={onBack} />
      <div className="flex items-center gap-3 border-b border-border/30 px-5 pb-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-50"
          aria-hidden="true"
        >
          <Calendar className="size-6 text-sky-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{event.title}</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden="true" />
              {event.time} – {event.endTime}
            </span>
            {event.space && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                {event.space.name}
              </span>
            )}
            <EventBadge category={event.category} />
          </div>
        </div>
      </div>
      <EventInfo
        event={event}
        bookedSpaceIds={bookedSpaceIds}
        onBook={onBook}
        onNavigate={onNavigate}
      />
    </section>
  )
}
