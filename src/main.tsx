import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdsenseBanner } from './AdsenseBanner'
import './styles.css'

const editor = document.querySelector<HTMLIFrameElement>('#cake-editor')!

window.addEventListener('message', (event) => {
  if (event.source !== editor.contentWindow || event.origin !== 'null') return

  const data = event.data
  if (data?.type !== 'cake-editor-height' || !Number.isInteger(data.height) || data.height < 1 || data.height > 4000) return

  editor.style.height = `${data.height}px`
})

function requestEditorHeight() {
  // An opaque-origin frame requires a wildcard target. Only a resize signal is sent.
  editor.contentWindow?.postMessage('measure-cake-editor', '*')
}

editor.addEventListener('load', requestEditorHeight)
requestEditorHeight()

createRoot(document.getElementById('ad-root')!).render(
  <StrictMode>
    <AdsenseBanner />
  </StrictMode>,
)
