import { useEffect, useEffectEvent, useId, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Armchair,
  ChevronDown,
  Layers,
  Minus,
  Paintbrush,
  Palette,
  Type,
  Users,
  ZoomIn,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { THEME_PRESETS, generateThemePreviews } from '#/floor-plan/theme'
import type { LayerSettings, ThemeOverrides } from '#/floor-plan/theme'
import type { PathStyle } from '#/floor-plan/wayfinding'
import { SourceLink } from '#/components/SourceLink'
import { Switch, ThemeEditor } from '#/components/ThemeEditor'

/**
 * What an operator can change about the plan. Not part of the visitor's
 * journey, so a reset leaves these alone.
 */
export interface MapSettings extends LayerSettings, PathStyle {
  showPeople: boolean
  zoomOnNavigate: boolean
  themeOverrides: ThemeOverrides
}

export const DEFAULT_SETTINGS: MapSettings = {
  showCategories: false,
  showLabels: true,
  showPeople: false,
  showAssets: true,
  zoomOnNavigate: false,
  smoothing: 6,
  thickness: 10,
  dashed: true,
  themeOverrides: THEME_PRESETS[0].overrides,
}

type SwitchKey = {
  [K in keyof MapSettings]: MapSettings[K] extends boolean ? K : never
}[keyof MapSettings]

interface SwitchSetting {
  key: SwitchKey
  label: string
  description: string
  icon: LucideIcon
  iconClass: string
}

const LAYER_SWITCHES: SwitchSetting[] = [
  {
    key: 'showCategories',
    label: 'Zone colors',
    description: 'Category shading',
    icon: Palette,
    iconClass: 'bg-amber-50 text-amber-600',
  },
  {
    key: 'showLabels',
    label: 'Space names',
    description: 'Labels on the plan',
    icon: Type,
    iconClass: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'showPeople',
    label: 'People',
    description: 'Workstation occupants',
    icon: Users,
    iconClass: 'bg-violet-50 text-violet-600',
  },
  {
    key: 'showAssets',
    label: 'Furniture',
    description: 'Assets on the plan',
    icon: Armchair,
    iconClass: 'bg-emerald-50 text-emerald-600',
  },
]

const NAVIGATION_SWITCHES: SwitchSetting[] = [
  {
    key: 'zoomOnNavigate',
    label: 'Zoom on navigate',
    description: 'Auto-zoom to path',
    icon: ZoomIn,
    iconClass: 'bg-sky-50 text-sky-600',
  },
  {
    key: 'dashed',
    label: 'Dashed path',
    description: 'Dashed line style',
    icon: Minus,
    iconClass: 'bg-slate-50 text-slate-600',
  },
]

/** The layers and settings panel in the top-right corner, and the link to this demo's source. */
export function MapControls({
  settings,
  onChange,
}: {
  settings: MapSettings
  onChange: (change: Partial<MapSettings>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [themesOpen, setThemesOpen] = useState(false)
  const previews = useThemePreviews(expanded && themesOpen, settings)

  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setExpanded(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  if (!expanded) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={() => setExpanded(true)}
          className="floating-panel flex size-10 items-center justify-center transition-colors hover:bg-accent"
          aria-label="Open layers and settings panel"
        >
          <Layers className="size-5 text-muted-foreground" aria-hidden="true" />
        </button>
        <SourceLink compact />
      </div>
    )
  }

  const switchRow = ({ key, ...row }: SwitchSetting) => (
    <SwitchRow
      key={key}
      {...row}
      checked={settings[key]}
      onChange={(checked) => onChange({ [key]: checked })}
    />
  )

  return (
    <section
      className="floating-panel kiosk-scroll max-h-[calc(100vh-2rem)] w-[30rem] overflow-x-hidden overflow-y-auto transition-[width]"
      aria-label="Layers and settings"
      onWheel={(event) => event.stopPropagation()}
    >
      <button
        onClick={() => setExpanded(false)}
        aria-expanded={expanded}
        aria-label="Close layers and settings panel"
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent"
      >
        <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
        Layers & Settings
      </button>

      <div
        className="border-t border-border/30 px-2 py-2"
        role="group"
        aria-label="Layer visibility"
      >
        {LAYER_SWITCHES.map(switchRow)}
      </div>

      <div
        className="border-t border-border/30 px-2 py-2"
        role="group"
        aria-label="Navigation settings"
      >
        <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">
          Navigation
        </p>
        {NAVIGATION_SWITCHES.map(switchRow)}
        <SliderRow
          label="Path smoothing"
          iconClass="bg-teal-50 text-teal-600"
          icon={<path d="M2 12 Q8 2 14 8" strokeWidth="2" />}
          value={settings.smoothing}
          min={0}
          max={12}
          step={1}
          onChange={(smoothing) => onChange({ smoothing })}
        />
        <SliderRow
          label="Path thickness"
          iconClass="bg-indigo-50 text-indigo-600"
          icon={
            <line
              x1="2"
              y1="8"
              x2="14"
              y2="8"
              strokeWidth={settings.thickness / 4}
            />
          }
          value={settings.thickness}
          min={4}
          max={20}
          step={2}
          onChange={(thickness) => onChange({ thickness })}
        />
      </div>

      <div className="border-t border-border/30 px-2 py-2">
        <button
          onClick={() => setThemesOpen(!themesOpen)}
          aria-expanded={themesOpen}
          aria-label="Toggle themes"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
        >
          <RowIcon className="bg-rose-50 text-rose-600">
            <Paintbrush className="size-4" />
          </RowIcon>
          <RowText label="Themes" description="Presets & element styles" />
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${
              themesOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>
        {themesOpen && (
          <ThemeEditor
            overrides={settings.themeOverrides}
            onChange={(themeOverrides) => onChange({ themeOverrides })}
            zonesShown={settings.showCategories}
            onShowZones={(showCategories) => onChange({ showCategories })}
            previews={previews}
          />
        )}
      </div>

      <SourceLink />
    </section>
  )
}

/**
 * A thumbnail of the floor under each preset, rendered by a second, hidden
 * engine the first time the themes are opened. The layers in force then are
 * used throughout, so toggling one mid-run cannot mix two different views.
 */
function useThemePreviews(
  wanted: boolean,
  layers: LayerSettings,
): Record<string, string> {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const needed = wanted && Object.keys(previews).length === 0
  const generate = useEffectEvent((signal: AbortSignal) =>
    generateThemePreviews(layers, signal),
  )

  useEffect(() => {
    if (!needed) return
    const controller = new AbortController()
    generate(controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setPreviews(result)
      },
      (error: unknown) => {
        console.warn('Theme previews could not be generated', error)
      },
    )
    return () => controller.abort()
  }, [needed])

  return previews
}

function RowIcon({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) {
  return (
    <div
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  )
}

function RowText({
  label,
  description,
}: {
  label: string
  description: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium leading-tight">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function SwitchRow({
  label,
  description,
  icon: Icon,
  iconClass,
  checked,
  onChange,
}: Omit<SwitchSetting, 'key'> & {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={`${label}: ${description}`}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
    >
      <RowIcon className={iconClass}>
        <Icon className="size-4" />
      </RowIcon>
      <RowText label={label} description={description} />
      <Switch checked={checked} />
    </button>
  )
}

function SliderRow({
  label,
  icon,
  iconClass,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  /** The inside of a 16×16 stroked SVG. */
  icon: ReactNode
  iconClass: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
      <RowIcon className={iconClass}>
        <svg
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
        >
          {icon}
        </svg>
      </RowIcon>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-medium leading-tight">
          {label}
        </label>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mt-1 h-1 w-full cursor-pointer accent-primary"
        />
      </div>
      <span
        className="shrink-0 text-xs tabular-nums text-muted-foreground"
        aria-hidden="true"
      >
        {value}
      </span>
    </div>
  )
}
