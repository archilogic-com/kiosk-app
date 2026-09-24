import { useEffect, useRef, useState } from 'react'
import { Accordion } from 'radix-ui'
import { Check, ChevronRight, Copy, Eye, EyeOff, RotateCcw } from 'lucide-react'
import {
  CATEGORY_COLORS,
  DEFAULT_STYLES,
  ELEMENT_GROUPS,
  THEME_DEFAULTS,
  THEME_PRESETS,
  applyPalette,
  extractPalette,
  floorPlanStyle,
  setCategoryColor,
  setElementStyle,
  toggleElementHidden,
} from '#/floor-plan/theme'
import type {
  CategoryColor,
  ElementStyle,
  StyledType,
  ThemeOverrides,
  ThemePalette,
} from '#/floor-plan/theme'
import { CATEGORY_LABELS } from '#/kiosk-state'

const PALETTE_ROLES: Array<{
  key: keyof ThemePalette
  label: string
  description: string
}> = [
  {
    key: 'wall',
    label: 'Walls & Columns',
    description: 'Walls, boundary walls, columns',
  },
  {
    key: 'wallDark',
    label: 'Wall Accent',
    description: 'Boundary wall & divider strokes',
  },
  {
    key: 'light',
    label: 'Openings & Details',
    description: 'Doors, windows, beams, casework',
  },
  { key: 'medium', label: 'Furniture', description: 'Curtain walls, assets' },
  {
    key: 'stroke',
    label: 'Outlines',
    description: 'Shared stroke across elements',
  },
  { key: 'circ', label: 'Circulation', description: 'Stairs, slabs' },
  { key: 'spaceFill', label: 'Space Fill', description: 'Space background' },
  {
    key: 'spaceStroke',
    label: 'Space Borders',
    description: 'Space strokes, divider fills',
  },
]

/**
 * An editor over the SDK's theme: presets, a palette that restyles every
 * element type at once, zone colours, labels, and per-element overrides.
 */
