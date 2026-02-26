import { useCallback, useState } from 'react'
import { Check, Link } from 'lucide-react'
import { buildDeepLink } from '#/core/domain/deep-link'
import type { NavigableItem } from '#/core/domain/types'

export function CopyLinkButton({
  item,
  directionsOpen,
}: {
  item: NavigableItem
  directionsOpen: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(buildDeepLink(item, directionsOpen))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setFailed(true))
  }, [item, directionsOpen])

  return (
    <button
      onClick={handleCopy}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary/60 px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-secondary active:scale-[0.97]"
    >
      {copied ? (
        <>
          <Check className="size-4" aria-hidden="true" />
          Copied!
        </>
      ) : failed ? (
        <>
          <Link className="size-4" aria-hidden="true" />
          Couldn&apos;t copy. Use the address bar.
        </>
      ) : (
        <>
          <Link className="size-4" aria-hidden="true" />
          Copy link to directions
        </>
      )}
    </button>
  )
}
