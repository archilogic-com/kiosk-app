import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '#/App'
import { VIEWPORT_INSETS } from '#/core/domain/layout'
import { loadFloorPlan } from '#/core/sdk/load-floor-plan'
import './styles.css'

const container = document.getElementById('floor-plan')
const root = document.getElementById('root')
if (!container || !root) {
  throw new Error('Missing #floor-plan or #root element (check index.html)')
}

// The floor starts loading before React mounts; the UI attaches to the loader.
const loader = loadFloorPlan(container, VIEWPORT_INSETS)

ReactDOM.createRoot(root).render(
  <StrictMode>
    <App loader={loader} />
  </StrictMode>,
)
