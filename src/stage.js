import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { SatelliteLauncher } from './model.js'

const TAU = Math.PI * 2
const PI = Math.PI
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4)

function makeGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(125,238,255,.2)', size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(0.16, inner)
  gradient.addColorStop(0.45, outer)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeStreakTexture(colorA = 'rgba(255,255,255,1)', colorB = 'rgba(72,170,255,.15)') {
  const width = 512
  const height = 128
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2)
  grad.addColorStop(0, colorA)
  grad.addColorStop(0.08, 'rgba(255,255,255,.5)')
  grad.addColorStop(0.35, colorB)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)
  ctx.globalCompositeOperation = 'destination-in'
  const mask = ctx.createLinearGradient(0, 0, 0, height)
  mask.addColorStop(0, 'rgba(0,0,0,0)')
  mask.addColorStop(0.5, 'rgba(0,0,0,1)')
  mask.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = mask
  ctx.fillRect(0, 0, width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeNebulaTexture(seed = 1, size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(size, size)
  const clamp01 = (v) => Math.min(1, Math.max(0, v))
  const smooth = (v) => {
    const t = clamp01(v)
    return t * t * (3 - 2 * t)
  }
  const hash = (x, y, salt) => {
    const value = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453
    return value - Math.floor(value)
  }
  const noise = (x, y, salt) => {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = smooth(x - ix)
    const fy = smooth(y - iy)
    const a = hash(ix, iy, salt)
    const b = hash(ix + 1, iy, salt)
    const c = hash(ix, iy + 1, salt)
    const d = hash(ix + 1, iy + 1, salt)
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy
  }
  const fbm = (x, y, salt) => {
    let value = 0
    let amplitude = 0.53
    let frequency = 1
    for (let octave = 0; octave < 4; octave += 1) {
      value += noise(x * frequency, y * frequency, salt + octave * 7.31) * amplitude
      frequency *= 2.03
      amplitude *= 0.49
    }
    return value
  }
  const seedOffset = seed * 19.37
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x / size) * 2 - 1
      const ny = (y / size) * 2 - 1
      const radius = Math.sqrt(nx * nx + ny * ny)
      const radial = Math.pow(Math.max(0, 1 - radius), 1.55)
      // Very soft edge keeps the billboard from reading as a rectangle.
      const edge = smooth((1 - radius) * 5.2)
      const n = fbm(x * 0.0115 + seedOffset, y * 0.0115 - seedOffset * 0.4, seed)
      const n2 = fbm(x * 0.026 - seedOffset * 0.7, y * 0.023 + seedOffset * 0.3, seed + 13)
      const n3 = fbm(x * 0.039 - seedOffset * 1.3, y * 0.037 + seedOffset * 0.8, seed + 31)
      const detail = smooth((n3 - 0.38) / 0.44)
      let density = Math.pow(smooth((n - 0.23) / 0.46), 1.0) * (0.46 + detail * 0.72)
      density = Math.max(density, Math.pow(smooth((n2 - 0.39) / 0.4), 1.35) * 0.62)
      density *= 0.62 + 0.38 * smooth((n2 - 0.2) / 0.55)
      const dust = smooth((n * 0.7 + n2 * 0.5 - 0.34) / 0.5)
      const core = Math.exp(-radius * radius * 3.6)
      let alpha = clamp01((density + core * 0.2) * radial * edge * (0.9 + dust * 0.18))
      alpha = smooth((alpha - 0.055) / 0.55)
      const index = (y * size + x) * 4
      image.data[index] = 255
      image.data[index + 1] = 255
      image.data[index + 2] = 255
      image.data[index + 3] = Math.round(Math.pow(alpha, 0.68) * 255)
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

function makeStarGlareTexture(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const half = size / 2
  const glow = ctx.createRadialGradient(half, half, 0, half, half, half)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.08, 'rgba(255,255,255,.92)')
  glow.addColorStop(0.22, 'rgba(185,231,255,.32)')
  glow.addColorStop(0.52, 'rgba(80,146,210,.055)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'lighter'
  for (const angle of [0, Math.PI / 2]) {
    ctx.save()
    ctx.translate(half, half)
    ctx.rotate(angle)
    const beam = ctx.createLinearGradient(-half, 0, half, 0)
    beam.addColorStop(0, 'rgba(0,0,0,0)')
    beam.addColorStop(0.44, 'rgba(255,255,255,.035)')
    beam.addColorStop(0.5, 'rgba(255,255,255,.72)')
    beam.addColorStop(0.56, 'rgba(255,255,255,.035)')
    beam.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = beam
    ctx.fillRect(-half, -1.1, size, 2.2)
    ctx.restore()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeEnvironment(renderer) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const sky = ctx.createLinearGradient(0, 0, 0, 512)
  sky.addColorStop(0, '#070d18')
  sky.addColorStop(0.24, '#11273b')
  sky.addColorStop(0.48, '#0b1c2b')
  sky.addColorStop(0.53, '#07101b')
  sky.addColorStop(0.75, '#0c2136')
  sky.addColorStop(1, '#02050a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 1024, 512)

  ctx.globalCompositeOperation = 'screen'
  const glow = (x, y, rx, ry, color) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry))
    gradient.addColorStop(0, color)
    gradient.addColorStop(0.24, color.replace(/[\d.]+\)$/, '0.12)'))
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry))
    ctx.translate(-x, -y)
    ctx.fillStyle = gradient
    ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2)
    ctx.restore()
  }
  glow(180, 155, 360, 150, 'rgba(72,148,214,.42)')
  glow(820, 350, 380, 170, 'rgba(25,100,150,.3)')
  glow(420, 70, 410, 110, 'rgba(196,231,255,.18)')
  glow(690, 210, 250, 80, 'rgba(255,96,140,.16)')

  // Long soft strips become reflection cues on the ceramic armor.
  for (const [x, y, w, h, color] of [
    [38, 212, 390, 3, 'rgba(179,242,255,.78)'],
    [592, 128, 310, 2, 'rgba(255,202,155,.55)'],
    [286, 330, 410, 2, 'rgba(82,149,255,.45)'],
    [0, 405, 1024, 2, 'rgba(219,247,255,.08)'],
  ]) {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }
  ctx.globalCompositeOperation = 'source-over'

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromEquirectangular(texture).texture
  pmrem.dispose()
  texture.dispose()
  return env
}

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float aberration = dot(centered, centered) * 0.0024;
      vec3 color;
      color.r = texture2D(tDiffuse, uv + centered * aberration).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - centered * aberration).b;

      float scan = sin(uv.y * uResolution.y * 1.12 + uTime * 1.4) * 0.5 + 0.5;
      color.rgb *= 1.0 - scan * 0.012;

      float grain = fract(sin(dot(uv * uResolution + uTime, vec2(12.9898, 78.233))) * 43758.5453);
      color.rgb += (grain - 0.5) * 0.012;

      float vignette = smoothstep(0.96, 0.26, length(centered * vec2(1.08, 1.0)));
      color.rgb *= mix(0.52, 1.0, vignette);
      color.rgb += vec3(0.002, 0.007, 0.013);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
}

