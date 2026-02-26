import type { EventCategory, ScheduledEvent, Space } from '#/core/domain/types'

/** Templates for mock events; preferredCategories picks a real space at runtime */
const EVENT_TEMPLATES: Array<{
  id: string
  time: string
  endTime: string
  title: string
  description: string
  organizer: string
  attendeeCount: number
  category: EventCategory
  preferredCategories: string[]
}> = [
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

/** Subcategories that should never host events (bathrooms, showers, etc.) */
const EXCLUDED_EVENT_SUBCATEGORIES = [
  'restroom',
  'wc',
  'toilet',
  'bathroom',
  'shower',
]

function isEventEligible(space: Space): boolean {
  return !EXCLUDED_EVENT_SUBCATEGORIES.includes(space.subCategory.toLowerCase())
}

/**
 * Build mock events by assigning real spaces from the floor plan.
 * Each template picks a distinct space matching its preferred categories.
 */
export function buildMockEvents(spaces: Space[]): ScheduledEvent[] {
  const usedIds = new Set<string>()

  return EVENT_TEMPLATES.map((template) => {
    let space: Space | null = null

    // Try preferred categories in order, picking an unused eligible space
    for (const cat of template.preferredCategories) {
      const match = spaces.find(
        (r) => r.category === cat && !usedIds.has(r.id) && isEventEligible(r),
      )
      if (match) {
        space = match
        break
      }
    }

    // Fallback: any unused eligible named space
    if (!space) {
      space =
        spaces.find((r) => !usedIds.has(r.id) && isEventEligible(r)) ?? null
    }

    if (space) usedIds.add(space.id)

    return {
      id: template.id,
      time: template.time,
      endTime: template.endTime,
      title: template.title,
      description: template.description,
      organizer: template.organizer,
      attendeeCount: space?.seatCapacity
        ? Math.min(template.attendeeCount, space.seatCapacity)
        : template.attendeeCount,
      category: template.category,
      space,
    }
  })
}

export interface HourlyForecast {
  hour: string
  tempF: number
  condition: 'sunny' | 'cloudy' | 'rainy' | 'partly-cloudy'
}

export interface WeatherData {
  location: string
  currentTempF: number
  condition: 'sunny' | 'cloudy' | 'rainy' | 'partly-cloudy'
  hourly: HourlyForecast[]
}

export interface DashboardConfig {
  companyName: string
  logoUrl: string | null
}

export const MOCK_WEATHER: WeatherData = {
  location: 'Asheville, NC',
  currentTempF: 47,
  condition: 'partly-cloudy',
  hourly: [
    { hour: '4 PM', tempF: 45, condition: 'partly-cloudy' },
    { hour: '5 PM', tempF: 43, condition: 'cloudy' },
    { hour: '6 PM', tempF: 40, condition: 'cloudy' },
    { hour: '7 PM', tempF: 38, condition: 'rainy' },
  ],
}

export const DASHBOARD_CONFIG: DashboardConfig = {
  companyName: 'Acme Corp',
  logoUrl: null,
}
