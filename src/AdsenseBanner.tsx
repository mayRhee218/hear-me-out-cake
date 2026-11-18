/// <reference types="vite/client" />

import { useEffect, useRef, useState } from 'react'
import { ADSENSE_CLIENT, ADSENSE_SLOT } from './adsense-config'
import './adsense.css'

const adClient = import.meta.env.VITE_ADSENSE_CLIENT?.trim() || ADSENSE_CLIENT.trim()
const adSlot = import.meta.env.VITE_ADSENSE_SLOT?.trim() || ADSENSE_SLOT.trim()
const isConfigured = import.meta.env.PROD && /^ca-pub-\d{16}$/.test(adClient) && /^\d{1,20}$/.test(adSlot)

type AdsenseWindow = Window & {
  adsbygoogle?: { push(request: Record<string, never>): unknown }
}

let scriptReady: Promise<void> | undefined
const initializedSlots = new WeakSet<HTMLElement>()

function loadAdsense() {
  scriptReady ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`
    script.async = true
    script.crossOrigin = 'anonymous'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('AdSense could not load.')), { once: true })
    document.head.append(script)
  })
  return scriptReady
}

export function AdsenseBanner() {
  const banner = useRef<HTMLElement>(null)
  const slot = useRef<HTMLModElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isConfigured || !banner.current) return

    let active = true
    let approached = false
    let observer: IntersectionObserver | undefined
    let cancelIdle = () => {}

    async function initialize() {
      const element = slot.current
      if (!active || !element || initializedSlots.has(element)) return

      try {
        await loadAdsense()
        if (!active || initializedSlots.has(element)) return

        initializedSlots.add(element)
        const adsWindow = window as AdsenseWindow
        adsWindow.adsbygoogle ??= []
        adsWindow.adsbygoogle.push({})
      } catch {
        if (active) setFailed(true)
      }
    }

    function waitForIdle() {
      if (typeof window.requestIdleCallback === 'function') {
        const idle = window.requestIdleCallback(initialize, { timeout: 2000 })
        cancelIdle = () => window.cancelIdleCallback(idle)
      } else {
        const timeout = window.setTimeout(initialize, 160)
        cancelIdle = () => window.clearTimeout(timeout)
      }
    }

    function onApproach() {
      if (approached) return
      approached = true
      observer?.disconnect()
      if (document.readyState === 'complete') waitForIdle()
      else window.addEventListener('load', waitForIdle, { once: true })
    }

    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onApproach()
      }, { rootMargin: '240px 0px' })
      observer.observe(banner.current)
    } else {
      onApproach()
    }

    return () => {
      active = false
      observer?.disconnect()
      window.removeEventListener('load', waitForIdle)
      cancelIdle()
    }
  }, [])

  if (!isConfigured) return null

  return (
    <section className="adsense-banner" ref={banner}
      aria-label={failed ? undefined : 'Advertisement'} aria-hidden={failed || undefined}>
      {!failed && <ins className="adsbygoogle adsense-banner__slot" ref={slot}
        style={{ display: 'block' }}
        data-ad-client={adClient} data-ad-slot={adSlot}
        data-ad-format="auto" data-full-width-responsive="true" />}
    </section>
  )
}
