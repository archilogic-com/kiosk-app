import { useEffect, useId, useState } from 'react'
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
import { ThemeEditor } from '#/components/ThemeEditor'
import { cn } from '#/lib/utils'
import type { ThemeOverrides } from '#/core/theme/defaults'

interface MapControlsProps {
  showCategories: boolean
  showLabels: boolean
  showPeople: boolean
  showAssets: boolean
  onShowCategoriesChange: (value: boolean) => void
  onShowLabelsChange: (value: boolean) => void
  onShowPeopleChange: (value: boolean) => void
  onShowAssetsChange: (value: boolean) => void
  pathSmoothing: number
  onPathSmoothingChange: (value: number) => void
  zoomOnNavigate: boolean
  onZoomOnNavigateChange: (value: boolean) => void
  pathThickness: number
  onPathThicknessChange: (value: number) => void
  pathDashed: boolean
  onPathDashedChange: (value: boolean) => void
  themePresetId: string | null
  onThemePresetChange: (presetId: string) => void
  themeOverrides: ThemeOverrides
  onThemeOverridesChange: (overrides: ThemeOverrides) => void
  themePreviews: Record<string, string>
}

const LAYER_ROWS = [
  {
    key: 'categories',
    label: 'Zone colors',
    description: 'Category shading',
    icon: Palette,
    iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    key: 'labels',
    label: 'Space names',
    description: 'Labels on the plan',
    icon: Type,
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'people',
    label: 'People',
    description: 'Workstation occupants',
    icon: Users,
    iconBg: 'bg-violet-50 text-violet-600',
  },
  {
    key: 'assets',
    label: 'Furniture',
    description: 'Asset textures',
    icon: Armchair,
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
] as const

const SETTING_TOGGLES = [
  {
    key: 'zoomOnNavigate',
    label: 'Zoom on navigate',
    description: 'Auto-zoom to path',
    icon: ZoomIn,
    iconBg: 'bg-sky-50 text-sky-600',
  },
  {
    key: 'pathDashed',
    label: 'Dashed path',
    description: 'Dashed line style',
    icon: Minus,
    iconBg: 'bg-slate-50 text-slate-600',
  },
] as const

function Toggle({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        active ? 'bg-primary' : 'bg-muted-foreground/20'
      }`}
    >
      <div
        className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
          active ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </div>
  )
}

export function MapControls({
  showCategories,
  showLabels,
  showPeople,
  showAssets,
  onShowCategoriesChange,
  onShowLabelsChange,
  onShowPeopleChange,
  onShowAssetsChange,
  pathSmoothing,
  onPathSmoothingChange,
  zoomOnNavigate,
  onZoomOnNavigateChange,
  pathThickness,
  onPathThicknessChange,
  pathDashed,
  onPathDashedChange,
  themePresetId,
  onThemePresetChange,
  themeOverrides,
  onThemeOverridesChange,
  themePreviews,
}: MapControlsProps) {
  const [expanded, setExpanded] = useState(false)
  const [themeEditorOpen, setThemeEditorOpen] = useState(false)
  const sliderId = useId()

  // Escape key closes the panel
  useEffect(() => {
    if (!expanded) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setExpanded(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expanded])

  const layerStateMap: Record<string, boolean> = {
    categories: showCategories,
    labels: showLabels,
    people: showPeople,
    assets: showAssets,
  }

  const layerHandlerMap: Record<string, (v: boolean) => void> = {
    categories: onShowCategoriesChange,
    labels: onShowLabelsChange,
    people: onShowPeopleChange,
    assets: onShowAssetsChange,
  }

  const settingStateMap: Record<string, boolean> = {
    zoomOnNavigate,
    pathDashed,
  }

  const settingHandlerMap: Record<string, (v: boolean) => void> = {
    zoomOnNavigate: onZoomOnNavigateChange,
    pathDashed: onPathDashedChange,
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="floating-panel flex size-10 items-center justify-center transition-colors hover:bg-accent"
        aria-label="Open layers and settings panel"
      >
        <Layers className="size-5 text-muted-foreground" aria-hidden="true" />
      </button>
    )
  }

  return (
    <section
      className={cn(
        'floating-panel kiosk-scroll max-h-[calc(100vh-2rem)] overflow-x-hidden overflow-y-auto transition-[width]',
        'w-[30rem]',
      )}
      aria-label="Layers and settings"
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(false)}
        aria-expanded={expanded}
        aria-label="Close layers and settings panel"
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-accent"
      >
        <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
        Layers & Settings
      </button>

      {/* Layer rows */}
      <div
        className="border-t border-border/30 px-2 py-2"
        role="group"
        aria-label="Layer visibility"
      >
        {LAYER_ROWS.map(({ key, label, description, icon: Icon, iconBg }) => {
          const active = layerStateMap[key]
          return (
            <button
              key={key}
              role="switch"
              aria-checked={active}
              aria-label={`${label}: ${description}`}
              onClick={() => layerHandlerMap[key](!active)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
            >
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                aria-hidden="true"
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Toggle active={active} />
            </button>
          )
        })}
      </div>

      {/* Navigation settings */}
      <div
        className="border-t border-border/30 px-2 py-2"
        role="group"
        aria-label="Navigation settings"
      >
        <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
          Navigation
        </p>

        {SETTING_TOGGLES.map(
          ({ key, label, description, icon: Icon, iconBg }) => {
            const active = settingStateMap[key]
            return (
              <button
                key={key}
                role="switch"
                aria-checked={active}
                aria-label={`${label}: ${description}`}
                onClick={() => settingHandlerMap[key](!active)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                  aria-hidden="true"
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Toggle active={active} />
              </button>
            )
          },
        )}

        {/* Path smoothing slider */}
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M2 12 Q8 2 14 8" strokeWidth="2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <label
              htmlFor={`${sliderId}-smoothing`}
              className="text-sm font-medium leading-tight"
            >
              Path smoothing
            </label>
            <input
              id={`${sliderId}-smoothing`}
              type="range"
              min={0}
              max={12}
              step={1}
              value={pathSmoothing}
              onChange={(e) => onPathSmoothingChange(Number(e.target.value))}
              className="mt-1 h-1 w-full cursor-pointer accent-primary"
            />
          </div>
          <span
            className="shrink-0 text-xs tabular-nums text-muted-foreground"
            aria-hidden="true"
          >
            {pathSmoothing}
          </span>
        </div>

        {/* Path thickness slider */}
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line
                x1="2"
                y1="8"
                x2="14"
                y2="8"
                strokeWidth={pathThickness / 4}
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <label
              htmlFor={`${sliderId}-thickness`}
              className="text-sm font-medium leading-tight"
            >
              Path thickness
            </label>
            <input
              id={`${sliderId}-thickness`}
              type="range"
              min={4}
              max={20}
              step={2}
              value={pathThickness}
              onChange={(e) => onPathThicknessChange(Number(e.target.value))}
              className="mt-1 h-1 w-full cursor-pointer accent-primary"
            />
          </div>
          <span
            className="shrink-0 text-xs tabular-nums text-muted-foreground"
            aria-hidden="true"
          >
            {pathThickness}
          </span>
        </div>
      </div>

      {/* Themes */}
      <div className="border-t border-border/30 px-2 py-2">
        <button
          onClick={() => setThemeEditorOpen(!themeEditorOpen)}
          aria-expanded={themeEditorOpen}
          aria-label="Toggle themes"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
        >
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600"
            aria-hidden="true"
          >
            <Paintbrush className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">Themes</p>
            <p className="text-xs text-muted-foreground">
              Presets &amp; element styles
            </p>
          </div>
          <ChevronDown
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              themeEditorOpen && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
        {themeEditorOpen && (
          <ThemeEditor
            overrides={themeOverrides}
            onChange={onThemeOverridesChange}
            themePresetId={themePresetId}
            onThemePresetChange={onThemePresetChange}
            themePreviews={themePreviews}
          />
        )}
      </div>
    </section>
  )
}
