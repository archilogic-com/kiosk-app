import React, { useCallback, useImperativeHandle, useRef } from 'react'
import { SEARCH_CATEGORIES } from '#/core/domain/types'
import { CATEGORY_BG, CATEGORY_CHIP_ICONS } from '#/components/search/shared'

export function CategoryChips({
  categoryCounts,
  onSelect,
  onFocusInput,
  ref,
}: {
  categoryCounts: Record<string, number>
  onSelect: (category: string) => void
  onFocusInput: () => void
  ref?: React.Ref<{ focusFirst: () => void }>
}) {
  const chipsRef = useRef<(HTMLButtonElement | null)[]>([])

  useImperativeHandle(
    ref,
    () => ({
      focusFirst: () => chipsRef.current[0]?.focus(),
    }),
    [],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        onFocusInput()
      }
    },
    [onFocusInput],
  )

  return (
    <div
      className="flex flex-wrap gap-2 px-4 pb-4"
      role="group"
      aria-label="Filter by category"
      onKeyDown={handleKeyDown}
    >
      {SEARCH_CATEGORIES.map(({ key, label }, i) => {
        const Icon = CATEGORY_CHIP_ICONS[key]
        return (
          <button
            key={key}
            ref={(el) => {
              chipsRef.current[i] = el
            }}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-all active:scale-[0.97] ${CATEGORY_BG[key] ?? 'bg-secondary/50 hover:bg-secondary/70'}`}
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            <span>{label}</span>
            {categoryCounts[key] != null && (
              <span className="text-xs text-muted-foreground">
                {categoryCounts[key]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
