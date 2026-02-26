import type { FloorPlanEngine, Vector2 } from '@archilogic/floor-plan-sdk'
import type { PlacedPoint } from '#/core/domain/state'
import { spaceNameAt } from '#/core/sdk/queries'
import '#/core/sdk/markers.css'

type HtmlMarker = ReturnType<FloorPlanEngine['addHtmlMarker']>

/** Tray padding (16px) plus the dot's radius (6px). */
const DOT_OFFSET_X = 22

export interface DraggableMarkerOptions {
  position: Vector2
  label: string
  /** Text before the label, e.g. "You are here: ". */
  prefix?: string
  /** Colour of the dot; the host's accent colour when omitted. */
  dotColor?: string
  /** Ring the dot with a pulse, to say "this is you". */
  pulse?: boolean
  /** Fires continuously while dragging, then once on release. */
  onMove?: (point: PlacedPoint) => void
  onDragStateChange?: (dragging: boolean) => void
}

/**
 * A labelled marker the visitor can pick up and move.
 *
 * Both ends of a route are the same object: a tray showing where it sits, and
 * a drag that re-reads the space underneath as it goes. Pointer handlers live
 * on the window rather than the element so a drag survives the pointer leaving
 * the tray, and live updates are throttled to one per frame.
 *
 * Styled by `markers.css`, which the host can override through the
 * `--kiosk-pin-*` custom properties or by restyling `.kiosk-pin`.
 */
export class DraggableMarker {
  private readonly el: HTMLDivElement
  private readonly labelEl: HTMLSpanElement
  private readonly marker: HtmlMarker
  private dragging = false
  private rafId = 0
  private destroyed = false

  constructor(
    private readonly floorPlan: FloorPlanEngine,
    private readonly options: DraggableMarkerOptions,
  ) {
    const { position, label, prefix, dotColor, pulse } = options

    const dot = document.createElement('span')
    dot.className = pulse
      ? 'kiosk-pin__dot kiosk-pin__dot--pulse'
      : 'kiosk-pin__dot'
    if (dotColor) dot.style.setProperty('--kiosk-pin-dot', dotColor)

    this.labelEl = document.createElement('span')
    this.labelEl.className = 'kiosk-pin__label'
    this.labelEl.textContent = label

    const text = document.createElement('span')
    text.className = 'kiosk-pin__text'
    if (prefix) text.append(prefix)
    text.append(this.labelEl)

    this.el = document.createElement('div')
    this.el.className = 'kiosk-pin'
    this.el.append(dot, text)

    this.marker = floorPlan.addHtmlMarker({ position, el: this.el })

    // The tray's width is only known once it is in the DOM, and the dot has to
    // line up with the point it marks rather than the tray's centre.
    requestAnimationFrame(() => {
      if (this.destroyed) return
      this.marker.set({
        position,
        offset: [this.marker.size[0] / 2 - DOT_OFFSET_X, 0],
      })
    })

    this.el.addEventListener('pointerdown', this.onPointerDown)
  }

  get isDragging(): boolean {
    return this.dragging
  }

  setLabel(label: string): void {
    this.labelEl.textContent = label
  }

  /** Put the marker somewhere else, as when a drag is undone by a reset. */
  moveTo(position: Vector2, label: string): void {
    this.marker.set({ position })
    this.setLabel(label)
  }

  destroy(): void {
    this.destroyed = true
    this.endDrag()
    this.el.removeEventListener('pointerdown', this.onPointerDown)
    this.marker.remove()
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.dragging = true
    this.el.classList.add('kiosk-pin--dragging')
    // Otherwise the engine treats this as a click on the plan beneath.
    event.stopPropagation()
    this.options.onDragStateChange?.(true)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging) return
    const position = this.floorPlan.getPlanPosition([
      event.clientX,
      event.clientY,
    ])
    this.marker.set({ position })
    if (this.rafId) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0
      this.report(position)
    })
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.dragging) return
    this.endDrag()
    this.report(this.floorPlan.getPlanPosition([event.clientX, event.clientY]))
  }

  private report(position: Vector2): void {
    const name = spaceNameAt(this.floorPlan, position)
    this.setLabel(name)
    this.options.onMove?.({ position, name })
  }

  private endDrag(): void {
    this.dragging = false
    this.el.classList.remove('kiosk-pin--dragging')
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    this.options.onDragStateChange?.(false)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
  }
}
