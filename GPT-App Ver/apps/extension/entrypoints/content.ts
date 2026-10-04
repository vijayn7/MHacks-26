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
  const claim = await chrome.runtime.sendMessage({
    type: 'claim-page',
    url: `${reply.decision.domain}:${location.pathname}`,
  })
  if (!claim?.first) return
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
      @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=neco@400,500&display=swap');
      .panel { position: fixed; right: 24px; bottom: 24px; width: 320px; background: #050505; color: #f2eae4; padding: 20px; font: 17px/1.4 "Satoshi", Helvetica, Arial, sans-serif; letter-spacing: -0.01em; box-shadow: 0 0 0 1px rgba(255,255,255,0.18), 0 24px 48px rgba(0,0,0,.55); border-radius: 24px; }
      h2 { font-family: "Neco", Georgia, serif; font-weight: 400; font-size: 28px; letter-spacing: -0.03em; margin: 8px 0 0; }
      button { font: inherit; font-weight: 500; margin-right: 8px; margin-top: 8px; padding: 8px 12px; border: 0; border-radius: 999px; background: #fff3d6; color: #1c0a04; }
      button.ghost { background: transparent; color: #f2eae4; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18); }
      .orb { width: 88px; height: 88px; border-radius: 50%; display: grid; place-items: center; color: #fff3d6; margin: 12px 0; font-family: "Neco", Georgia, serif; font-size: 28px; }
      .ash { color: #9a918b; font-family: "Satoshi", Helvetica, Arial, sans-serif; font-size: 13px; }
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
