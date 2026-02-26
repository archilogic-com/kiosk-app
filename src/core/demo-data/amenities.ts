export type AmenityType = 'screen' | 'whiteboard' | 'phone' | 'projector'

/**
 * Stand-in equipment data, so the space detail card has something to show.
 *
 * The Space Graph has no equipment model. A real deployment would read this
 * from custom attributes on the space, or join against whatever system already
 * knows: room booking, AV inventory, facilities. What this returns is
 * illustrative, not a property of the floor.
 */
export function demoAmenities(
  category: string,
  seatCapacity?: number,
): AmenityType[] {
  if (category !== 'meet') return []
  const amenities: AmenityType[] = ['screen', 'whiteboard', 'phone']
  if (seatCapacity != null && seatCapacity > 15) amenities.push('projector')
  return amenities
}
