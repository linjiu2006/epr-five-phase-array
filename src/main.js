import { Vector3 } from 'three'
import { Stage } from './stage.js'
import { SYSTEM, PARTS, PART_MAP } from './parts.js'
import { ARMOR_PROFILES, getArmorProfile } from './armor.js'
import { createMuseum } from './museum.js'

const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => Array.from(document.querySelectorAll(selector))
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const clamp01 = (v) => clamp(v, 0, 1)
const pad3 = (v) => String(Math.max(0, Math.round(v))).padStart(3, '0')
const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const params = new URLSearchParams(window.location.search)
const skipIntro = params.get('skip') === '1' || params.get('nointro') === '1' || params.get('skip') === 'true'
const requestedExplode = Number.parseFloat(params.get('explode') ?? '0')
const initialExplode = clamp01(Number.isFinite(requestedExplode) ? requestedExplode / 100 : 0)
const initialSelection = PART_MAP.has(params.get('select')) ? params.get('select') : null
const initialArmor = getArmorProfile(params.get('phase') || params.get('armor') || 'long').id
const museumMode = /museum\.html$/i.test(window.location.pathname) || params.get('museum') === '1'
const prefersReducedMotion =
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const state = {
  selected: null,
  hovered: null,
  explodeTarget: initialExplode,
  explodeDisplay: initialExplode,
  autoRotate: params.get('rotate') !== '0' && !prefersReducedMotion,
  labels: params.get('labels') !== '0',
  armor: initialArmor,
  sound: false,
  booted: false,
  stageReady: false,
  bootProgress: 0,
  bootSkipRequested: false,
  bootTimer: null,
  bootRaf: null,
  demoActive: false,
  demoStart: 0,
  demoLastTarget: 0,
  demoPhase: 'reset',
  demoPhaseStart: 0,
  helpOpen: false,
  inspectorOpen: false,
  toastTimer: null,
  fpsFrames: 0,
  fpsTime: 0,
  lastUiPercent: -1,
  didFirstFrame: false,
  introStarted: false,
  museumMode,
  museumOverview: false,
}

const dom = {
  canvas: $('#scene'),
  bootScreen: $('#bootScreen'),
  bootBar: $('#bootBar'),
  bootPct: $('#bootPct'),
  bootLog: $('#bootLog'),
  partList: $('#partList'),
  moduleCount: $('#moduleCount'),
  subtagList: $('#subtagList'),
  subtagCount: $('#subtagCount'),
  panelContent: $('#panelContent'),
  inspector: $('#inspector'),
  inspectorCount: $('#inspectorCount'),
  inspectorClose: $('#inspectorClose'),
  archiveBtn: $('#archiveBtn'),
  moduleRail: $('#moduleRail'),
  panelToggle: $('#panelToggle'),
  museumHud: $('#museumHud'),
  museumEnterBtn: $('#museumEnterBtn'),
  museumBackBtn: $('#museumBackBtn'),
  explodeRange: $('#explodeRange'),
  explodePct: $('#explodePct'),
  explodeStage: $('#explodeStage'),
  explodeStageEn: $('#explodeStageEn'),
  explodeBtn: $('#explodeBtn'),
  explodeBtnLabel: $('#explodeBtnLabel'),
  demoBtn: $('#demoBtn'),
  lockStatus: $('#lockStatus'),
  autoRotateBtn: $('#rotateBtn'),
  labelsBtn: $('#labelsBtn'),
  soundBtn: $('#soundBtn'),
  resetBtn: $('#resetBtn'),
  helpBtn: $('#helpBtn'),
  fullscreenBtn: $('#fullscreenBtn'),
  armorPicker: $('#armorPicker'),
  armorBtn: $('#armorBtn'),
  armorMenu: $('#armorMenu'),
  armorOptions: $('#armorOptions'),
  armorName: $('#armorName'),
  armorSwatch: $('#armorSwatch'),
  armorCurrentEn: $('#armorCurrentEn'),
  helpModal: $('#helpModal'),
  cursor: $('#cursor'),
  cursorLabel: $('#cursorLabel'),
  toast: $('#toast'),
  tagLayer: $('#tagLayer'),
  tagSvg: $('#tagSvg'),
  clock: $('#clockReadout'),
  fps: $('#fpsReadout'),
  webglError: $('#webglError'),
  rangeTicks: $$('.range-ticks span'),
}

const TAG_CONFIG = [
  { id: 'blade', dx: 152, dy: -92, side: 'right' },
  { id: 'rails', dx: 118, dy: 70, side: 'right' },
  { id: 'bus', dx: -116, dy: 18, side: 'left' },
  { id: 'thruster', dx: -96, dy: 46, side: 'left' },
  { id: 'core', dx: -72, dy: 112, side: 'left' },
  { id: 'sensor', dx: -148, dy: -112, side: 'left' },
  { id: 'hub', dx: -128, dy: 26, side: 'left' },
  { id: 'cradle', dx: -112, dy: -92, side: 'left' },
  { id: 'fins', dx: -118, dy: 96, side: 'left' },
  { id: 'radiator', dx: -100, dy: 132, side: 'left' },

  // New subassemblies added after the first ten modules.
  {
    id: 'rails-tubes', part: 'rails', code: '04A', name: '五路导能管', en: 'FIVE-CHANNEL WAVEGUIDES',
    accent: '#ffd089', anchor: [6.0, 2.3, 0.8], dx: 164, dy: -106, side: 'right', sub: true, minExplode: 0,
  },
  {
    id: 'rails-shells', part: 'rails', code: '04B', name: '分段发射护壳', en: 'SEGMENTED EMITTER SHELLS',
    accent: '#ffd089', anchor: [4.3, 2.7, -0.8], dx: 146, dy: 26, side: 'right', sub: true, minExplode: 0,
  },
  {
    id: 'rails-aggregate', part: 'rails', code: '04C', name: '中央合束导管', en: 'CENTRAL BEAM COMBINER',
    accent: '#ffd089', anchor: [5.0, 0.1, 0], dx: 128, dy: 120, side: 'right', sub: true, minExplode: 0,
  },
  {
    id: 'rails-frame', part: 'rails', code: '04D', name: '五联发射框', en: 'FIVE-CHANNEL EMITTER FRAME',
    accent: '#ffd089', anchor: [6.2, 0.2, 2.4], dx: 176, dy: 150, side: 'right', sub: true, minExplode: 0,
  },
  {
    id: 'hub-rings', part: 'hub', code: '03A', name: '相位调谐环组', en: 'PHASE TUNING RING SET',
    accent: '#9ceeff', anchor: [0, 3.6, 0.2], dx: -128, dy: 38, side: 'left', sub: true, minExplode: 0,
  },
  {
    id: 'hub-fins', part: 'hub', code: '03B', name: '相位整形鳍', en: 'PHASE-SHAPING FINS',
    accent: '#9ceeff', anchor: [0, 4.5, 0], dx: -122, dy: -46, side: 'left', sub: true, minExplode: 0,
  },
  {
    id: 'cradle-screens', part: 'cradle', code: '05A', name: '五色徽记屏', en: 'FIVE-COLOR EMBLEM DISPLAYS',
    accent: '#a8f7ff', anchor: [0.9, 2.1, 0.9], dx: -130, dy: -72, side: 'left', sub: true, minExplode: 0,
  },
  {
    id: 'cradle-wings', part: 'cradle', code: '05B', name: '翼面校正组件', en: 'WING TRIM ASSEMBLY',
    accent: '#a8f7ff', anchor: [0.2, 2.9, -1.4], dx: -128, dy: 58, side: 'left', sub: true, minExplode: 0,
  },
  {
    id: 'blade-arms', part: 'blade', code: '02A', name: '光网展开臂', en: 'NET DEPLOYMENT ARMS',
    accent: '#ff5f98', anchor: [0, 6.8, 0.8], dx: 152, dy: -122, side: 'right', sub: true, minExplode: 0,
  },
  {
    id: 'blade-net', part: 'blade', code: '02B', name: '光能耦合网', en: 'PHOTON COUPLING MESH',
    accent: '#ff5f98', anchor: [0, 11.8, 0], dx: 158, dy: -48, side: 'right', sub: true, minExplode: 0.78,
  },
]

