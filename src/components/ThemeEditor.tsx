import { useCallback, useMemo, useRef, useState } from 'react'
import { Accordion } from 'radix-ui'
import { Check, ChevronRight, Copy, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { cn } from '#/lib/utils'
import { buildFloorPlanTheme } from '#/core/theme/build-theme'
import { ELEMENT_GROUPS, FPE_DEFAULT_STYLES } from '#/core/theme/defaults'
import type {
  ElementStyleOverride,
  ThemeOverrides,
} from '#/core/theme/defaults'
import {
  CATEGORY_COLOR_DEFAULTS_HEX,
  CATEGORY_ROLES,
  PALETTE_ROLES,
  extractPalette,
} from '#/core/theme/palette'
import type { ThemePalette } from '#/core/theme/palette'
import { THEME_PRESETS } from '#/core/theme/presets'
import {
  applyPalette,
  setCategoryColor,
  setElementStyle,
  toggleElementHidden,
} from '#/core/theme/overrides'

interface ThemeEditorProps {
  overrides: ThemeOverrides
  onChange: (overrides: ThemeOverrides) => void
  themePresetId: string | null
  onThemePresetChange: (presetId: string) => void
  themePreviews: Record<string, string>
}

/** Throttle a callback to fire at most once per `ms` milliseconds */
function useThrottled<T>(
  fn: (value: T) => void,
  ms: number,
): (value: T) => void {
  const lastCall = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(null)

  return useCallback(
    (value: T) => {
      const now = Date.now()
      const remaining = ms - (now - lastCall.current)

      if (remaining <= 0) {
        lastCall.current = now
        fn(value)
      } else {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          lastCall.current = Date.now()
          fn(value)
        }, remaining)
      }
    },
    [fn, ms],
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function ColorSwatch({
  color,
  onChange,
  label,
}: {
  color: string
  onChange: (hex: string) => void
  label: string
}) {
  const throttledOnChange = useThrottled(onChange, 80)

  return (
    <label className="relative size-5 shrink-0 cursor-pointer" title={label}>
      <span
        className="block size-full rounded border border-border/50"
        style={{ backgroundColor: color }}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => throttledOnChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        aria-label={label}
      />
    </label>
  )
}

function OpacitySlider({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={5}
      value={Math.round(value * 100)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="h-1 w-12 shrink-0 cursor-pointer accent-primary"
      aria-label={label}
    />
  )
}

function elementLabel(key: string): string {
  return key.replace(/^(element|layout):/, '')
}

function StrokeWidthSlider({
  value,
  onChange,
  label,
}: {
  value: number | 'native'
  onChange: (v: number | 'native') => void
  label: string
}) {
  // Map 'native' to 0 in the slider (0 = native, 1-10 = explicit px)
  const numericValue = value === 'native' ? 0 : value

  return (
    <input
      type="range"
      min={0}
      max={10}
      step={0.5}
      value={numericValue}
      onChange={(e) => {
        const v = Number(e.target.value)
        onChange(v === 0 ? 'native' : v)
      }}
      className="h-1 w-10 shrink-0 cursor-pointer accent-primary"
      aria-label={label}
    />
  )
}

function PaletteRow({
  label,
  description,
  color,
  onChange,
}: {
  label: string
  description: string
  color: string
  onChange: (hex: string) => void
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="min-w-0 flex-1">
        <span className="text-xs text-foreground/80">{label}</span>
        <span className="ml-1.5 text-[10px] text-muted-foreground/50">
          {description}
        </span>
      </div>
      <ColorSwatch color={color} onChange={onChange} label={label} />
      <span className="w-[3.2rem] text-right text-[10px] tabular-nums text-muted-foreground">
        {color}
      </span>
    </div>
  )
}

function CategoryColorRow({
  label,
  fill,
  fillOpacity,
  onFillChange,
  onOpacityChange,
}: {
  label: string
  fill: string
  fillOpacity: number
  onFillChange: (hex: string) => void
  onOpacityChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <span className="min-w-0 flex-1 text-xs text-foreground/80">{label}</span>
      <ColorSwatch
        color={fill}
        onChange={onFillChange}
        label={`${label} fill`}
      />
      <OpacitySlider
        value={fillOpacity}
        onChange={onOpacityChange}
        label={`${label} opacity`}
      />
    </div>
  )
}

function ElementRow({
  elementType,
  defaults,
  override,
  hidden,
  onUpdate,
  onToggleVisibility,
}: {
  elementType: string
  defaults: Record<string, unknown>
  override?: ElementStyleOverride
  hidden: boolean
  onUpdate: (
    field: keyof ElementStyleOverride,
    value: string | number | 'native',
  ) => void
  onToggleVisibility: () => void
}) {
  const fill = (override?.fill ?? defaults.fill) as string
  const stroke = (override?.stroke ?? defaults.stroke) as string
  const fillOpacity = override?.fillOpacity ?? (defaults.fillOpacity as number)
  const strokeOpacity =
    override?.strokeOpacity ??
    (defaults.strokeOpacity as number | undefined) ??
    1
  const strokeWidth =
    override?.strokeWidth ??
    (defaults.strokeWidth as number | 'native') ??
    'native'
  const name = elementLabel(elementType)

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 ${hidden ? 'opacity-40' : ''}`}
    >
      <button
        onClick={onToggleVisibility}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={`${hidden ? 'Show' : 'Hide'} ${name}`}
        title={hidden ? 'Show' : 'Hide'}
      >
        {hidden ? (
          <EyeOff className="size-3" aria-hidden="true" />
        ) : (
          <Eye className="size-3" aria-hidden="true" />
        )}
      </button>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
        {name}
      </span>
      <ColorSwatch
        color={fill}
        onChange={(hex) => onUpdate('fill', hex)}
        label={`${name} fill`}
      />
      <ColorSwatch
        color={stroke}
        onChange={(hex) => onUpdate('stroke', hex)}
        label={`${name} stroke`}
      />
      <OpacitySlider
        value={fillOpacity}
        onChange={(v) => onUpdate('fillOpacity', v)}
        label={`${name} fill opacity`}
      />
      <OpacitySlider
        value={strokeOpacity}
        onChange={(v) => onUpdate('strokeOpacity', v)}
        label={`${name} stroke opacity`}
      />
      <StrokeWidthSlider
        value={strokeWidth}
        onChange={(v) => onUpdate('strokeWidth', v)}
        label={`${name} stroke width`}
      />
    </div>
  )
}

function SmallToggle({
  active,
  onToggle,
  label,
}: {
  active: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      role="switch"
      aria-checked={active}
      aria-label={label}
      onClick={onToggle}
      className="relative h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors"
      style={{
        backgroundColor: active ? 'var(--primary)' : 'oklch(0.6 0 0 / 0.2)',
      }}
    >
      <div
        className={`absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-transform ${
          active ? 'translate-x-3.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ── Main ThemeEditor ───────────────────────────────────────────────

export function ThemeEditor({
  overrides,
  onChange,
  themePresetId,
  onThemePresetChange,
  themePreviews,
}: ThemeEditorProps) {
  const [copied, setCopied] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const bgColor = overrides.background ?? '#f7f8fa'
  const roomStampText = overrides.roomStamp?.text ?? '#8c8c8a'
  const roomStampOutline = overrides.roomStamp?.textOutline ?? true

  // Derive palette from current overrides
  const currentPalette = useMemo(
    () => extractPalette(overrides.byType),
    [overrides.byType],
  )

  function handlePaletteChange(role: keyof ThemePalette, hex: string) {
    onChange(applyPalette(overrides, { ...currentPalette, [role]: hex }))
  }

  function handleCategoryFillChange(category: string, hex: string) {
    onChange(setCategoryColor(overrides, category, { fill: hex }))
  }

  function handleCategoryOpacityChange(category: string, opacity: number) {
    onChange(setCategoryColor(overrides, category, { fillOpacity: opacity }))
  }

  function handleCopyThemeJson() {
    const theme = buildFloorPlanTheme({
      showCategories: true,
      showLabels: true,
      showAssets: true,
      themeOverrides: overrides,
    })
    void navigator.clipboard
      .writeText(JSON.stringify(theme, null, 2))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setCopied(false))
  }

  // Back to the Default preset, so the picker shows what is applied.
  function handleReset() {
    onThemePresetChange('default')
  }

  return (
    <div className="space-y-1 pt-1">
      {/* ── Theme presets ────────────────────────────────────────── */}
      <div className="px-2 pb-1">
        <p className="pb-1 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
          Presets
        </p>
        <div className="grid grid-cols-2 gap-2 px-1">
          {THEME_PRESETS.map((preset) => {
            const active = themePresetId === preset.id
            const [bg, wall, border, accent] = preset.palette
            const previewUrl = themePreviews[preset.id]
            return (
              <button
                key={preset.id}
                onClick={() => onThemePresetChange(preset.id)}
                className={cn(
                  'group flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-all',
                  active
                    ? 'bg-primary/10 ring-1.5 ring-primary/40'
                    : 'hover:bg-accent',
                )}
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
                  className={cn(
                    'text-[10px] leading-tight',
                    active
                      ? 'font-medium text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  {preset.name}
                </span>
              </button>
            )
          })}
        </div>
        {themePresetId === null && (
          <p className="px-1 pt-1 text-[10px] italic text-muted-foreground/60">
            Custom, edited below
          </p>
        )}
      </div>

      {/* ── Palette colors ──────────────────────────────────────── */}
      <div className="px-2">
        <p className="pb-0.5 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
          Palette
        </p>
        {/* Background */}
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="min-w-0 flex-1">
            <span className="text-xs text-foreground/80">Background</span>
          </div>
          <ColorSwatch
            color={bgColor}
            onChange={(hex) => onChange({ ...overrides, background: hex })}
            label="Background color"
          />
          <span className="w-[3.2rem] text-right text-[10px] tabular-nums text-muted-foreground">
            {bgColor}
          </span>
        </div>
        {/* Palette roles */}
        {PALETTE_ROLES.map((role) => (
          <PaletteRow
            key={role.key}
            label={role.label}
            description={role.description}
            color={currentPalette[role.key]}
            onChange={(hex) => handlePaletteChange(role.key, hex)}
          />
        ))}
      </div>

      {/* ── Zone (category) colors ──────────────────────────────── */}
      <div className="border-t border-border/20 px-2 pt-2">
        <p className="pb-0.5 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
          Zone Colors
        </p>
        {CATEGORY_ROLES.map((cat) => {
          const catOverride = overrides.categoryColors?.[cat.key]
          const defaults = CATEGORY_COLOR_DEFAULTS_HEX[cat.key]
          return (
            <CategoryColorRow
              key={cat.key}
              label={cat.label}
              fill={catOverride?.fill ?? defaults.fill}
              fillOpacity={catOverride?.fillOpacity ?? defaults.fillOpacity}
              onFillChange={(hex) => handleCategoryFillChange(cat.key, hex)}
              onOpacityChange={(v) => handleCategoryOpacityChange(cat.key, v)}
            />
          )
        })}
      </div>

      {/* ── Space labels ─────────────────────────────────────────── */}
      <div className="border-t border-border/20 px-2 pt-2">
        <p className="pb-0.5 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
          Space Labels
        </p>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="min-w-0 flex-1 text-xs text-foreground/80">
            Text color
          </span>
          <ColorSwatch
            color={roomStampText}
            onChange={(hex) =>
              onChange({
                ...overrides,
                roomStamp: { ...overrides.roomStamp, text: hex },
              })
            }
            label="Space label text color"
          />
        </div>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="min-w-0 flex-1 text-xs text-foreground/80">
            Text outline
          </span>
          <SmallToggle
            active={roomStampOutline}
            onToggle={() =>
              onChange({
                ...overrides,
                roomStamp: {
                  ...overrides.roomStamp,
                  textOutline: !roomStampOutline,
                },
              })
            }
            label="Space label text outline"
          />
        </div>
      </div>

      {/* ── Per-element overrides (advanced) ─────────────────────── */}
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
                    {/* Column headers */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5">
                      <span className="w-3 shrink-0" />
                      <span className="min-w-0 flex-1" />
                      <span className="w-5 shrink-0 text-center text-[9px] text-muted-foreground/50">
                        fill
                      </span>
                      <span className="w-5 shrink-0 text-center text-[9px] text-muted-foreground/50">
                        str
                      </span>
                      <span className="w-12 shrink-0 text-center text-[9px] text-muted-foreground/50">
                        fOp
                      </span>
                      <span className="w-12 shrink-0 text-center text-[9px] text-muted-foreground/50">
                        sOp
                      </span>
                      <span className="w-10 shrink-0 text-center text-[9px] text-muted-foreground/50">
                        sW
                      </span>
                    </div>
                    {keys.map((key) => (
                      <ElementRow
                        key={key}
                        elementType={key}
                        defaults={FPE_DEFAULT_STYLES[key]}
                        override={overrides.byType?.[key]}
                        hidden={overrides.hiddenTypes?.includes(key) ?? false}
                        onUpdate={(field, value) =>
                          onChange(
                            setElementStyle(overrides, key, field, value),
                          )
                        }
                        onToggleVisibility={() =>
                          onChange(toggleElementHidden(overrides, key))
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

      {/* ── Action buttons ──────────────────────────────────────── */}
      <div className="flex gap-1.5 border-t border-border/20 px-2 pt-2 pb-1">
        <button
          onClick={handleCopyThemeJson}
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
          onClick={handleReset}
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
