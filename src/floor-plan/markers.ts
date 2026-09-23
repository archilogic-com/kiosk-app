/**
 * HTML markers on the plan: the draggable pins at either end of a route, and
 * avatars on occupied workstations. Both are `floorPlan.addHtmlMarker`, styled
 * by `markers.css`, which the app can restyle through the `--kiosk-pin-*` and
 * `--kiosk-avatar-*` custom properties.
 */
import { useEffect, useEffectEvent, useRef } from 'react'
import type { FloorPlanEngine, Vector2 } from '@archilogic/floor-plan-sdk'
import { spaceAt } from '#/floor-plan/engine'
import { avatarColor, getInitials } from '#/kiosk-state'
import type { PlacedPoint, Workstation } from '#/kiosk-state'
import '#/floor-plan/markers.css'

type HtmlMarker = ReturnType<FloorPlanEngine['addHtmlMarker']>

/** Tray padding (16px) plus the dot's radius (6px). */
const DOT_OFFSET_X = 22

/**
 * A labelled pin the visitor can pick up and move.
 *
 * Both ends of a route are one of these: a tray showing where it sits, and a
 * drag that re-reads the space underneath as it goes. Pointer handlers live
 * on the window rather than the element so a drag survives the pointer
 * leaving the tray, and live updates are throttled to one per frame.
 */
export class DraggableMarker {
  private readonly el = document.createElement('div')
  private readonly labelEl = document.createElement('span')
  private readonly marker: HtmlMarker
  private dragging = false
  private frame = 0

  constructor(
    private readonly floorPlan: FloorPlanEngine,
    private readonly options: {
      position: Vector2
      label: string
      /** Text before the label, e.g. "You are here: ". */
      prefix?: string
      /** Colour of the dot; `--kiosk-pin-accent` when omitted. */
      dotColor?: string
      /** Ring the dot with a pulse, to say "this is you". */
      pulse?: boolean
      /** Fires once a frame while dragging, then once on release. */
      onMove: (point: PlacedPoint) => void
    },
  ) {
    const { position, label, prefix, dotColor, pulse } = options

    const dot = document.createElement('span')
    dot.className = pulse
      ? 'kiosk-pin__dot kiosk-pin__dot--pulse'
      : 'kiosk-pin__dot'
    if (dotColor) dot.style.setProperty('--kiosk-pin-dot', dotColor)

    this.labelEl.className = 'kiosk-pin__label'
    this.labelEl.textContent = label

    const text = document.createElement('span')
    text.className = 'kiosk-pin__text'
    if (prefix) text.append(prefix)
    text.append(this.labelEl)

    this.el.className = 'kiosk-pin'
    this.el.append(dot, text)
    this.el.addEventListener('pointerdown', this.onPointerDown)

    // The engine centres the element on the point; line the dot up with it
    // instead. The marker measures the element as it is added.
    this.marker = floorPlan.addHtmlMarker({ position, el: this.el })
    this.marker.set({ offset: [this.marker.size[0] / 2 - DOT_OFFSET_X, 0] })
  }

  get isDragging(): boolean {
    return this.dragging
  }

  /** Put the marker somewhere else, as when a drag is undone by a reset. */
  moveTo(position: Vector2, label: string): void {
    this.marker.set({ position })
    this.labelEl.textContent = label
  }

  destroy(): void {
    this.endDrag()
    this.el.removeEventListener('pointerdown', this.onPointerDown)
    this.marker.remove()
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.dragging = true
    this.el.classList.add('kiosk-pin--dragging')
    // Otherwise the engine treats this as a click on the plan beneath.
    event.stopPropagation()
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
  }

  private onPointerMove = (event: PointerEvent): void => {
    const position = this.floorPlan.getPlanPosition([
      event.clientX,
      event.clientY,
    ])
    this.marker.set({ position })
    if (this.frame) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.report(position)
    })
  }

  private onPointerUp = (event: PointerEvent): void => {
    this.endDrag()
    this.report(this.floorPlan.getPlanPosition([event.clientX, event.clientY]))
  }

  private report(position: Vector2): void {
    const name = spaceAt(this.floorPlan, position)?.name ?? 'Space'
    this.labelEl.textContent = name
    this.options.onMove({ position, name })
  }

  private endDrag(): void {
    this.dragging = false
    this.el.classList.remove('kiosk-pin--dragging')
    cancelAnimationFrame(this.frame)
    this.frame = 0
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
  }
}

const HIGHLIGHTED = 'kiosk-avatar__circle--highlighted'

/**
 * Avatar markers for occupied workstations, one ringed while `highlightedId`
 * names it.
 */
export function usePeopleMarkers(
  floorPlan: FloorPlanEngine,
  workstations: Workstation[],
  highlightedId: string | null,
  callbacks: {
    onHover: (workstation: Workstation | null) => void
    onClick: (workstation: Workstation) => void
  },
): void {
  const onHover = useEffectEvent(callbacks.onHover)
  const onClick = useEffectEvent(callbacks.onClick)
  const circles = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    const byId = new Map<string, HTMLElement>()
    const markers = workstations.flatMap((workstation) => {
      const name = workstation.occupantName
      if (!name) return []

      const circle = document.createElement('div')
      circle.className = 'kiosk-avatar__circle'
      circle.style.backgroundColor = avatarColor(name)
      circle.textContent = getInitials(name)
      circle.addEventListener('pointerenter', () => onHover(workstation))
      circle.addEventListener('pointerleave', () => onHover(null))
      circle.addEventListener('click', (event) => {
        event.stopPropagation()
        onClick(workstation)
      })
      byId.set(workstation.id, circle)

      // The engine owns the transform of the element it is given, so the
      // visible circle is a child that can be styled and scaled freely.
      const wrapper = document.createElement('div')
      wrapper.className = 'kiosk-avatar'
      wrapper.append(circle)
      return [
        floorPlan.addHtmlMarker({
          position: workstation.position,
          el: wrapper,
        }),
      ]
    })
    circles.current = byId
    return () => markers.forEach((marker) => marker.remove())
  }, [floorPlan, workstations])

  useEffect(() => {
    const circle = highlightedId && circles.current.get(highlightedId)
    if (!circle) return
    circle.classList.add(HIGHLIGHTED)
    return () => circle.classList.remove(HIGHLIGHTED)
  }, [highlightedId, workstations])
}
