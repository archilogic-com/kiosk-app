import { Search } from 'lucide-react'

interface PeopleFinderCompactProps {
  onActivate: () => void
}

export function PeopleFinderCompact({ onActivate }: PeopleFinderCompactProps) {
  return (
    <button
      onClick={onActivate}
      className="floating-panel flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/80 active:scale-[0.98]"
    >
      <Search className="size-5 text-muted-foreground" aria-hidden="true" />
      <span className="text-lg text-muted-foreground/60">
        Search people, spaces, events...
      </span>
    </button>
  )
}