const STAGES = [
  { threshold: 0.18, cn: '形态锁定', en: 'HARD DOCK' },
  { threshold: 0.48, cn: '花瓣展开', en: 'PETAL DEPLOY' },
  { threshold: 0.76, cn: '枢纽解锁', en: 'RING RELEASE' },
  { threshold: 0.94, cn: '核心分离', en: 'CORE EXPOSED' },
  { threshold: 1.01, cn: '全展开 · 六段连锁', en: 'SIX-SEGMENT LINK' },
]

class AudioEngine {
  constructor() {
    this.context = null
    this.master = null
    this.ambientNodes = []
    this.enabled = false
  }

  async setEnabled(enabled) {
    if (!enabled) {
      this.enabled = false
      if (this.master && this.context) {
        this.master.gain.cancelScheduledValues(this.context.currentTime)
        this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.18)
      }
      return false
    }
    this.ensure()
    if (!this.context) return false
    await this.context.resume()
    this.master.gain.cancelScheduledValues(this.context.currentTime)
    this.master.gain.setTargetAtTime(0.16, this.context.currentTime, 0.5)
    this.enabled = true
    return true
  }

  ensure() {
    if (this.context) return
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    this.context = new AudioContext()
    this.master = this.context.createGain()
    this.master.gain.value = 0
    this.master.connect(this.context.destination)

    const droneGain = this.context.createGain()
    droneGain.gain.value = 0.13
    const lowpass = this.context.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 180
    lowpass.Q.value = 0.8
    droneGain.connect(lowpass)
    lowpass.connect(this.master)

    const oscA = this.context.createOscillator()
    oscA.type = 'sine'
    oscA.frequency.value = 42
    const oscB = this.context.createOscillator()
    oscB.type = 'triangle'
    oscB.frequency.value = 63.1
    const gainB = this.context.createGain()
    gainB.gain.value = 0.2
    oscA.connect(droneGain)
    oscB.connect(gainB)
    gainB.connect(droneGain)
    oscA.start()
    oscB.start()

    const shimmerGain = this.context.createGain()
    shimmerGain.gain.value = 0.008
    const shimmerFilter = this.context.createBiquadFilter()
    shimmerFilter.type = 'bandpass'
    shimmerFilter.frequency.value = 920
    shimmerFilter.Q.value = 0.6
    shimmerGain.connect(shimmerFilter)
    shimmerFilter.connect(this.master)
    const shimmer = this.context.createOscillator()
    shimmer.type = 'sine'
    shimmer.frequency.value = 864
    const lfo = this.context.createOscillator()
    lfo.frequency.value = 0.09
    const lfoGain = this.context.createGain()
    lfoGain.gain.value = 0.007
    lfo.connect(lfoGain)
    lfoGain.connect(shimmerGain.gain)
    shimmer.connect(shimmerGain)
    shimmer.start()
    lfo.start()

    this.ambientNodes = [oscA, oscB, shimmer, lfo]
  }

  tone(frequency, endFrequency, duration, volume = 0.035, type = 'sine') {
    if (!this.enabled || !this.context) return
    const start = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(18, endFrequency), start + duration)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  click() {
    this.tone(740, 560, 0.055, 0.018, 'square')
  }

  select() {
    this.tone(880, 1380, 0.1, 0.028, 'sine')
    window.setTimeout(() => this.tone(1320, 1040, 0.09, 0.014, 'sine'), 68)
  }

  whoosh() {
    this.tone(290, 52, 0.88, 0.04, 'sawtooth')
    this.tone(520, 180, 0.55, 0.014, 'triangle')
  }

  lock() {
    this.tone(190, 76, 0.38, 0.04, 'triangle')
    this.tone(680, 330, 0.22, 0.015, 'square')
  }
}

const audio = new AudioEngine()
let stage = null
let museum = null
let museumStructural = null
let bootAnimation = null

function showWebGLError() {
  dom.webglError.classList.add('is-visible')
  dom.bootScreen.classList.add('is-done')
  document.body.classList.remove('is-booting')
  document.body.classList.add('is-ready')
}

function hasWebGL() {
  try {
    const test = document.createElement('canvas')
    return Boolean(test.getContext('webgl2') || test.getContext('webgl'))
  } catch {
    return false
  }
}

function injectBootLogs() {
  const lines = Array.from(dom.bootLog.querySelectorAll('span'))
  lines.forEach((line) => line.classList.remove('is-active', 'is-done'))
  let index = 0
  const advance = () => {
    if (index > 0 && lines[index - 1]) {
      lines[index - 1].classList.remove('is-active')
      lines[index - 1].classList.add('is-done')
    }
    if (index < lines.length) {
      lines[index].classList.add('is-active')
      index += 1
      window.setTimeout(advance, 420)
    }
  }
  advance()
}

function updateBootProgress(value) {
  const pct = clamp01(value)
  state.bootProgress = pct
  dom.bootBar.style.width = `${pct * 100}%`
  dom.bootPct.textContent = String(Math.round(pct * 100)).padStart(2, '0')
}

function skipBoot() {
  if (state.booted) return
  state.bootSkipRequested = true
  updateBootProgress(1)
  if (bootAnimation) {
    cancelAnimationFrame(bootAnimation)
    bootAnimation = null
  }
  if (state.bootTimer) {
    clearInterval(state.bootTimer)
    state.bootTimer = null
  }
  const lines = Array.from(dom.bootLog.querySelectorAll('span'))
  lines.forEach((line) => {
    line.classList.remove('is-active')
    line.classList.add('is-done')
  })
  tryFinishBoot()
}

function tryFinishBoot() {
  if (state.booted || !dom.canvas) return
  if (!state.bootProgress || state.bootProgress < 0.999 || !state.stageReady) return
  if (bootAnimation) {
    cancelAnimationFrame(bootAnimation)
    bootAnimation = null
  }
  if (state.bootTimer) {
    clearInterval(state.bootTimer)
    state.bootTimer = null
  }
  state.booted = true
  dom.bootScreen.classList.add('is-done')
  document.body.classList.remove('is-booting')
  document.body.classList.add('is-ready')
  window.setTimeout(() => {
    if (document.body.classList.contains('is-ready')) {
      dom.bootScreen.setAttribute('aria-hidden', 'true')
    }
  }, 1100)

  if (initialSelection) {
    window.setTimeout(() => selectPart(initialSelection, { focus: false, silent: true }), 360)
  }
}

