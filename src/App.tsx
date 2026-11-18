import { Fragment, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import {
  Cake, Check, CircleHelp, Download, ImagePlus, Images, LoaderCircle,
  Palette, Plus, RefreshCw, RotateCcw, Sparkles, Trash2, X,
} from 'lucide-react'
import { CAKE_SCENE, FROSTINGS, TOPPER_COUNT, TOPPER_LAYOUT, drawCake, renderCakeExport } from './cake'
import type { Frosting } from './cake'
import { downloadCake, preparePhoto } from './photos'
import type { CakePhoto } from './photos'

const emptyCake = () => Array.from({ length: TOPPER_COUNT }, () => null)
const toPercent = (fraction: number) => `${fraction * 100}%`
const topperStyles = TOPPER_LAYOUT.positions.map((position): CSSProperties => {
  const stickX = (position.targetX - position.x) * CAKE_SCENE.width
  const stickY = (position.targetY - position.y) * CAKE_SCENE.height
  const stickLength = Math.hypot(stickX, stickY)
  const { flag } = TOPPER_LAYOUT

  return {
    '--topper-x': toPercent(position.x),
    '--topper-y': toPercent(position.y),
    '--stick-length': toPercent(stickLength / CAKE_SCENE.height),
    '--stick-tilt': `${Math.atan2(-stickX, stickY) * 180 / Math.PI}deg`,
    '--insert-from-x': `${-3 * stickX / stickLength}cqw`,
    '--insert-from-y': `${-3 * stickY / stickLength}cqw`,
    '--flag-width': flag.width,
    '--flag-height': flag.height,
    '--flag-border': flag.border,
    '--flag-radius': flag.radius,
    '--tilt': `${position.tilt}deg`,
  } as CSSProperties
})

type Dialog = { kind: 'help' } | { kind: 'edit'; slot: number } | { kind: 'reset' }

type CakeBoardProps = {
  frosting: Frosting
  photos: readonly (CakePhoto | null)[]
  busy: readonly number[]
  onSlot: (slot: number) => void
  onImage: (image: HTMLImageElement) => void
  onArtError: () => void
}

function CakeBoard({ frosting, photos, busy, onSlot, onImage, onArtError }: CakeBoardProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const preview = canvas.current
    if (!preview || !image) return

    drawCake(preview, image, frosting)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    preview.animate?.([{ opacity: 0.84 }, { opacity: 1 }], {
      duration: 185,
      easing: 'ease-out',
    })
  }, [image, frosting])

  return (
    <section className="cake-board relative isolate" aria-label="Live cake preview">
      <div className="preview-tag"><span /> Live preview</div>
      <div className="stage relative" style={{ aspectRatio: `${CAKE_SCENE.width} / ${CAKE_SCENE.height}` }}>
        <span className="stage-sparkle sparkle-left" aria-hidden="true">✧</span>
        <span className="stage-sparkle sparkle-right" aria-hidden="true">✦</span>
        <span className="stage-sparkle sparkle-small" aria-hidden="true">✧</span>
        <span className="stage-sparkle sparkle-tiny" aria-hidden="true">·</span>
        <img
          className="hidden"
          crossOrigin="anonymous"
          src="./cake.webp"
          alt=""
          onLoad={(event) => {
            setImage(event.currentTarget)
            onImage(event.currentTarget)
          }}
          onError={onArtError}
        />
        <canvas
          className="cake-canvas absolute inset-0 size-full"
          width={CAKE_SCENE.width * 2}
          height={CAKE_SCENE.height * 2}
          ref={canvas}
          role="img"
          aria-label={`${frosting.name} cake on a white stand`}
        />
        {topperStyles.map((style, slot) => {
          const photo = photos[slot]
          const pending = busy.includes(slot)

          return (
            <div className="topper-position" key={slot} style={style}>
              {photo ? (
                <Fragment key={photo.source}>
                  <span className="topper-stick" aria-hidden="true" />
                  <button className="photo-flag" type="button" onClick={() => onSlot(slot)} disabled={pending}
                    aria-label={`Edit topper ${slot + 1}`}>
                    <img src={photo.source} alt={`Photo on topper ${slot + 1}`} draggable={false} />
                  </button>
                </Fragment>
              ) : (
                <>
                  <span className="empty-stick" aria-hidden="true" />
                  <button className="stage-slot" type="button" onClick={() => onSlot(slot)} disabled={pending}
                    aria-label={`Add photo to topper ${slot + 1} on cake`}>
                    {pending ? <LoaderCircle className="spinner" size={17} /> : <Plus size={18} strokeWidth={1.8} />}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
      <div className="preview-foot"><Sparkles size={14} /> {frosting.name} frosting</div>
    </section>
  )
}

export function App() {
  const [frosting, setFrosting] = useState<Frosting>(FROSTINGS[0])
  const [photos, setPhotos] = useState<(CakePhoto | null)[]>(emptyCake)
  const [busy, setBusy] = useState<number[]>([])
  const [cakeArt, setCakeArt] = useState<HTMLImageElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const pickerSlot = useRef<number | null>(null)
  const dialogElement = useRef<HTMLDialogElement>(null)
  const count = photos.filter(Boolean).length

  useEffect(() => {
    const element = dialogElement.current
    if (dialog && element && !element.open) element.showModal()
  }, [dialog])

  function dismissDialog() {
    dialogElement.current?.close()
    setDialog(null)
  }

  function pickPhoto(slot: number) {
    if (!fileInput.current || busy.includes(slot)) return
    pickerSlot.current = slot
    fileInput.current.value = ''
    fileInput.current.click()
  }

  function openSlot(slot: number) {
    if (busy.includes(slot)) return
    if (photos[slot]) {
      setDialog({ kind: 'edit', slot })
    } else {
      pickPhoto(slot)
    }
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    const slot = pickerSlot.current
    pickerSlot.current = null
    if (!file || slot === null) return

    setBusy((current) => [...current, slot])
    setError('')
    setMessage('')
    try {
      const photo = await preparePhoto(file)
      setPhotos((current) => current.map((item, index) => index === slot ? photo : item))
      setMessage(`Topper ${slot + 1} is on the cake.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That photo could not be opened.')
    } finally {
      setBusy((current) => current.filter((index) => index !== slot))
    }
  }

  function removePhoto(slot: number) {
    setPhotos((current) => current.map((item, index) => index === slot ? null : item))
    setError('')
    setMessage(`Topper ${slot + 1} removed.`)
    dismissDialog()
  }

  function resetCake() {
    setFrosting(FROSTINGS[0])
    setPhotos(emptyCake())
    setError('')
    setMessage('Cake reset.')
    dismissDialog()
  }

  async function saveCake() {
    if (!cakeArt || saving) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const canvas = await renderCakeExport(cakeArt, frosting, photos)
      await downloadCake(canvas)
      setMessage('Cake image ready.')
    } catch {
      setError('The cake image could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const editedPhoto = dialog?.kind === 'edit' ? photos[dialog.slot] : null

  return (
    <>
      <header className="site-header">
        <div className="header-inner mx-auto flex items-center justify-between">
          <a href="#" className="brand flex items-center" aria-label="Hear Me Out Cake home">
            <span className="brand-icon"><Cake size={23} strokeWidth={1.8} /></span>
            <span>Hear Me Out <span className="brand-accent">Cake</span></span>
          </a>
          <button className="help-button inline-flex items-center" type="button" onClick={() => setDialog({ kind: 'help' })}>
            <CircleHelp size={16} strokeWidth={1.85} /> How it works
          </button>
        </div>
      </header>

      <main className="main-content mx-auto">
        <div className="hero text-center">
          <h1>Hear Me Out <span>Cake</span><Sparkles className="title-sparkle" size={31} strokeWidth={1.35} aria-hidden="true" /></h1>
          <p>Give your hear-me-outs a spot on the cake.</p>
        </div>

        <div className="builder grid">
          <CakeBoard
            frosting={frosting}
            photos={photos}
            busy={busy}
            onSlot={openSlot}
            onImage={setCakeArt}
            onArtError={() => setError('The cake preview could not load. Refresh the page to try again.')}
          />

          <section className="controls" aria-label="Customize your cake">
            <div className="control-section frosting-section">
              <h2><Palette size={20} aria-hidden="true" /> Pick your frosting</h2>
              <div className="swatch-list" role="group" aria-label="Frosting colors">
                {FROSTINGS.map((option) => (
                  <button
                    className="swatch"
                    style={{ '--swatch': option.swatch } as CSSProperties}
                    type="button"
                    key={option.id}
                    onClick={() => setFrosting(option)}
                    aria-label={option.name}
                    aria-pressed={frosting.id === option.id}
                    title={option.name}
                  >
                    {frosting.id === option.id && <Check size={17} strokeWidth={2.1} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-section photo-section">
              <div className="section-heading flex items-center justify-between">
                <h2><Images size={20} aria-hidden="true" /> Add your people</h2>
                <span className="count" aria-label={`${count} of ${TOPPER_COUNT} photo slots filled`}>{count}/{TOPPER_COUNT}</span>
              </div>
              <p className="slot-hint">Tap a slot to add or edit a photo.</p>
              <div className="slot-grid grid" role="group" aria-label="Photo slots">
                {photos.map((photo, slot) => {
                  const pending = busy.includes(slot)
                  return (
                    <button
                      className={`photo-slot ${photo ? 'is-filled' : ''}`}
                      type="button"
                      key={slot}
                      disabled={pending}
                      onClick={() => openSlot(slot)}
                      aria-label={photo ? `Edit photo ${slot + 1}` : `Add photo ${slot + 1}`}
                    >
                      {photo ? <img src={photo.source} alt="" /> :
                        pending ? <LoaderCircle className="spinner" size={21} /> : <Plus size={21} strokeWidth={1.65} />}
                    </button>
                  )
                })}
              </div>
              {error && <p className="error-message" role="alert">{error}</p>}
              <span className="sr-only" role="status">{message}</span>
            </div>

            <div className="control-actions">
              <button className="download-button" type="button" onClick={saveCake} disabled={!cakeArt || saving || !!busy.length}>
                {saving ? <LoaderCircle className="spinner" size={18} /> : <Download size={18} strokeWidth={2} />}
                {saving ? 'Saving…' : 'Download cake'}
              </button>
              <button className="reset-button" type="button" disabled={!!busy.length || (!count && frosting.id === FROSTINGS[0].id)}
                onClick={() => count ? setDialog({ kind: 'reset' }) : resetCake()}>
                <RotateCcw size={14} strokeWidth={1.8} /> Start over
              </button>
            </div>
          </section>
        </div>
      </main>

      <input ref={fileInput} type="file" accept="image/*,.heic,.heif" className="sr-only" tabIndex={-1}
        aria-label="Choose a topper photo" onChange={handlePhoto} />

      <dialog className="cake-dialog" ref={dialogElement} aria-labelledby="dialog-title" onClose={() => setDialog(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect()
            if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) dismissDialog()
          }
        }}>
        <button className="dialog-close" type="button" aria-label="Close dialog" onClick={dismissDialog}><X size={20} /></button>
        {dialog?.kind === 'help' && (
          <>
            <span className="dialog-icon"><Cake size={24} aria-hidden="true" /></span>
            <h2 id="dialog-title">How it works</h2>
            <ol>
              <li>Pick a frosting color.</li>
              <li>Tap a plus to add a photo and watch it land on the cake. Add up to {TOPPER_COUNT}.</li>
              <li>Tap any photo to replace or remove it. Download the cake when it’s ready.</li>
            </ol>
            <button className="download-button" type="button" onClick={dismissDialog}>Start decorating</button>
          </>
        )}
        {dialog?.kind === 'edit' && editedPhoto && (
          <>
            <img className="dialog-photo" src={editedPhoto.source} alt={`Topper ${dialog.slot + 1}`} />
            <h2 id="dialog-title">Edit topper {dialog.slot + 1}</h2>
            <div className="dialog-actions">
              <button className="download-button" type="button" onClick={() => {
                const slot = dialog.slot
                dismissDialog()
                pickPhoto(slot)
              }}><ImagePlus size={18} /> Replace photo</button>
              <button className="dialog-secondary" type="button" onClick={() => removePhoto(dialog.slot)}>
                <Trash2 size={17} /> Remove photo
              </button>
            </div>
          </>
        )}
        {dialog?.kind === 'reset' && (
          <>
            <span className="dialog-icon"><RefreshCw size={23} aria-hidden="true" /></span>
            <h2 id="dialog-title">Start over?</h2>
            <p>This clears all your photos and brings back the lavender frosting.</p>
            <div className="dialog-actions">
              <button className="download-button" type="button" onClick={resetCake}>Reset cake</button>
              <button className="dialog-secondary" type="button" onClick={dismissDialog}>Keep decorating</button>
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
