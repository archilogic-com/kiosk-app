/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARCHILOGIC_PUBLISHABLE_ACCESS_TOKEN?: string
  readonly VITE_ARCHILOGIC_FLOOR_ID?: string
  readonly VITE_ARCHILOGIC_LAYOUT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