function startBootSequence() {
  if (state.introStarted) return
  state.introStarted = true
  injectBootLogs()

  if (skipIntro) {
    updateBootProgress(1)
    skipBoot()
    return
  }

  const start = performance.now()
  const duration = prefersReducedMotion ? 500 : 2050
  updateBootProgress(0)
  const step = () => {
    const elapsed = performance.now() - start
    const t = clamp01(elapsed / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    updateBootProgress(eased * 0.985)
    if (t < 1) {
      bootAnimation = requestAnimationFrame(step)
    } else {
      updateBootProgress(1)
      const lines = Array.from(dom.bootLog.querySelectorAll('span'))
      lines.forEach((line) => {
        line.classList.remove('is-active')
        line.classList.add('is-done')
      })
      tryFinishBoot()
    }
  }
  bootAnimation = requestAnimationFrame(step)
}

function initSubTagList() {
  if (!dom.subtagList) return
  const items = TAG_CONFIG.filter((conf) => conf.sub)
  if (dom.subtagCount) dom.subtagCount.textContent = String(items.length)
  dom.subtagList.innerHTML = items
    .map((conf) => {
      const part = PART_MAP.get(conf.part)
      if (!part) return ''
      return `
        <button class="subtag-item" type="button" data-part="${part.id}" style="--accent:${conf.accent || part.accent}">
          <span class="subtag-item__code">${escapeHtml(conf.code || '')}</span>
          <span>${escapeHtml(conf.name || part.name)}</span>
        </button>`
    })
    .join('')
  dom.subtagList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-part]')
    if (!item) return
    selectPart(item.dataset.part, { focus: true })
  })
}

function initPartList() {
  dom.partList.innerHTML = PARTS.map(
    (part) => `
      <button class="part-item" type="button" data-part="${part.id}" style="--accent:${part.accent}" aria-pressed="false">
        <span class="part-item__index">${String(part.index).padStart(2, '0')}</span>
        <span class="part-item__copy">
          <span class="part-item__name">${escapeHtml(part.name)}</span>
          <span class="part-item__en">${escapeHtml(part.en)}</span>
        </span>
        <span class="part-item__status"><i class="part-item__dot"></i>${escapeHtml(part.status)}</span>
      </button>`,
  ).join('')

  dom.partList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-part]')
    if (!item) return
    selectPart(item.dataset.part, { focus: true })
  })
}

function updateActivePartUI() {
  $$('.part-item').forEach((item) => {
    const active = item.dataset.part === state.selected
    item.classList.toggle('is-active', active)
    item.setAttribute('aria-pressed', String(active))
  })
  $$('.tag').forEach((tag) => {
    tag.classList.toggle('is-active', tag.dataset.part === state.selected)
  })
  $$('.tag-svg line').forEach((line) => {
    line.classList.toggle('is-active', line.dataset.part === state.selected)
  })
}

function renderOverview() {
  const perf = SYSTEM.performance
    .map(
      (item) => `
        <div class="perf-row">
          <span class="pl">${escapeHtml(item.label)}</span>
          <span class="bar"><i style="width:${item.value}%"></i></span>
          <span class="pv">${item.value}</span>
        </div>`,
    )
    .join('')
  const stats = SYSTEM.stats
    .map(
      (stat) => `
        <div class="stat-cell">
          <div class="lbl">${escapeHtml(stat.label)}<i>${escapeHtml(stat.note)}</i></div>
          <div class="val">${escapeHtml(stat.value)}<span>${escapeHtml(stat.unit)}</span></div>
        </div>`,
    )
    .join('')

  dom.panelContent.innerHTML = `
    <article class="doc-overview">
      <div class="doc-top">
        <span class="doc-code">${escapeHtml(SYSTEM.code)}</span>
        <span class="doc-badge">${escapeHtml(SYSTEM.mode)}</span>
      </div>
      <div class="doc-hero">
        <div class="doc-kicker">${escapeHtml(SYSTEM.authority)} / ${escapeHtml(SYSTEM.division)}</div>
        <h2 class="doc-title">${escapeHtml(SYSTEM.name)}</h2>
        <div class="doc-en">${escapeHtml(SYSTEM.en)}</div>
        <p class="doc-summary">${escapeHtml(SYSTEM.summary)}</p>
      </div>
      <div class="stat-grid">${stats}</div>
      <div class="section-label"><b>SYSTEM PERFORMANCE</b> / 系统状态</div>
      <div class="perf-list">${perf}</div>
      <div class="doc-actions">
        <button class="primary-btn" type="button" data-doc-action="demo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l13 8-13 8Z"/></svg>
          <span>启动变形</span>
        </button>
        <button class="ghost-btn" type="button" data-doc-action="focus-core">
          <span>核心档案</span>
        </button>
      </div>
      <p class="doc-note">数据为基于剧集画面与公开台词的合理化推演。操作：鼠标左键拖拽环绕，滚轮缩放，点击任意结构进入部件档案。</p>
    </article>
  `
  dom.inspectorCount.textContent = 'OVERVIEW'
  bindInspectorActions()
}

function renderPartDoc(part) {
  const specs = part.specs
    .map(
      ([label, value]) => `
        <div class="spec-row">
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>`,
    )
    .join('')
  const bullets = part.bullets
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')

  dom.panelContent.innerHTML = `
    <article class="part-doc" style="--accent:${part.accent}">
      <div class="part-doc-head">
        <div class="part-number">${String(part.index).padStart(2, '0')}</div>
        <div class="part-kicker">${escapeHtml(part.code)} / ${escapeHtml(part.group)}</div>
        <h2 class="part-name">${escapeHtml(part.name)}</h2>
        <div class="part-en">${escapeHtml(part.en)}</div>
        <div class="part-status">${escapeHtml(part.status)}</div>
      </div>
      <p class="part-summary">${escapeHtml(part.summary)}</p>
      <dl class="spec-list">${specs}</dl>
      <div class="section-label"><b>FUNCTION NOTES</b> / 功能节点</div>
      <ul class="bullet-list">${bullets}</ul>
      <p class="part-detail">${escapeHtml(part.detail)}</p>
      <div class="doc-actions">
        <button class="primary-btn" type="button" data-doc-action="focus">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          <span>镜头聚焦</span>
        </button>
        <button class="ghost-btn" type="button" data-doc-action="back">
          <span>返回总览</span>
        </button>
      </div>
    </article>
  `
  dom.inspectorCount.textContent = `PART ${String(part.index).padStart(2, '0')}`
  bindInspectorActions()
}

