import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '#/App'
import { DEFAULT_SETTINGS } from '#/components/MapControls'
import { loadFloorPlan } from '#/floor-plan/engine'
import { floorPlanStyle } from '#/floor-plan/theme'
import './styles.css'

const container = document.getElementById('floor-plan')
const root = document.getElementById('root')
if (!container || !root) {
  throw new Error('Missing #floor-plan or #root element (check index.html)')
}

// The floor starts loading before React mounts, already in the look the
// kiosk opens with; the UI attaches to the loader.
const loader = loadFloorPlan(
  container,
  floorPlanStyle({
    layers: DEFAULT_SETTINGS,
    overrides: DEFAULT_SETTINGS.themeOverrides,
  }),
)

ReactDOM.createRoot(root).render(
  <StrictMode>
    <App loader={loader} />
  </StrictMode>,
)
