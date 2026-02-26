import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { Workstation } from '#/core/domain/types'
import { avatarColor, getInitials } from '#/core/domain/avatar'
import '#/core/sdk/markers.css'

type HtmlMarker = ReturnType<FloorPlanEngine['addHtmlMarker']>

const HIGHLIGHTED = 'kiosk-avatar__circle--highlighted'

export interface PeopleMarkerCallbacks {
  onHover?: (workstation: Workstation | null) => void
  onClick?: (workstation: Workstation) => void
}

/**
 * Avatar markers for occupied workstations.
 *
 * The SDK owns the transform on the marker element it is given, so the visible
 * circle is a child: it can be styled and scaled without disturbing
 * positioning. Styled by `markers.css`.
 */
export class PeopleMarkerLayer {
  private markers: HtmlMarker[] = []
  private circles = new Map<string, HTMLDivElement>()
  private highlightedId: string | null = null

  constructor(
    private readonly floorPlan: FloorPlanEngine,
    private readonly callbacks: PeopleMarkerCallbacks = {},
  ) {}

  setWorkstations(workstations: Workstation[]): void {
    this.clear()
    for (const workstation of workstations) {
      if (!workstation.occupantName) continue
      this.addMarker(workstation, workstation.occupantName)
    }
    // Re-assert any highlight that survived the rebuild.
    if (this.highlightedId) this.paint(this.highlightedId, true)
  }

  highlight(workstationId: string | null): void {
    if (this.highlightedId === workstationId) return
    if (this.highlightedId) this.paint(this.highlightedId, false)
    if (workstationId) this.paint(workstationId, true)
    this.highlightedId = workstationId
  }

  destroy(): void {
    this.clear()
    this.highlightedId = null
  }

  private paint(id: string, highlighted: boolean): void {
    this.circles.get(id)?.classList.toggle(HIGHLIGHTED, highlighted)
  }

  private clear(): void {
    for (const marker of this.markers) marker.remove()
    this.markers = []
    this.circles.clear()
  }

  private addMarker(workstation: Workstation, name: string): void {
    const wrapper = document.createElement('div')
    wrapper.className = 'kiosk-avatar'

    const circle = document.createElement('div')
    circle.className = 'kiosk-avatar__circle'
    circle.style.backgroundColor = avatarColor(name)
    circle.textContent = getInitials(name)

    circle.addEventListener('pointerenter', () =>
      this.callbacks.onHover?.(workstation),
    )
    circle.addEventListener('pointerleave', () =>
      this.callbacks.onHover?.(null),
    )
    circle.addEventListener('click', (event) => {
      event.stopPropagation()
      this.callbacks.onClick?.(workstation)
    })

    wrapper.appendChild(circle)
    this.markers.push(
      this.floorPlan.addHtmlMarker({
        position: workstation.position,
        el: wrapper,
      }),
    )
    this.circles.set(workstation.id, circle)
  }
}