function bindInspectorActions() {
  const focusButton = dom.panelContent.querySelector('[data-doc-action="focus"]')
  const backButton = dom.panelContent.querySelector('[data-doc-action="back"]')
  if (focusButton) {
    focusButton.addEventListener('click', () => {
      if (state.selected) focusPart(state.selected)
    })
  }
  if (backButton) {
    backButton.addEventListener('click', () => {
      deselectPart({ silent: false })
    })
  }
  const demoButton = dom.panelContent.querySelector('[data-doc-action="demo"]')
  if (demoButton) demoButton.addEventListener('click', () => startDemo())
  const coreButton = dom.panelContent.querySelector('[data-doc-action="focus-core"]')
  if (coreButton) coreButton.addEventListener('click', () => selectPart('core', { focus: true }))
}

function syncArchiveButton() {
  if (!dom.archiveBtn) return
  const open = Boolean(state.inspectorOpen)
  dom.archiveBtn.classList.toggle('is-on', open)
  dom.archiveBtn.classList.toggle('has-part', !open && Boolean(state.selected))
  dom.archiveBtn.setAttribute('aria-expanded', String(open))
  dom.archiveBtn.setAttribute('aria-label', open ? '收起结构档案' : '打开结构档案')
  document.body.classList.toggle('archive-open', open)
}

function syncMatrixButton() {
  if (!dom.panelToggle || !dom.moduleRail) return
  const open = dom.moduleRail.classList.contains('is-open')
  dom.panelToggle.classList.toggle('is-on', open)
  dom.panelToggle.setAttribute('aria-expanded', String(open))
  dom.panelToggle.setAttribute('aria-label', open ? '收起模块矩阵' : '打开模块矩阵')
  dom.panelToggle.dataset.tip = open ? '收起模块矩阵' : '模块矩阵'
  dom.moduleRail.inert = !open
  dom.moduleRail.setAttribute('aria-hidden', String(!open))
  if (dom.moduleCount) {
    dom.moduleCount.textContent = `${PARTS.length} 功能段 / ${TAG_CONFIG.length} 标注`
  }
}

function updateInspectorVisibility() {
  if (!dom.inspector) return
  // The structure archive is an explicit overlay: selecting a component updates
  // its contents but never opens it on its own.
  dom.inspector.classList.toggle('is-open', state.inspectorOpen)
  dom.inspector.setAttribute('aria-hidden', String(!state.inspectorOpen))
  dom.inspector.inert = !state.inspectorOpen
  syncArchiveButton()
}

function setInspectorOpen(open, { silent = false } = {}) {
  const hadPanelFocus = Boolean(dom.inspector?.contains(document.activeElement))
  state.inspectorOpen = Boolean(open)
  if (state.inspectorOpen) {
    dom.moduleRail.classList.remove('is-open')
    syncMatrixButton()
  }
  updateInspectorVisibility()
  if (!state.inspectorOpen && hadPanelFocus) dom.archiveBtn.focus()
  if (!silent) {
    audio.click()
    showToast(state.inspectorOpen ? '结构档案 / 已展开' : '结构档案 / 已收起')
  }
}

function selectPart(id, { focus = false, silent = false } = {}) {
  const part = PART_MAP.get(id)
  if (!part || !stage) return
  state.selected = id
  stage.setSelected(id)
  renderPartDoc(part)
  updateActivePartUI()
  updateInspectorVisibility()
  dom.moduleRail.classList.remove('is-open')
  syncMatrixButton()
  if (focus) focusPart(id)
  if (!silent) {
    audio.select()
    showToast(`已选中 / ${part.name}`)
  }
}

function focusPart(id) {
  if (!stage) return
  const part = PART_MAP.get(id)
  if (!part) return
  stage.focusOnPart(id, part.focus, 1.1)
  // Focusing is a deliberate action, so temporarily let the camera settle.
  showToast(`镜头聚焦 / ${part.name}`)
}

function deselectPart({ silent = false } = {}) {
  state.selected = null
  if (stage) stage.setSelected(null)
  renderOverview()
  updateActivePartUI()
  updateInspectorVisibility()
  if (!silent) {
    audio.click()
    showToast('返回整机总览')
  }
}

function togglePartPanels() {
  if (!dom.moduleRail) return
  const shouldOpen = !dom.moduleRail.classList.contains('is-open')
  dom.moduleRail.classList.toggle('is-open', shouldOpen)
  syncMatrixButton()
  if (shouldOpen && state.inspectorOpen) setInspectorOpen(false, { silent: true })
  if (shouldOpen) audio.click()
}

function setExplodeTarget(value, { fromUser = true } = {}) {
  const target = clamp01(value)
  state.explodeTarget = target
  if (fromUser) {
    state.demoActive = false
    dom.demoBtn.classList.remove('is-playing')
    stopDemo()
  }
  if (stage) stage.setExplode(target)
  syncExplodeUi(target)
}

function syncExplodeUi(target) {
  const percent = clamp01(target)
  const pct = Math.round(percent * 100)
  state.explodeDisplay = percent
  dom.explodePct.textContent = pad3(pct)
  dom.explodeRange.value = String(pct)
  dom.explodeRange.style.setProperty('--fill', `${pct}%`)
  if (pct >= 92) {
    dom.lockStatus.textContent = '6-SEG LINKED'
    dom.lockStatus.classList.remove('is-off')
    dom.lockStatus.classList.add('is-linked')
  } else {
    dom.lockStatus.textContent = pct < 50 ? 'ENGAGED' : 'RELEASED'
    dom.lockStatus.classList.toggle('is-off', pct >= 50)
    dom.lockStatus.classList.remove('is-linked')
  }
  dom.explodeBtnLabel.textContent = target > 0.5 ? '重组' : '拆解'
  dom.explodeBtn.setAttribute('aria-label', target > 0.5 ? '重组卫星' : '拆解卫星')
  dom.explodeBtn.classList.toggle('is-active', target > 0.5)

  let activeStage = STAGES[0]
  for (const stageDef of STAGES) {
    if (percent <= stageDef.threshold) {
      activeStage = stageDef
      break
    }
  }
  // STAGES thresholds describe the upper edge of each range.
  if (percent >= 0.94) activeStage = STAGES[4]
  dom.explodeStage.textContent = activeStage.cn
  dom.explodeStageEn.textContent = activeStage.en
  const activeIndex = STAGES.indexOf(activeStage)
  dom.rangeTicks.forEach((tick, index) => {
    tick.classList.toggle('is-active', index === Math.min(activeIndex, dom.rangeTicks.length - 1))
  })
}

function toggleDisassembly() {
  if (state.demoActive) {
    stopDemo()
    return
  }
  const next = state.explodeTarget > 0.5 ? 0 : 1
  setExplodeTarget(next, { fromUser: true })
  audio.whoosh()
  showToast(next > 0.5 ? '拆解序列启动 / DISASSEMBLY' : '重组序列启动 / REASSEMBLY')
}

function startDemo() {
  if (!stage) return
  if (state.demoActive) {
    stopDemo()
    return
  }
  state.demoActive = true
  state.demoStart = performance.now()
  state.demoLastTarget = 0
  state.demoPhase = 'reset'
  state.demoPhaseStart = performance.now()
  dom.demoBtn.classList.add('is-playing')
  dom.demoBtn.querySelector('.btn-copy b').textContent = '停止演示'
  // 1) Reset the hero view first. 2) Once the camera settles, rotate the
  // five-emitter carriage so the selected phase emblem is at the top of
  // the reset frame. 3) Only then begin unfolding.
  stage.resetView(true)
  stage.setAutoRotate(false)
  setExplodeTarget(0, { fromUser: false })
  audio.whoosh()
  showToast('12 秒变形序列 / AUTO CYCLE')
}