const SkyShader = {
  uniforms: {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(-0.45, 0.42, -0.55).normalize() },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vDir;
    uniform float uTime;
    uniform vec3 uSunDir;

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float value = 0.0;
      float amp = 0.52;
      for (int i = 0; i < 5; i++) {
        value += amp * noise(p);
        p = p * 2.03 + vec3(1.4, -2.1, 0.8);
        amp *= 0.5;
      }
      return value;
    }

    void main() {
      vec3 dir = normalize(vDir);
      float band = exp(-pow((dir.y + dir.x * 0.2 + 0.04) * 2.7, 2.0));
      float crossBand = exp(-pow((dir.y - dir.x * 0.46 + 0.12) * 3.8, 2.0));
      float n = fbm(dir * 2.6 + vec3(3.1, 1.2, -2.0) + uTime * 0.0015);
      float n2 = fbm(dir * 5.1 + vec3(-1.4, 4.3, 2.7));
      float dust = smoothstep(0.34, 0.72, n) * band;
      float filament = smoothstep(0.52, 0.8, n2) * band;

      vec3 color = vec3(0.0015, 0.0035, 0.0085);
      color += vec3(0.026, 0.064, 0.118) * dust;
      color += vec3(0.050, 0.017, 0.046) * filament * 0.58;
      color += vec3(0.065, 0.17, 0.26) * smoothstep(0.40, 0.95, n2) * band * 0.25;
      color += vec3(0.032, 0.058, 0.105) * crossBand * smoothstep(0.42, 0.9, n2) * 0.16;

      float sun = max(dot(dir, uSunDir), 0.0);
      color += vec3(0.4, 0.57, 0.76) * pow(sun, 360.0) * 2.2;
      color += vec3(0.075, 0.17, 0.28) * pow(sun, 12.0) * 0.16;

      float vignette = smoothstep(1.1, 0.2, length(dir.xy));
      color *= mix(0.42, 1.0, vignette);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
}

const EarthVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPos;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPos = normalize(position);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const EarthFragment = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPos;
  uniform float uTime;
  uniform vec3 uSunDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.23, 0.47));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.07 + vec3(0.7, -1.4, 2.2);
      a *= 0.49;
    }
    return v;
  }
  float ridged(vec3 p) {
    float v = 0.0;
    float a = 0.52;
    for (int i = 0; i < 4; i++) {
      v += a * (1.0 - abs(noise(p) * 2.0 - 1.0));
      p = p * 2.15 + vec3(-1.2, 0.8, 1.7);
      a *= 0.48;
    }
    return v;
  }

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 p = normalize(vPos);
    vec3 v = normalize(vViewDir);
    vec3 L = normalize(uSunDir);

    float continent = fbm(p * 2.35 + vec3(1.2, 5.2, 3.1));
    continent += 0.36 * fbm(p * 6.2 + vec3(-2.0, 1.6, 4.2));
    float detail = fbm(p * 11.0 + vec3(7.0, -1.4, 2.2));
    float landMask = smoothstep(0.59, 0.675, continent);
    float coast = smoothstep(0.50, 0.59, continent) * (1.0 - landMask);
    float mountain = smoothstep(0.58, 0.8, fbm(p * 18.0 + vec3(2.2, 4.4, -3.1)));

    vec3 oceanDeep = vec3(0.002, 0.010, 0.030);
    vec3 oceanMid = vec3(0.008, 0.055, 0.125);
    vec3 oceanShallow = vec3(0.018, 0.14, 0.22);
    vec3 ocean = mix(oceanDeep, oceanMid, clamp(detail * 1.2 + 0.16, 0.0, 1.0));
    ocean = mix(ocean, oceanShallow, coast * 0.7);

    vec3 landLow = vec3(0.055, 0.105, 0.075);
    vec3 landHigh = vec3(0.22, 0.255, 0.19);
    vec3 land = mix(landLow, landHigh, smoothstep(0.48, 0.74, detail));
    land = mix(land, vec3(0.36, 0.375, 0.32), mountain * 0.5);
    vec3 color = mix(ocean, land, landMask);

    // Long, soft cloud bands and cyclonic curls.
    float swirl = ridged(p * 4.4 + vec3(0.4, -1.2, 1.7) + uTime * 0.00035);
    float cloudNoise = fbm(p * 5.8 + vec3(-1.2, 2.6, 0.4) + uTime * 0.00025);
    cloudNoise += 0.38 * ridged(p * 12.0 + vec3(5.1, -2.2, 3.4));
    float cloudMask = smoothstep(0.69, 0.86, cloudNoise * 0.78 + swirl * 0.34);
    cloudMask *= smoothstep(0.38, 0.62, fbm(p * 3.1 + vec3(2.3, 4.1, -3.0)));
    cloudMask = clamp(cloudMask * 1.35, 0.0, 0.9);
    color = mix(color, vec3(0.66, 0.82, 0.93), cloudMask * 0.8);

    float diffuse = clamp(dot(n, L), 0.0, 1.0);
    float softDay = smoothstep(-0.18, 0.2, diffuse);
    float spec = pow(max(dot(reflect(-L, n), v), 0.0), 34.0) * (1.0 - cloudMask) * 0.45;
    float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
    float sunRim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 1.0) * smoothstep(0.0, 0.5, diffuse);

    color *= 0.09 + diffuse * 0.95;
    color += vec3(0.23, 0.5, 0.85) * rim * 0.17;
    color += vec3(0.35, 0.65, 0.95) * sunRim * 0.045;
    color += spec * vec3(0.85, 0.96, 1.0);
    color *= softDay * 0.92 + 0.08;

    // Airglow highlight along the limb, kept pale so the HUD stays legible.
    float limb = smoothstep(0.72, 0.98, 1.0 - abs(dot(n, v)));
    color += vec3(0.22, 0.52, 0.95) * limb * 0.26;

    gl_FragColor = vec4(color * 0.92, 1.0);
  }
