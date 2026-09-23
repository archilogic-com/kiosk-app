/**
 * Stand-in data for the parts of the kiosk the floor plan does not know
 * about: today's events, the weather, and meeting-room equipment. A real
 * deployment would read these from a calendar, a weather service and a
 * facilities system; here they are illustrative, not properties of the floor.
 */
import type { ScheduledEvent, Space } from '#/kiosk-state'

export const COMPANY_NAME = 'Acme Corp'

/** Templates for mock events; `preferredCategories` picks a real space at runtime. */
const EVENT_TEMPLATES: Array<
  Omit<ScheduledEvent, 'space'> & { preferredCategories: string[] }
> = [
  {
    id: '1',
    time: '9:00 AM',
    endTime: '9:45 AM',
    title: 'Morning Yoga',
    description:
      'Start your day with a guided yoga session. All levels welcome. Mats provided.',
    organizer: 'Sarah Chen',
    attendeeCount: 12,
    category: 'wellness',
    preferredCategories: ['care', 'socialize'],
  },
  {
    id: '2',
    time: '11:00 AM',
    endTime: '12:00 PM',
    title: 'Marketing All-Hands',
    description:
      'Q1 campaign review, brand refresh update, and upcoming product launch timeline.',
    organizer: 'James Wilson',
    attendeeCount: 24,
    category: 'meeting',
    preferredCategories: ['meet'],
  },
  {
    id: '3',
    time: '1:00 PM',
    endTime: '2:00 PM',
    title: 'Lunch & Learn: AI Tools',
    description:
      'Hands-on demo of the latest AI tools transforming our workflow. Lunch provided.',
    organizer: 'Priya Patel',
    attendeeCount: 35,
    category: 'social',
    preferredCategories: ['socialize', 'meet'],
  },
  {
    id: '4',
    time: '3:00 PM',
    endTime: '4:30 PM',
    title: 'Product Sprint Review',
    description:
      'Demo completed features from Sprint 14, collect stakeholder feedback, plan next iteration.',
    organizer: 'Marcus Johnson',
    attendeeCount: 8,
    category: 'review',
    preferredCategories: ['meet', 'work'],
  },
]

/** Subcategories that should never host events. */
const NO_EVENTS_IN = ['restroom', 'wc', 'toilet', 'bathroom', 'shower']

/**
 * Give each event template a real space from the floor: the first unused one
 * in its preferred categories, or failing that any unused one.
 */
export function buildMockEvents(spaces: Space[]): ScheduledEvent[] {
  const used = new Set<string>()
  const available = (space: Space) =>
    !used.has(space.id) &&
    !NO_EVENTS_IN.includes(space.subCategory.toLowerCase())

  return EVENT_TEMPLATES.map(({ preferredCategories, ...event }) => {
    const space =
      preferredCategories
        .map((category) =>
          spaces.find((s) => s.category === category && available(s)),
        )
        .find(Boolean) ??
      spaces.find(available) ??
      null
    if (space) used.add(space.id)
    return {
      ...event,
      attendeeCount: space?.seatCapacity
        ? Math.min(event.attendeeCount, space.seatCapacity)
        : event.attendeeCount,
      space,
    }
  })
}

export const MOCK_WEATHER = {
  location: 'Asheville, NC',
  currentTempF: 47,
  condition: 'partly-cloudy',
  hourly: [
    { hour: '4 PM', tempF: 45, condition: 'partly-cloudy' },
    { hour: '5 PM', tempF: 43, condition: 'cloudy' },
    { hour: '6 PM', tempF: 40, condition: 'cloudy' },
    { hour: '7 PM', tempF: 38, condition: 'rainy' },
  ],
} as const

export type Amenity = 'screen' | 'whiteboard' | 'phone' | 'projector'

/**
 * Meeting-room equipment, so the space detail card has something to show.
 * The Space Graph has no equipment model; a real deployment would read this
 * from custom attributes on the space, or from an AV inventory.
 */
export function demoAmenities(space: Space): Amenity[] {
  if (space.category !== 'meet') return []
  const amenities: Amenity[] = ['screen', 'whiteboard', 'phone']
  if (space.seatCapacity != null && space.seatCapacity > 15) {
    amenities.push('projector')
  }
  return amenities
}
