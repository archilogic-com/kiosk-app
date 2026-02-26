/** Pastel hues for avatar backgrounds, deterministic by name */
const AVATAR_HUES = [260, 330, 200, 30, 160, 290, 50, 100]

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  const hue = AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length]
  return `oklch(0.90 0.04 ${hue})`
}