function stopDemo() {
  if (!state.demoActive) return
  state.demoActive = false
  dom.demoBtn.classList.remove('is-playing')
  dom.demoBtn.querySelector('.btn-copy b').textContent = '12s 变形演示'
  stage.setExplode(state.explodeTarget)
  stage.setAutoRotate(state.autoRotate)
}

function tickDemo(now) {
  if (!state.demoActive) return
  const phaseElapsed = (now - state.demoPhaseStart) / 1000
  let target = 0

  if (state.demoPhase === 'reset') {
    // 0–1.3 s: reset the camera first; do not rotate or unfold yet.
    target = 0
    if (phaseElapsed >= 1.3) {
      stage.launcher.focusArmorScreen(state.armor)
      state.demoPhase = 'align'
      state.demoPhaseStart = now
    }
  } else if (state.demoPhase === 'align') {
    // 1.3–2.45 s: rotate the five-emblem carriage so the selected phase's
    // screen is at the top of the reset view.
    target = 0
    if (phaseElapsed >= 1.15) {
      const view = stage.launcher.getArmorScreenView(state.armor)
      if (view) stage.focusScreen(view.point, view.normal, 0.95)
      state.demoPhase = 'focus'
      state.demoPhaseStart = now
    }
  } else if (state.demoPhase === 'focus') {
    // 2.45–4.6 s: push in (0.95 s) and hold for about 1.2 s on the selected
    // emblem screen before returning to the hero view.
    target = 0
    if (phaseElapsed >= 2.15) {
      stage.resetView(true, 1.4)
      state.demoPhase = 'return'
      state.demoPhaseStart = now
    }
  } else if (state.demoPhase === 'return') {
    // 4.6–6.05 s: pull back slowly to the hero view before any unfolding.
    target = 0
    if (phaseElapsed >= 1.45) {
      state.demoPhase = 'expand'
      state.demoPhaseStart = now
    }
  } else if (state.demoPhase === 'expand') {
    // 6.05–9.95 s: unfold after the screen presentation and second reset.
    const t = clamp01(phaseElapsed / 3.9)
    target = t * t * (3 - 2 * t)
    if (phaseElapsed >= 3.9) {
      target = 1
      state.demoPhase = 'hold'
      state.demoPhaseStart = now
    }
  } else {
    // 9.95–11.95 s: hold fully deployed so the lasers remain visible. The demo
    // ends deployed; use 重组 to retract afterwards.
    target = 1
    if (phaseElapsed >= 2.0) {
      state.demoActive = false
      dom.demoBtn.classList.remove('is-playing')
      dom.demoBtn.querySelector('.btn-copy b').textContent = '12s 变形演示'
      if (stage) {
        stage.setExplode(1)
        stage.setAutoRotate(state.autoRotate)
      }
      state.explodeTarget = 1
      syncExplodeUi(1)
      showToast('变形序列完成 / CYCLE COMPLETE')
      return
    }
  }

  state.explodeTarget = target
  if (stage) stage.setExplode(target)
  syncExplodeUi(target)
  if (state.demoLastTarget < 0.5 && target >= 0.5) audio.whoosh()
  state.demoLastTarget = target
}

function toggleAutoRotate() {
  if (!stage) return
  state.autoRotate = stage.toggleAutoRotate()
  audio.click()
  updateToggleButton(dom.autoRotateBtn, state.autoRotate)
  showToast(state.autoRotate ? '自动环绕已开启 / ORBIT ON' : '自动环绕已暂停 / ORBIT PAUSED')
}

function toggleLabels() {
  state.labels = !state.labels
  document.body.classList.toggle('tags-on', state.labels)
  document.body.classList.toggle('tags-off', !state.labels)
  updateToggleButton(dom.labelsBtn, state.labels)
  audio.click()
  showToast(state.labels ? '部件标注已开启 / TAGS ON' : '部件标注已关闭 / TAGS OFF')
}

function updateToggleButton(button, enabled) {
  if (!button) return
  button.classList.toggle('is-on', enabled)
  button.setAttribute('aria-pressed', String(enabled))
}

async function toggleSound() {
  if (!state.sound) {
    const enabled = await audio.setEnabled(true)
    state.sound = Boolean(enabled)
  } else {
    await audio.setEnabled(false)
    state.sound = false
  }
  dom.soundBtn.classList.toggle('is-muted', !state.sound)
  dom.soundBtn.setAttribute('aria-pressed', String(state.sound))
  if (state.sound) audio.select()
  showToast(state.sound ? '声音链路已建立 / AUDIO ON' : '声音链路已关闭 / AUDIO OFF')
}

function resetView() {
  if (!stage) return
  stage.resetView(true)
  stage.setAutoRotate(state.autoRotate)
  audio.click()
  showToast('视角已复位 / VIEW RESET')
}

function setView(view) {
  if (!stage) return
  stage.setView(view)
  audio.click()
  const labels = { hero: '主视角', front: '正视', side: '侧视', top: '俯视' }
  showToast(`镜头切换 / ${labels[view] || view}`)
}

function openHelp() {
  if (state.helpOpen) return
  state.helpOpen = true
  if (stage) {
    state.helpWasAutoRotate = state.autoRotate
    stage.setAutoRotate(false)
  }
  dom.helpModal.classList.add('is-open')
  dom.helpModal.setAttribute('aria-hidden', 'false')
  audio.click()
}

function closeHelp() {
  if (!state.helpOpen) return
  state.helpOpen = false
  dom.helpModal.classList.remove('is-open')
  dom.helpModal.setAttribute('aria-hidden', 'true')
  if (stage) stage.setAutoRotate(state.helpWasAutoRotate ?? state.autoRotate)
  audio.click()
}

function toggleFullscreen() {
  const root = document.documentElement
  if (!document.fullscreenElement) {
    const request = root.requestFullscreen?.()
    if (request?.catch) request.catch(() => showToast('全屏请求未获浏览器允许'))
  } else {
    document.exitFullscreen?.()
  }
  audio.click()
}

function showToast(message) {
  dom.toast.textContent = message
  dom.toast.classList.add('is-visible')
  if (state.toastTimer) clearTimeout(state.toastTimer)
  state.toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove('is-visible')
  }, 2200)
}

function updateCursor(visible, hoveredId = null, x = 0, y = 0) {
  if (!dom.cursor) return
  if (!visible || window.matchMedia('(pointer: coarse)').matches) {
    dom.cursor.classList.remove('is-visible', 'is-hovering')
    return
  }
  dom.cursor.classList.add('is-visible')
  dom.cursor.style.left = `${x}px`
  dom.cursor.style.top = `${y}px`
  const part = hoveredId ? PART_MAP.get(hoveredId) : null
  dom.cursor.classList.toggle('is-hovering', Boolean(part))
  dom.cursorLabel.textContent = part ? part.name : ''
  document.body.style.cursor = ''
}

