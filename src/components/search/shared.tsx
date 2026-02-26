import React from 'react'
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Calendar,
  CornerUpLeft,
  CornerUpRight,
  DoorOpen,
  Heart,
  MapPinCheck,
  Monitor,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { avatarColor, getInitials } from '#/core/domain/avatar'
import { KIOSK_COLORS } from '#/core/domain/types'
import type { StepKind } from '#/core/wayfinding/directions'

/** Icons for the search categories, keyed as `SEARCH_CATEGORIES` is. */
export const CATEGORY_CHIP_ICONS: Record<string, LucideIcon> = {
  people: Users,
  meet: DoorOpen,
  socialize: Users,
  work: Monitor,
  care: Heart,
  events: Calendar,
}

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  people: <Users className="size-5" aria-hidden="true" />,
  meet: <DoorOpen className="size-5" aria-hidden="true" />,
  socialize: <Users className="size-5" aria-hidden="true" />,
  work: <Monitor className="size-5" aria-hidden="true" />,
  care: <Heart className="size-5" aria-hidden="true" />,
  events: <Calendar className="size-5" aria-hidden="true" />,
}

export const CATEGORY_BG: Record<string, string> = {
  people: 'bg-violet-50 hover:bg-violet-100/60',
  meet: 'bg-amber-50 hover:bg-amber-100/60',
  socialize: 'bg-emerald-50 hover:bg-emerald-100/60',
  work: 'bg-blue-50 hover:bg-blue-100/60',
  care: 'bg-rose-50 hover:bg-rose-100/60',
  events: 'bg-sky-50 hover:bg-sky-100/60',
}

export function Avatar({ name }: { name: string }) {
  return (
    <div
      className="flex size-10 items-center justify-center rounded-full text-sm font-semibold"
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

const STEP_ICONS: Record<StepKind, LucideIcon> = {
  walk: ArrowUp,
  'turn-left': CornerUpLeft,
  'turn-right': CornerUpRight,
  'slight-left': ArrowUpLeft,
  'slight-right': ArrowUpRight,
  arrive: MapPinCheck,
}

export function stepIcon(kind: StepKind) {
  const Icon = STEP_ICONS[kind]
  const tone = kind === 'arrive' ? 'text-primary' : 'text-muted-foreground'
  return <Icon className={`size-4 ${tone}`} aria-hidden="true" />
}
