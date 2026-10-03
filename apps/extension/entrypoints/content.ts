import { emberColor } from '@impulse/shared'

export default defineContentScript({
  matches: ['http://localhost/*'],
  registration: 'runtime',
  main() {
    void maybeShow()
  },
})

async function maybeShow() {
  const price = readPrice()
  const reply = await chrome.runtime.sendMessage({
    type: 'evaluate',
    url: location.href,
    title: document.title,
    amountCents: price,
  })
  if (!reply?.ok || !reply.decision?.ok) return
  const key = `seen:${reply.decision.domain}:${location.pathname}`
  const seen = await chrome.storage.session.get(key)
  if (seen[key]) return
  await chrome.storage.session.set({ [key]: Date.now() })
  mount(reply.decision.domain as string, reply.reflectionSeconds as number, price)
}

function readPrice(): number | null {
  const meta = document.querySelector('meta[property="product:price:amount"]')
  if (meta instanceof HTMLMetaElement && /^\d+(\.\d{1,2})?$/.test(meta.content)) {
    return Math.round(Number(meta.content) * 100)
  }
  return null
}

function mount(domain: string, seconds: number, amountCents: number | null) {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.inset = '0'
  host.style.zIndex = '2147483646'
  const shadow = host.attachShadow({ mode: 'open' })
  document.documentElement.append(host)
  const idempotencyKey = `ext-${domain}-${location.pathname}`.slice(0, 180)
  let closed = false

  const root = document.createElement('div')
  root.innerHTML = `
    <style>
      .panel { position: fixed; right: 24px; bottom: 24px; width: 320px; background: #f6f3ee; color: #1c140f; padding: 20px; font: 16px/1.4 Georgia, serif; box-shadow: 0 12px 40px rgba(0,0,0,.18); }
      button { font: inherit; margin-right: 8px; margin-top: 8px; padding: 8px 10px; border: 1px solid #1c140f; background: #1c140f; color: #f6f3ee; }
      button.ghost { background: transparent; color: #1c140f; }
      .orb { width: 88px; height: 88px; border-radius: 50%; display: grid; place-items: center; color: #f6f3ee; margin: 12px 0; }
      .ash { color: #8c857c; font-family: sans-serif; font-size: 13px; }
    </style>
    <div class="panel">
      <div class="ash">IMPULSE · ${domain}</div>
      <h2>A pause before this payment.</h2>
      <div class="orb" id="orb">0</div>
      <p class="ash" id="note">Hold the ember, or use the timed pause. Space does the same from the keyboard.</p>
      <div>
        <button id="continue">Continue</button>
        <button id="save" class="ghost">Save for later</button>
        <button id="drop" class="ghost">Drop it</button>
      </div>
      <button id="timed" class="ghost">Pause without holding</button>
      <button id="override" class="ghost">This one is essential</button>
    </div>
  `
  shadow.append(root)
  const orb = shadow.getElementById('orb') as HTMLDivElement
  const note = shadow.getElementById('note') as HTMLParagraphElement
  let progress = 0
  let timer: number | null = null
  let holding = false
  let reflectionDone = false

  function paint() {
    orb.style.background = emberColor(progress)
    orb.textContent = String(Math.round(progress * 100))
  }
  paint()

  function start(auto: boolean) {
    const began = performance.now()
    holding = true
    timer = window.setInterval(() => {
      progress = Math.min(1, (performance.now() - began) / (seconds * 1000))
      paint()
      if (progress >= 1) {
        reflectionDone = true
        stop(false)
        note.textContent = 'The pause is finished.'
      } else if (!auto && !holding) stop(true)
    }, 50)
  }
  function stop(reset: boolean) {
    holding = false
    if (timer) window.clearInterval(timer)
    timer = null
    if (reset && !reflectionDone) {
      progress = 0
      paint()
    }
  }

  orb.addEventListener('pointerdown', () => start(false))
  orb.addEventListener('pointerup', () => stop(true))
  orb.addEventListener('pointerleave', () => stop(true))
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && event.target === document.body) {
      event.preventDefault()
      if (!holding) start(false)
    }
  })
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') stop(true)
  })
  shadow.getElementById('timed')?.addEventListener('click', () => start(true))

  async function act(decision: 'continue' | 'save' | 'drop', overrideEssential = false) {
    if (closed) return
    const result = await chrome.runtime.sendMessage({
      type: 'act',
      body: {
        idempotencyKey,
        url: location.href,
        amountCents,
        decision,
        reflectionCompleted: reflectionDone,
        overrideEssential,
      },
    })
    if (!result?.ok) {
      note.textContent = result?.error ?? 'Could not reach Impulse. It will retry.'
      return
    }
    const status = result.result.status as string
    if (status === 'reflection_required' && !reflectionDone) {
      note.textContent = `Hold for ${result.result.seconds} seconds, then continue.`
      return
    }
    if (status === 'approval_required') {
      const contact = result.result.contacts?.[0]
      if (!contact) {
        note.textContent = 'High is on, but nobody has accepted a trusted-contact invite yet.'
        return
      }
      const approval = await chrome.runtime.sendMessage({
        type: 'approval',
        body: { interventionId: result.result.interventionId, contactId: contact.id },
      })
      note.textContent = 'Waiting on your contact. You can cancel from the phone.'
      const poll = window.setInterval(async () => {
        const current = await chrome.runtime.sendMessage({ type: 'approval-status', body: { id: approval.result.id } })
        if (current?.result?.status === 'approved') {
          window.clearInterval(poll)
          await act('continue')
        }
        if (current?.result?.status === 'declined' || current?.result?.status === 'expired' || current?.result?.status === 'canceled') {
          window.clearInterval(poll)
          note.textContent = `Request ${current.result.status}.`
        }
      }, 3000)
      return
    }
    closed = true
    host.remove()
  }

  shadow.getElementById('continue')?.addEventListener('click', () => void act('continue'))
  shadow.getElementById('save')?.addEventListener('click', () => void act('save'))
  shadow.getElementById('drop')?.addEventListener('click', () => void act('drop'))
  shadow.getElementById('override')?.addEventListener('click', () => void act('continue', true))
}
