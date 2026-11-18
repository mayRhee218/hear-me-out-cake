import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

const editor = document.getElementById('root')!

if (window.parent !== window) {
  let previousHeight = 0

  function reportHeight(force = false) {
    const height = Math.ceil(editor.getBoundingClientRect().height)
    if (!height || (!force && height === previousHeight)) return

    previousHeight = height
    // The parent only receives the height. All images and downloads stay in this document.
    window.parent.postMessage({ type: 'cake-editor-height', height }, '*')
  }

  if (typeof ResizeObserver === 'function') {
    const resizeObserver = new ResizeObserver(() => reportHeight())
    resizeObserver.observe(editor)
  }
  window.addEventListener('resize', () => reportHeight())
  window.addEventListener('pageshow', () => reportHeight(true))
  window.addEventListener('message', (event) => {
    if (event.source === window.parent && event.data === 'measure-cake-editor') reportHeight(true)
  })
}

createRoot(editor).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