`

const AtmosphereVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const AtmosphereFragment = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(vViewDir);
    float rim = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 3.0);
    float inner = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 8.0);
    vec3 color = mix(vec3(0.3, 0.63, 1.0), vec3(0.7, 0.92, 1.0), inner);
    gl_FragColor = vec4(color, rim * 0.54 + inner * 0.2);
  }
`

export class Stage {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas
    this.hooks = hooks
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.autoRotateWanted = !this.reducedMotion
    this.selectedId = null
    this.hoveredId = null
    this.cameraTween = null
    this.elapsed = 0
    this.pointer = new THREE.Vector2(-2, -2)
    this.pointerDown = null
    this.pointerInside = false
    this.lastClientX = 0
    this.lastClientY = 0
    this._raycaster = new THREE.Raycaster()
    this._pickFrame = 0

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x01030a)
    this.camera = new THREE.PerspectiveCamera(37, 1, 0.1, 3000)
    this.camera.position.set(18.5, 8.7, 21.5)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.95
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
    this.renderer.setClearColor(0x01030a, 1)

    this.scene.environment = makeEnvironment(this.renderer)
    this.scene.environmentIntensity = 0.95

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.rotateSpeed = 0.82
    this.controls.zoomSpeed = 0.72
    this.controls.panSpeed = 0.55
    this.controls.screenSpacePanning = true
    this.controls.minDistance = 7
    this.controls.maxDistance = 600
    // Full spherical orbit: the satellite can be inspected from above, below and behind.
    this.controls.minPolarAngle = 0.001
    this.controls.maxPolarAngle = PI - 0.001
    this.controls.maxTargetRadius = 32
    this.controls.target.set(0.15, 0.35, 0)
    this.controls.autoRotate = this.autoRotateWanted && !this.reducedMotion
    this.controls.autoRotateSpeed = 0.42
    this.controls.update()

    this._setupPostprocessing()
    this._buildSky()
    this._buildNebulaField()
    this._buildEarth()
    this._buildStars()
    this._buildBrightStars()
    this._buildLights()
    this._buildDebris()
    this._buildLauncher()
    this.launcher.setEarthTarget(this.earthCenter)
    this.launcher.setEarthAimPoint(this.earthCenter.clone().add(new THREE.Vector3(14.4, -7.0, 68.1)))
    this._buildReticle()
    this._bindEvents()

    this.defaultTarget = new THREE.Vector3(0, 0, 0)
    this.defaultDirection = new THREE.Vector3(0.1, 0.12, 0.99).normalize()
    this.appliedCamera = false

    this._onResize()
    this.clock = new THREE.Clock()
    this._applyDefaultView(false)

    // A slow drift keeps the huge platform alive without fighting direct control.
    this.idleStart = performance.now()
  }

  _setupPostprocessing() {
    this.composer = new EffectComposer(this.renderer)
    this.composer.renderTarget1.samples = 2
    this.composer.renderTarget2.samples = 2

    this.renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(this.renderPass)

    this.outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.camera,
    )
    this.outlinePass.edgeStrength = 2.8
    this.outlinePass.edgeGlow = 0.55
    this.outlinePass.edgeThickness = 1.2
    this.outlinePass.pulsePeriod = 2.4
    this.outlinePass.visibleEdgeColor.set(0x91f6ff)
    this.outlinePass.hiddenEdgeColor.set(0x285f75)
    this.outlinePass.selectedObjects = []
    this.composer.addPass(this.outlinePass)

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.33,
      0.4,
      0.89,
    )
    this.composer.addPass(this.bloomPass)

    this.filmPass = new ShaderPass(FilmShader)
    this.composer.addPass(this.filmPass)

    this.outputPass = new OutputPass()
    this.composer.addPass(this.outputPass)
  }

  _buildSky() {
    const geometry = new THREE.SphereGeometry(1200, 48, 32)
    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(SkyShader.uniforms),
      vertexShader: SkyShader.vertexShader,
      fragmentShader: SkyShader.fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
    })
    this.sky = new THREE.Mesh(geometry, material)
    this.sky.renderOrder = -10
    this.scene.add(this.sky)

    const sunMap = makeGlowTexture('rgba(255,251,243,1)', 'rgba(109,185,255,.28)', 256)
    const sun = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunMap,
        color: 0xffefd7,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    sun.position.set(-380, 260, -480)
    sun.scale.set(180, 180, 1)
    this.scene.add(sun)
    this.sunSprite = sun

    const streak = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeStreakTexture('rgba(255,241,218,.8)', 'rgba(72,148,255,.08)'),
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    streak.position.set(-320, 250, -470)
    streak.scale.set(420, 48, 1)
    this.scene.add(streak)

    const farHaze = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(64,148,255,.1)', 'rgba(24,61,128,.02)', 256),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    farHaze.position.set(250, -100, -600)
    farHaze.scale.set(900, 440, 1)
    this.scene.add(farHaze)
  }

  _buildNebulaField() {
    const cloud = makeNebulaTexture(7, 256)
    this.nebulaSprites = []
    const configs = [
      { x: 300, y: 160, z: -700, sx: 520, sy: 310, color: 0x5ec9ed, opacity: 0.26, rot: 0.18 },
      { x: -320, y: 120, z: -680, sx: 480, sy: 290, color: 0x8876ff, opacity: 0.22, rot: -0.25 },
      { x: 330, y: -150, z: -700, sx: 500, sy: 300, color: 0xff6ab5, opacity: 0.24, rot: 0.26 },
      { x: -300, y: -120, z: -650, sx: 440, sy: 270, color: 0x59b8df, opacity: 0.18, rot: -0.16 },
      { x: 200, y: 30, z: -950, sx: 640, sy: 380, color: 0x4d79c7, opacity: 0.10, rot: 0.12 },
      // A low-opacity central veil keeps the background alive in portrait /
      // mobile crops where the edge clouds fall outside the narrower FOV.
      { x: 0, y: 110, z: -820, sx: 760, sy: 440, color: 0x4f78b8, opacity: 0.08, rot: 0.12 },
      { x: 0, y: -230, z: -720, sx: 620, sy: 360, color: 0x6b4c9b, opacity: 0.06, rot: -0.2 },
      { x: -200, y: 30, z: -900, sx: 600, sy: 360, color: 0x7e66c9, opacity: 0.10, rot: -0.1 },
      { x: 0, y: -60, z: 760, sx: 620, sy: 360, color: 0x4d79c7, opacity: 0.08, rot: 0.2 },
    ]
    for (const c of configs) {
      const material = new THREE.SpriteMaterial({
        map: cloud,
        color: c.color,
        transparent: true,
        opacity: c.opacity,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      })
      const sprite = new THREE.Sprite(material)
      sprite.position.set(c.x, c.y, c.z)
      sprite.scale.set(c.sx, c.sy, 1)
      material.rotation = c.rot
      sprite.renderOrder = -8
      this.scene.add(sprite)
      this.nebulaSprites.push({ sprite, material, base: c.opacity, phase: Math.random() * TAU })
    }

    // A distant tilted galaxy breaks up the open right side of the frame.
    const galaxy = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: cloud,
        color: 0x9bc9e6,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    galaxy.position.set(330, -210, -620)
    galaxy.scale.set(280, 70, 1)
    galaxy.material.rotation = -0.46
    galaxy.renderOrder = -7
    this.scene.add(galaxy)
    this.nebulaSprites.push({ sprite: galaxy, material: galaxy.material, base: 0.4, phase: 1.7 })
  }

  _buildBrightStars() {
    const map = makeStarGlareTexture(256)
    const colors = [0xdff7ff, 0xb9ddff, 0xffe0bd, 0xe7d7ff, 0xffffff]
    const rng = (() => {
      let seed = 91
      return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
      }
    })()
    this.brightStars = []
    const addBrightStar = (x, y, z, size, opacity, color) => {
      const material = new THREE.SpriteMaterial({
        map,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      })
      const sprite = new THREE.Sprite(material)
      sprite.position.set(x, y, z)
      sprite.scale.set(size, size, 1)
      sprite.renderOrder = -4
      this.scene.add(sprite)
      this.brightStars.push({ sprite, material, base: opacity, phase: Math.random() * TAU, speed: 0.18 + rng() * 0.3 })
    }
    addBrightStar(120, 180, -520, 32, 0.9, 0xdff7ff)
    addBrightStar(-140, 160, -520, 26, 0.8, 0xffe0bd)
    addBrightStar(260, -110, -540, 26, 0.82, 0xbfe4ff)
    addBrightStar(-120, -190, -520, 24, 0.75, 0xe9e0ff)
    addBrightStar(200, 40, -600, 22, 0.7, 0xffffff)
    for (let i = 0; i < 30; i += 1) {
      const radius = 740 + rng() * 240
      const theta = rng() * TAU
      const phi = Math.acos(THREE.MathUtils.lerp(-1, 1, rng()))
      const color = colors[Math.floor(rng() * colors.length)]
      const material = new THREE.SpriteMaterial({
        map,
        color,
        transparent: true,
        opacity: 0.55 + rng() * 0.35,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      })
      const sprite = new THREE.Sprite(material)
      sprite.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      )
      const scale = 10 + rng() * 20
      sprite.scale.set(scale, scale, 1)
      sprite.renderOrder = -4
      this.scene.add(sprite)
      this.brightStars.push({ sprite, material, base: material.opacity, phase: rng() * TAU, speed: 0.18 + rng() * 0.34 })
    }
  }

  _buildEarth() {
    const earthRadius = 70
    this.earthCenter = new THREE.Vector3(-80, 0, -120)
    const sunDir = new THREE.Vector3(-0.38, 0.72, 0.58).normalize()

    const earthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: sunDir },
      },
      vertexShader: EarthVertex,
      fragmentShader: EarthFragment,
    })
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(earthRadius, 96, 64), earthMaterial)
    this.earth.position.copy(this.earthCenter)
    this.earth.rotation.set(0.12, 1.55, -0.12)
    this.scene.add(this.earth)

    // A soft, camera-facing halo reads as atmosphere without a hard shell edge.
    const haloMap = makeGlowTexture('rgba(149,232,255,.55)', 'rgba(42,107,255,.06)', 256)
    this.earthHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloMap,
        color: 0x77d9ff,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
      }),
    )
    this.earthHalo.position.copy(this.earthCenter)
    this.earthHalo.scale.set(earthRadius * 2.65, earthRadius * 2.65, 1)
    this.scene.add(this.earthHalo)

    const haloInner = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloMap,
        color: 0xbdefff,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
      }),
    )
    haloInner.position.copy(this.earthCenter)
    haloInner.scale.set(earthRadius * 2.16, earthRadius * 2.16, 1)
    this.scene.add(haloInner)
    this.earthHaloInner = haloInner

    // Foreground-shifted thin rim strengthens the planet's silhouette.
    const rimMap = makeGlowTexture('rgba(231,250,255,.8)', 'rgba(74,155,255,.1)', 256)
    this.earthRim = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: rimMap,
        color: 0xd9fbff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
      }),
    )
    this.earthRim.position.copy(this.earthCenter)
    this.earthRim.scale.set(earthRadius * 2.08, earthRadius * 2.08, 1)
    this.scene.add(this.earthRim)
  }

  _buildStars() {
    const count = 4600
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    const palette = [
      new THREE.Color(0x8eebff),
      new THREE.Color(0xe5f2ff),
      new THREE.Color(0xffd9c6),
      new THREE.Color(0x7099d7),
      new THREE.Color(0xc5ecff),
    ]
    for (let i = 0; i < count; i += 1) {
      const radius = 540 + Math.random() * 420
      const theta = Math.random() * TAU
      const phi = Math.acos(THREE.MathUtils.lerp(-1, 1, Math.random()))
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      const c = palette[Math.floor(Math.random() * palette.length)]
      const brightness = 0.62 + Math.random() * 0.75
      colors[i * 3] = c.r * brightness
      colors[i * 3 + 1] = c.g * brightness
      colors[i * 3 + 2] = c.b * brightness
      sizes[i] = Math.random() < 0.84 ? 1.1 + Math.random() * 2.3 : 3.4 + Math.random() * 3.2
      phases[i] = Math.random() * TAU
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;
        uniform float uDpr;
        void main() {
          vColor = color;
          vTwinkle = 0.7 + 0.3 * sin(uTime * 0.85 + aPhase);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uDpr;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          float core = smoothstep(0.16, 0.0, d);
          float halo = smoothstep(0.5, 0.08, d);
          float alpha = (core * 0.9 + halo * 0.32) * vTwinkle;
          if (alpha < 0.02) discard;
          gl_FragColor = vec4(vColor * (0.9 + core * 1.7), alpha);
        }
      `,
    })
    this.stars = new THREE.Points(geometry, material)
    this.stars.frustumCulled = false
    this.stars.renderOrder = -5
    this.scene.add(this.stars)

    // Dense Milky Way-like band. The points are generated around a local
    // equator and then tilted as a group so the band crosses the frame.
    const bandCount = 2800
    const bandPositions = new Float32Array(bandCount * 3)
    const bandColors = new Float32Array(bandCount * 3)
    const bandSizes = new Float32Array(bandCount)
    const bandPhases = new Float32Array(bandCount)
    for (let i = 0; i < bandCount; i += 1) {
      const radius = 520 + Math.random() * 470
      const theta = Math.random() * TAU
      const spread = (Math.random() + Math.random() + Math.random() - 1.5) * 0.09
      const phi = PI / 2 + spread + Math.sin(theta * 3.1) * 0.018
      bandPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      bandPositions[i * 3 + 1] = radius * Math.cos(phi)
      bandPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      const c = palette[Math.floor(Math.random() * palette.length)]
      const brightness = 0.55 + Math.random() * 0.85
      bandColors[i * 3] = c.r * brightness
      bandColors[i * 3 + 1] = c.g * brightness
      bandColors[i * 3 + 2] = c.b * brightness
      bandSizes[i] = 0.7 + Math.random() * 2.0
      bandPhases[i] = Math.random() * TAU
    }
    const bandGeo = new THREE.BufferGeometry()
    bandGeo.setAttribute('position', new THREE.BufferAttribute(bandPositions, 3))
    bandGeo.setAttribute('color', new THREE.BufferAttribute(bandColors, 3))
    bandGeo.setAttribute('aSize', new THREE.BufferAttribute(bandSizes, 1))
    bandGeo.setAttribute('aPhase', new THREE.BufferAttribute(bandPhases, 1))
    const bandMat = material.clone()
    bandMat.uniforms.uDpr.value = material.uniforms.uDpr.value
    this.starsBand = new THREE.Points(bandGeo, bandMat)
    this.starsBand.frustumCulled = false
    this.starsBand.renderOrder = -4.6
    this.starsBand.rotation.set(0.45, 0.16, 0.58)
    this.scene.add(this.starsBand)

    // A second layer of dim dust-like stars for parallax.
    const dustCount = 560
    const dustPositions = new Float32Array(dustCount * 3)
    const dustSizes = new Float32Array(dustCount)
    const dustColors = new Float32Array(dustCount * 3)
    const dustPhases = new Float32Array(dustCount)
    for (let i = 0; i < dustCount; i += 1) {
      const r = 26 + Math.random() * 78
      const theta = Math.random() * TAU
      const phi = Math.acos(THREE.MathUtils.lerp(-0.7, 0.9, Math.random()))
      dustPositions[i * 3] = Math.cos(theta) * r * Math.sin(phi)
      dustPositions[i * 3 + 1] = Math.cos(phi) * r * 0.6
      dustPositions[i * 3 + 2] = Math.sin(theta) * r * Math.sin(phi)
      dustSizes[i] = 0.35 + Math.random() * 0.8
      dustPhases[i] = Math.random() * TAU
      const c = palette[Math.floor(Math.random() * palette.length)]
      dustColors[i * 3] = c.r * 0.7
      dustColors[i * 3 + 1] = c.g * 0.7
      dustColors[i * 3 + 2] = c.b * 0.7
    }
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3))
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1))
    dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dustPhases, 1))
    const dustMat = material.clone()
    dustMat.uniforms.uDpr.value = material.uniforms.uDpr.value
    this.starsDust = new THREE.Points(dustGeo, dustMat)
    this.starsDust.frustumCulled = false
    this.scene.add(this.starsDust)
  }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x8fc7dd, 0x01040c, 0.28))

    const key = new THREE.DirectionalLight(0xfff0df, 2.35)
    key.position.set(-12, 15, 16)
    this.scene.add(key)
    this.keyLight = key

    const fill = new THREE.DirectionalLight(0x7ca9ff, 0.95)
    fill.position.set(-15, 3, -13)
    this.scene.add(fill)
    this.fillLight = fill

    const rim = new THREE.DirectionalLight(0x8ef4ff, 1.3)
    rim.position.set(4, -8, -15)
    this.scene.add(rim)
    this.rimLight = rim

    const front = new THREE.DirectionalLight(0xd8f2ff, 0.56)
    front.position.set(16, 5, 14)
    this.scene.add(front)
    this.frontLight = front

    const pink = new THREE.PointLight(0xff4d8e, 3.0, 9.5, 2)
    pink.position.set(1.5, 2.8, 1.8)
    this.scene.add(pink)
    this.pinkLight = pink

    const earthBounce = new THREE.PointLight(0x2e86ff, 2.3, 16, 2)
    earthBounce.position.set(2, -4.5, 3.5)
    this.scene.add(earthBounce)
    this.earthBounce = earthBounce

    const spots = new THREE.SpotLight(0xc9f6ff, 11, 38, 0.55, 0.9, 1.5)
    spots.position.set(8, 13, 12)
    spots.target.position.set(0, 0, 0)
    this.scene.add(spots, spots.target)

    // A local bounce light makes the dense rear bus readable without flattening the array.
    const busFill = new THREE.PointLight(0x94d9ff, 16, 11, 2)
    busFill.position.set(-3.3, 2.4, 5.2)
    this.scene.add(busFill)
    this.busFill = busFill
  }

  _buildDebris() {
    const count = 72
    const geometry = new THREE.BufferGeometry()
    const vertices = []
    const sizes = []
    for (let i = 0; i < count; i += 1) {
      const radius = 12 + Math.random() * 13
      const theta = Math.random() * TAU
      const phi = Math.acos(THREE.MathUtils.lerp(-0.5, 0.6, Math.random()))
      vertices.push(
        radius * Math.sin(phi) * Math.cos(theta),
        Math.cos(phi) * radius * 0.35,
        radius * Math.sin(phi) * Math.sin(theta),
      )
      sizes.push(0.02 + Math.random() * 0.08)
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
    const material = new THREE.PointsMaterial({
      color: 0x92d8e8,
      size: 0.055,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    this.debris = new THREE.Points(geometry, material)
    this.scene.add(this.debris)
  }

  _buildLauncher() {
    this.launcher = new SatelliteLauncher()
    this.launcher.root.renderOrder = 2
    this.scene.add(this.launcher.root)
    this.selectableMeshes = this.launcher.getSelectableMeshes()
    this.partGroupCache = new Map()
    for (const [id, group] of this.launcher.partGroups) {
      this.partGroupCache.set(id, group)
    }
  }

  _buildReticle() {
    const group = new THREE.Group()
    group.position.set(0, 0.3, 0)
    this.scene.add(group)
    this.reticle = group

    const material = new THREE.MeshBasicMaterial({
      color: 0x63e9ff,
      transparent: true,
      opacity: 0.11,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(9.2, 0.01, 4, 220, PI * 1.35), material)
    ringA.rotation.set(PI / 2 + 0.1, 0.16, 0.42)
    group.add(ringA)
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(10.7, 0.008, 4, 220, PI * 0.85), material.clone())
    ringB.material.opacity = 0.07
    ringB.rotation.set(PI / 2 - 0.18, 0.08, 1.8)
    group.add(ringB)
    const ringC = new THREE.Mesh(new THREE.RingGeometry(11.9, 12.0, 220, 1, 0.2, PI * 1.15), material.clone())
    ringC.material.opacity = 0.05
    ringC.rotation.x = PI / 2 + 0.08
    group.add(ringC)
    this.reticleRings = [ringA, ringB, ringC]

    const ticks = new THREE.Group()
    for (let i = 0; i < 54; i += 1) {
      const a = (i / 54) * TAU
      const length = i % 6 === 0 ? 0.5 : 0.22
      const tickMaterial = new THREE.MeshBasicMaterial({
        color: 0x73e9ff,
        transparent: true,
        opacity: i % 6 === 0 ? 0.18 : 0.08,
        depthWrite: false,
        toneMapped: false,
      })
      const tick = new THREE.Mesh(new THREE.BoxGeometry(length, 0.01, 0.012), tickMaterial)
      tick.position.set(Math.cos(a) * 12.6, 0, Math.sin(a) * 12.6)
      tick.rotation.y = -a
      ticks.add(tick)
    }
    ticks.rotation.x = PI / 2 + 0.08
    group.add(ticks)
    this.reticleTicks = ticks
  }

  _bindEvents() {
    this._onResize = this._onResize.bind(this)
    window.addEventListener('resize', this._onResize)
    this.controls.addEventListener('start', () => {
      if (this.cameraTween) {
        this.cameraTween = null
        this.controls.autoRotate = false
      }
      this.canvas.classList.add('is-dragging')
    })
    this.controls.addEventListener('end', () => {
      this.canvas.classList.remove('is-dragging')
      if (this.autoRotateWanted && !this.reducedMotion) this.controls.autoRotate = true
    })

    this.canvas.addEventListener('pointerenter', (event) => {
      this.pointerInside = true
      this._setPointer(event)
      if (this.hooks.onCursor) this.hooks.onCursor(true, this.hoveredId, event.clientX, event.clientY)
    })
    this.canvas.addEventListener('pointerleave', () => {
      this.pointerInside = false
      this.pointer.set(-2, -2)
      this._setHovered(null)
      if (this.hooks.onCursor) this.hooks.onCursor(false)
    })
    this.canvas.addEventListener('pointermove', (event) => {
      this._setPointer(event)
      if (!this.pointerInside) {
        this.pointerInside = true
      }
      if (this.hooks.onCursor) this.hooks.onCursor(true, this.hoveredId, event.clientX, event.clientY)
    })
    this.canvas.addEventListener('pointerdown', (event) => {
      this.pointerDown = { x: event.clientX, y: event.clientY, time: performance.now() }
    })
    this.canvas.addEventListener('pointerup', (event) => {
      if (!this.pointerDown) return
      const dx = event.clientX - this.pointerDown.x
      const dy = event.clientY - this.pointerDown.y
      const elapsed = performance.now() - this.pointerDown.time
      this.pointerDown = null
      if (dx * dx + dy * dy > 36 || elapsed > 620) return
      this._setPointer(event)
      const hit = this._pickPart()
      if (hit) {
        if (this.hooks.onPick) this.hooks.onPick(hit)
      } else if (this.hooks.onPickBackground) {
        this.hooks.onPickBackground()
      }
    })
    window.addEventListener('pointerup', () => {
      this.pointerDown = null
    })
    this.canvas.addEventListener('dblclick', (event) => {
      this._setPointer(event)
      const hit = this._pickPart()
      if (hit && this.hooks.onFocusPick) this.hooks.onFocusPick(hit)
    })
  }

  _setPointer(event) {
    const rect = this.canvas.getBoundingClientRect()
    this.lastClientX = event.clientX
    this.lastClientY = event.clientY
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  _pickPart() {
    if (!this.selectableMeshes?.length) return null
    this._raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this._raycaster.intersectObjects(this.selectableMeshes, false)
    if (!hits.length) return null
    for (const hit of hits) {
      let node = hit.object
      while (node && !node.userData.part) node = node.parent
      if (node?.userData.part) return node.userData.part
    }
    return null
  }

  _setHovered(id) {
    if (this.hoveredId === id) return
    this.hoveredId = id
    this._refreshOutline()
    if (this.hooks.onHover) this.hooks.onHover(id)
    if (this.pointerInside && this.hooks.onCursor) this.hooks.onCursor(true, id, this.lastClientX, this.lastClientY)
    this.canvas.classList.toggle('is-hovering', Boolean(id))
  }

  setSelected(id) {
    this.selectedId = id
    this._refreshOutline()
  }

  _refreshOutline() {
    const ids = new Set()
    if (this.selectedId) ids.add(this.selectedId)
    if (this.hoveredId) ids.add(this.hoveredId)
    const objects = []
    for (const id of ids) {
      const group = this.partGroupCache.get(id)
      if (group) objects.push(group)
    }
    this.outlinePass.selectedObjects = objects
  }

  setAutoRotate(enabled) {
    this.autoRotateWanted = enabled
    // Turning auto-rotate off must take effect immediately, even while a
    // reset camera tween is still running; otherwise the demo camera would
    // keep orbiting while the emblem ring is being aligned.
    if (!enabled) this.controls.autoRotate = false
    else if (!this.cameraTween) this.controls.autoRotate = !this.reducedMotion
  }

  toggleAutoRotate() {
    this.setAutoRotate(!this.autoRotateWanted)
    return this.autoRotateWanted
  }

  _defaultCamera() {
    const aspect = this.camera.aspect
    const width = window.innerWidth
    let distance = 44
    let direction = this.defaultDirection.clone()
    if (aspect < 0.7) {
      distance = 58
      direction.set(0.16, 0.16, 0.97).normalize()
    } else if (aspect < 0.95) {
      distance = 48
      direction.set(0.14, 0.14, 0.98).normalize()
    } else if (width <= 1180) {
      distance = 46
    } else if (width < 1360) {
      distance = 52
    } else if (width < 1500) {
      distance = 50
    }
    const position = this.defaultTarget.clone().addScaledVector(direction, distance)
    return { position, target: this.defaultTarget.clone() }
  }

  _applyDefaultView(animate = true) {
    const { position, target } = this._defaultCamera()
    if (!animate || this.reducedMotion) {
      this.camera.position.copy(position)
      this.controls.target.copy(target)
      this.controls.update()
      this.appliedCamera = true
      return
    }
    this._startCameraTween(position, target, 1.8)
  }

  resetView(animate = true, duration = 1.3) {
    this.controls.autoRotate = this.autoRotateWanted && !this.reducedMotion
    if (animate) {
      const { position, target } = this._defaultCamera()
      this._startCameraTween(position, target, duration)
    } else {
      const { position, target } = this._defaultCamera()
      this.camera.position.copy(position)
      this.controls.target.copy(target)
      this.controls.update()
    }
  }

  museumView(animate = true) {
    const target = new THREE.Vector3(-48, 0.5, -58)
    const direction = new THREE.Vector3(0.08, 0.13, 0.99).normalize()
    const distance = 300
    this.controls.maxTargetRadius = 500
    const position = target.clone().addScaledVector(direction, distance)
    this.controls.autoRotate = false
    if (animate) {
      this._startCameraTween(position, target, 1.8)
    } else {
      this.cameraTween = null
      this.camera.position.copy(position)
      this.controls.target.copy(target)
      this.controls.update()
    }
  }

  museumHeroView(target, animate = true) {
    if (!target) return
    this.controls.maxTargetRadius = 500
    this.controls.autoRotate = false
    const direction = this.defaultDirection.clone()
    const distance = 64
    const position = target.clone().addScaledVector(direction, distance)
    if (animate) {
      this._startCameraTween(position, target.clone(), 1.45)
    } else {
      this.cameraTween = null
      this.camera.position.copy(position)
      this.controls.target.copy(target)
      this.controls.update()
    }
  }

  focusScreen(point, normal, duration = 0.95) {
    if (!point || !normal) return
    const direction = normal.clone().normalize()
    const position = point.clone().addScaledVector(direction, 1.05)
    position.y += 0.045
    position.x += 0.035
    this.controls.autoRotate = false
    this._startCameraTween(position, point.clone(), duration)
  }

  setView(view) {
    const aspect = this.camera.aspect
    const base = aspect < 0.9 ? 56 : window.innerWidth <= 1180 ? 49 : 55
    const factor = view === 'front' ? 0.8 : view === 'top' ? 0.96 : view === 'side' ? 1.03 : 1
    const distance = base * factor
    const target = new THREE.Vector3(0.3, 0.25, 0)
    let dir
    if (view === 'front') dir = new THREE.Vector3(1, 0.14, 0.18).normalize()
    else if (view === 'side') dir = new THREE.Vector3(-0.14, 0.22, 1).normalize()
    else if (view === 'top') dir = new THREE.Vector3(0.25, 1, 0.2).normalize()
    else dir = this.defaultDirection.clone()
    this._startCameraTween(target.clone().addScaledVector(dir, distance), target, 1.2)
    this.controls.autoRotate = false
  }

  focusOnPart(id, focus, duration = 1.15) {
    const group = this.partGroupCache.get(id)
    if (!group) return false
    const box = new THREE.Box3().setFromObject(group)
    if (box.isEmpty()) return false
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    const center = sphere.center.clone()
    const direction = new THREE.Vector3(...(focus?.dir || [0.7, 0.25, 0.7])).normalize()
    let distance = focus?.dist ?? 12
    const aspect = this.camera.aspect
    if (aspect < 0.9) distance *= 1.25
    distance = Math.max(distance, sphere.radius / Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * 1.1 + 1.6)
    distance = Math.min(distance, 44)
    const target = center
    const position = center.clone().addScaledVector(direction, distance)
    this._startCameraTween(position, target, duration)
    this.controls.autoRotate = false
    return true
  }

  focusOnPoint(center, direction = [0.8, 0.3, 0.7], distance = 12) {
    const dir = new THREE.Vector3(...direction).normalize()
    this._startCameraTween(center.clone().addScaledVector(dir, distance), center.clone(), 1.15)
    this.controls.autoRotate = false
  }

  _startCameraTween(position, target, duration = 1.1) {
    const fromPos = this.camera.position.clone()
    const fromTarget = this.controls.target.clone()
    if (fromPos.distanceTo(position) < 0.02 && fromTarget.distanceTo(target) < 0.02) return
    this.cameraTween = {
      elapsed: 0,
      duration,
      fromPos,
      toPos: position.clone(),
      fromTarget,
      toTarget: target.clone(),
    }
    this.controls.autoRotate = false
  }

  setExplode(value) {
    this.launcher.setExplode(value)
  }

  getExplode() {
    return this.launcher.explode
  }

  getExplodeTarget() {
    return this.launcher.explodeTarget
  }

  projectPartAnchor(partId, local) {
    const group = this.partGroupCache.get(partId)
    if (!group) return null
    const world = group.localToWorld(local.clone())
    const projected = world.clone().project(this.camera)
    if (projected.z > 1 || projected.z < -1) return null
    return {
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
      visible: projected.z < 1 && projected.x > -1.2 && projected.x < 1.2 && projected.y > -1.2 && projected.y < 1.2,
    }
  }

  getScreenPosition(world, offset = 0) {
    const projected = world.clone().project(this.camera)
    return {
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
      z: projected.z,
    }
  }

  _onResize() {
    const width = window.innerWidth
    const height = window.innerHeight
    const compact = width < 820
    this.camera.aspect = width / height
    this.camera.fov = compact ? 48 : 37
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.3 : 1.6))
    this.renderer.setSize(width, height, false)
    this.composer.setPixelRatio(this.renderer.getPixelRatio())
    this.composer.setSize(width, height)
    this.filmPass.uniforms.uResolution.value.set(width * this.renderer.getPixelRatio(), height * this.renderer.getPixelRatio())
    if (this.stars) this.stars.material.uniforms.uDpr.value = Math.min(window.devicePixelRatio || 1, 2)
    if (this.starsDust) this.starsDust.material.uniforms.uDpr.value = Math.min(window.devicePixelRatio || 1, 2)
    if (this.starsBand) this.starsBand.material.uniforms.uDpr.value = Math.min(window.devicePixelRatio || 1, 2)
  }

  update(delta) {
    const time = (this.elapsed += delta)

    // Pull the effective field of view back as the structure opens up, keeping
    // the newly connected petals inside the operational frame.
    if (this.launcher) {
      const e = this.launcher.explode
      const eased = e * e * (3 - 2 * e)
      const desiredZoom = 1 - 0.2 * eased
      if (Math.abs(this.camera.zoom - desiredZoom) > 0.0002) {
        this.camera.zoom = desiredZoom
        this.camera.updateProjectionMatrix()
      }
    }

    if (this.cameraTween) {
      const tween = this.cameraTween
      tween.elapsed += delta
      const t = clamp01(tween.elapsed / tween.duration)
      const ease = easeInOutCubic(t)
      this.camera.position.lerpVectors(tween.fromPos, tween.toPos, ease)
      this.controls.target.lerpVectors(tween.fromTarget, tween.toTarget, ease)
      this.camera.lookAt(this.controls.target)
      if (t >= 1) {
        this.cameraTween = null
        if (this.autoRotateWanted) this.controls.autoRotate = true
        this.controls.update()
      }
    } else {
      this.controls.update(delta)
    }

    // Subtle mouse parallax while the user is not dragging.
    if (this.pointerInside && !this.pointerDown && !this.cameraTween) {
      const targetOffsetX = this.pointer.x * 0.15
      const targetOffsetY = this.pointer.y * 0.08
      this.controls.target.x += (this.controls.target.x - targetOffsetX - this.controls.target.x) * 0
    }

    this.launcher.update(time, delta, {
      spin: !this.reducedMotion,
      energy: 1,
    })

    const busGroup = this.launcher.partGroups.get('bus')
    if (busGroup) {
      this.busFill.position.set(
        busGroup.position.x + this.launcher.root.position.x + 1.7,
        busGroup.position.y + 2.35,
        busGroup.position.z + 5.1,
      )
    }

    this.sky.material.uniforms.uTime.value = time
    this.stars.material.uniforms.uTime.value = time
    this.starsDust.material.uniforms.uTime.value = time
    this.stars.rotation.y += delta * 0.0018
    this.starsDust.rotation.y += delta * 0.0035
    if (this.starsBand) {
      this.starsBand.material.uniforms.uTime.value = time
      this.starsBand.rotation.y += delta * 0.0011
    }
    for (const star of this.brightStars || []) {
      star.material.opacity = star.base * (0.78 + Math.sin(time * star.speed + star.phase) * 0.22)
    }
    for (const cloud of this.nebulaSprites || []) {
      cloud.material.opacity = cloud.base * (0.92 + Math.sin(time * 0.1 + cloud.phase) * 0.08)
    }
    this.earth.material.uniforms.uTime.value = time
    this.sunSprite.material.opacity = 0.42 + Math.sin(time * 0.52) * 0.03
    this.earthBounce.intensity = 2.2 + Math.sin(time * 0.76) * 0.24
    this.busFill.intensity = 15 + Math.sin(time * 1.1) * 1.2
    this.pinkLight.position.y = 2.8 + Math.sin(time * 0.8) * 0.35
    this.pinkLight.intensity = 2.8 + Math.sin(time * 2.1) * 0.35
    this.reticle.rotation.y = time * 0.012
    this.reticle.rotation.z = Math.sin(time * 0.2) * 0.02
    this.reticleTicks.rotation.z = time * 0.02
    this.debris.rotation.y += delta * 0.006
    this.debris.rotation.x = Math.sin(time * 0.1) * 0.04
    this.filmPass.uniforms.uTime.value = time

    // Throttle expensive raycasting while idle.
    this._pickFrame = (this._pickFrame + 1) % 3
    if (this.pointerInside && this._pickFrame === 0 && !this.pointerDown) {
      const hit = this._pickPart()
      this._setHovered(hit)
    }

    this.composer.render(delta)
  }

  dispose() {
    window.removeEventListener('resize', this._onResize)
    this.controls.dispose()
    this.renderer.dispose()
    this.composer.dispose()
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose?.()
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value?.isTexture) value.dispose()
          }
          material.dispose?.()
        }
      }
    })
  }
}


