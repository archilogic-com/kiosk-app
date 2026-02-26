import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '#/App'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element (check index.html)')

ReactDOM.createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