function setHoveredPart(id) {
  state.hovered = id
  if (id) {
    const part = PART_MAP.get(id)
    dom.canvas.setAttribute('aria-label', `选中 ${part?.name || ''}，ERP 轨道卫星发射器三维拆解可视化`)
  } else {
    dom.canvas.setAttribute('aria-label', 'ERP 轨道卫星发射器三维拆解可视化')
  }
}

function buildTagUi() {
  if (!stage) return
  dom.tagLayer.innerHTML = ''
  dom.tagSvg.innerHTML = ''
  const svgNs = 'http://www.w3.org/2000/svg'
  for (const conf of TAG_CONFIG) {
    const parentId = conf.part || conf.id
    const part = PART_MAP.get(parentId)
    if (!part) continue

    const group = document.createElementNS(svgNs, 'g')
    group.dataset.tag = conf.id
    const line = document.createElementNS(svgNs, 'line')
    line.dataset.part = part.id
    const circle = document.createElementNS(svgNs, 'circle')
    circle.setAttribute('r', '1.4')
    circle.dataset.part = part.id
    const ring = document.createElementNS(svgNs, 'circle')
    ring.setAttribute('r', '5.5')
    ring.setAttribute('class', 'tag-ring')
    group.append(line, ring, circle)
    dom.tagSvg.appendChild(group)

    const button = document.createElement('button')
    button.type = 'button'
    button.className = `tag ${conf.side === 'left' ? 'is-left' : 'is-right'}${conf.sub ? ' is-sub' : ''}`
    button.dataset.tag = conf.id
    button.dataset.part = part.id
    button.style.setProperty('--accent', conf.accent || part.accent)
    const code = conf.code || String(part.index).padStart(2, '0')
    const name = conf.name || part.name
    const en = conf.en || part.en
    button.innerHTML = `
      <span class="tag-index">${escapeHtml(code)}</span>
      <span class="tag-name"><b>${escapeHtml(name)}</b><em>${escapeHtml(en)}</em></span>
    `
    button.addEventListener('click', () => selectPart(part.id, { focus: true }))
    dom.tagLayer.appendChild(button)
  }
}

function updateTags() {
  if (!stage || !state.labels || !state.booted) return
  const compact = window.innerWidth <= 900
  const matrixGutter = dom.moduleRail.classList.contains('is-open') ? 334 : 44
  const archiveGutter = state.inspectorOpen && window.innerWidth > 900 ? 356 : matrixGutter
  const safe = window.innerWidth > 1180
    ? { minX: 44, maxX: window.innerWidth - archiveGutter, minY: 116, maxY: window.innerHeight - 178 }
    : { minX: 44, maxX: window.innerWidth - archiveGutter, minY: 96, maxY: window.innerHeight - 164 }
  const placed = []

  for (const conf of TAG_CONFIG) {
    const parentId = conf.part || conf.id
    const part = PART_MAP.get(parentId)
    if (!part) continue
    const button = dom.tagLayer.querySelector(`.tag[data-tag="${conf.id}"]`)
    const group = dom.tagSvg.querySelector(`g[data-tag="${conf.id}"]`)
    if (!button || !group) continue
    if (conf.minExplode && state.explodeDisplay < conf.minExplode) {
      button.style.visibility = 'hidden'
      button.style.opacity = '0'
      group.style.opacity = '0'
      continue
    }
    const screen = stage.projectPartAnchor(parentId, new Vector3(...(conf.anchor || part.anchor)))
    if (!screen || !screen.visible || compact) {
      button.style.visibility = 'hidden'
      button.style.opacity = '0'
      group.style.opacity = '0'
      continue
    }

    if (!button._tagSize) {
      const rect = button.getBoundingClientRect()
      button._tagSize = { width: rect.width || 100, height: rect.height || 30 }
    }
    const width = button._tagSize.width
    const height = button._tagSize.height
    let lx = screen.x + conf.dx
    let ly = screen.y + conf.dy

    lx = conf.side === 'left'
      ? clamp(lx, safe.minX + width, safe.maxX)
      : clamp(lx, safe.minX, safe.maxX - width)
    ly = clamp(ly, safe.minY, safe.maxY)

    // Resolve label collisions with a small vertical fan-out.
    const offsets = [0, 36, -36, 72, -72, 108, -108, 144, -144]
    let accepted = null
    for (const offset of offsets) {
      const testY = ly + offset
      if (testY < safe.minY || testY > safe.maxY) continue
      const left = conf.side === 'left' ? lx - width : lx
      const top = testY - height / 2
      const box = { left, right: left + width, top, bottom: top + height }
      const overlaps = placed.some(
        (other) => !(box.right + 8 < other.left || box.left > other.right + 8 || box.bottom + 6 < other.top || box.top > other.bottom + 6),
      )
      if (!overlaps) {
        accepted = { x: lx, y: testY, box }
        break
      }
    }

    if (!accepted) {
      button.style.visibility = 'hidden'
      button.style.opacity = '0'
      group.style.opacity = '0'
      continue
    }
    placed.push(accepted.box)
    lx = accepted.x
    ly = accepted.y

    button.classList.toggle('is-left', conf.side === 'left')
    button.style.visibility = 'visible'
    button.style.opacity = ''
    button.style.left = `${lx}px`
    button.style.top = `${ly}px`
    button.style.transform = conf.side === 'left' ? `translate(-${width}px, -50%)` : 'translate(0, -50%)'

    const line = group.querySelector('line')
    const dot = group.querySelector('circle:not(.tag-ring)')
    const ring = group.querySelector('.tag-ring')
    if (line && dot && ring) {
      const anchorX = screen.x
      const anchorY = screen.y
      const endX = conf.side === 'left' ? lx - 6 : lx - 5
      line.setAttribute('x1', anchorX.toFixed(1))
      line.setAttribute('y1', anchorY.toFixed(1))
      line.setAttribute('x2', endX.toFixed(1))
      line.setAttribute('y2', ly.toFixed(1))
      dot.setAttribute('cx', anchorX.toFixed(1))
      dot.setAttribute('cy', anchorY.toFixed(1))
      ring.setAttribute('cx', anchorX.toFixed(1))
      ring.setAttribute('cy', anchorY.toFixed(1))
      group.style.opacity = '1'
    }
  }
}

function updateClock() {
  if (!dom.clock) return
  const now = new Date()
  const second = now.getSeconds()
  if (state.lastClockSecond === second) return
  state.lastClockSecond = second
  try {
    dom.clock.textContent = now.toLocaleTimeString('en-GB', {
      hour12: false,
      timeZone: 'Asia/Shanghai',
    })
  } catch {
    dom.clock.textContent = now.toTimeString().slice(0, 8)
  }
}

function renderArmorOptions() {
  if (!dom.armorOptions) return
  dom.armorOptions.innerHTML = ARMOR_PROFILES.map((profile) => `
    <button class="armor-option" type="button" role="menuitemradio" aria-checked="false" tabindex="-1"
      data-armor="${profile.id}" style="--swatch:${profile.ui}">
      <span class="armor-option__code">${profile.code}</span>
      <i class="armor-option__swatch" aria-hidden="true"></i>
      <span class="armor-option__copy"><b>${escapeHtml(profile.name)}</b><em>${escapeHtml(profile.en)}</em></span>
      <span class="armor-option__check" aria-hidden="true">✓</span>
    </button>
  `).join('')
}

