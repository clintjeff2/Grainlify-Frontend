import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import { validateEnv } from './shared/config/api'
import { ErrorBoundary } from './shared/components/ErrorBoundary'
import './styles/index.css'

validateEnv()

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