export function ThemeEditor({
  overrides,
  onChange,
  zonesShown,
  onShowZones,
  previews,
}: {
  overrides: ThemeOverrides
  onChange: (overrides: ThemeOverrides) => void
  /** Whether the zone colours layer is on; the zone colours only show then. */
  zonesShown: boolean
  onShowZones: (shown: boolean) => void
  /** Thumbnails by preset id, once they have been rendered. */
  previews: Record<string, string>
}) {
  const [copied, setCopied] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const activePreset = THEME_PRESETS.find((p) => p.overrides === overrides)
  const palette = extractPalette(overrides.byType)
  const labelOutline =
    overrides.roomStamp?.textOutline ?? THEME_DEFAULTS.labelOutline

  const setZoneColor = (category: string, change: Partial<CategoryColor>) => {
    onChange(setCategoryColor(overrides, category, change))
    onShowZones(true)
  }

  const setRoomStamp = (change: ThemeOverrides['roomStamp']) =>
    onChange({ ...overrides, roomStamp: { ...overrides.roomStamp, ...change } })

  const copyThemeJson = () => {
    const style = floorPlanStyle({
      layers: { showCategories: true, showLabels: true, showAssets: true },
      overrides,
    })
    navigator.clipboard
      .writeText(JSON.stringify(style, null, 2))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setCopied(false))
  }

  return (
    <div className="space-y-1 pt-1">
      <div className="px-2 pb-1">
        <SectionHeading>Presets</SectionHeading>
        <div className="grid grid-cols-2 gap-2 px-1">
          {THEME_PRESETS.map((preset) => {
            const active = preset === activePreset
            const [bg, wall, border, accent] = preset.swatches
            const previewUrl = previews[preset.id]
            return (
              <button
                key={preset.id}
                onClick={() => onChange(preset.overrides)}
                className={`group flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-all ${
                  active
                    ? 'ring-1.5 bg-primary/10 ring-primary/40'
                    : 'hover:bg-accent'
                }`}
                aria-pressed={active}
                aria-label={`${preset.name}: ${preset.description}`}
                title={preset.description}
              >
                {previewUrl ? (
                  <div
                    className="w-full overflow-hidden rounded-[3px] border border-border/30"
                    aria-hidden="true"
                  >
                    <img
                      src={previewUrl}
                      alt=""
                      className="block aspect-[3/2] w-full object-cover"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div
                    className="flex aspect-[3/2] w-full items-center justify-center gap-px overflow-hidden rounded-[3px] border border-border/30"
                    style={{ backgroundColor: bg }}
                    aria-hidden="true"
                  >
                    <span
                      className="h-3 w-1.5 rounded-sm"
                      style={{ backgroundColor: wall }}
                    />
                    <span
                      className="h-2.5 w-3.5 rounded-[2px] border"
                      style={{ backgroundColor: bg, borderColor: border }}
                    />
                    <span
                      className="h-2.5 w-3.5 rounded-[2px]"
                      style={{ backgroundColor: accent, opacity: 0.6 }}
                    />
                    <span
                      className="h-3 w-1.5 rounded-sm"
                      style={{ backgroundColor: wall }}
                    />
                  </div>
                )}
                <span
                  className={`text-[10px] leading-tight ${
                    active
                      ? 'font-medium text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {preset.name}
                </span>
              </button>
            )
          })}
        </div>
        {!activePreset && (
          <p className="px-1 pt-1 text-[10px] italic text-muted-foreground/60">
            Custom, edited below
          </p>
        )}
      </div>

      <div className="px-2">
        <SectionHeading>Palette</SectionHeading>
        <ColorRow
          label="Background"
          color={overrides.background ?? THEME_DEFAULTS.background}
          onChange={(background) => onChange({ ...overrides, background })}
        />
        {PALETTE_ROLES.map((role) => (
          <ColorRow
            key={role.key}
            label={role.label}
            description={role.description}
            color={palette[role.key]}
            onChange={(hex) =>
              onChange(applyPalette(overrides, { ...palette, [role.key]: hex }))
            }
          />
        ))}
      </div>

      <div className="border-t border-border/20 px-2 pt-2">
        <div className="flex items-start justify-between pr-2">
          <SectionHeading>Zone Colors</SectionHeading>
          <button
            role="switch"
            aria-checked={zonesShown}
            aria-label="Show zone colors on the plan"
            title="Show on the plan"
            onClick={() => onShowZones(!zonesShown)}
          >
            <Switch checked={zonesShown} small />
          </button>
        </div>
        {Object.entries(CATEGORY_COLORS).map(([category, defaults]) => {
          const label = CATEGORY_LABELS[category] ?? category
          const color = { ...defaults, ...overrides.categoryColors?.[category] }
          return (
            <div key={category} className="flex items-center gap-2 px-2 py-1">
              <span className="min-w-0 flex-1 text-xs text-foreground/80">
                {label}
              </span>
              <ColorSwatch
                color={color.fill}
                onChange={(fill) => setZoneColor(category, { fill })}
                label={`${label} fill`}
              />
              <Slider
                value={color.fillOpacity}
                onChange={(fillOpacity) =>
                  setZoneColor(category, { fillOpacity })
                }
                label={`${label} opacity`}
              />
            </div>
          )
        })}
      </div>

      <div className="border-t border-border/20 px-2 pt-2">
        <SectionHeading>Space Labels</SectionHeading>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="min-w-0 flex-1 text-xs text-foreground/80">
            Text color
          </span>
          <ColorSwatch
            color={overrides.roomStamp?.text ?? THEME_DEFAULTS.labelText}
            onChange={(text) => setRoomStamp({ text })}
            label="Space label text color"
          />
        </div>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="min-w-0 flex-1 text-xs text-foreground/80">
            Text outline
          </span>
          <button
            role="switch"
            aria-checked={labelOutline}
            aria-label="Space label text outline"
            onClick={() => setRoomStamp({ textOutline: !labelOutline })}
          >
            <Switch checked={labelOutline} small />
          </button>
        </div>
      </div>

      <div className="border-t border-border/20 pt-1">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center gap-1.5 px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase transition-colors hover:text-muted-foreground"
        >
          <ChevronRight
            className={`size-3 shrink-0 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
          Per-Element Overrides
        </button>
        {showAdvanced && (
          <Accordion.Root
            type="multiple"
            defaultValue={ELEMENT_GROUPS.map((g) => g.label)}
            className="space-y-0.5"
          >
            {ELEMENT_GROUPS.map(({ label, keys }) => (
              <Accordion.Item key={label} value={label}>
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase transition-colors hover:bg-accent">
                    <ChevronRight
                      className="size-3 shrink-0 transition-transform group-data-[state=open]:rotate-90"
                      aria-hidden="true"
                    />
                    {label}
                    <span className="ml-auto text-[10px] text-muted-foreground/40">
                      {keys.length}
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="pb-1">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 text-center text-[9px] text-muted-foreground/50">
                      <span className="w-3 shrink-0" />
                      <span className="min-w-0 flex-1" />
                      <span className="w-5 shrink-0">fill</span>
                      <span className="w-5 shrink-0">str</span>
                      <span className="w-12 shrink-0">fOp</span>
                      <span className="w-12 shrink-0">sOp</span>
                      <span className="w-10 shrink-0">sW</span>
                    </div>
                    {keys.map((type) => (
                      <ElementRow
                        key={type}
                        type={type}
                        style={{
                          ...DEFAULT_STYLES[type],
                          ...overrides.byType?.[type],
                        }}
                        hidden={overrides.hiddenTypes?.includes(type) ?? false}
                        onChange={(change) =>
                          onChange(setElementStyle(overrides, type, change))
                        }
                        onToggleHidden={() =>
                          onChange(toggleElementHidden(overrides, type))
                        }
                      />
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        )}
      </div>

      <div className="flex gap-1.5 border-t border-border/20 px-2 pt-2 pb-1">
        <button
          onClick={copyThemeJson}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          {copied ? 'Copied!' : 'Copy Theme JSON'}
        </button>
        <button
          onClick={() => onChange(THEME_PRESETS[0].overrides)}
          className="flex items-center justify-center rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
          aria-label="Reset theme to defaults"
          title="Reset to defaults"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/** The visual half of a switch; the row or button around it is the control. */
export function Switch({
  checked,
  small,
}: {
  checked: boolean
  small?: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative shrink-0 rounded-full transition-colors ${
        small ? 'h-4 w-7' : 'h-5 w-9'
      } ${checked ? 'bg-primary' : 'bg-muted-foreground/20'}`}
    >
      <div
        className={`absolute top-0.5 rounded-full bg-white shadow-sm transition-transform ${
          small ? 'size-3' : 'size-4'
        } ${
          checked
            ? small
              ? 'translate-x-3.5'
              : 'translate-x-4'
            : 'translate-x-0.5'
        }`}
      />
    </div>
  )
}

function SectionHeading({ children }: { children: string }) {
  return (
    <p className="pb-1 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
      {children}
    </p>
  )
}

function ColorRow({
  label,
  description,
  color,
  onChange,
}: {
  label: string
  description?: string
  color: string
  onChange: (hex: string) => void
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="min-w-0 flex-1">
        <span className="text-xs text-foreground/80">{label}</span>
        {description && (
          <span className="ml-1.5 text-[10px] text-muted-foreground/50">
            {description}
          </span>
        )}
      </div>
      <ColorSwatch color={color} onChange={onChange} label={label} />
      <span className="w-[3.2rem] text-right text-[10px] tabular-nums text-muted-foreground">
        {color}
      </span>
    </div>
  )
}

/** A colour input that restyles the plan at most every 80ms while dragged. */
function ColorSwatch({
  color,
  onChange,
  label,
}: {
  color: string
  onChange: (hex: string) => void
  label: string
}) {
  const lastCall = useRef(0)
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(pending.current), [])

  const throttledChange = (hex: string) => {
    clearTimeout(pending.current)
    const wait = 80 - (Date.now() - lastCall.current)
    const fire = () => {
      lastCall.current = Date.now()
      onChange(hex)
    }
    if (wait <= 0) fire()
    else pending.current = setTimeout(fire, wait)
  }

  return (
    <label className="relative size-5 shrink-0 cursor-pointer" title={label}>
      <span
        className="block size-full rounded border border-border/50"
        style={{ backgroundColor: color }}
      />
      <input
        type="color"
        value={color}
        onChange={(event) => throttledChange(event.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        aria-label={label}
      />
    </label>
  )
}

/** 0–1 as a slider from 0 to 100. */
function Slider({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (value: number) => void
  label: string
}) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={5}
      value={Math.round(value * 100)}
      onChange={(event) => onChange(Number(event.target.value) / 100)}
      className="h-1 w-12 shrink-0 cursor-pointer accent-primary"
      aria-label={label}
    />
  )
}

function ElementRow({
  type,
  style,
  hidden,
  onChange,
  onToggleHidden,
}: {
  type: StyledType
  style: ElementStyle
  hidden: boolean
  onChange: (change: Partial<ElementStyle>) => void
  onToggleHidden: () => void
}) {
  const name = type.replace(/^(element|layout):/, '')
  const VisibilityIcon = hidden ? EyeOff : Eye

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 ${hidden ? 'opacity-40' : ''}`}
    >
      <button
        onClick={onToggleHidden}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={`${hidden ? 'Show' : 'Hide'} ${name}`}
        title={hidden ? 'Show' : 'Hide'}
      >
        <VisibilityIcon className="size-3" aria-hidden="true" />
      </button>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
        {name}
      </span>
      <ColorSwatch
        color={style.fill}
        onChange={(fill) => onChange({ fill })}
        label={`${name} fill`}
      />
      <ColorSwatch
        color={style.stroke}
        onChange={(stroke) => onChange({ stroke })}
        label={`${name} stroke`}
      />
      <Slider
        value={style.fillOpacity}
        onChange={(fillOpacity) => onChange({ fillOpacity })}
        label={`${name} fill opacity`}
      />
      <Slider
        value={style.strokeOpacity ?? 1}
        onChange={(strokeOpacity) => onChange({ strokeOpacity })}
        label={`${name} stroke opacity`}
      />
      {/* 0 on the slider is the engine's native width */}
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={style.strokeWidth === 'native' ? 0 : style.strokeWidth}
        onChange={(event) => {
          const width = Number(event.target.value)
          onChange({ strokeWidth: width === 0 ? 'native' : width })
        }}
        className="h-1 w-10 shrink-0 cursor-pointer accent-primary"
        aria-label={`${name} stroke width`}
      />
    </div>
  )
}