function syncArmorUi() {
  const profile = getArmorProfile(state.armor)
  if (dom.armorPicker) {
    dom.armorPicker.style.setProperty('--armor', profile.ui)
  }
  if (dom.armorName) dom.armorName.textContent = profile.name
  if (dom.armorCurrentEn) dom.armorCurrentEn.textContent = profile.en
  if (dom.armorBtn) {
    dom.armorBtn.setAttribute('aria-label', `选择五相模式，当前${profile.name}`)
  }
  if (!dom.armorOptions) return
  const options = dom.armorOptions.querySelectorAll('[data-armor]')
  for (const option of options) {
    const selected = option.dataset.armor === profile.id
    option.classList.toggle('is-selected', selected)
    option.setAttribute('aria-checked', String(selected))
    option.tabIndex = selected ? 0 : -1
  }
}

function setArmorMenuOpen(open, { focus = false, returnFocus = false } = {}) {
  if (!dom.armorPicker || !dom.armorBtn || !dom.armorMenu) return
  const next = Boolean(open)
  dom.armorPicker.classList.toggle('is-open', next)
  dom.armorBtn.setAttribute('aria-expanded', String(next))
  dom.armorMenu.toggleAttribute('inert', !next)
  if (next && focus) {
    requestAnimationFrame(() => {
      const selected = dom.armorOptions?.querySelector('.armor-option.is-selected')
      ;(selected || dom.armorOptions?.querySelector('.armor-option'))?.focus({ preventScroll: true })
    })
  } else if (!next && returnFocus) {
    dom.armorBtn.focus({ preventScroll: true })
  }
}

function setArmor(id, { silent = false } = {}) {
  const profile = getArmorProfile(id)
  state.armor = profile.id
  stage?.launcher?.setArmorTheme?.(profile.id)
  syncArmorUi()
  if (!silent) setArmorMenuOpen(false, { returnFocus: true })
}

function bindArmorPicker() {
  renderArmorOptions()
  syncArmorUi()
  if (!dom.armorBtn || !dom.armorMenu || !dom.armorOptions) return

  dom.armorBtn.addEventListener('click', (event) => {
    event.stopPropagation()
    const open = !dom.armorPicker.classList.contains('is-open')
    setArmorMenuOpen(open, { focus: open })
  })

  dom.armorOptions.addEventListener('click', (event) => {
    const option = event.target.closest?.('[data-armor]')
    if (!option) return
    setArmor(option.dataset.armor)
  })

  dom.armorMenu.addEventListener('keydown', (event) => {
    const options = Array.from(dom.armorOptions.querySelectorAll('[data-armor]'))
    const current = options.indexOf(document.activeElement)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      const next = (current + step + options.length) % options.length
      options[next]?.focus({ preventScroll: true })
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : options.length - 1
      options[next]?.focus({ preventScroll: true })
    }
  })

  document.addEventListener('pointerdown', (event) => {
    if (!dom.armorPicker.classList.contains('is-open')) return
    if (!dom.armorPicker.contains(event.target)) setArmorMenuOpen(false)
  })
}

function setMuseumEffectsHidden(hidden) {
  if (!stage || !museumStructural) return
  for (const child of stage.launcher.root.children) {
    if (!museumStructural.has(child)) child.visible = !hidden
  }
  const L = stage.launcher
  const hide = (object) => {
    if (!object) return
    if (Array.isArray(object)) {
      object.forEach(hide)
      return
    }
    if (object.visible !== undefined) object.visible = !hidden
  }
  hide(L.energyBeam?.group)
  hide(L.energyBeam?.core)
  hide(L.energyBeam?.glow)
  hide(L.energyBeam?.impact)
  hide(L.energyBeam?.impactRing)
  hide(L.energyBeam?.originGlow)
  for (const pulse of L.energyBeam?.pulses || []) hide(pulse.sprite)
  hide(L.energyFlow?.line)
  hide(L.energyFlow?.tubes)
  hide(L.energyFlow?.sprites)
  hide(L.engineEnergy?.group)
  if (L.petalLaser) {
    hide(L.petalLaser.netMesh)
    hide(L.petalLaser.outline)
    hide(L.petalLaser.beams)
    hide(L.petalLaser.bigBeams)
    hide(L.petalLaser.bigGlows)
    hide(L.petalLaser.apexSprites)
    for (const sprite of L.petalLaser.apexSprites || []) hide(sprite)
  }
  if (L.petalEnergyRelay) {
    hide(L.petalEnergyRelay.receiver)
    hide(L.petalEnergyRelay.beams)
    for (const beam of L.petalEnergyRelay.beams || []) {
      for (const pulse of beam.pulses || []) hide(pulse.sprite)
    }
    hide(L.petalEnergyRelay.ports)
    hide(L.petalEnergyRelay.coreGlow)
    hide(L.petalEnergyRelay.ringHalo)
  }
}

function enterMuseum(animate = true) {
  if (!stage || !state.museumMode) return
  state.museumOverview = true
  document.body.classList.add('is-museum')
  if (dom.museumHud) dom.museumHud.hidden = false
  if (dom.museumBackBtn) dom.museumBackBtn.hidden = true
  if (museum) {
    museum.group.visible = true
    museum.setPaused(false)
    museum.update(stage.elapsed)
  }
  setMuseumEffectsHidden(true)
  stage.setAutoRotate(false)
  stage.museumView(animate)
  if (state.selected) deselectPart({ silent: true })
}

function enterHeroExhibit() {
  if (!stage || !state.museumMode) return
  state.museumOverview = false
  document.body.classList.remove('is-museum')
  if (dom.museumHud) dom.museumHud.hidden = true
  if (dom.museumBackBtn) dom.museumBackBtn.hidden = false
  if (museum) {
    museum.setPaused(true)
    museum.group.visible = false
  }
  setMuseumEffectsHidden(false)
  stage.museumHeroView(stage.launcher.root.position, true)
  stage.setAutoRotate(false)
  state.autoRotate = false
  if (dom.autoRotateBtn) updateToggleButton(dom.autoRotateBtn, false)
}


