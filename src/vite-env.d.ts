/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARCHILOGIC_PUBLISHABLE_ACCESS_TOKEN?: string
  readonly VITE_ARCHILOGIC_FLOOR_ID?: string
  readonly VITE_ARCHILOGIC_LAYOUT_ID?: string
  readonly VITE_ARCHILOGIC_SPACE_API_URL?: string
  readonly VITE_ARCHILOGIC_OCCUPANT_ATTRIBUTE?: string
  readonly VITE_ARCHILOGIC_EMPLOYEE_ID_ATTRIBUTE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
