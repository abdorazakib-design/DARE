import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from '@/i18n'
import { DataProvider } from '@/data/DataProvider'
import { ToastProvider } from '@/components/ui/feedback'
import { App } from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <DataProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </DataProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
