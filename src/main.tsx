import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdsenseBanner } from './AdsenseBanner'
import './styles.css'

createRoot(document.getElementById('ad-root')!).render(
  <StrictMode>
    <AdsenseBanner />
  </StrictMode>,
)