function bindUi() {
  bindArmorPicker()
  dom.panelToggle.addEventListener('click', togglePartPanels)
  dom.archiveBtn.addEventListener('click', () => setInspectorOpen(!state.inspectorOpen))
  dom.inspectorClose.addEventListener('click', () => setInspectorOpen(false))
  dom.autoRotateBtn.addEventListener('click', toggleAutoRotate)
  dom.labelsBtn.addEventListener('click', toggleLabels)
  dom.soundBtn.addEventListener('click', toggleSound)
  dom.resetBtn.addEventListener('click', resetView)
  dom.helpBtn.addEventListener('click', openHelp)
  dom.fullscreenBtn.addEventListener('click', toggleFullscreen)
  dom.explodeBtn.addEventListener('click', toggleDisassembly)
  dom.demoBtn.addEventListener('click', startDemo)
  dom.museumEnterBtn?.addEventListener('click', () => enterHeroExhibit())
  dom.museumBackBtn?.addEventListener('click', () => enterMuseum(true))
  dom.explodeRange.addEventListener('input', (event) => {
    const target = Number(event.target.value) / 100
    setExplodeTarget(target, { fromUser: true })
  })
  dom.explodeRange.addEventListener('pointerdown', () => {
    if (state.demoActive) stopDemo()
  })

  $$('[data-close-modal]').forEach((el) => el.addEventListener('click', closeHelp))
  dom.helpModal.addEventListener('click', (event) => {
    if (event.target === dom.helpModal) closeHelp()
  })

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return
    const targetTag = event.target?.tagName
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return
    const key = event.key.toLowerCase()
    if (key === 'escape') {
      if (dom.armorPicker?.classList.contains('is-open')) {
        setArmorMenuOpen(false, { returnFocus: true })
      } else if (state.helpOpen) {
        closeHelp()
      } else if (state.inspectorOpen) {
        setInspectorOpen(false)
      } else if (dom.moduleRail.classList.contains('is-open')) {
        dom.moduleRail.classList.remove('is-open')
        syncMatrixButton()
      } else if (state.selected) {
        deselectPart()
      }
      return
    }
    if (key === ' ' || event.code === 'Space') {
      event.preventDefault()
      toggleDisassembly()
      return
    }
    if (key === 'r') return resetView()
    if (key === 'a') return toggleAutoRotate()
    if (key === 'l') return toggleLabels()
    if (key === 'm') return toggleSound()
    if (key === 'f') return toggleFullscreen()
    if (key === '?' || (key === '/' && event.shiftKey)) return openHelp()
    if (key === 'h') return openHelp()
    if (['1', '2', '3', '4'].includes(key)) {
      const views = ['hero', 'front', 'side', 'top']
      if (key === '1') {
        resetView()
      } else {
        setView(views[Number(key) - 1])
      }
    }
  })

  dom.bootScreen.addEventListener('click', skipBoot)

  document.addEventListener('mousemove', (event) => {
    if (!dom.cursor.classList.contains('is-visible')) return
    // The canvas hook owns cursor visibility; this just catches UI overlays.
    if (event.target.closest?.('button, .panel, .dock, .tag, input')) {
      dom.cursor.classList.remove('is-visible', 'is-hovering')
    }
  })
  document.addEventListener('mouseleave', () => {
    dom.cursor.classList.remove('is-visible', 'is-hovering')
  })

  window.addEventListener('resize', () => {
    updateInspectorVisibility()
    dom.moduleRail.classList.remove('is-open')
    setArmorMenuOpen(false)
    syncMatrixButton()
  })
}

async function initStage() {
  if (!hasWebGL()) {
    showWebGLError()
    return
  }
  try {
    await document.fonts.ready.catch(() => {})
    stage = new Stage(dom.canvas, {
      onHover: setHoveredPart,
      onPick: (id) => {
        if (state.museumMode && state.museumOverview) {
          enterHeroExhibit()
          return
        }
        selectPart(id, { focus: false })
        audio.click()
      },
      onPickBackground: () => {
        if (state.selected) deselectPart()
      },
      onFocusPick: (id) => {
        selectPart(id, { focus: true })
      },
      onCursor: (visible, hoveredId, x, y) => updateCursor(visible, hoveredId, x, y),
    })

    // QA hook used by the local screenshot harness; harmless in production.
    window.__stage = stage

    stage.launcher.setExplode(initialExplode, true)
    stage.launcher.setArmorTheme(state.armor)
    stage.setAutoRotate(state.autoRotate)
    syncExplodeUi(initialExplode)
    updateToggleButton(dom.autoRotateBtn, state.autoRotate)
    updateToggleButton(dom.labelsBtn, state.labels)
    dom.soundBtn.classList.add('is-muted')
    document.body.classList.toggle('tags-on', state.labels)
    document.body.classList.toggle('tags-off', !state.labels)

    buildTagUi()
    syncMatrixButton()
    renderOverview()
    updateActivePartUI()
    updateInspectorVisibility()
    stage.ready = true
    state.stageReady = true

    if (state.museumMode) {
      stage.launcher.setExplode(1, true)
      state.explodeTarget = 1
      syncExplodeUi(1)
      museum = createMuseum(stage.scene, { heroRoot: stage.launcher.root })
      museumStructural = new Set([
        ...stage.launcher.partGroups.values(),
        ...stage.launcher.root.children.filter((child) => child.name && child.name.startsWith('EPR-AXIAL')),
      ])
      enterMuseum(false)
    }

    tryFinishBoot()

    window.__app = {
      ready: () => stage?.ready === true,
      explode: (value) => setExplodeTarget(value, { fromUser: false }),
      select: (id, focus = true) => selectPart(id, { focus, silent: true }),
      deselect: () => deselectPart({ silent: true }),
      archive: (open = !state.inspectorOpen) => setInspectorOpen(Boolean(open), { silent: true }),
      rotate: (enabled) => {
        if (!stage) return
        state.autoRotate = Boolean(enabled)
        stage.setAutoRotate(state.autoRotate)
        updateToggleButton(dom.autoRotateBtn, state.autoRotate)
      },
      labels: (enabled) => {
        state.labels = Boolean(enabled)
        document.body.classList.toggle('tags-on', state.labels)
        document.body.classList.toggle('tags-off', !state.labels)
        updateToggleButton(dom.labelsBtn, state.labels)
      },
      view: (view) => stage.setView(view),
      armor: (id) => setArmor(id, { silent: true }),
      reset: () => stage.resetView(true),
      demo: () => startDemo(),
      help: () => openHelp(),
      museum: () => enterMuseum(true),
      hero: () => enterHeroExhibit(),
      skip: () => {
        skipBoot()
        stage?.controls?.update()
      },
      state: () => ({
        selected: state.selected,
        armor: state.armor,
        demoPhase: state.demoPhase,
        demoActive: state.demoActive,
        explode: state.explodeTarget,
        labels: state.labels,
        autoRotate: state.autoRotate,
        inspectorOpen: state.inspectorOpen,
        booted: state.booted,
        museumMode: state.museumMode,
        museumOverview: state.museumOverview,
      }),
    }
  } catch (error) {
    console.error(`[ERP-LS07] initialization failed: ${error?.stack || error?.message || error}`)
    showWebGLError()
  }
}

function animate() {
  requestAnimationFrame(animate)
  if (!stage) return
  const dt = Math.min(stage.clock.getDelta(), 0.05)
  stage.update(dt)
  if (museum) {
    museum.update(stage.elapsed)
    if (state.museumOverview) setMuseumEffectsHidden(true)
  }
  if (state.demoActive) tickDemo(performance.now())
  state.frameIndex = (state.frameIndex || 0) + 1
  if (state.frameIndex % 2 === 0) updateTags()
  updateClock()
  if (!state.didFirstFrame) {
    state.didFirstFrame = true
    document.body.classList.add('scene-running')
  }
}

async function boot() {
  initPartList()
  initSubTagList()
  bindUi()
  syncExplodeUi(initialExplode)
  updateBootProgress(0)
  startBootSequence()
  await initStage()
  animate()
  // If stage takes longer than the intro animation, the boot overlay waits.
  tryFinishBoot()
}

boot()
