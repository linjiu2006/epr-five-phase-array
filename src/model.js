import * as THREE from 'three'
import { getArmorProfile } from './armor.js'
import { EMBLEM_URLS } from './emblems.js'

const TAU = Math.PI * 2
const PI = Math.PI
const HALF_PI = PI / 2
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvasTexture(size, draw, { repeat = [1, 1], srgb = true } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat[0], repeat[1])
  texture.anisotropy = 8
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function drawPanelBase(ctx, size, seed, base, edge, line, accent, dark = false) {
  const rand = mulberry32(seed)
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, base)
  gradient.addColorStop(0.48, dark ? '#0b1b2b' : '#b7c9dc')
  gradient.addColorStop(1, edge)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Broad tonal breakup, keeps the panels from reading like untextured plastic.
  for (let i = 0; i < 38; i += 1) {
    const x = rand() * size
    const y = rand() * size
    const w = 20 + rand() * size * 0.32
    const h = 4 + rand() * 36
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(7,22,38,.055)'
    ctx.fillRect(x, y, w, h)
  }

  // Panel grid with subtle depth.
  const cells = dark ? 5 : 4
  const cell = size / cells
  ctx.lineWidth = Math.max(1, size / 420)
  for (let i = 0; i <= cells; i += 1) {
    const p = i * cell
    ctx.strokeStyle = line
    ctx.strokeRect(p + 1, 1, size - 2, size - 2)
    ctx.beginPath()
    ctx.moveTo(p, 0)
    ctx.lineTo(p, size)
    ctx.moveTo(0, p)
    ctx.lineTo(size, p)
    ctx.stroke()
  }

  // Secondary panel seams.
  ctx.strokeStyle = dark ? 'rgba(93,172,220,.16)' : 'rgba(19,47,76,.22)'
  for (let i = 0; i < 30; i += 1) {
    const x = cell * (1 + Math.floor(rand() * (cells - 1))) + (rand() > 0.5 ? 14 : -12)
    const y = rand() * size
    const len = 12 + rand() * 82
    ctx.beginPath()
    if (rand() > 0.45) {
      ctx.moveTo(x, y)
      ctx.lineTo(x + len, y)
    } else {
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + len * 0.55)
    }
    ctx.stroke()
  }

  // Fasteners and tiny service markings.
  for (let i = 0; i < 78; i += 1) {
    const x = Math.floor(rand() * cells) * cell + 8
    const y = Math.floor(rand() * cells) * cell + 8
    ctx.beginPath()
    ctx.arc(x + rand() * (cell - 16), y + rand() * (cell - 16), size / 380, 0, TAU)
    ctx.fillStyle = dark ? 'rgba(134,194,224,.32)' : 'rgba(20,52,82,.36)'
    ctx.fill()
  }

  // Sparse accent bars / engineering decals.
  ctx.fillStyle = accent
  for (let i = 0; i < (dark ? 4 : 3); i += 1) {
    const x = 16 + Math.floor(rand() * (cells - 1)) * cell
    const y = size - 22 - Math.floor(rand() * 2) * 18
    ctx.globalAlpha = 0.7
    ctx.fillRect(x, y, 24 + rand() * 38, 2)
    ctx.globalAlpha = 1
  }
  ctx.font = `${Math.round(size * 0.023)}px "Rajdhani", sans-serif`
  ctx.fillStyle = dark ? 'rgba(158,231,255,.38)' : 'rgba(17,45,70,.42)'
  ctx.fillText('EPR 路 STRUCTURAL', 17, 25)
  ctx.fillText('QA 07', size - 52, size - 17)

  // Fine grain / machining speckle.
  const image = ctx.getImageData(0, 0, size, size)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * 12
    data[i] = Math.max(0, Math.min(255, data[i] + n))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n))
  }
  ctx.putImageData(image, 0, 0)
}

function drawCellPanel(ctx, size, colorA, colorB, line, accent) {
  const rand = mulberry32(771)
  ctx.fillStyle = colorA
  ctx.fillRect(0, 0, size, size)
  const cols = 8
  const rows = 8
  const cw = size / cols
  const ch = size / rows
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const gl = ctx.createLinearGradient(x * cw, y * ch, (x + 1) * cw, (y + 1) * ch)
      gl.addColorStop(0, colorB)
      gl.addColorStop(1, colorA)
      ctx.fillStyle = gl
      ctx.fillRect(x * cw + 2, y * ch + 2, cw - 4, ch - 4)
      ctx.strokeStyle = line
      ctx.lineWidth = 1
      ctx.strokeRect(x * cw + 2.5, y * ch + 2.5, cw - 5, ch - 5)
      if (rand() > 0.9) {
        ctx.fillStyle = accent
        ctx.globalAlpha = 0.3
        ctx.fillRect(x * cw + 5, y * ch + 5, cw - 10, 2)
        ctx.globalAlpha = 1
      }
    }
  }
  ctx.strokeStyle = 'rgba(207,251,255,.16)'
  ctx.lineWidth = 2
  for (let i = 0; i < 5; i += 1) {
    const p = 10 + (i * (size - 20)) / 4
    ctx.beginPath()
    ctx.moveTo(p, 0)
    ctx.lineTo(p, size)
    ctx.stroke()
  }
}

function drawHazard(ctx, size) {
  ctx.fillStyle = '#0b1119'
  ctx.fillRect(0, 0, size, size)
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.rotate(-PI / 4)
  for (let i = -size; i < size * 1.2; i += 38) {
    ctx.fillStyle = '#d7a33d'
    ctx.fillRect(i, -size, 18, size * 2)
  }
  ctx.restore()
  const vignette = ctx.createLinearGradient(0, 0, 0, size)
  vignette.addColorStop(0, 'rgba(255,255,255,.18)')
  vignette.addColorStop(1, 'rgba(0,0,0,.3)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, size, size)
}

function drawTextDecal(ctx, size, data) {
  ctx.clearRect(0, 0, size, size)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = data.color || 'rgba(230,248,255,.9)'
  if (data.primary) {
    ctx.font = `700 ${data.primarySize || 128}px "Orbitron", sans-serif`
    ctx.fillText(data.primary, 6, data.primaryY || 130)
  }
  if (data.secondary) {
    ctx.fillStyle = data.color2 || 'rgba(142,210,232,.72)'
    ctx.font = `500 ${data.secondarySize || 30}px "Rajdhani", sans-serif`
    ctx.fillText(data.secondary, 9, data.secondaryY || 170)
  }
  if (data.code) {
    ctx.fillStyle = data.color2 || 'rgba(142,210,232,.6)'
    ctx.font = `600 ${data.codeSize || 23}px "Rajdhani", sans-serif`
    ctx.fillText(data.code, 9, data.codeY || 204)
  }
  if (data.rule !== false) {
    ctx.strokeStyle = data.color2 || 'rgba(142,210,232,.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(8, data.ruleY || 150)
    ctx.lineTo(data.ruleW || size - 24, data.ruleY || 150)
    ctx.stroke()
  }
}

function radialSpriteTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(0.18, inner)
  gradient.addColorStop(0.52, outer)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function buildMaterials() {
  const whiteMap = canvasTexture(512, (ctx, size) =>
    drawPanelBase(ctx, size, 737, '#e1e8ef', '#91a9c1', 'rgba(31,63,91,.3)', 'rgba(255,166,74,.8)', false),
  )
  const whiteBump = canvasTexture(
    512,
    (ctx, size) => {
      drawPanelBase(ctx, size, 737, '#b9b9b9', '#747474', 'rgba(20,20,20,.8)', 'rgba(255,255,255,.3)', false)
    },
    { srgb: false },
  )
  const darkMap = canvasTexture(512, (ctx, size) =>
    drawPanelBase(ctx, size, 149, '#10243a', '#050c17', 'rgba(80,157,204,.28)', 'rgba(90,228,255,.9)', true),
  )
  const darkBump = canvasTexture(
    512,
    (ctx, size) => {
      drawPanelBase(ctx, size, 149, '#7c7c7c', '#1c1c1c', 'rgba(5,5,5,.8)', 'rgba(255,255,255,.2)', true)
    },
    { srgb: false },
  )
  const cellMap = canvasTexture(512, (ctx, size) =>
    drawCellPanel(ctx, size, '#061a33', '#0d3e70', 'rgba(114,218,255,.34)', '#62e6ff'),
  )
  const hazardMap = canvasTexture(256, drawHazard)
  const starWhiteMap = radialSpriteTexture('rgba(255,255,255,1)', 'rgba(190,239,255,.3)')
  const glowCyanMap = radialSpriteTexture('rgba(132,252,255,.9)', 'rgba(41,183,255,.24)')
  const glowPinkMap = radialSpriteTexture('rgba(255,177,210,.95)', 'rgba(255,56,124,.26)')
  const glowWarmMap = radialSpriteTexture('rgba(255,222,175,.92)', 'rgba(255,128,55,.2)')
  const glowWhiteMap = radialSpriteTexture('rgba(255,255,255,1)', 'rgba(186,245,255,.2)')

  const white = new THREE.MeshPhysicalMaterial({
    color: 0xc3d3e1,
    map: whiteMap,
    bumpMap: whiteBump,
    bumpScale: 0.028,
    metalness: 0.38,
    roughness: 0.32,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.05,
  })
  const whiteSilk = white.clone()
  whiteSilk.color.setHex(0xf2f7fb)
  whiteSilk.roughness = 0.24
  whiteSilk.metalness = 0.28

  const ivory = new THREE.MeshStandardMaterial({
    color: 0xc9d8e6,
    metalness: 0.28,
    roughness: 0.48,
    envMapIntensity: 0.85,
  })

  const navy = new THREE.MeshPhysicalMaterial({
    color: 0x0c2742,
    map: darkMap,
    bumpMap: darkBump,
    bumpScale: 0.022,
    metalness: 0.76,
    roughness: 0.24,
    clearcoat: 0.6,
    clearcoatRoughness: 0.28,
    envMapIntensity: 1.35,
  })
  const navySilk = navy.clone()
  navySilk.color.setHex(0x143c64)
  navySilk.roughness = 0.19
  navySilk.clearcoat = 0.8

  const ink = new THREE.MeshStandardMaterial({
    color: 0x050b13,
    metalness: 0.7,
    roughness: 0.34,
    envMapIntensity: 0.7,
  })
  const gunmetal = new THREE.MeshStandardMaterial({
    color: 0x3a4d5f,
    metalness: 0.92,
    roughness: 0.27,
    envMapIntensity: 1.2,
  })
  const titanium = new THREE.MeshStandardMaterial({
    color: 0x8fa4b5,
    metalness: 0.9,
    roughness: 0.24,
    envMapIntensity: 1.15,
  })
  const copper = new THREE.MeshStandardMaterial({
    color: 0xd28a58,
    metalness: 0.82,
    roughness: 0.33,
    envMapIntensity: 1.2,
  })
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xc9e1ec,
    metalness: 1,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.8,
  })
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0xd8e6f0,
    metalness: 0.18,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    emissive: 0x1a394a,
    emissiveIntensity: 0.12,
    envMapIntensity: 1.2,
  })
  const radiator = new THREE.MeshPhysicalMaterial({
    color: 0xeef9ff,
    map: whiteMap,
    metalness: 0.18,
    roughness: 0.3,
    clearcoat: 0.4,
    clearcoatRoughness: 0.26,
    side: THREE.DoubleSide,
    envMapIntensity: 1.35,
  })
  const solar = new THREE.MeshPhysicalMaterial({
    color: 0x2b7edd,
    map: cellMap,
    emissive: 0x0b3a66,
    emissiveIntensity: 1.1,
    metalness: 0.55,
    roughness: 0.22,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.7,
  })
  const hazard = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: hazardMap,
    metalness: 0.25,
    roughness: 0.5,
  })

  const glowCyan = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.22, 2.15, 2.65),
    transparent: true,
    opacity: 0.98,
    toneMapped: false,
  })
  const glowBlue = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.09, 0.72, 2.45),
    transparent: true,
    opacity: 0.82,
    toneMapped: false,
  })
  const glowPink = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.55, 0.16, 0.57),
    transparent: true,
    opacity: 0.95,
    toneMapped: false,
  })
  const glowWhite = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.9, 2.65, 3.0),
    transparent: true,
    opacity: 0.88,
    toneMapped: false,
  })
  const glowWarm = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.08, 0.22),
    transparent: true,
    opacity: 0.95,
    toneMapped: false,
  })
  const glowGlass = new THREE.MeshPhysicalMaterial({
    color: 0x73eaff,
    metalness: 0.1,
    roughness: 0.08,
    transmission: 0.3,
    thickness: 0.4,
    transparent: true,
    opacity: 0.42,
    clearcoat: 1,
    emissive: 0x1890c7,
    emissiveIntensity: 0.7,
    envMapIntensity: 2.2,
    depthWrite: false,
  })
  const bladeEdge = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.4, 1.0, 1.2),
    transparent: true,
    opacity: 0.9,
    toneMapped: false,
  })

  return {
    white,
    whiteSilk,
    ivory,
    navy,
    navySilk,
    ink,
    gunmetal,
    titanium,
    copper,
    chrome,
    ceramic,
    radiator,
    solar,
    hazard,
    glowCyan,
    glowBlue,
    glowPink,
    glowWhite,
    glowWarm,
    glowGlass,
    bladeEdge,
    maps: {
      whiteMap,
      darkMap,
      cellMap,
      hazardMap,
      starWhiteMap,
      glowCyanMap,
      glowPinkMap,
      glowWarmMap,
      glowWhiteMap,
      whiteBump,
      darkBump,
    },
  }
}

function boxMesh(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z)
  return mesh
}

function cylinderX(r1, r2, length, material, x, y = 0, z = 0, segments = 32, openEnded = false) {
  const geometry = new THREE.CylinderGeometry(r1, r2, length, segments, 1, openEnded)
  geometry.rotateZ(-HALF_PI)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x, y, z)
  return mesh
}

function cylinderY(r1, r2, length, material, x = 0, y = 0, z = 0, segments = 32, openEnded = false) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, length, segments, 1, openEnded), material)
  mesh.position.set(x, y, z)
  return mesh
}

function torusX(radius, tube, material, x = 0, radialSegments = 8, tubularSegments = 64, arc = TAU) {
  const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments, arc)
  geometry.rotateY(HALF_PI)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.x = x
  return mesh
}

function torusY(radius, tube, material, y = 0, radialSegments = 8, tubularSegments = 40) {
  const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments)
  geometry.rotateX(HALF_PI)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = y
  return mesh
}

function extrudedPlate(points, depth, material, { bevel = 0.02, segments = 1 } = {}) {
  const shape = new THREE.Shape()
  shape.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1])
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segments,
    curveSegments: 8,
  })
  geometry.translate(0, 0, -depth / 2)
  geometry.rotateY(HALF_PI)
  const mesh = new THREE.Mesh(geometry, material)
  return mesh
}

function octRing(outerRadius, innerRadius, depth, material, x, sides = 8, rotation = 0) {
  const outer = new THREE.Shape()
  const inner = new THREE.Path()
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i / sides) * TAU
    const ox = Math.cos(a) * outerRadius
    const oy = Math.sin(a) * outerRadius
    const ix = Math.cos(a) * innerRadius
    const iy = Math.sin(a) * innerRadius
    if (i === 0) {
      outer.moveTo(ox, oy)
      inner.moveTo(ix, iy)
    } else {
      outer.lineTo(ox, oy)
      inner.lineTo(ix, iy)
    }
  }
  outer.closePath()
  inner.closePath()
  outer.holes.push(inner)
  const geometry = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false })
  geometry.translate(0, 0, -depth / 2)
  geometry.rotateY(HALF_PI)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.x = x
  return mesh
}

function circleRing(outerRadius, innerRadius, depth, material, x) {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, outerRadius, 0, TAU, false)
  const hole = new THREE.Path()
  hole.absarc(0, 0, innerRadius, 0, TAU, true)
  shape.holes.push(hole)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 48 })
  geometry.translate(0, 0, -depth / 2)
  geometry.rotateY(HALF_PI)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.x = x
  return mesh
}

function addBolts(parent, material, positions, radius = 0.035) {
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.1, 0.024, 8)
  geometry.rotateX(HALF_PI)
  for (const [x, y, z, rz = 0] of positions) {
    const bolt = new THREE.Mesh(geometry, material)
    bolt.position.set(x, y, z)
    bolt.rotation.z = rz
    parent.add(bolt)
  }
}

function makeCurveTube(points, radius, material, tubularSegments = 48, radialSegments = 6) {
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false)
  return new THREE.Mesh(geometry, material)
}

function labelDecal(text, sub, code, { width = 2.1, height = 0.8, tone = 'light' } = {}) {
  const texture = canvasTexture(
    512,
    (ctx, size) =>
      drawTextDecal(ctx, size, {
        primary: text,
        secondary: sub,
        code,
        color: tone === 'light' ? 'rgba(18,43,65,.95)' : 'rgba(228,249,255,.94)',
        color2: tone === 'light' ? 'rgba(27,82,111,.8)' : 'rgba(102,220,255,.72)',
        primarySize: 92,
        primaryY: 116,
        ruleY: 140,
        ruleW: 390,
        secondarySize: 27,
        secondaryY: 180,
        codeSize: 22,
        codeY: 210,
      }),
    { repeat: [1, 1] },
  )
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    toneMapped: false,
  })
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
}

function glowSprite(map, color, scale, opacity = 0.8) {
  const material = new THREE.SpriteMaterial({
    map,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(scale, scale, 1)
  return sprite
}

function boltRing(parent, mat, radius, count, x, tube = 0.035, phase = 0) {
  const group = new THREE.Group()
  for (let i = 0; i < count; i += 1) {
    const a = phase + (i / count) * TAU
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(tube, tube, 0.04, 6), mat)
    bolt.rotation.x = HALF_PI
    bolt.position.set(x, Math.cos(a) * radius, Math.sin(a) * radius)
    bolt.rotation.y = a
    group.add(bolt)
  }
  parent.add(group)
  return group
}

function tagPart(object, id) {
  object.userData.part = id
  object.traverse((child) => {
    if (child.isMesh) {
      child.userData.part = id
      child.castShadow = false
      child.receiveShadow = false
    }
  })
  return object
}

function cylinderBetween(a, b, radius, material, segments = 10) {
  const direction = new THREE.Vector3().subVectors(b, a)
  const length = direction.length()
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  return mesh
}

function plateXY(points, depth, material, bevel = 0.02) {
  const shape = new THREE.Shape()
  shape.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1])
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 8,
  })
  geometry.translate(0, 0, -depth / 2)
  return new THREE.Mesh(geometry, material)
}

export class SatelliteLauncher {
  constructor() {
    this.materials = buildMaterials()
    this.root = new THREE.Group()
    this.root.name = 'EPR-LS07'
    this.root.rotation.set(0.02, -0.03, 0.075)
    this.root.position.set(1.25, 0.18, 0)

    this.explode = 0
    this.explodeTarget = 0
    this.armorId = 'long'
    this.armorBindings = []
    this.armorLights = []
    this.plasmaRingRotation = 0
    this.plasmaRingTargetRotation = 0
    this.plasmaRingTween = null
    this.cradleEmitters = []

    this.partGroups = new Map()
    this.partMeshes = new Map()
    this.assemblies = []
    this.spinners = []
    this.bladeRoots = []
    this.bladeConnectors = []
    this.bladeSecondaries = []
    this.scissorArms = []
    this.petalLaser = null
    this.petalNetApexes = []
    this.petalEnergyRelay = null
    this.engineEnergy = null
    this.energyFlow = null
    this.energyBeam = null
    this.earthRadius = 70
    this.earthTarget = new THREE.Vector3(-132.8, -487.3, -979.3)
    this.earthTargetLocal = new THREE.Vector3(-132.8, -487.3, -979.3)
    // A visible point on the Earth-facing limb. Using a limb instead of the
    // Earth centre gives a long, readable straight beam instead of a short
    // foreshortened splash near the muzzle.
    this.earthAimPoint = new THREE.Vector3(-65.6, -7.0, -51.9)
    this.earthAimPointLocal = new THREE.Vector3(-65.6, -7.0, -51.9)
    this.axialLinks = []
    this.energyClaws = []
    this.energySparks = []
    this.energyRings = []
    this.interstageDishes = []
    this.energyBridge = null
    this.hexHalves = []
    this.cradlePipes = []
    this.cradlePipeCoreMat = null
    this.plasmaMuzzles = []
    this.plasmaRedMat = null
    this.finRoots = []
    this.radiatorPanels = []
    this.railProngs = []
    this.cablePulses = []
    this.beacons = []
    this.energySprites = []
    this.nodeSprites = []
    this.pinkLights = []
    this.floatingBits = []

    this._createGroup('bus')
    this._createGroup('fins')
    this._createGroup('radiator')
    this._createGroup('thruster')
    this._createGroup('sensor')
    this._createGroup('cradle')
    this._createGroup('hub')
    this._createGroup('core')
    this._createGroup('blade')
    this._createGroup('rails')

    // Locked-station layout: the six major assemblies are kept apart by a
    // long structural spine instead of being stacked directly against each other.
    this.partGroups.get('thruster').position.set(-9.85, 0, 0)
    this.partGroups.get('bus').position.set(-5.5, 0, 0)
    this.partGroups.get('fins').position.set(-5.5, 0, 0)
    this.partGroups.get('radiator').position.set(-5.5, 0, 0)
    this.partGroups.get('sensor').position.set(-5.5, 0, 0)
    this.partGroups.get('cradle').position.set(-2.7, 0, 0)
    this.partGroups.get('hub').position.set(0.64, 0, 0)
    this.partGroups.get('core').position.set(0.64, 0, 0)
    this.partGroups.get('blade').position.set(6.52, 0, 0)
    this.partGroups.get('rails').position.set(7.12, 0, 0)

    this._buildBus(this.partGroups.get('bus'))
    this._buildFins(this.partGroups.get('fins'))
    this._buildRadiators(this.partGroups.get('radiator'))
    this._buildThruster(this.partGroups.get('thruster'))
    this._buildSensor(this.partGroups.get('sensor'))
    this._buildCradle(this.partGroups.get('cradle'))
    this._buildHub(this.partGroups.get('hub'))
    this._buildCore(this.partGroups.get('core'))
    this._buildBlades(this.partGroups.get('blade'))
    this._buildRails(this.partGroups.get('rails'))
    this._buildInterstageDishes()
    this._buildEnergyBridge(this.partGroups.get('bus'))
    this._buildEnergyLaunch()
    this._buildPetalEnergyRelay()

    for (const [id, group] of this.partGroups) {
      tagPart(group, id)
      const meshes = []
      group.traverse((child) => {
        if (child.isMesh) meshes.push(child)
      })
      this.partMeshes.set(id, meshes)
    }
    this._buildAxialLinks()
    this._setupAssemblies()
    this._collectBeacons()
    this._bindArmorMaterials()
    this.setArmorTheme('long')
  }

  _createGroup(id) {
    const group = new THREE.Group()
    group.name = `EPR-${id.toUpperCase()}`
    group.userData.part = id
    this.root.add(group)
    this.partGroups.set(id, group)
    return group
  }

  _buildInterstageDishes() {
    const m = this.materials
    // The first reflector is 1.2x the engine interface diameter, and the
    // second is 1.5x the first. Both sit on the extended coupler between the
    // orbital thruster and the storage spine.
    const engineInterfaceDiameter = 2.2
    // The pair was enlarged by another 1.5x at the user's request while the
    // second reflector remains 1.5x the first.
    const firstDiameter = engineInterfaceDiameter * 1.2 * 1.5
    const secondDiameter = firstDiameter * 1.5
    const reflectorMat = m.ivory.clone()
    reflectorMat.color.setHex(0xdce7ee)
    reflectorMat.metalness = 0.58
    reflectorMat.roughness = 0.3
    reflectorMat.side = THREE.DoubleSide
    reflectorMat.needsUpdate = true

    const configs = [
      {
        id: '01',
        parent: this.partGroups.get('thruster'),
        x: -5.23,
        radius: firstDiameter * 0.5,
        inner: 0.75,
        closedTilt: -0.82,
        openTilt: -0.25,
        supportFrom: -5.93,
        supportRadius: 0.78,
        rib: m.titanium,
        rim: m.chrome,
      },
      {
        id: '02',
        parent: this.partGroups.get('bus'),
        x: -6.97,
        radius: secondDiameter * 0.5,
        inner: 0.93,
        closedTilt: 0.82,
        openTilt: 0.25,
        supportFrom: -6.27,
        supportRadius: 0.9,
        rib: m.copper,
        rim: m.titanium,
      },
    ]

    for (const conf of configs) {
      const parent = conf.parent
      const count = 12
      const innerR = conf.inner
      const span = conf.radius - innerR
      const dish = new THREE.Group()
      dish.name = `EPR-FAN-DISH-${conf.id}`
      dish.position.x = conf.x
      parent.add(dish)

      // Fixed hub ring around the long coupler. The centre stays open so the
      // telescoping tube can slide through the dishes as the modules separate.
      dish.add(torusX(innerR * 0.96, 0.05, m.titanium, 0, 8, 64))
      dish.add(torusX(innerR * 0.8, 0.03, m.chrome, 0.02, 6, 56))
      dish.add(torusX(innerR * 0.62, 0.024, m.glowCyan, 0.04, 6, 48))
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU + PI / 12
        const spoke = boxMesh(0.055, innerR * 0.5, 0.07, m.titanium, 0, Math.cos(a) * innerR * 0.72, Math.sin(a) * innerR * 0.72)
        spoke.rotation.x = a
        dish.add(spoke)
      }

      // Outboard support truss connects each reflector to its own module.
      parent.add(torusX(innerR * 0.82, 0.028, m.titanium, conf.supportFrom, 6, 48))
      parent.add(torusX(innerR * 0.66, 0.016, m.glowCyan, conf.supportFrom, 6, 48))
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * TAU + PI / 6
        const start = new THREE.Vector3(
          conf.supportFrom,
          Math.cos(a) * conf.supportRadius,
          Math.sin(a) * conf.supportRadius,
        )
        const end = new THREE.Vector3(
          conf.x,
          Math.cos(a) * innerR * 0.92,
          Math.sin(a) * innerR * 0.92,
        )
        parent.add(cylinderBetween(start, end, 0.028, m.titanium, 8))
        const mid = start.clone().lerp(end, 0.55)
        const clamp = boxMesh(0.14, 0.14, 0.14, m.ink, mid.x, mid.y, mid.z)
        parent.add(clamp)
        const journal = boxMesh(0.22, 0.2, 0.2, m.whiteSilk, conf.supportFrom + 0.08, start.y, start.z)
        journal.rotation.x = a
        parent.add(journal)
      }

      const petals = []
      for (let i = 0; i < count; i += 1) {
        const a = (i / count) * TAU
        const axis = new THREE.Group()
        axis.rotation.x = a
        dish.add(axis)

        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10), m.chrome)
        pin.rotation.x = HALF_PI
        pin.position.y = innerR
        axis.add(pin)
        axis.add(boxMesh(0.26, 0.16, 0.22, m.gunmetal, 0, innerR * 0.99, 0))

        const pivot = new THREE.Group()
        pivot.position.y = innerR
        pivot.rotation.z = conf.closedTilt
        axis.add(pivot)

        const wIn = (TAU * innerR / count) * 0.82
        const wOut = (TAU * conf.radius / count) * 0.82
        const shape = [
          [-wIn * 0.5, 0.015],
          [wIn * 0.5, 0.015],
          [wOut * 0.5, span * 0.975],
          [-wOut * 0.5, span * 0.975],
        ]
        pivot.add(extrudedPlate(shape, 0.055, reflectorMat, { bevel: 0.01, segments: 1 }))

        // Symmetric ribs let the reflector read as a dish from either side as
        // it fans open. The metallic surface is double-sided rather than a
        // separate dark backing plate.
        for (const face of [-1, 1]) {
          pivot.add(
            cylinderBetween(
              new THREE.Vector3(face * 0.05, 0.01, 0),
              new THREE.Vector3(face * 0.075, span * 0.975, 0),
              0.014,
              conf.rib,
              6,
            ),
          )
          for (const side of [-1, 1]) {
            pivot.add(
              cylinderBetween(
                new THREE.Vector3(face * 0.05, 0.02, side * wIn * 0.46),
                new THREE.Vector3(face * 0.075, span * 0.975, side * wOut * 0.46),
                0.011,
                conf.rim,
                5,
              ),
            )
          }
          pivot.add(boxMesh(0.018, 0.025, wOut * 0.7, m.glowCyan, face * 0.095, span * 0.982, 0))
        }
        pivot.add(boxMesh(0.12, 0.028, wOut * 0.92, m.gunmetal, 0, span * 0.58, 0))
        pivot.add(boxMesh(0.12, 0.045, wOut + 0.05, conf.rim, 0, span * 0.975, 0))
        petals.push(pivot)
      }

      this.interstageDishes.push({
        group: dish,
        petals,
        closedTilt: conf.closedTilt,
        openTilt: conf.openTilt,
      })
    }
  }

  _buildEnergyBridge(parent) {
    const m = this.materials
    const group = new THREE.Group()
    group.name = 'EPR-ENERGY-BRIDGE'
    group.position.set(-3.14, 0, 0)
    parent.add(group)

    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.34, 2.8, 3.3),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    })
    const windowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.45, 2.2, 2.6),
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const ringGlowMat = new THREE.MeshBasicMaterial({
      color:new THREE.Color(0.6, 3.2, 3.6),
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    })

    // Rear socket clamps the device around the existing bus-cradle coupler.
    group.add(cylinderX(0.36, 0.58, 0.34, m.ink, 0.14, 0, 0, 28))
    group.add(torusX(0.64, 0.04, m.titanium, 0.02, 8, 56))
    group.add(torusX(0.48, 0.028, m.glowCyan, 0.2, 6, 48))
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + PI / 4
      const p1 = new THREE.Vector3(0.02, Math.cos(a) * 0.53, Math.sin(a) * 0.53)
      const p2 = new THREE.Vector3(0.38, Math.cos(a) * 0.78, Math.sin(a) * 0.78)
      group.add(cylinderBetween(p1, p2, 0.032, m.titanium, 8))
      const clamp = boxMesh(0.2, 0.16, 0.16, m.whiteSilk, 0.16, Math.cos(a) * 0.62, Math.sin(a) * 0.62)
      clamp.rotation.x = a
      group.add(clamp)
    }

    // Layered main transfer cylinder: eight white armor ribs around a dark
    // inner core, with cyan energy channels exposed between them.
    const body = new THREE.Group()
    group.add(body)
    body.add(cylinderX(0.52, 0.52, 1.16, m.ink, 0.95, 0, 0, 24))
    body.add(cylinderX(0.44, 0.44, 1.1, coreMat, 0.95, 0, 0, 20))
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU + PI / 8
      const panel = boxMesh(1.14, 0.2, 0.43, m.whiteSilk, 0.95, Math.cos(a) * 0.8, Math.sin(a) * 0.8)
      panel.rotation.x = a
      body.add(panel)
      const rib = boxMesh(1.22, 0.055, 0.09, m.titanium, 0.95, Math.cos(a) * 0.94, Math.sin(a) * 0.94)
      rib.rotation.x = a
      body.add(rib)
      const channel = boxMesh(0.94, 0.018, 0.11, windowMat, 0.95, Math.cos(a + PI / 8) * 0.92, Math.sin(a + PI / 8) * 0.92)
      channel.rotation.x = a + PI / 8
      body.add(channel)
      if (i % 2 === 0) {
        const node = boxMesh(0.16, 0.045, 0.16, m.glowPink, 0.94, Math.cos(a) * 0.96, Math.sin(a) * 0.96)
        node.rotation.x = a
        body.add(node)
      }
    }
    body.add(torusX(0.94, 0.055, m.titanium, 0.37, 8, 64))
    body.add(torusX(0.99, 0.045, m.ink, 1.53, 8, 64))
    body.add(torusX(0.72, 0.024, ringGlowMat, 0.61, 6, 48))
    body.add(torusX(0.8, 0.022, ringGlowMat, 1.28, 6, 48))
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * TAU + PI / 6
      const p1 = new THREE.Vector3(0.42, Math.cos(a) * 0.58, Math.sin(a) * 0.58)
      const p2 = new THREE.Vector3(1.48, Math.cos(a) * 0.58, Math.sin(a) * 0.58)
      body.add(cylinderBetween(p1, p2, 0.022, m.chrome, 6))
      const pipe = boxMesh(0.28, 0.07, 0.13, m.gunmetal, 0.58, Math.cos(a) * 0.7, Math.sin(a) * 0.7)
      pipe.rotation.x = a
      body.add(pipe)
    }
    // A separate external collar rotates once charging begins.
    const collar = new THREE.Group()
    body.add(collar)
    collar.add(torusX(0.9, 0.026, m.glowCyan, 0.76, 6, 56))
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU
      const finger = boxMesh(0.16, 0.035, 0.3, m.whiteSilk, 0.76, Math.cos(a) * 0.93, Math.sin(a) * 0.93)
      finger.rotation.x = a
      collar.add(finger)
    }

    // Front telescoping barrel. Its pivot is at the cylinder's cradle-facing
    // lip; the whole barrel spins and lengthens toward the docking ring.
    group.add(cylinderX(0.66, 0.58, 0.22, m.titanium, 1.63, 0, 0, 24))
    group.add(torusX(0.6, 0.03, m.chrome, 1.75, 6, 48))
    const slide = new THREE.Group()
    slide.position.x = 1.55
    group.add(slide)
    slide.add(cylinderX(0.46, 0.52, 0.96, m.gunmetal, 0.5, 0, 0, 24))
    slide.add(cylinderX(0.34, 0.4, 0.92, m.ink, 0.5, 0, 0, 18))
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * TAU + PI / 3
      const lug = boxMesh(0.84, 0.09, 0.16, m.whiteSilk, 0.48, Math.cos(a) * 0.52, Math.sin(a) * 0.52)
      lug.rotation.x = a
      slide.add(lug)
      const glow = boxMesh(0.7, 0.018, 0.05, windowMat, 0.48, Math.cos(a + 0.12) * 0.57, Math.sin(a + 0.12) * 0.57)
      glow.rotation.x = a + 0.12
      slide.add(glow)
    }
    slide.add(torusX(0.54, 0.03, m.titanium, 0.09, 6, 44))
    slide.add(torusX(0.54, 0.03, m.titanium, 0.89, 6, 44))
    slide.add(cylinderX(0.42, 0.35, 0.08, m.whiteSilk, 0.97, 0, 0, 20))
    slide.add(torusX(0.4, 0.022, ringGlowMat, 0.99, 6, 36))
    slide.add(boxMesh(0.06, 0.02, 0.16, m.glowCyan, 0.98, 0.34, 0))

    // Cradle-facing docking ring. This is a layered socket rather than a plain
    // torus: guide horns, clamp lugs, index lights and a support sleeve.
    const ringGroup = new THREE.Group()
    group.add(ringGroup)
    ringGroup.position.x = 2.43
    ringGroup.add(cylinderX(1.16, 1.16, 0.13, m.ink, 0, 0, 0, 36, true))
    ringGroup.add(torusX(1.17, 0.075, m.whiteSilk, 0, 8, 64))
    ringGroup.add(torusX(1.02, 0.05, m.titanium, 0.08, 6, 56))
    ringGroup.add(torusX(0.83, 0.035, ringGlowMat, -0.03, 6, 48))
    ringGroup.add(torusX(0.66, 0.035, m.chrome, 0.03, 6, 40))
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU + PI / 8
      const clamp = boxMesh(0.26, 0.16, 0.18, i % 2 ? m.whiteSilk : m.titanium, 0, Math.cos(a) * 1.04, Math.sin(a) * 1.04)
      clamp.rotation.x = a
      ringGroup.add(clamp)
      const index = boxMesh(0.1, 0.035, 0.08, i === 0 ? m.glowPink : m.glowCyan, -0.1, Math.cos(a) * 1.18, Math.sin(a) * 1.18)
      index.rotation.x = a
      ringGroup.add(index)
      const spoke = boxMesh(0.1, 0.06, 0.5, m.gunmetal, 0.01, Math.cos(a) * 0.74, Math.sin(a) * 0.74)
      spoke.rotation.x = a
      ringGroup.add(spoke)
    }
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * TAU + PI / 6
      const horn = boxMesh(0.34, 0.11, 0.18, m.whiteSilk, -0.22, Math.cos(a) * 0.78, Math.sin(a) * 0.78)
      horn.rotation.x = a
      ringGroup.add(horn)
      ringGroup.add(boxMesh(0.08, 0.04, 0.05, m.glowCyan, -0.4, Math.cos(a) * 0.78, Math.sin(a) * 0.78))
    }
    // Sleeve and rails to the cradle-side link socket.
    ringGroup.add(cylinderX(0.44, 0.52, 0.44, m.gunmetal, 0.32, 0, 0, 24))
    ringGroup.add(torusX(0.55, 0.035, m.titanium, 0.54, 6, 48))
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * TAU + PI / 6
      const rail = boxMesh(0.48, 0.055, 0.08, m.whiteSilk, 0.3, Math.cos(a) * 0.82, Math.sin(a) * 0.82)
      rail.rotation.x = a
      ringGroup.add(rail)
    }
    // Four receiving posts, one for each single-stage locking claw.
    const ringPadGlows = []
    for (let i = 0; i < 4; i += 1) {
      const az = new THREE.Group()
      az.rotation.x = PI / 4 + i * PI / 2
      ringGroup.add(az)
      az.add(boxMesh(0.18, 0.34, 0.22, m.whiteSilk, -0.14, 1.28, 0))
      az.add(boxMesh(0.1, 0.06, 0.16, m.gunmetal, -0.14, 1.43, 0))
      az.add(boxMesh(0.2, 0.06, 0.26, m.whiteSilk, -0.14, 1.46, 0))
      az.add(boxMesh(0.09, 0.025, 0.18, m.glowCyan, -0.25, 1.46, 0))
      const padGlow = glowSprite(m.maps.glowCyanMap, 0x9efbff, 0.38, 0)
      padGlow.position.set(-0.24, 1.46, 0)
      az.add(padGlow)
      ringPadGlows.push(padGlow)
    }
    const ringRotor = new THREE.Group()
    ringGroup.add(ringRotor)
    ringRotor.add(torusX(0.9, 0.02, m.glowCyan, 0.02, 5, 44))
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU
      ringRotor.add(boxMesh(0.1, 0.035, 0.22, m.titanium, 0.02, Math.cos(a) * 0.9, Math.sin(a) * 0.9).rotateX(a))
    }

    // Four single-stage reverse claws, evenly spaced around the transfer
    // cylinder. Locked: 45 degrees back toward the storage spine. Expanded:
    // each swings onto its own pad on the docking ring.
    const clawAzimuth = PI / 4
    const clawShape = [
      [-0.16, 0.02],
      [-0.21, 0.18],
      [-0.15, 1.55],
      [-0.08, 2.06],
      [0, 2.2],
      [0.08, 2.06],
      [0.15, 1.55],
      [0.21, 0.18],
      [0.16, 0.02],
    ]
    const claws = []
    for (let i = 0; i < 4; i += 1) {
      const az = new THREE.Group()
      az.rotation.x = clawAzimuth + i * PI / 2
      group.add(az)
      az.add(boxMesh(0.36, 0.54, 0.42, m.whiteSilk, 1.05, 1.13, 0))
      az.add(boxMesh(0.26, 0.24, 0.3, m.gunmetal, 1.05, 1.37, 0))

      const clawPivot = new THREE.Group()
      clawPivot.position.set(1.05, 1.38, 0)
      clawPivot.rotation.z = PI / 4
      az.add(clawPivot)
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 16), m.ink)
      hinge.rotation.x = HALF_PI
      clawPivot.add(hinge)
      for (const z of [-0.21, 0.21]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 12), m.titanium)
        cap.rotation.x = HALF_PI
        cap.position.z = z
        clawPivot.add(cap)
      }
      const clawArm = extrudedPlate(clawShape, 0.16, m.whiteSilk, { bevel: 0.018, segments: 1 })
      clawPivot.add(clawArm)
      const clawInset = extrudedPlate(
        clawShape.map(([z, y]) => [z * 0.55, y]),
        0.05,
        m.navySilk,
        { bevel: 0.008, segments: 1 },
      )
      clawInset.position.x = 0.1
      clawPivot.add(clawInset)
      for (const face of [-1, 1]) {
        clawPivot.add(
          cylinderBetween(
            new THREE.Vector3(face * 0.07, 0.05, 0),
            new THREE.Vector3(face * 0.1, 2.05, 0),
            0.018,
            m.titanium,
            6,
          ),
        )
        clawPivot.add(boxMesh(0.016, 1.4, 0.025, m.glowCyan, face * 0.1, 1.05, 0.13))
      }
      clawPivot.add(boxMesh(0.25, 0.12, 0.34, m.gunmetal, 0, 0.12, 0))
      clawPivot.add(boxMesh(0.3, 0.05, 0.22, m.titanium, 0, 0.34, 0))
      clawPivot.add(boxMesh(0.23, 0.18, 0.34, m.whiteSilk, 0.02, 2.14, 0))
      clawPivot.add(boxMesh(0.14, 0.05, 0.24, m.glowCyan, 0.02, 2.22, 0))
      for (const [z, sway] of [[-0.14, -0.03], [0, 0], [0.14, 0.03]]) {
        const tine = boxMesh(0.11, 0.22, 0.075, m.ink, 0.02, 2.26, z)
        tine.rotation.x = sway
        clawPivot.add(tine)
        clawPivot.add(boxMesh(0.065, 0.045, 0.05, m.glowCyan, 0.02, 2.37, z + sway))
      }
      const clawPiston = cylinderBetween(new THREE.Vector3(0.17, 0.25, 0.12), new THREE.Vector3(0.17, 1.3, 0.12), 0.026, m.chrome, 8)
      clawPivot.add(clawPiston)
      const clawTipGlow = glowSprite(m.maps.glowCyanMap, 0x9efbff, 0.42, 0)
      clawTipGlow.position.set(0.02, 2.2, 0)
      clawPivot.add(clawTipGlow)
      claws.push({ pivot: clawPivot, tipGlow: clawTipGlow })
    }

    // Energy streams are deliberately outside the opaque sleeves so their
    // direction (cradle -> storage spine) reads even from a wide shot.
    const pulseGroup = new THREE.Group()
    group.add(pulseGroup)
    const pulseRings = []
    for (let i = 0; i < 4; i += 1) {
      const mat = ringGlowMat.clone()
      mat.opacity = 0
      const ring = torusX(0.65 + i * 0.045, 0.018, mat, 0, 5, 36)
      pulseGroup.add(ring)
      pulseRings.push({ mesh: ring, material: mat, phase: i / 4, speed: 0.13 + i * 0.011 })
    }
    const pulses = []
    for (let i = 0; i < 10; i += 1) {
      const sprite = glowSprite(
        m.maps.glowCyanMap,
        i % 3 === 0 ? 0xff8bc4 : 0x8ff9ff,
        0.28 + (i % 3) * 0.08,
        0,
      )
      sprite.userData.phase = i / 10
      sprite.userData.speed = 0.16 + (i % 4) * 0.022
      sprite.userData.angle = (i * 2.13) % TAU
      sprite.userData.radius = 0.62 + (i % 3) * 0.11
      pulseGroup.add(sprite)
      pulses.push(sprite)
    }

    const chargeLight = new THREE.PointLight(0x6df7ff, 0, 5.2, 2)
    chargeLight.position.set(0.95, 0.25, 0)
    group.add(chargeLight)
    const halo = glowSprite(m.maps.glowCyanMap, 0x7df8ff, 2.1, 0)
    halo.position.set(0.95, 0, 0)
    group.add(halo)
    const dockFlare = glowSprite(m.maps.glowCyanMap, 0x98fbff, 0.9, 0)
    dockFlare.position.set(2.4, 0, 0)
    group.add(dockFlare)

    this.energyBridge = {
      group,
      body,
      collar,
      slide,
      ringGroup,
      ringRotor,
      claws,
      coreMat,
      windowMat,
      ringGlowMat,
      pulseGroup,
      pulseRings,
      pulses,
      chargeLight,
      halo,
      dockFlare,
      ringPadGlows,
      clawArmLength: 2.2,
    }
  }

  _buildAxialLinks() {
    const m = this.materials
    const specs = [
      {
        id: 'thruster-bus',
        aGroup: 'thruster',
        aLocal: new THREE.Vector3(-5.93, 0, 0),
        bGroup: 'bus',
        bLocal: new THREE.Vector3(-6.27, 0, 0),
        radius: 1.06,
        sleeve: m.navySilk,
        glow: m.glowCyan,
        style: 'bellows',
        extended: true,
      },
      {
        id: 'bus-cradle',
        aGroup: 'bus',
        aLocal: new THREE.Vector3(-3.14, 0, 0),
        bGroup: 'cradle',
        bLocal: new THREE.Vector3(-2.96, 0, 0),
        radius: 1.18,
        sleeve: m.whiteSilk,
        glow: m.glowBlue,
        style: 'cage',
      },
      {
        id: 'cradle-hub',
        aGroup: 'cradle',
        aLocal: new THREE.Vector3(0.08, 0, 0),
        bGroup: 'hub',
        bLocal: new THREE.Vector3(-0.68, 0, 0),
        radius: 1.28,
        sleeve: m.titanium,
        glow: m.glowCyan,
        style: 'telescope',
      },
      {
        id: 'blade-rails',
        aGroup: 'blade',
        aLocal: new THREE.Vector3(0.58, 0, 0),
        bGroup: 'rails',
        bLocal: new THREE.Vector3(1.04, 0, 0),
        radius: 0.95,
        sleeve: m.navySilk,
        glow: m.glowCyan,
        style: 'coil',
      },
    ]

    for (const spec of specs) {
      const group = new THREE.Group()
      group.name = `EPR-AXIAL-${spec.id.toUpperCase()}`
      this.root.add(group)
      this._decorateAxialLink(group, spec)
      this.axialLinks.push({ ...spec, group })
      for (let k = 0; k < 2; k += 1) {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(3.2, 0.035, 0.08),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        })
        const ring = torusY(spec.radius * 0.92, 0.07, mat, 0, 8, 48)
        group.add(ring)
        const glow = glowSprite(m.maps.glowPinkMap, 0xff2438, spec.radius * 1.75, 0)
        glow.visible = false
        group.add(glow)
        this.axialEnergyPulses.push({
          ring,
          mat,
          glow,
          phase: k * 0.5 + this.axialLinks.length * 0.11,
          speed: 0.15 + (this.axialLinks.length % 3) * 0.02,
        })
      }
      const coreMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(3.4, 0.02, 0.055),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
      const redCore = cylinderY(spec.radius * 0.105, spec.radius * 0.085, 0.9, coreMat, 0, 0.5, 0, 10)
      group.add(redCore)
      this.axialEnergyCores.push({ core: redCore, mat: coreMat })
    }
  }

  _decorateAxialLink(group, spec) {
    const m = this.materials
    const R = spec.radius
    const sleeve = spec.sleeve
    const glow = spec.glow

    // Thin continuous load-bearing core. It reads as a luminous filament in
    // the gaps and is slender enough to keep the station silhouette graceful.
    group.add(cylinderY(0.032 * R, 0.032 * R, 0.94, m.chrome, 0, 0.5, 0, 8))
    group.add(cylinderY(0.018 * R, 0.018 * R, 0.9, glow, 0, 0.5, 0, 6))

    // Rear socket.
    group.add(cylinderY(0.3 * R, 0.37 * R, 0.052, m.ink, 0, 0.026, 0, 24))
    group.add(torusY(0.38 * R, 0.016, m.chrome, 0.052, 6, 40))
    group.add(cylinderY(0.2 * R, 0.29 * R, 0.1, sleeve, 0, 0.1, 0, 24))
    group.add(torusY(0.26 * R, 0.013, m.titanium, 0.155, 6, 36))
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + PI / 4
      group.add(boxMesh(0.045 * R, 0.018, 0.03 * R, m.ink, Math.cos(a) * 0.27 * R, 0.062, Math.sin(a) * 0.27 * R).rotateY(-a))
    }

    // Stepped telescoping sleeves and flexible bellows.
    if (spec.style === 'bellows') {
      for (let i = 0; i < 7; i += 1) {
        group.add(torusY((0.2 + i * 0.008) * R, 0.012, i % 2 ? m.titanium : m.ink, 0.18 + i * 0.025, 6, 30))
      }
      group.add(cylinderY(0.16 * R, 0.2 * R, 0.18, m.gunmetal, 0, 0.3, 0, 18))
      group.add(boxMesh(0.065 * R, 0.014, 0.065 * R, m.hazard, 0.21 * R, 0.2, 0, 0))
    } else {
      group.add(cylinderY(0.2 * R, 0.16 * R, 0.17, sleeve, 0, 0.245, 0, 20))
      group.add(torusY(0.22 * R, 0.014, m.chrome, 0.17, 6, 36))
      group.add(torusY(0.195 * R, 0.012, m.glowCyan, 0.325, 5, 32))
      if (spec.style === 'coil') {
        for (let i = 0; i < 5; i += 1) {
          group.add(torusY(0.205 * R, 0.012, m.titanium, 0.2 + i * 0.035, 5, 28))
        }
      }
    }

    // Wide mechanical stop, then the exposed energy-transfer chamber.
    group.add(cylinderY(0.3 * R, 0.22 * R, 0.055, m.whiteSilk, 0, 0.4, 0, 26))
    group.add(torusY(0.31 * R, 0.017, m.ink, 0.43, 8, 40))
    group.add(cylinderY(0.14 * R, 0.14 * R, 0.15, glow, 0, 0.51, 0, 20))
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + PI / 4
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * R, 0.014 * R, 0.22, 6), m.chrome)
      rod.position.set(Math.cos(a) * 0.22 * R, 0.51, Math.sin(a) * 0.22 * R)
      group.add(rod)
      group.add(boxMesh(0.03 * R, 0.015, 0.03 * R, m.ink, Math.cos(a) * 0.22 * R, 0.4, Math.sin(a) * 0.22 * R).rotateY(-a))
    }
    group.add(torusY(0.235 * R, 0.017, m.glowCyan, 0.45, 6, 36))
    group.add(torusY(0.19 * R, 0.02, m.glowCyan, 0.51, 6, 30))
    group.add(torusY(0.235 * R, 0.012, m.chrome, 0.58, 6, 36))

    // The thruster-bus coupler is substantially longer than the rest of the
    // inter-module links; extra collars and longitudinal rails keep its scale
    // legible across the widened gap.
    if (spec.extended) {
      for (let i = 0; i < 6; i += 1) {
        group.add(torusY(0.215 * R, 0.013, i % 2 ? m.titanium : m.ink, 0.2 + i * 0.115, 5, 32))
      }
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * TAU + PI / 4
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.009 * R, 0.009 * R, 0.74, 5), m.chrome)
        rail.position.set(Math.cos(a) * 0.23 * R, 0.5, Math.sin(a) * 0.23 * R)
        group.add(rail)
      }
      group.add(torusY(0.245 * R, 0.017, m.glowCyan, 0.56, 6, 36))
      for (const t of [0.36, 0.74]) {
        group.add(boxMesh(0.04 * R, 0.018, 0.2 * R, m.hazard, 0.19 * R, t, 0))
      }
    }

    // Forward telescope stages.
    group.add(cylinderY(0.16 * R, 0.2 * R, 0.08, m.gunmetal, 0, 0.63, 0, 18))
    group.add(cylinderY(0.2 * R, 0.15 * R, 0.15, sleeve, 0, 0.72, 0, 20))
    group.add(torusY(0.22 * R, 0.014, m.titanium, 0.79, 6, 34))
    group.add(cylinderY(0.12 * R, 0.17 * R, 0.08, m.ink, 0, 0.85, 0, 16))
    if (spec.style === 'telescope' || spec.style === 'cage') {
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * TAU
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.011 * R, 0.011 * R, 0.44, 5), m.chrome)
        rail.position.set(Math.cos(a) * 0.17 * R, 0.68, Math.sin(a) * 0.17 * R)
        group.add(rail)
      }
    }

    // End collar / docking bell.
    group.add(cylinderY(0.27 * R, 0.17 * R, 0.055, m.whiteSilk, 0, 0.9, 0, 24))
    group.add(torusY(0.28 * R, 0.015, m.chrome, 0.93, 6, 36))
    group.add(cylinderY(0.31 * R, 0.38 * R, 0.055, m.ink, 0, 0.974, 0, 24))
    group.add(torusY(0.39 * R, 0.018, glow, 0.998, 8, 40))

    // A pair of very small alignment fins gives each link a readable direction.
    for (const side of [1, -1]) {
      const fin = boxMesh(0.07 * R, 0.035, 0.2 * R, m.whiteSilk, 0, 0.39, side * 0.28 * R)
      fin.rotation.x = side * 0.16
      group.add(fin)
    }
  }

  _updateAxialLinks() {
    const up = new THREE.Vector3(0, 1, 0)
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const dir = new THREE.Vector3()
    for (const link of this.axialLinks) {
      a.copy(this.partGroups.get(link.aGroup).position).add(link.aLocal)
      b.copy(this.partGroups.get(link.bGroup).position).add(link.bLocal)
      dir.copy(b).sub(a)
      const length = dir.length()
      link.group.visible = length > 0.12
      link.group.position.copy(a)
      link.group.quaternion.setFromUnitVectors(up, dir.normalize())
      link.group.scale.set(1, Math.max(0.2, length), 1)
    }
  }

  _setupAssemblies() {
    const defs = [
      { id: 'bus', dir: [-1, -0.02, 0], dist: 3.1, delay: 0.1 },
      { id: 'thruster', dir: [-1, 0.02, 0], dist: 4.2, delay: 0.02 },
      { id: 'fins', dir: [-1, -0.08, 0], dist: 3.35, delay: 0.18 },
      { id: 'radiator', dir: [-1, -0.12, 0], dist: 3.8, delay: 0.22 },
      { id: 'sensor', dir: [-0.25, 1, 0.35], dist: 3.55, delay: 0.3 },
      { id: 'cradle', dir: [-1, 0.1, 0], dist: 2.15, delay: 0.36 },
      { id: 'hub', dir: [-0.5, 0.04, 0.04], dist: 1.15, delay: 0.4 },
      { id: 'blade', dir: [0.9, 0, 0.12], dist: 2.0, delay: 0.44 },
      { id: 'core', dir: [0.7, -0.68, 0.22], dist: 3.5, delay: 0.54 },
      { id: 'rails', dir: [1, 0.03, 0], dist: 3.5, delay: 0.48 },
    ]
    for (const def of defs) {
      const group = this.partGroups.get(def.id)
      this.assemblies.push({
        ...def,
        group,
        base: group.position.clone(),
        dir: new THREE.Vector3(...def.dir).normalize(),
      })
    }

    this.radiatorPanels.forEach(({ pivot, base }) => {
      pivot.userData.baseRot = base
    })
    for (const beacon of this.beacons) {
      beacon.userData.phase = Math.random() * TAU
    }
  }

  _collectBeacons() {
    this.beacons = []
    this.root.traverse((child) => {
      if (child.isSprite && child.userData.beacon) this.beacons.push(child)
    })
  }

  setExplode(value, immediate = false) {
    this.explodeTarget = clamp01(value)
    if (immediate) this.explode = this.explodeTarget
  }

  getSelectableMeshes() {
    return Array.from(this.partMeshes.values()).flat()
  }

  getPartMeshes(id) {
    return this.partMeshes.get(id) || []
  }

  getPartGroup(id) {
    return this.partGroups.get(id)
  }

  getPartCenter(id) {
    const meshes = this.partMeshes.get(id)
    if (!meshes?.length) return new THREE.Vector3()
    const box = new THREE.Box3()
    const temp = new THREE.Box3()
    for (const mesh of meshes) {
      mesh.updateWorldMatrix(true, false)
      temp.setFromObject(mesh)
      box.union(temp)
    }
    return box.getCenter(new THREE.Vector3())
  }

  _updateEnergyBridge(time, e) {
    if (!this.energyBridge) return
    const bridge = this.energyBridge
    const busX = this.partGroups.get('bus').position.x
    const cradleX = this.partGroups.get('cradle').position.x
    const gap = Math.max(0.6, cradleX - busX + 0.18)
    const dock = smoothstep(0.34, 0.97, e)
    const charge = smoothstep(0.64, 0.995, e)
    const pulse = 0.75 + Math.sin(time * 4.1) * 0.16 + Math.sin(time * 9.2) * 0.08
    const ringX = gap - 0.55

    bridge.ringGroup.position.x = ringX
    bridge.slide.scale.x = 0.4 + 1.34 * dock
    bridge.slide.rotation.x = dock * 0.95
    bridge.ringRotor.rotation.x = charge * 0.7
    bridge.collar.rotation.x = time * 0.11 * (0.25 + charge)
    bridge.coreMat.opacity = 0.05 + charge * 0.42 * pulse
    bridge.windowMat.opacity = 0.045 + charge * 0.5 * pulse
    bridge.ringGlowMat.opacity = 0.05 + charge * 0.48 * pulse
    bridge.chargeLight.intensity = charge * (3.8 + pulse * 2.2)
    bridge.halo.material.opacity = charge * 0.2 * pulse
    bridge.dockFlare.material.opacity = charge * 0.7 * pulse
    bridge.dockFlare.position.x = ringX - 0.12
    bridge.dockFlare.scale.setScalar(0.75 + charge * 0.45 + Math.sin(time * 4.6) * 0.1)

    // The single claw aims at the ring's upper pad as the station opens; at
    // full extension its contact shoe lands exactly on that pad.
    const contactX = ringX - 0.13
    const targetAngle = Math.atan2(-(contactX - 1.05), 0.08)
    const swing = smoothstep(0.3, 0.97, e)
    for (const claw of bridge.claws) {
      claw.pivot.rotation.z = THREE.MathUtils.lerp(PI / 4, targetAngle, swing)
      claw.tipGlow.material.opacity = 0.18 + charge * 0.7 * pulse
    }
    for (const padGlow of bridge.ringPadGlows) {
      padGlow.material.opacity = 0.12 + charge * 0.65 * pulse
    }

    bridge.pulseGroup.visible = charge > 0.01
    if (bridge.pulseGroup.visible) {
      const startX = ringX - 0.18
      const endX = 0.58
      for (const item of bridge.pulseRings) {
        const t = (time * item.speed + item.phase) % 1
        item.mesh.position.x = startX + (endX - startX) * t
        item.mesh.position.y = 0
        item.mesh.position.z = 0
        item.mesh.scale.setScalar(0.86 + t * 0.22)
        item.material.opacity = charge * Math.sin(t * PI) * 0.55 * pulse
      }
      for (const sprite of bridge.pulses) {
        const t = (time * sprite.userData.speed + sprite.userData.phase) % 1
        const radius = sprite.userData.radius * (0.8 + Math.sin(t * PI) * 0.25)
        sprite.position.set(
          startX + (endX - startX) * t,
          Math.cos(sprite.userData.angle) * radius,
          Math.sin(sprite.userData.angle) * radius,
        )
        sprite.material.opacity = charge * Math.sin(t * PI) * 0.8 * pulse
      }
    }
  }

  update(time, delta, { spin = true, energy = 1 } = {}) {
    const target = this.explodeTarget
    const easing = 1 - Math.exp(-delta * 3.8)
    this.explode += (target - this.explode) * easing
    if (Math.abs(target - this.explode) < 0.0005) this.explode = target
    const e = this.explode
    const ease = e * e * (3 - 2 * e)

    for (const assembly of this.assemblies) {
      const local = smoothstep(assembly.delay, Math.min(0.995, assembly.delay + 0.38), e)
      assembly.group.position.copy(assembly.base).addScaledVector(assembly.dir, assembly.dist * local)
    }

    this._updateAxialLinks()
    this._updateEnergyBridge(time, e)

    // The two interstage fan reflectors deploy in a fan-like motion. They are
    // mounted on opposite sides of the long thruster-bus coupler and face the
    // gap between the two modules.
    const dishDeploy = smoothstep(0.18, 0.95, e)
    for (const dish of this.interstageDishes) {
      for (let i = 0; i < dish.petals.length; i += 1) {
        const stagger = smoothstep(0.18 + i * 0.004, 0.95, e)
        dish.petals[i].rotation.z = THREE.MathUtils.lerp(dish.closedTilt, dish.openTilt, stagger)
      }
    }

    // Keep the axial telescoping link physically spanning the separated hub
    // and petal rotor. Its end collar always meets the rotor root.
    if (this.hubLink) {
      const hubPos = this.partGroups.get('hub').position
      const bladePos = this.partGroups.get('blade').position
      const gap = Math.max(0, bladePos.x - hubPos.x)
      const extension = Math.max(0.001, (gap - 0.86) / 1.16)
      this.hubLink.scale.x = extension
      this.hubLink.visible = gap > 0.9
      if (this.hubLinkEndGlow) {
        this.hubLinkEndGlow.visible = gap > 0.9
        this.hubLinkEndGlow.position.x = this.hubLink.position.x + extension * 1.12
      }
    }
    if (this.hubLinkEnergyMat) {
      this.hubLinkEnergyMat.opacity = 0.1 + e * 0.5 + Math.sin(time * 4.2) * 0.06
      if (this.hubLinkPulse) {
        const pt = (time * 0.13) % 1
        this.hubLinkPulse.position.x = 0.1 + pt * 1.0
        this.hubLinkPulse.material.opacity = 0.12 + Math.sin(pt * PI) * 0.55
      }
    }

    // The outer rings deploy as a layered telescope: the second ring stays
    // parallel to the first and moves toward the stabilizer, while the third
    // travels toward the solar petals and grows to 1.2x.
    if (this.hubRingSecond && this.hubRingThird) {
      const ringDeploy = smoothstep(0.18, 0.95, e)
      const secondX = this.hubRingBaseX - this.hubRingSecondTravel * ringDeploy
      const thirdX = this.hubRingBaseX + this.hubRingThirdTravel * ringDeploy
      const thirdScale = 1 + 0.2 * ringDeploy
      this.hubRingSecond.position.x = secondX
      this.hubRingThird.position.x = thirdX
      this.hubRingThird.scale.setScalar(thirdScale)
      const positions = this.hubRingThreadLines.geometry.attributes.position
      let cursor = 0
      for (let i = 0; i < 32; i += 1) {
        const a = (i / 32) * TAU
        positions.setXYZ(cursor, secondX, Math.cos(a) * this.hubRingR2, Math.sin(a) * this.hubRingR2)
        cursor += 1
        positions.setXYZ(cursor, thirdX, Math.cos(a) * this.hubRingR3 * thirdScale, Math.sin(a) * this.hubRingR3 * thirdScale)
        cursor += 1
      }
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU + PI / 12
        positions.setXYZ(cursor, this.hubRingBaseX, Math.cos(a) * this.hubRingR1, Math.sin(a) * this.hubRingR1)
        cursor += 1
        positions.setXYZ(cursor, secondX, Math.cos(a) * this.hubRingR2, Math.sin(a) * this.hubRingR2)
        cursor += 1
      }
      positions.needsUpdate = true
    }

    if (this.rotorHub) {
      this.rotorHub.visible = e > 0.025
      this.rotorHub.scale.setScalar(0.82 + 0.18 * smoothstep(0.02, 0.5, e))
    }

    const rotorSpeed = spin ? 0.115 : 0.018
    this.bladeRotor.rotation.x = time * rotorSpeed
    this.gearRing.rotation.x = time * -0.17
    this.hubInner.rotation.x = time * 0.23
    this.coreSpin.rotation.x = time * 0.74
    this.coreSpin.rotation.z = Math.sin(time * 0.33) * 0.16

    for (let i = 0; i < this.bladeRoots.length; i += 1) {
      const blade = this.bladeRoots[i]
      const fan = smoothstep(0.28, 1, e)
      blade.holder.position.y = 3.0 * fan
      blade.holder.rotation.y = 0.24 + (i % 2 === 0 ? 1 : -1) * 0.34 * fan
      blade.holder.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.018 * fan

      // The six radial connectors telescope out with the petal roots, so the
      // array never looks like six loose pieces floating around the hub.
      const connector = this.bladeConnectors[i]
      if (connector) {
        const desiredEnd = 0.8 + blade.holder.position.y - 0.04
        const stretch = clamp01((desiredEnd - connector.baseY) / connector.length)
        connector.group.scale.y = Math.max(0.16, stretch)
        connector.group.rotation.y = blade.holder.rotation.y * 0.3
      }
    }
    for (let i = 0; i < this.bladeSecondaries.length; i += 1) {
      const holder = this.bladeSecondaries[i]
      const fan = smoothstep(0.4, 1, e)
      holder.position.y = 0.9 * fan
      holder.rotation.y = -0.12 + (i % 2 === 0 ? -1 : 1) * 0.19 * fan
    }
    this._updatePetalLasers(e, time)
    this._updatePetalEnergyRelay(e, time)

    // The three engine claws clamp the energy column while docked and open to
    // a radial, petal-parallel stance as the station unfolds.
    const clawOpen = smoothstep(0.2, 0.92, e)
    for (const claw of this.energyClaws) {
      claw.shoulder.rotation.z = THREE.MathUtils.lerp(claw.closedAngles[0], claw.openAngles[0], clawOpen)
      claw.elbow.rotation.z = THREE.MathUtils.lerp(claw.closedAngles[1], claw.openAngles[1], clawOpen)
      claw.wrist.rotation.z = THREE.MathUtils.lerp(claw.closedAngles[2], claw.openAngles[2], clawOpen)
      claw.tipGlow.material.opacity = 0.38 + clawOpen * 0.35
    }
    if (this.energyCore) this.energyCore.material.opacity = 0.23 + clawOpen * 0.2 + Math.sin(time * 2.4) * 0.025
    if (this.energyFilament) this.energyFilament.material.opacity = 0.56 + clawOpen * 0.2
    if (this.energyHalo) this.energyHalo.material.opacity = 0.17 + clawOpen * 0.1
    if (this.energyPortLight) this.energyPortLight.intensity = 2.2 + clawOpen * 1.2 + Math.sin(time * 3.1) * 0.25
    for (const ring of this.energyRings) {
      const s = 1 + Math.sin(time * 2.1 + ring.userData.phase) * 0.035
      ring.scale.set(s, s, s)
    }
    for (const spark of this.energySparks) {
      const t = (time * spark.userData.speed + spark.userData.phase) % 1
      const radius = spark.userData.radius * (1 - t * 0.72)
      spark.position.set(
        -7.38 - t * 2.25,
        Math.cos(spark.userData.angle) * radius,
        Math.sin(spark.userData.angle) * radius,
      )
      spark.material.opacity = Math.sin(t * PI) * 0.6
    }

    const railOpen = smoothstep(0.3, 0.96, e)
    const railFan = smoothstep(0.35, 1, e)
    for (let i = 0; i < this.railProngs.length; i += 1) {
      const prong = this.railProngs[i]
      const fan = railFan
      // Hinge at the left end: the muzzle end swings radially outward while
      // the base point stays fixed against the pentagonal yoke.
      prong.hinge.rotation.z = 0.24 * fan
      for (const shell of prong.shells) {
        shell.front.position.x = shell.baseFront + 0.7 * railOpen
        shell.front.position.y = shell.baseY + 0.34 * railOpen
        shell.rear.position.x = shell.baseRear - 0.4 * railOpen
        shell.rear.position.y = shell.baseY + 0.22 * railOpen
        shell.front.rotation.z = 0.055 * railOpen
        shell.rear.rotation.z = -0.035 * railOpen
      }
    }
    for (const frame of this.railSupports) {
      const span = Math.max(0, frame.x - 1.3)
      const follow = 1 + (span * Math.sin(0.24) + 0.2) * railFan / 2.38
      frame.group.scale.y = follow
      frame.group.scale.z = follow
    }
    for (const pulse of this.railPulses) {
      const t = (time * pulse.speed + pulse.offset) % 1
      pulse.sprite.position.x = 1.75 + t * 6.9
      pulse.sprite.material.opacity = railOpen * Math.sin(t * PI) * 0.8
    }
    for (const pulse of this.railAggregatePulses) {
      const t = (time * pulse.speed + pulse.offset) % 1
      pulse.sprite.position.x = 3.15 + t * 3.5
      pulse.sprite.material.opacity = 0.12 + railOpen * Math.sin(t * PI) * 0.55
    }
    this._updateEnergyLaunch(e, time)

    for (const panel of this.radiatorPanels) {
      const open = smoothstep(0.3, 1, e)
      panel.pivot.rotation.x = THREE.MathUtils.lerp(panel.base, panel.target, open)
      panel.pivot.rotation.z = panel.baseZ + (panel.targetZ - panel.baseZ) * open
    }

    for (const fin of this.finRoots) {
      const open = smoothstep(0.25, 1, e)
      fin.holder.position.y = 0.85 * open
      fin.holder.rotation.y = fin.twist * open
    }

    const pulse = 0.78 + Math.sin(time * 2.9) * 0.14 + Math.sin(time * 8.3) * 0.07
    const energyLevel = energy * (0.94 + Math.sin(time * 1.7) * 0.06)
    this.materials.glowCyan.opacity = 0.76 + Math.sin(time * 3.4) * 0.17
    this.materials.glowPink.opacity = 0.72 + Math.sin(time * 3.05 + 1.2) * 0.2
    this.materials.glowWhite.opacity = 0.7 + Math.sin(time * 4.1) * 0.12
    this.materials.bladeEdge.opacity = 0.65 + Math.sin(time * 2.2) * 0.18
    this.coreLight.intensity = 1.35 * energyLevel + Math.sin(time * 7) * 0.24
    this.coreHalo.material.opacity = 0.24 + Math.sin(time * 2.7) * 0.07
    this.coreHalloSprite.scale.setScalar(2.9 + Math.sin(time * 2.2) * 0.18)
    this.coreSphere.scale.setScalar(0.96 + Math.sin(time * 3.6) * 0.04)

    for (let i = 0; i < this.nodeSprites.length; i += 1) {
      const node = this.nodeSprites[i]
      node.material.opacity = 0.48 + Math.sin(time * (2.2 + (i % 5) * 0.21) + i * 1.31) * 0.25
    }
    for (let i = 0; i < this.pinkLights.length; i += 1) {
      const light = this.pinkLights[i]
      light.intensity = 1.3 + Math.sin(time * 2.4 + i * 1.8) * 0.55
    }

    for (const pulseObj of this.cablePulses) {
      const t = (time * pulseObj.speed + pulseObj.offset) % 1
      pulseObj.sprite.position.copy(pulseObj.curve.getPointAt(t))
      pulseObj.sprite.material.opacity = 0.25 + Math.sin(t * PI) * 0.55
    }

    const stabilizerOpen = smoothstep(0.28, 0.92, e)
    const springT = smoothstep(0.3, 0.98, e)
    const spring = 1 - Math.exp(-3.6 * springT) * Math.cos(5.4 * springT)
    for (const half of this.hexHalves) {
      // Rotate inside the ring plane, around the craft's longitudinal axis.
      half.group.rotation.x = half.dir * half.openAngle * stabilizerOpen
      const gap = half.closedGap + (half.openGap - half.closedGap) * spring
      for (const layer of half.layers) {
        layer.group.position.x = layer.sign * gap
      }
      for (const guide of half.guides) {
        for (const side of guide.rods) {
          const len = Math.max(0.008, gap - 0.23)
          const split = len * 0.55
          side.outer.scale.x = Math.max(0.008, split)
          side.outer.position.x = side.dir * (0.23 + split * 0.5)
          side.inner.scale.x = Math.max(0.008, len - split)
          side.inner.position.x = side.dir * (0.23 + split + (len - split) * 0.5)
          side.midCollar.position.x = side.dir * (0.23 + split)
          side.endCollar.position.x = side.dir * (0.23 + len)
        }
      }
    }
    const pipePower = smoothstep(0.52, 0.98, e)
    if (this.cradlePipeCoreMat) {
      this.cradlePipeCoreMat.opacity = 0.03 + pipePower * 0.7 * (0.82 + Math.sin(time * 5.1) * 0.13)
    }
    for (const pipe of this.cradlePipes) {
      for (const pulseObj of pipe.pulses) {
        const t = (time * pulseObj.speed + pulseObj.phase) % 1
        pulseObj.sprite.position.set(-0.52 - t * 2.25, pipe.radius, 0)
        pulseObj.sprite.material.opacity = pipePower * Math.sin(t * PI) * 0.8
      }
      pipe.endGlow.material.opacity = 0.12 + pipePower * 0.62
    }
    for (const muzzle of this.plasmaMuzzles) {
      muzzle.material.opacity = 0.32 + Math.sin(time * 3.7) * 0.12 + pipePower * 0.16
    }

    for (const beacon of this.beacons) {
      const phase = (time * (0.7 + (beacon.userData.speed || 0.8)) + (beacon.userData.phase || 0)) % 1
      beacon.material.opacity = phase < 0.08 ? 1 : 0.12 + Math.sin(time * 2.1) * 0.05
    }

    this.root.position.y = 0.18 + Math.sin(time * 0.45) * 0.035
    this.root.rotation.z = 0.075 + Math.sin(time * 0.33) * 0.005
    if (this.plasmaRing) {
      if (this.plasmaRingTween) {
        const tween = this.plasmaRingTween
        const progress = clamp01((performance.now() * 0.001 - tween.start) / tween.duration)
        const eased = progress * progress * (3 - 2 * progress)
        this.plasmaRingRotation = THREE.MathUtils.lerp(tween.from, tween.to, eased)
        this.plasmaRing.rotation.x = this.plasmaRingRotation
        if (progress >= 1) this.plasmaRingTween = null
      } else {
        this.plasmaRing.rotation.x = this.plasmaRingRotation
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SATELLITE BUS
  // ---------------------------------------------------------------------------

  _buildBus(parent) {
    const m = this.materials
    const shellMat = m.white.clone()
    shellMat.flatShading = true
    shellMat.needsUpdate = true
    const navyFlat = m.navy.clone()
    navyFlat.flatShading = true
    navyFlat.needsUpdate = true

    const hull = cylinderX(1.28, 1.28, 3.1, shellMat, -4.78, 0, 0, 8)
    hull.rotation.x = PI / 8
    parent.add(hull)

    // Dark inner spine visible through the armor seams.
    parent.add(cylinderX(1.05, 1.05, 3.5, m.ink, -4.8, 0, 0, 16))
    parent.add(cylinderX(0.92, 0.92, 3.72, m.gunmetal, -4.78, 0, 0, 16))

    // Octagonal formers.
    for (const x of [-6.34, -5.92, -5.28, -4.6, -3.93, -3.31]) {
      const ring = octRing(x === -6.34 || x === -3.31 ? 1.38 : 1.35, 1.19, 0.075, x === -5.28 ? m.titanium : m.gunmetal, x)
      ring.rotation.x = PI / 8
      parent.add(ring)
    }
    for (const x of [-5.56, -4.94, -4.28, -3.62]) {
      const ring = octRing(1.31, 1.23, 0.032, m.ink, x)
      ring.rotation.x = PI / 8
      parent.add(ring)
    }

    // Longitudinal structural ribs.
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU + PI / 8
      const rib = boxMesh(2.94, 0.09, 0.12, i % 2 ? m.ink : m.gunmetal, -4.78, Math.cos(a) * 1.29, Math.sin(a) * 1.29)
      rib.rotation.x = a
      parent.add(rib)
    }

    // Armor "cheek" plates.
    for (const side of [1, -1]) {
      const plate = boxMesh(2.08, 0.46, 0.14, m.whiteSilk, -4.88, 0.58, side * 1.28)
      plate.rotation.z = side * 0.02
      parent.add(plate)
      parent.add(boxMesh(1.88, 0.035, 0.15, m.titanium, -4.88, 0.33, side * 1.305))
      const lower = boxMesh(1.7, 0.27, 0.13, m.ivory, -4.67, -0.82, side * 1.28)
      parent.add(lower)
      parent.add(boxMesh(0.12, 0.16, 0.14, m.ink, -5.58, -0.82, side * 1.305))
      parent.add(boxMesh(0.12, 0.16, 0.14, m.ink, -3.75, -0.82, side * 1.305))
    }

    // Blue photon-cell bands on four faces.
    const cellPanels = [
      [-4.88, 0.02, 1.295, 0, 0, 0],
      [-4.88, 0.02, -1.295, 0, PI, 0],
      [-4.88, 1.292, 0.02, 0, HALF_PI, HALF_PI],
      [-4.88, -1.292, 0.02, 0, -HALF_PI, HALF_PI],
    ]
    for (const [x, y, z, ry, rx] of cellPanels) {
      const panel = boxMesh(1.26, 0.56, 0.026, m.solar, x, y, z)
      panel.rotation.set(rx, ry, 0)
      parent.add(panel)
      const frame = boxMesh(1.45, 0.68, 0.04, m.ink, x, y, z)
      frame.rotation.set(rx, ry, 0)
      parent.add(frame)
    }

    // Thin luminous spine strips and vents.
    for (const side of [1, -1]) {
      parent.add(boxMesh(1.5, 0.035, 0.045, m.glowCyan, -4.87, 0.91, side * 1.284))
      parent.add(boxMesh(0.72, 0.025, 0.05, m.glowBlue, -5.73, 0.98, side * 1.25))
      for (let i = 0; i < 4; i += 1) {
        parent.add(boxMesh(0.16, 0.035, 0.045, m.chrome, -5.38 + i * 0.25, 0.71, side * 1.292))
      }
    }

    // Mechanical side pods.
    for (const side of [1, -1]) {
      const pod = new THREE.Group()
      pod.position.set(-4.93, 0.3, side * 1.43)
      parent.add(pod)
      pod.add(boxMesh(1.13, 0.55, 0.48, m.whiteSilk))
      pod.add(boxMesh(0.88, 0.21, 0.49, navyFlat, 0.05, 0.19, side * 0.01))
      pod.add(boxMesh(0.58, 0.11, 0.5, m.glowBlue, -0.14, 0.01, 0))
      pod.add(boxMesh(0.36, 0.06, 0.51, m.ink, 0.34, -0.08, 0))
      const lens = cylinderX(0.12, 0.12, 0.06, m.glowCyan, 0.52, -0.15, side * 0.1, 16)
      lens.rotation.x = side * 0.2
      pod.add(lens)
      for (const px of [-0.42, 0.36]) {
        for (const pz of [-0.17, 0.17]) {
          pod.add(cylinderX(0.035, 0.035, 0.025, m.chrome, px, 0.285, pz, 8))
        }
      }
      pod.add(boxMesh(0.18, 0.42, 0.12, m.titanium, -0.58, -0.03, -side * 0.09))
    }

    // Bracket pods on dorsal / ventral faces.
    for (const side of [1, -1]) {
      const saddle = new THREE.Group()
      saddle.position.set(-4.82, side * 1.38, 0)
      parent.add(saddle)
      saddle.add(boxMesh(1.2, 0.22, 0.68, m.ivory))
      saddle.add(boxMesh(0.7, 0.18, 0.46, m.navy, 0.1, side * 0.18, 0))
      saddle.add(boxMesh(0.36, 0.06, 0.52, m.glowBlue, -0.36, side * 0.04, 0))
      saddle.add(boxMesh(0.15, 0.25, 0.72, m.ink, -0.67, side * 0.03, 0))
      if (side > 0) {
        const label = labelDecal('EPR', 'ORBITAL LAUNCHER / 07', 'LS-07 路 DEEP SPACE DIV.', { width: 1.8, height: 0.68, tone: 'light' })
        label.position.set(-4.78, 0.4, 1.33)
        label.rotation.z = 0
        parent.add(label)
      }
    }

    // Top service bridge and utility pipes.
    const bridge = new THREE.Group()
    bridge.position.set(-4.76, 1.02, 0.46)
    parent.add(bridge)
    bridge.add(boxMesh(1.7, 0.08, 0.28, m.gunmetal))
    for (let i = 0; i < 5; i += 1) {
      bridge.add(boxMesh(0.08, 0.03, 0.36, m.ink, -0.62 + i * 0.31, 0.06, 0))
    }
    for (const z of [-0.36, 0.36]) {
      parent.add(cylinderX(0.045, 0.045, 2.5, m.chrome, -4.98, 1.05, z, 8))
      for (let i = 0; i < 3; i += 1) {
        parent.add(cylinderX(0.075, 0.075, 0.09, m.ink, -5.65 + i * 0.72, 1.05, z, 8))
      }
    }

    // Rear service band and gold MLI boxes.
    parent.add(octRing(1.42, 1.13, 0.18, m.ink, -6.21))
    parent.add(octRing(1.34, 1.18, 0.1, m.hazard, -6.05))
    for (const [y, z] of [
      [0.82, 0.72],
      [-0.78, -0.72],
      [0.32, -0.92],
    ]) {
      parent.add(boxMesh(0.52, 0.28, 0.34, m.copper, -5.92, y, z))
      parent.add(boxMesh(0.56, 0.05, 0.38, m.ink, -5.92, y + 0.16, z))
    }

    // Front collar.
    parent.add(cylinderX(1.15, 1.26, 0.24, m.ink, -3.22))
    parent.add(octRing(1.3, 1.09, 0.12, m.titanium, -3.12))
    parent.add(cylinderX(0.92, 0.92, 0.34, m.gunmetal, -3.02))
    parent.add(torusX(0.94, 0.045, m.glowCyan, -2.92))
    boltRing(parent, m.titanium, 1.13, 20, -3.17, 0.027)

    // Small utility markings.
    const warning = boxMesh(0.6, 0.018, 0.08, m.hazard, -5.7, -1.04, 0.94)
    warning.rotation.x = 0.32
    parent.add(warning)

    this.busLabelAnchor = new THREE.Vector3(-4.75, 0.5, 1.33)
  }

  // ---------------------------------------------------------------------------
  // ATTITUDE FINS
  // ---------------------------------------------------------------------------

  _buildFins(parent) {
    const m = this.materials
    const outlay = [
      { angle: PI * 0.22, light: 0xff5f78, twist: -0.1 },
      { angle: PI * 0.78, light: 0xffa35a, twist: 0.1 },
      { angle: PI * 1.22, light: 0x7defff, twist: 0.12 },
      { angle: PI * 1.78, light: 0xff5f78, twist: -0.12 },
    ]
    outlay.forEach((conf, index) => {
      const root = new THREE.Group()
      root.position.set(-4.54, 0, 0)
      root.rotation.x = conf.angle
      parent.add(root)

      const holder = new THREE.Group()
      root.add(holder)

      const shape = [
        [-0.58, 1.04],
        [0.68, 1.02],
        [0.92, 1.62],
        [0.62, 2.44],
        [0.16, 3.22],
        [0.02, 2.64],
        [-0.2, 2.2],
        [-0.76, 1.64],
      ]
      const fin = plateXY(shape, 0.13, m.navy, 0.025)
      holder.add(fin)

      const upper = plateXY(
        [
          [-0.38, 1.55],
          [0.45, 1.48],
          [0.55, 1.92],
          [0.25, 2.24],
          [-0.18, 2.05],
        ],
        0.16,
        m.whiteSilk,
        0.018,
      )
      upper.position.z = 0.09
      holder.add(upper)

      const lens = plateXY(
        [
          [-0.28, 1.74],
          [0.25, 1.66],
          [0.28, 1.94],
          [0.06, 2.08],
          [-0.22, 2.01],
        ],
        0.17,
        m.glowBlue,
        0.01,
      )
      lens.position.z = 0.17
      holder.add(lens)

      // Wing spar and leading-edge highlight.
      const spar = boxMesh(1.25, 0.075, 0.18, m.titanium, 0.04, 1.8, 0)
      spar.rotation.z = -0.23
      holder.add(spar)
      const highlight = boxMesh(0.92, 0.02, 0.06, m.glowCyan, 0.32, 2.22, 0.15)
      highlight.rotation.z = -0.34
      holder.add(highlight)

      holder.add(boxMesh(0.22, 0.25, 0.28, m.ink, -0.12, 1.13, 0))
      holder.add(boxMesh(0.06, 0.7, 0.06, m.chrome, -0.3, 1.55, 0.18))
      const beacon = glowSprite(m.maps.glowPinkMap, conf.light, 0.36, 0.9)
      beacon.position.set(0.33, 3.08, 0.06)
      beacon.userData.beacon = true
      beacon.userData.speed = 0.54 + index * 0.1
      holder.add(beacon)

      // Tiny navigation lamp on the opposite edge.
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), m.glowWhite)
      tip.position.set(0.18, 3.2, 0)
      holder.add(tip)

      this.finRoots.push({
        root,
        holder,
        twist: conf.twist,
        baseRot: conf.angle,
      })
    })
  }

  // ---------------------------------------------------------------------------
  // RADIATOR WINGS
  // ---------------------------------------------------------------------------

  _buildRadiators(parent) {
    const m = this.materials
    const configs = [
      { side: 1, x: -5.12, z: 0.9, base: -0.32, target: 0.18, baseZ: 0.08, targetZ: 0.34 },
      { side: -1, x: -5.12, z: -0.9, base: 0.32, target: -0.18, baseZ: -0.08, targetZ: -0.34 },
    ]
    for (const conf of configs) {
      const pivot = new THREE.Group()
      pivot.position.set(conf.x, 0.18, conf.z)
      parent.add(pivot)

      const panel = new THREE.Group()
      panel.position.set(-0.2, 0, conf.side * 1.12)
      pivot.add(panel)

      const face = boxMesh(2.1, 0.075, 1.8, m.radiator)
      panel.add(face)
      const frame = new THREE.Group()
      panel.add(frame)
      const edgeMat = m.titanium
      frame.add(boxMesh(2.22, 0.08, 0.055, edgeMat, 0, 0.02, 0.9))
      frame.add(boxMesh(2.22, 0.08, 0.055, edgeMat, 0, 0.02, -0.9))
      frame.add(boxMesh(0.055, 0.08, 1.85, edgeMat, 1.08, 0.02, 0))
      frame.add(boxMesh(0.055, 0.08, 1.85, edgeMat, -1.08, 0.02, 0))
      frame.add(boxMesh(1.55, 0.06, 0.035, m.glowBlue, 0, 0.065, 0.71))
      frame.add(boxMesh(1.95, 0.02, 0.09, m.ink, 0, 0.055, 0))
      for (let i = 0; i < 6; i += 1) {
        frame.add(boxMesh(0.04, 0.065, 1.55, i === 2 ? m.glowCyan : m.titanium, -0.78 + i * 0.31, 0.055, 0.08))
      }
      // Hinge and pistons.
      pivot.add(cylinderX(0.14, 0.14, 0.42, m.gunmetal, 0, 0, 0.12, 16))
      pivot.add(boxMesh(0.34, 0.12, 0.35, m.ink, 0, 0, 0))
      const piston = cylinderBetween(
        new THREE.Vector3(conf.x + 0.2, 0.2, conf.z * 0.8),
        new THREE.Vector3(conf.x + 0.2, 0.32, conf.z + conf.side * 0.86),
        0.035,
        m.chrome,
        8,
      )
      // Piston is already in bus space; add to parent rather than pivot.
      parent.add(piston)
      const strip = boxMesh(1.4, 0.02, 0.08, conf.side > 0 ? m.glowCyan : m.glowBlue, -0.25, 0.07, conf.side * 1.72)
      panel.add(strip)

      this.radiatorPanels.push({
        pivot,
        face,
        base: conf.base,
        target: conf.target,
        baseZ: conf.baseZ,
        targetZ: conf.targetZ,
        side: conf.side,
      })
    }

    // Small centerline thermal plate bridge.
    const bridge = boxMesh(1.6, 0.12, 0.48, m.whiteSilk, -5.18, 0.36, 0)
    parent.add(bridge)
    parent.add(boxMesh(0.9, 0.04, 0.18, m.glowBlue, -5.18, 0.44, 0))
    for (const side of [1, -1]) {
      parent.add(boxMesh(0.26, 0.22, 0.42, m.ink, -5.6, 0.2, side * 0.73))
    }
  }

  // ---------------------------------------------------------------------------
  // ORBITAL THRUSTER
  // ---------------------------------------------------------------------------

  _buildThruster(parent) {
    const m = this.materials
    const nozzleMat = m.gunmetal.clone()
    nozzleMat.side = THREE.DoubleSide
    const nozzle = cylinderX(0.54, 0.96, 0.92, nozzleMat, -6.85, 0, 0, 32, true)
    parent.add(nozzle)
    parent.add(torusX(0.96, 0.065, m.titanium, -7.31, 10, 64))
    parent.add(torusX(0.77, 0.055, m.ink, -7.12, 8, 48))
    parent.add(cylinderX(0.54, 0.54, 0.18, m.ink, -6.37))
    parent.add(cylinderX(0.62, 0.62, 0.24, m.hazard, -6.23))

    const innerGlowMat = m.glowBlue.clone()
    innerGlowMat.opacity = 0.28
    const inner = cylinderX(0.3, 0.88, 0.82, innerGlowMat, -6.9, 0, 0, 24, true)
    inner.material.side = THREE.DoubleSide
    parent.add(inner)
    parent.add(cylinderX(0.69, 0.69, 0.03, m.glowCyan, -7.28, 0, 0, 24))
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.74, 3.1, 28, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x5feaff,
        transparent: true,
        opacity: 0.075,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    plume.rotation.z = HALF_PI
    plume.position.set(-8.85, 0, 0)
    parent.add(plume)
    this.plume = plume

    // Gimbal truss.
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + PI / 4
      const p1 = new THREE.Vector3(-6.24, Math.cos(a) * 0.65, Math.sin(a) * 0.65)
      const p2 = new THREE.Vector3(-6.7, Math.cos(a) * 0.9, Math.sin(a) * 0.9)
      parent.add(cylinderBetween(p1, p2, 0.055, m.titanium, 8))
      parent.add(boxMesh(0.24, 0.12, 0.12, m.ink, -6.35, Math.cos(a) * 0.73, Math.sin(a) * 0.73).rotateX(a))
    }

    // Vernier thrusters around the aft ring.
    for (let i = 0; i < 4; i += 1) {
      const a = PI / 4 + (i / 4) * TAU
      const cluster = new THREE.Group()
      cluster.position.set(-6.02, Math.cos(a) * 1.05, Math.sin(a) * 1.05)
      cluster.rotation.x = a
      parent.add(cluster)
      const cone = cylinderX(0.12, 0.2, 0.3, m.ink, -0.12, 0, 0, 12, true)
      cluster.add(cone)
      cluster.add(cylinderX(0.13, 0.13, 0.03, m.glowWarm, -0.27, 0, 0, 12))
      cluster.add(boxMesh(0.28, 0.2, 0.16, m.ivory, 0.14, 0, 0))
      const beacon = glowSprite(m.maps.glowWarmMap, 0xff9f5c, 0.25, 0.5)
      beacon.position.set(-0.3, 0, 0)
      beacon.userData.beacon = true
      cluster.add(beacon)
    }

    this._buildEnergyPort(parent)
    this._buildEnergyClaws(parent)

    // Aft sensor mast.
    parent.add(cylinderBetween(new THREE.Vector3(-5.92, 1.15, -0.32), new THREE.Vector3(-6.2, 1.72, -0.5), 0.035, m.chrome, 8))
    parent.add(boxMesh(0.18, 0.09, 0.09, m.ink, -6.2, 1.74, -0.5))
    const aftLamp = glowSprite(m.maps.glowPinkMap, 0xff567f, 0.32, 0.7)
    aftLamp.position.set(-6.31, 1.75, -0.52)
    aftLamp.userData.beacon = true
    parent.add(aftLamp)

    parent.add(octRing(1.1, 0.79, 0.11, m.titanium, -6.18))
  }

  _buildEnergyPort(parent) {
    const m = this.materials

    // A richer, layered energy column replaces the previous single faint cone.
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x56e8ff,
      transparent: true,
      opacity: 0.075,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.78, 3.15, 32, 1, true), outerMat)
    outer.rotation.z = HALF_PI
    outer.position.x = -8.9
    parent.add(outer)
    this.energyOuter = outer

    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.4, 3.4, 4.2),
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.3, 24, 1, true), coreMat)
    core.rotation.z = HALF_PI
    core.position.x = -8.18
    parent.add(core)
    this.energyCore = core

    const filamentMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.9, 4.4, 4.8),
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const filament = cylinderX(0.035, 0.07, 2.2, filamentMat, -8.25, 0, 0, 8)
    parent.add(filament)
    this.energyFilament = filament

    // Nozzle-side emitter rings with graduated diameters.
    const ringSpecs = [
      [-7.42, 0.62, m.glowCyan],
      [-7.86, 0.54, m.titanium],
      [-8.3, 0.45, m.glowBlue],
      [-8.74, 0.34, m.glowPink],
      [-9.16, 0.24, m.glowCyan],
    ]
    for (let i = 0; i < ringSpecs.length; i += 1) {
      const [x, radius, material] = ringSpecs[i]
      const ring = torusX(radius, 0.018, material, x, 6, 48)
      ring.userData.baseScale = 1
      ring.userData.phase = i * 1.2
      parent.add(ring)
      this.energyRings.push(ring)
    }

    // Soft emitter bloom.
    const glow = glowSprite(m.maps.glowCyanMap, 0x7af5ff, 1.8, 0.24)
    glow.position.set(-7.9, 0, 0)
    parent.add(glow)
    this.energyHalo = glow

    const portLight = new THREE.PointLight(0x61efff, 2.5, 5.2, 2)
    portLight.position.set(-7.7, 0.15, 0)
    parent.add(portLight)
    this.energyPortLight = portLight

    // Fast-moving sparks along the transfer column.
    for (let i = 0; i < 9; i += 1) {
      const spark = glowSprite(
        m.maps.glowCyanMap,
        i % 3 === 0 ? 0xff79aa : 0x8bf8ff,
        0.12 + (i % 4) * 0.035,
        0.42,
      )
      const phase = i / 9
      spark.userData.phase = phase
      spark.userData.angle = (i * 2.39) % TAU
      spark.userData.radius = 0.18 + (i % 3) * 0.16
      spark.userData.speed = 0.07 + (i % 4) * 0.017
      parent.add(spark)
      this.energySparks.push(spark)
    }

    // Structural collar that receives the three articulated clamps.
    parent.add(torusX(0.98, 0.045, m.titanium, -6.96, 10, 64))
    parent.add(torusX(0.86, 0.022, m.glowCyan, -6.9, 6, 56))
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * TAU
      const pad = boxMesh(0.24, 0.2, 0.26, m.whiteSilk, -6.94, Math.cos(a) * 0.9, Math.sin(a) * 0.9)
      pad.rotation.x = a
      parent.add(pad)
      parent.add(boxMesh(0.1, 0.08, 0.12, m.glowCyan, -6.86, Math.cos(a) * 0.98, Math.sin(a) * 0.98))
    }
  }

  _buildEnergyClaws(parent) {
    const m = this.materials
    const lengths = [1.7, 1.65, 1.55]
    const widths = [
      { root: 0.35, tip: 0.23 },
      { root: 0.3, tip: 0.19 },
      { root: 0.25, tip: 0.1 },
    ]
    const closedAngles = [1.25, 0.5, 0.6]
    const openAngles = [0.035, -0.02, 0.02]

    const addHinge = (group, radius = 0.155, length = 0.46) => {
      const block = boxMesh(radius * 2.5, radius * 2.25, length * 1.1, m.gunmetal, 0, 0, 0)
      group.add(block)
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 20), m.ink)
      pin.rotation.x = HALF_PI
      group.add(pin)
      for (const z of [-length * 0.56, length * 0.56]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.66, radius * 0.66, 0.035, 14), m.titanium)
        cap.rotation.x = HALF_PI
        cap.position.z = z
        group.add(cap)
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.25, 0.014, 5, 28), m.glowCyan)
      ring.position.z = length * 0.58
      group.add(ring)
    }

    const addSegment = (group, length, w0, w1, index) => {
      const midW = THREE.MathUtils.lerp(w0, w1, 0.52)
      const shape = [
        [-w0 * 0.48, 0.012],
        [-w0 * 0.6, length * 0.12],
        [-midW * 0.6, length * 0.56],
        [-w1 * 0.62, length * 0.87],
        [-w1 * 0.35, length * 0.985],
        [0, length * 1.025],
        [w1 * 0.35, length * 0.985],
        [w1 * 0.62, length * 0.87],
        [midW * 0.6, length * 0.56],
        [w0 * 0.6, length * 0.12],
        [w0 * 0.48, 0.012],
      ]
      const main = extrudedPlate(shape, 0.16, m.whiteSilk, { bevel: 0.014, segments: 1 })
      group.add(main)

      const inlayPoints = shape.map(([z, y]) => [z * 0.62, y])
      const inlay = extrudedPlate(inlayPoints, 0.045, m.navySilk, { bevel: 0.009, segments: 1 })
      inlay.position.x = 0.09
      group.add(inlay)

      group.add(cylinderY(0.055, 0.07, length * 0.9, m.gunmetal, 0, length * 0.46, 0, 8))
      for (const t of [0.17, 0.36, 0.55, 0.73, 0.88]) {
        const ribWidth = THREE.MathUtils.lerp(w0, w1, t) * 1.16
        group.add(boxMesh(0.2, 0.032, ribWidth, t === 0.55 ? m.titanium : m.ink, 0, length * t, 0))
        if (t === 0.36 || t === 0.73) {
          group.add(boxMesh(0.025, length * 0.11, 0.032, m.glowCyan, 0.095, length * (t + 0.045), ribWidth * 0.5))
        }
      }
      group.add(boxMesh(0.02, length * 0.48, 0.026, m.glowCyan, 0.095, length * 0.48, midW * 0.48))
      group.add(boxMesh(0.02, length * 0.34, 0.026, m.glowCyan, 0.095, length * 0.38, -midW * 0.48))
      const piston = cylinderY(0.024, 0.024, length * 0.56, m.chrome, 0.155, length * 0.42, -midW * 0.37, 8)
      group.add(piston)
      group.add(boxMesh(0.18, 0.14, w0 * 1.32, m.whiteSilk, 0, length * 0.035, 0))
      group.add(boxMesh(0.22, 0.07, w0 * 0.68, m.titanium, 0, length * 0.11, 0))

      // A small articulation lug at the far end gives the next joint a clean stop.
      group.add(boxMesh(0.22, 0.16, w1 * 1.55, m.gunmetal, 0, length * 0.975, 0))
      if (index === 2) {
        const talon = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28, 4, 1, false), m.ink)
        talon.position.y = length * 1.02 + 0.12
        group.add(talon)
        group.add(cylinderY(0.035, 0.018, 0.09, m.glowCyan, 0, length * 1.02 + 0.28, 0, 7))
      }
      return group
    }

    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * TAU
      const root = new THREE.Group()
      root.rotation.x = angle
      parent.add(root)

      const mount = new THREE.Group()
      mount.position.set(-6.9, 0.98, 0)
      root.add(mount)

      // Fixed base bracket and the first hinge.
      mount.add(boxMesh(0.48, 0.34, 0.5, m.whiteSilk, 0, -0.08, 0))
      mount.add(boxMesh(0.34, 0.28, 0.36, m.ink, 0, -0.2, 0))
      addHinge(mount, 0.17, 0.5)

      const shoulder = new THREE.Group()
      mount.add(shoulder)
      addSegment(shoulder, lengths[0], widths[0].root, widths[0].tip, 0)

      const elbow = new THREE.Group()
      elbow.position.y = lengths[0]
      shoulder.add(elbow)
      addHinge(elbow, 0.14, 0.42)
      addSegment(elbow, lengths[1], widths[1].root, widths[1].tip, 1)

      const wrist = new THREE.Group()
      wrist.position.y = lengths[1]
      elbow.add(wrist)
      addHinge(wrist, 0.12, 0.38)
      addSegment(wrist, lengths[2], widths[2].root, widths[2].tip, 2)

      const tipGlow = glowSprite(m.maps.glowCyanMap, 0x75f4ff, 0.42, 0.55)
      tipGlow.position.y = lengths[2] * 1.02 + 0.3
      wrist.add(tipGlow)
      this.nodeSprites.push(tipGlow)

      shoulder.rotation.z = closedAngles[0]
      elbow.rotation.z = closedAngles[1]
      wrist.rotation.z = closedAngles[2]

      this.energyClaws.push({
        root,
        mount,
        shoulder,
        elbow,
        wrist,
        closedAngles,
        openAngles,
        lengths,
        tipGlow,
      })
    }
  }

  // ---------------------------------------------------------------------------
  // GUIDANCE SENSOR
  // ---------------------------------------------------------------------------

  _buildSensor(parent) {
    const m = this.materials
    const mastBase = new THREE.Vector3(-2.86, 1.02, 0.34)
    parent.add(cylinderBetween(mastBase, new THREE.Vector3(-2.9, 1.66, 0.38), 0.075, m.gunmetal, 10))
    parent.add(cylinderY(0.2, 0.24, 0.22, m.ink, -2.9, 1.68, 0.38, 16))
    parent.add(torusX(0.22, 0.035, m.chrome, 0).rotateY(HALF_PI).translateX(-2.9).translateY(1.68).translateZ(0.38))
    const yoke = new THREE.Group()
    yoke.position.set(-2.9, 1.78, 0.38)
    yoke.rotation.z = -0.38
    yoke.rotation.x = -0.2
    parent.add(yoke)
    yoke.add(cylinderX(0.17, 0.2, 0.45, m.titanium, 0, 0, 0, 16))
    yoke.add(cylinderX(0.11, 0.11, 0.22, m.ink, 0.2, 0, 0, 16))

    // Parabolic dish.
    const dishGroup = new THREE.Group()
    dishGroup.rotation.z = -0.72
    dishGroup.rotation.x = 0.24
    dishGroup.position.set(0.34, 0, 0)
    yoke.add(dishGroup)
    const lathePoints = []
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10
      lathePoints.push(new THREE.Vector2(0.05 + t * 0.68, t * t * 0.2))
    }
    const dishGeo = new THREE.LatheGeometry(lathePoints, 28)
    const dishMat = m.ceramic.clone()
    dishMat.side = THREE.DoubleSide
    dishMat.color.setHex(0xe8f4fb)
    const dish = new THREE.Mesh(dishGeo, dishMat)
    dish.rotation.x = HALF_PI
    dishGroup.add(dish)
    const dishInner = new THREE.Mesh(dishGeo, m.glowBlue)
    dishInner.scale.setScalar(0.88)
    dishInner.position.y = 0.012
    dishInner.material.side = THREE.DoubleSide
    dishGroup.add(dishInner)
    dishGroup.add(cylinderY(0.03, 0.03, 0.4, m.chrome, 0, 0.28, 0, 8))
    const feed = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), m.glowWarm)
    feed.position.y = 0.49
    dishGroup.add(feed)
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU
      dishGroup.add(
        cylinderBetween(
          new THREE.Vector3(Math.cos(a) * 0.64, 0.2, Math.sin(a) * 0.64),
          new THREE.Vector3(Math.cos(a) * 0.08, 0.42, Math.sin(a) * 0.08),
          0.012,
          m.chrome,
          5,
        ),
      )
    }

    // Optical targeting cluster below the dish.
    const turret = new THREE.Group()
    turret.position.set(-2.92, 1.34, -0.42)
    parent.add(turret)
    turret.add(cylinderY(0.24, 0.3, 0.25, m.ink, 0, -0.03, 0, 16))
    turret.add(boxMesh(0.4, 0.22, 0.46, m.whiteSilk, 0, 0.09, 0))
    for (let i = -1; i <= 1; i += 2) {
      const eye = cylinderX(0.1, 0.13, 0.15, m.gunmetal, 0.23, 0.07, i * 0.13, 12)
      turret.add(eye)
      const lens = cylinderX(0.07, 0.07, 0.02, m.glowWarm, 0.315, 0.07, i * 0.13, 12)
      turret.add(lens)
    }
    const scanner = glowSprite(m.maps.glowWarmMap, 0xffc177, 0.26, 0.55)
    scanner.position.set(0.3, 0.13, 0)
    scanner.userData.beacon = true
    turret.add(scanner)

    // Fine star-tracker barrels.
    for (let i = 0; i < 2; i += 1) {
      const a = i * PI
      const barrel = cylinderX(0.075, 0.1, 0.3, m.titanium, -2.68, 1.52, a === 0 ? 0.26 : -0.22, 12)
      parent.add(barrel)
      parent.add(cylinderX(0.042, 0.042, 0.015, m.glowCyan, -2.5, 1.52, a === 0 ? 0.26 : -0.22, 12))
    }

    parent.add(octRing(0.39, 0.27, 0.1, m.titanium, -2.74).rotateY(-0.16))
  }

  // ---------------------------------------------------------------------------
  // ARC CRADLE + UMBILICALS
  // ---------------------------------------------------------------------------

  _buildCradle(parent) {
    const m = this.materials

    // Central articulated spine.
    parent.add(cylinderX(0.72, 0.9, 0.72, m.gunmetal, -2.68))
    parent.add(cylinderX(0.56, 0.56, 0.92, m.ink, -2.04))
    parent.add(cylinderX(0.46, 0.62, 0.7, m.titanium, -1.52))
    parent.add(circleRing(0.92, 0.76, 0.12, m.ink, -2.36))
    parent.add(torusX(0.72, 0.045, m.glowCyan, -2.16))
    parent.add(torusX(0.58, 0.035, m.chrome, -1.87))
    parent.add(torusX(0.47, 0.035, m.glowPink, -1.23))

    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + PI / 4
      const p1 = new THREE.Vector3(-2.96, Math.cos(a) * 0.92, Math.sin(a) * 0.92)
      const p2 = new THREE.Vector3(-1.18, Math.cos(a) * 0.44, Math.sin(a) * 0.44)
      parent.add(cylinderBetween(p1, p2, 0.04, m.titanium, 7))
      parent.add(boxMesh(0.48, 0.12, 0.12, m.whiteSilk, -2.56, Math.cos(a) * 0.79, Math.sin(a) * 0.79).rotateX(a))
    }

    // Closed hexagonal stabilizer and the larger plasma weapon ring.
    this._buildHexStabilizer(parent)
    this._buildCradlePlasmaRing(parent)
    this._buildCradleEnergyPipes(parent)

    // Small bracket details at the back.
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU
      parent.add(cylinderX(0.035, 0.035, 0.5, m.chrome, -2.28, Math.cos(a) * 0.84, Math.sin(a) * 0.84, 6))
    }
  }

  _buildHexStabilizer(parent) {
    const m = this.materials
    const R = 2.15
    const H = R * Math.sqrt(3) * 0.5
    const ringX = -0.72
    const pts = [
      [0, R],
      [H, R * 0.5],
      [H, -R * 0.5],
      [0, -R],
      [-H, -R * 0.5],
      [-H, R * 0.5],
    ]
    const halves = [
      { idx: [0, 1, 2, 3], dir: 1 },
      { idx: [0, 5, 4, 3], dir: -1 },
    ]

    // Hinge axle through the shared left/right vertices. The two half-hoops
    // rotate around this Z line when the station expands.
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, R * 2.06, 10), m.chrome)
    axle.rotation.x = HALF_PI
    axle.position.set(ringX, 0, 0)
    parent.add(axle)
    for (const side of [-1, 1]) {
      const z = R * side
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 14), m.ink)
      housing.rotation.x = HALF_PI
      housing.position.set(ringX, 0, z)
      parent.add(housing)
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.045, 12), m.titanium)
      cap.rotation.x = HALF_PI
      cap.position.set(ringX, 0, z + side * 0.18)
      parent.add(cap)
      parent.add(boxMesh(0.34, 0.2, 0.34, m.whiteSilk, ringX - 0.02, 0, z).rotateX(0))
      parent.add(boxMesh(0.12, 0.065, 0.12, m.glowCyan, ringX - 0.2, 0, z))
    }

    // Central bearing collar and two fixed support arms back to the spine.
    parent.add(torusX(0.62, 0.045, m.titanium, ringX, 8, 56))
    parent.add(torusX(0.42, 0.025, m.glowCyan, ringX, 6, 40))
    for (const side of [-1, 1]) {
      parent.add(cylinderBetween(new THREE.Vector3(-2.06, 0, side * 0.32), new THREE.Vector3(ringX, 0, side * 0.62), 0.04, m.titanium, 8))
      parent.add(cylinderBetween(new THREE.Vector3(-1.82, 0, 0), new THREE.Vector3(ringX, 0, side * R * 0.74), 0.032, m.titanium, 8))
    }

    const makeTelescopingGuide = (host, y, z, w, h, guides) => {
      // Fixed central sleeve plus two concentric sliding stages on each side.
      host.add(cylinderX(w * 1.12, w * 1.12, 0.5, m.gunmetal, 0, y, z, 10))
      const rods = []
      for (const dir of [-1, 1]) {
        const outer = cylinderX(w * 0.68, w * 0.68, 1, m.titanium, 0, y, z, 8)
        const inner = cylinderX(w * 0.4, w * 0.4, 1, m.chrome, 0, y, z, 8)
        const midCollar = cylinderX(w * 0.86, w * 0.86, 0.09, m.whiteSilk, 0, y, z, 8)
        const endCollar = cylinderX(w * 0.92, w * 0.92, 0.12, m.glowCyan, 0, y, z, 8)
        outer.scale.x = 0.01
        inner.scale.x = 0.01
        host.add(outer)
        host.add(inner)
        host.add(midCollar)
        host.add(endCollar)
        rods.push({ dir, outer, inner, midCollar, endCollar })
      }
      guides.push({ rods })
    }

    for (const def of halves) {
      const group = new THREE.Group()
      group.position.x = ringX
      parent.add(group)
      const guides = []

      const layers = []
      for (const layerSign of [-1, 1]) {
        const layerGroup = new THREE.Group()
        layerGroup.position.x = layerSign * 0.25
        group.add(layerGroup)
        layers.push({ group: layerGroup, sign: layerSign })
        for (let side = 0; side < 3; side += 1) {
          const p1 = pts[def.idx[side]]
          const p2 = pts[def.idx[side + 1]]
          layerGroup.add(cylinderBetween(
            new THREE.Vector3(0, p1[0], p1[1]),
            new THREE.Vector3(0, p2[0], p2[1]),
            0.17,
            m.whiteSilk,
            6,
          ))
          layerGroup.add(cylinderBetween(
            new THREE.Vector3(0, p1[0] * 0.91, p1[1] * 0.91),
            new THREE.Vector3(0, p2[0] * 0.91, p2[1] * 0.91),
            0.064,
            m.ink,
            5,
          ))
        }
        for (const vi of def.idx) {
          const [y, z] = pts[vi]
          layerGroup.add(boxMesh(0.2, 0.11, 0.14, m.titanium, 0, y, z))
          layerGroup.add(boxMesh(0.08, 0.035, 0.06, m.glowCyan, 0.12, y, z))
        }
      }

      for (let side = 0; side < 3; side += 1) {
        const p1 = pts[def.idx[side]]
        const p2 = pts[def.idx[side + 1]]
        group.add(cylinderBetween(
          new THREE.Vector3(0, p1[0] * 0.93, p1[1] * 0.93),
          new THREE.Vector3(0, p2[0] * 0.93, p2[1] * 0.93),
          0.02,
          m.glowCyan,
          4,
        ))
        const my = (p1[0] + p2[0]) * 0.5
        const mz = (p1[1] + p2[1]) * 0.5
        group.add(boxMesh(0.42, 0.12, 0.2, m.titanium, 0, my, mz))
        makeTelescopingGuide(group, my, mz, 0.08, 0.08, guides)
        group.add(boxMesh(0.08, 0.035, 0.08, m.glowPink, 0.24, my, mz))
      }

      for (const vi of def.idx) {
        const [y, z] = pts[vi]
        makeTelescopingGuide(group, y, z, 0.12, 0.14, guides)
        if (vi === 0 || vi === 3) continue
        group.add(cylinderX(0.22, 0.22, 0.4, m.ink, 0, y, z, 8))
        group.add(boxMesh(0.32, 0.22, 0.22, m.whiteSilk, 0.02, y, z))
        group.add(boxMesh(0.14, 0.06, 0.08, m.glowCyan, 0.23, y, z))
        group.add(boxMesh(0.08, 0.05, 0.08, m.glowPink, -0.2, y, z))
      }

      this.hexHalves.push({
        group,
        dir: def.dir,
        openAngle: 0.55,
        layers,
        guides,
        closedGap: 0.25,
        openGap: 0.75,
      })
    }
  }

  _buildCradlePlasmaRing(parent) {
    const m = this.materials
    const R = 2.15 * 1.3
    const ringX = -0.72
    const root = new THREE.Group()
    root.name = 'EPR-PLASMA-RING'
    root.position.x = ringX
    parent.add(root)

    // Outer circular carriage, deliberately 1.3x the hex stabilizer.
    root.add(torusX(R, 0.07, m.whiteSilk, -0.1, 8, 96))
    root.add(torusX(R, 0.05, m.titanium, 0.1, 8, 96))
    root.add(torusX(R - 0.13, 0.02, m.glowCyan, 0.01, 6, 80))
    for (let i = 0; i < 30; i += 1) {
      const a = (i / 30) * TAU
      const seg = boxMesh(0.2, 0.09, 0.34, i % 3 === 0 ? m.titanium : m.whiteSilk, 0, Math.cos(a) * R, Math.sin(a) * R)
      seg.rotation.x = a
      root.add(seg)
      if (i % 4 === 0) {
        root.add(boxMesh(0.08, 0.025, 0.06, m.glowCyan, 0.19, Math.cos(a) * R, Math.sin(a) * R))
      }
    }

    // The weapon ring rides on five radial spokes and a central bearing.
    root.add(cylinderX(0.52, 0.58, 0.55, m.ink, 0, 0, 0, 24))
    root.add(torusX(0.62, 0.04, m.titanium, 0, 6, 48))
    const angles = Array.from({ length: 5 }, (_, i) => PI / 2 + (i / 5) * TAU)
    for (const a of angles) {
      const p1 = new THREE.Vector3(0, Math.cos(a) * 0.58, Math.sin(a) * 0.58)
      const p2 = new THREE.Vector3(0, Math.cos(a) * R, Math.sin(a) * R)
      root.add(cylinderBetween(p1, p2, 0.034, m.titanium, 8))
      root.add(boxMesh(0.34, 0.18, 0.4, m.gunmetal, 0, Math.cos(a) * R, Math.sin(a) * R).rotateX(a))
    }

    const redMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(4.2, 0.35, 0.28),
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    })
    this.plasmaRedMat = redMat

    const rearShape = [
      [-0.27, 0.18],
      [-0.11, 0.34],
      [0.27, 0.34],
      [0.27, -0.34],
      [-0.27, -0.34],
    ]
    const frontShape = [
      [-0.27, 0.23],
      [0.28, 0.17],
      [0.24, -0.22],
      [-0.22, -0.28],
    ]
    const frontShapeNarrow = frontShape.map(([z, y]) => [z * 0.8, y * 0.8])

    // One long swept wing per launcher, mounted above the two display faces.
    const wingLength = 1.7
    const wingRootThick = 0.1
    const wingTipThick = 0.034
    const wingGeometry = new THREE.BufferGeometry()
    wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, wingRootThick * 0.5, -0.22,
      wingLength, wingTipThick * 0.5, -0.06,
      wingLength, wingTipThick * 0.5, 0.16,
      0, wingRootThick * 0.5, 0.21,
      0, -wingRootThick * 0.5, -0.22,
      wingLength, -wingTipThick * 0.5, -0.06,
      wingLength, -wingTipThick * 0.5, 0.16,
      0, -wingRootThick * 0.5, 0.21,
    ], 3))
    wingGeometry.setIndex([
      0, 1, 2, 0, 2, 3,
      4, 7, 6, 4, 6, 5,
      0, 4, 5, 0, 5, 1,
      3, 2, 6, 3, 6, 7,
      0, 3, 7, 0, 7, 4,
      1, 5, 6, 1, 6, 2,
    ])
    wingGeometry.computeVertexNormals()
    const wingMat = m.whiteSilk.clone()
    wingMat.side = THREE.DoubleSide

    const emblemLoader = new THREE.TextureLoader()
    const emblemTextures = EMBLEM_URLS.map((url) => {
      const texture = emblemLoader.load(url)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 8
      return texture
    })
    // Physical border colour follows each emblem's dominant colour so the
    // five displays can be identified from a distance.
    const emblemBorderColors = [0xe64125, 0xd9852b, 0xc1c3c2, 0x4a9868, 0x3a62aa]

    let emitterIndex = 0
    for (const a of angles) {
      const emitter = new THREE.Group()
      emitter.position.set(0, Math.cos(a) * R, Math.sin(a) * R)
      emitter.rotation.x = a
      root.add(emitter)
      const emblemIndex = emitterIndex % emblemTextures.length
      const emblemTexture = emblemTextures[emblemIndex]
      const borderMat = new THREE.MeshBasicMaterial({
        color: emblemBorderColors[emblemIndex],
        toneMapped: false,
        transparent: true,
        opacity: 0.95,
      })
      emitter.userData.emblemIndex = emblemIndex
      emitterIndex += 1

      // Rear block: a cuboid with its top-left corner cut away.
      const rear = extrudedPlate(rearShape, 0.78, m.whiteSilk, { bevel: 0.014, segments: 1 })
      rear.position.x = 0.48
      emitter.add(rear)
      emitter.add(extrudedPlate(rearShape.map(([z, y]) => [z * 0.62, y * 0.66]), 0.82, m.ink, { bevel: 0.006, segments: 1 }).translateX(0.49))

      // Two opposite displays show the same emblem for this launcher.
      const screens = []
      for (const side of [-1, 1]) {
        const frame = boxMesh(0.58, 0.45, 0.045, m.ink, 0.47, 0.01, side * 0.292)
        emitter.add(frame)
        const screenMat = new THREE.MeshBasicMaterial({
          map: emblemTexture,
          toneMapped: false,
          color: 0xffffff,
          side: THREE.FrontSide,
        })
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.36), screenMat)
        screen.position.set(0.47, 0.02, side * 0.322)
        if (side < 0) screen.rotation.y = Math.PI
        emitter.add(screen)
        screens.push({ mesh: screen, side })
        const borderZ = side * 0.331
        emitter.add(boxMesh(0.5, 0.012, 0.01, borderMat, 0.47, 0.205, borderZ))
        emitter.add(boxMesh(0.5, 0.012, 0.01, borderMat, 0.47, -0.165, borderZ))
        emitter.add(boxMesh(0.012, 0.38, 0.01, borderMat, 0.235, 0.02, borderZ))
        emitter.add(boxMesh(0.012, 0.38, 0.01, borderMat, 0.705, 0.02, borderZ))
      }
      this.cradleEmitters.push({ emitter, index: emblemIndex, screens })
      for (const x of [0.22, 0.45, 0.68]) {
        emitter.add(boxMesh(0.035, 0.72, 0.035, m.titanium, x, 0, 0))
      }

      // Small rear fins and exhaust collar.
      for (const side of [-1, 1]) {
        const finTop = boxMesh(0.3, 0.045, 0.32, m.whiteSilk, 0.93, side * 0.3, 0)
        finTop.rotation.z = side * 0.16
        emitter.add(finTop)
        const finSide = boxMesh(0.3, 0.3, 0.045, m.whiteSilk, 0.93, 0, side * 0.26)
        finSide.rotation.x = side * 0.14
        emitter.add(finSide)
      }
      emitter.add(torusX(0.18, 0.025, m.glowPink, 0.92, 5, 30))
      emitter.add(cylinderX(0.22, 0.16, 0.12, m.gunmetal, 0.99, 0, 0, 12))

      // Long aircraft wing inserted through the top face above the screens.
      // The root sits below the surface inside a recessed diagonal socket.
      // Top-face slot, cut along the 45-degree wing span.
      const socket = new THREE.Group()
      socket.position.set(0.5, 0.34, 0)
      socket.rotation.y = 0
      emitter.add(socket)
      socket.add(boxMesh(0.58, 0.025, 0.17, m.ink, 0.08, 0.006, 0))
      socket.add(boxMesh(0.58, 0.1, 0.05, m.whiteSilk, 0.08, 0.055, -0.08))
      socket.add(boxMesh(0.58, 0.1, 0.05, m.whiteSilk, 0.08, 0.055, 0.08))
      socket.add(boxMesh(0.06, 0.1, 0.21, m.whiteSilk, -0.18, 0.055, 0))
      socket.add(boxMesh(0.06, 0.1, 0.21, m.whiteSilk, 0.38, 0.055, 0))
      socket.add(boxMesh(0.16, 0.24, 0.14, m.gunmetal, 0.08, -0.09, 0))
      for (const xBolt of [-0.15, 0.31]) {
        for (const zBolt of [-0.11, 0.11]) {
          socket.add(cylinderX(0.025, 0.025, 0.06, m.chrome, xBolt, 0.09, zBolt, 8))
        }
      }
      const wingRoot = new THREE.Group()
      wingRoot.position.set(0.5, 0.335, 0)
      wingRoot.rotation.y = 0
      emitter.add(wingRoot)
      const wingBlade = new THREE.Group()
      wingBlade.rotation.x = HALF_PI
      wingRoot.add(wingBlade)
      wingBlade.add(new THREE.Mesh(wingGeometry, wingMat))
      wingBlade.add(cylinderBetween(
        new THREE.Vector3(0, wingRootThick * 0.5 + 0.005, -0.22),
        new THREE.Vector3(wingLength, wingTipThick * 0.5 + 0.005, -0.06),
        0.018,
        m.ink,
        6,
      ))
      wingBlade.add(cylinderBetween(
        new THREE.Vector3(0, wingRootThick * 0.5 + 0.002, 0.21),
        new THREE.Vector3(wingLength, wingTipThick * 0.5 + 0.002, 0.16),
        0.012,
        m.titanium,
        5,
      ))
      for (const xPanel of [0.55, 1.05]) {
        wingBlade.add(boxMesh(0.02, 0.008, 0.3, m.ink, xPanel, 0.054, 0.0))
      }
      const wingLight = glowSprite(m.maps.glowCyanMap, 0x9efbff, 0.2, 0.55)
      wingLight.position.set(wingLength - 0.01, 0.055, 0.12)
      wingBlade.add(wingLight)

      // Irregular-quadrilateral plasma muzzle with a visible red core.
      // Firing barrel: another 1.5x length, with the quad section shrunk to 0.8x.
      const casing = extrudedPlate(frontShapeNarrow, 1.47, m.ink, { bevel: 0.012, segments: 1 })
      casing.position.x = -0.755
      emitter.add(casing)
      const sideArmor = extrudedPlate(frontShapeNarrow.map(([z, y]) => [z * 0.82, y * 0.82]), 1.5, m.titanium, { bevel: 0.006, segments: 1 })
      sideArmor.position.x = -0.77
      emitter.add(sideArmor)
      emitter.add(boxMesh(0.16, 0.56, 0.5, m.gunmetal, -0.015, 0, 0))
      for (const xBarrel of [-0.25, -0.85, -1.25]) {
        for (const side of [-1, 1]) {
          emitter.add(boxMesh(0.224, 0.128, 0.028, m.ink, xBarrel, 0.016, side * 0.188))
          emitter.add(boxMesh(0.184, 0.084, 0.016, redMat, xBarrel, 0.016, side * 0.204))
        }
      }
      for (const [y, z] of [[0.208, 0], [-0.192, 0], [0, 0.204], [0, -0.204]]) {
        emitter.add(boxMesh(1.4, 0.018, 0.018, m.titanium, -0.77, y, z))
      }
      const muzzle = extrudedPlate(frontShapeNarrow.map(([z, y]) => [z * 0.64, y * 0.64]), 0.035, redMat, { bevel: 0.004, segments: 1 })
      muzzle.position.x = -1.57
      emitter.add(muzzle)
      emitter.add(extrudedPlate(frontShapeNarrow.map(([z, y]) => [z * 1.04, y * 1.04]), 0.045, m.gunmetal, { bevel: 0.004, segments: 1 }).translateX(-1.55))
      for (const [z, y] of [[-0.176, 0.144], [0.176, 0.12], [0.152, -0.144], [-0.144, -0.16]]) {
        const tooth = boxMesh(0.16, 0.06, 0.06, m.whiteSilk, -1.59, y, z)
        emitter.add(tooth)
      }
      const muzzleGlow = glowSprite(m.maps.glowPinkMap, 0xff4a5c, 0.64, 0.8)
      muzzleGlow.position.set(-1.59, 0, 0)
      emitter.add(muzzleGlow)
      this.plasmaMuzzles.push(muzzleGlow)

      // Ring mounting shoe.
      emitter.add(boxMesh(0.3, 0.2, 0.46, m.titanium, 0.02, 0, 0))
      emitter.add(boxMesh(0.2, 0.1, 0.5, m.whiteSilk, 0.12, 0.12, 0))
    }

    // Five tech nodes between the plasma emitters.
    for (let i = 0; i < 5; i += 1) {
      const a = angles[i] + TAU / 10
      const node = new THREE.Group()
      node.position.set(0, Math.cos(a) * R, Math.sin(a) * R)
      node.rotation.x = a
      root.add(node)
      node.add(boxMesh(0.44, 0.26, 0.34, m.whiteSilk, 0.1, 0, 0))
      node.add(boxMesh(0.28, 0.12, 0.24, m.ink, 0.1, 0.12, 0))
      node.add(boxMesh(0.07, 0.05, 0.18, m.glowCyan, 0.27, 0.15, 0))
      node.add(boxMesh(0.035, 0.28, 0.035, m.chrome, 0.16, 0.28, 0))
      node.add(boxMesh(0.09, 0.045, 0.09, m.glowPink, 0.16, 0.43, 0))
      node.add(boxMesh(0.26, 0.16, 0.3, m.gunmetal, 0.28, -0.06, 0))
    }

    // Axial tie back to the cradle body.
    root.add(cylinderX(0.32, 0.44, 0.9, m.gunmetal, 0.55, 0, 0, 18))
    this.plasmaRing = root
  }

  _buildCradleEnergyPipes(parent) {
    const m = this.materials
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.32, 2.7, 3.2),
      transparent: true,
      opacity: 0.035,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    this.cradlePipeCoreMat = coreMat
    const R = 2.5
    // Fore and aft manifold collars on the central spine.
    parent.add(cylinderX(0.5, 0.54, 0.34, m.ink, -1.28, 0, 0, 20))
    parent.add(torusX(0.5, 0.028, m.glowCyan, -1.28, 6, 40))
    parent.add(cylinderX(0.7, 0.74, 0.36, m.ink, -2.6, 0, 0, 24))
    parent.add(torusX(0.7, 0.03, m.glowCyan, -2.6, 6, 48))
    for (let i = 0; i < 4; i += 1) {
      const a = PI / 4 + (i / 4) * TAU
      const holder = new THREE.Group()
      holder.rotation.x = a
      parent.add(holder)
      holder.add(cylinderX(0.075, 0.075, 2.34, m.whiteSilk, -1.63, R, 0, 10))
      holder.add(cylinderX(0.042, 0.042, 2.28, m.gunmetal, -1.63, R, 0, 8))
      holder.add(cylinderX(0.024, 0.024, 2.24, coreMat, -1.63, R, 0, 6))
      holder.add(boxMesh(1.92, 0.02, 0.035, m.glowCyan, -1.63, R + 0.085, 0))
      holder.add(boxMesh(1.92, 0.016, 0.025, m.glowCyan, -1.63, R, 0.086))
      holder.add(boxMesh(1.92, 0.016, 0.025, m.glowCyan, -1.63, R, -0.086))
      for (const x of [-0.52, -1.08, -1.68, -2.72]) {
        const collar = torusX(0.125, 0.018, m.titanium, x, 5, 28)
        collar.position.y = R
        holder.add(collar)
      }
      holder.add(boxMesh(0.24, 0.24, 0.24, m.gunmetal, -0.47, R, 0))
      holder.add(boxMesh(0.26, 0.26, 0.26, m.gunmetal, -2.8, R, 0))
      holder.add(boxMesh(0.18, 0.07, 0.09, m.glowCyan, -0.6, R + 0.08, 0))
      holder.add(boxMesh(0.14, 0.14, 0.05, m.glowPink, -2.84, R, 0))

      const pulses = []
      for (let j = 0; j < 2; j += 1) {
        const sprite = glowSprite(m.maps.glowCyanMap, j === 0 ? 0x8ff8ff : 0xff73ad, 0.3, 0)
        sprite.position.set(-0.55, R, 0)
        holder.add(sprite)
        pulses.push({ sprite, phase: j * 0.5 + i * 0.09, speed: 0.12 + i * 0.008 })
      }
      const endGlow = glowSprite(m.maps.glowCyanMap, 0x8ff8ff, 0.5, 0)
      endGlow.position.set(-2.84, R, 0)
      holder.add(endGlow)
      // Hang the conduit from the 1.3x weapon carriage at its ring plane.
      const aOuter = a
      const pOuter = new THREE.Vector3(-0.72, Math.cos(aOuter) * 2.795, Math.sin(aOuter) * 2.795)
      const pPipe = new THREE.Vector3(-0.72, Math.cos(aOuter) * R, Math.sin(aOuter) * R)
      parent.add(cylinderBetween(pOuter, pPipe, 0.035, m.titanium, 6))
      parent.add(boxMesh(0.2, 0.13, 0.2, m.gunmetal, -0.72, Math.cos(aOuter) * R, Math.sin(aOuter) * R))
      parent.add(boxMesh(0.08, 0.045, 0.1, m.glowCyan, -0.72, Math.cos(aOuter) * R, Math.sin(aOuter) * R))

      // Both ends of every conduit tie back into the central spine.
      const pFrontHub = new THREE.Vector3(-1.28, Math.cos(aOuter) * 0.5, Math.sin(aOuter) * 0.5)
      const pFrontPipe = new THREE.Vector3(-0.56, Math.cos(aOuter) * R, Math.sin(aOuter) * R)
      parent.add(cylinderBetween(pFrontHub, pFrontPipe, 0.04, m.titanium, 6))
      parent.add(cylinderBetween(
        new THREE.Vector3(-1.24, Math.cos(aOuter) * 0.54, Math.sin(aOuter) * 0.54),
        new THREE.Vector3(-0.54, Math.cos(aOuter) * (R - 0.05), Math.sin(aOuter) * (R - 0.05)),
        0.014,
        m.glowCyan,
        4,
      ))
      parent.add(boxMesh(0.18, 0.18, 0.18, m.gunmetal, -0.56, Math.cos(aOuter) * R, Math.sin(aOuter) * R))
      const pRearHub = new THREE.Vector3(-2.6, Math.cos(aOuter) * 0.7, Math.sin(aOuter) * 0.7)
      const pRearPipe = new THREE.Vector3(-2.7, Math.cos(aOuter) * R, Math.sin(aOuter) * R)
      parent.add(cylinderBetween(pRearHub, pRearPipe, 0.045, m.titanium, 6))
      parent.add(boxMesh(0.18, 0.18, 0.18, m.gunmetal, -2.7, Math.cos(aOuter) * R, Math.sin(aOuter) * R))
      this.cradlePipes.push({ holder, radius: R, pulses, endGlow })
    }
  }

  // ---------------------------------------------------------------------------
  // GYRO COLLAR
  // ---------------------------------------------------------------------------

  _buildHub(parent) {
    const m = this.materials
    const gearRing = new THREE.Group()
    gearRing.position.x = -0.18
    parent.add(gearRing)
    this.gearRing = gearRing

    gearRing.add(torusX(1.46, 0.08, m.titanium, 0, 10, 96))
    gearRing.add(circleRing(1.57, 1.37, 0.08, m.ink, 0))
    for (let i = 0; i < 36; i += 1) {
      const a = (i / 36) * TAU
      const tooth = boxMesh(0.1, 0.18, 0.11, i % 3 === 0 ? m.whiteSilk : m.gunmetal, 0, Math.cos(a) * 1.56, Math.sin(a) * 1.56)
      tooth.rotation.x = a
      gearRing.add(tooth)
    }
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU
      const rib = boxMesh(0.32, 0.08, 0.2, m.ink, 0.02, Math.cos(a) * 1.32, Math.sin(a) * 1.32)
      rib.rotation.x = a
      gearRing.add(rib)
    }
    const cyanDots = new THREE.Group()
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU + PI / 12
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), m.glowCyan)
      dot.position.set(0.07, Math.cos(a) * 1.45, Math.sin(a) * 1.45)
      cyanDots.add(dot)
    }
    gearRing.add(cyanDots)

    const inner = new THREE.Group()
    parent.add(inner)
    this.hubInner = inner
    inner.add(cylinderX(0.72, 0.72, 1.26, m.gunmetal, 0.05, 0, 0, 28))
    inner.add(cylinderX(0.58, 0.65, 0.52, m.ink, 0.44, 0, 0, 24))
    inner.add(torusX(0.75, 0.055, m.whiteSilk, -0.41))
    inner.add(torusX(0.61, 0.045, m.titanium, 0.31))
    inner.add(torusX(0.49, 0.035, m.chrome, 0.55))
    inner.add(torusX(0.7, 0.028, m.glowCyan, 0.68))
    inner.add(circleRing(1.08, 0.94, 0.07, m.ink, -0.56))
    inner.add(circleRing(0.96, 0.83, 0.06, m.titanium, 0.76))
    for (let i = 0; i < 18; i += 1) {
      const a = (i / 18) * TAU
      const notch = boxMesh(0.14, 0.18, 0.18, m.ink, 0.15, Math.cos(a) * 0.74, Math.sin(a) * 0.74)
      notch.rotation.x = a
      inner.add(notch)
    }

    // Six armored blade root clamps.
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU
      const clampRoot = new THREE.Group()
      clampRoot.rotation.x = a
      parent.add(clampRoot)
      clampRoot.add(boxMesh(0.36, 0.38, 0.83, m.whiteSilk, 0.1, 0.92, 0))
      clampRoot.add(boxMesh(0.18, 0.2, 0.62, m.ink, 0.28, 0.92, 0))
      clampRoot.add(boxMesh(0.2, 0.12, 0.2, m.glowCyan, 0.33, 1.19, 0))
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.5, 10), m.chrome)
      bolt.rotation.z = HALF_PI
      bolt.position.set(0.02, 0.94, 0)
      clampRoot.add(bolt)
      clampRoot.add(boxMesh(0.42, 0.11, 0.18, m.titanium, -0.16, 0.69, 0))
    }

    // Outer gyro cage.
    parent.add(torusX(1.14, 0.04, m.chrome, -0.22))
    parent.add(torusX(1.24, 0.022, m.glowPink, 0.11))
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * TAU + PI / 6
      const arm = cylinderX(0.06, 0.06, 0.75, m.whiteSilk, 0.12, Math.cos(a) * 1.02, Math.sin(a) * 1.02, 8)
      arm.rotation.x = a
      parent.add(arm)
    }
    parent.add(circleRing(0.42, 0.24, 0.18, m.ink, 0.84))
    parent.add(circleRing(0.3, 0.17, 0.08, m.titanium, 0.95))

    this._buildHubRings(parent)
    this._buildHubLink(parent)
  }

  _buildHubRings(parent) {
    const m = this.materials
    const ringX = -0.18
    const hubR = 1.57
    const r1 = hubR * 1.2
    const r2 = r1 * 2 * 0.8
    const r3 = r2 * 1.5

    // The first ring stays keyed to the deformation hub.
    parent.add(torusX(r1, 0.026, m.titanium, ringX, 6, 128))
    parent.add(torusX(r1 + 0.035, 0.009, m.glowCyan, ringX, 4, 128))
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU + PI / 6
      const p1 = new THREE.Vector3(ringX, Math.cos(a) * 1.6, Math.sin(a) * 1.6)
      const p2 = new THREE.Vector3(ringX, Math.cos(a) * r1, Math.sin(a) * r1)
      parent.add(cylinderBetween(p1, p2, 0.018, m.titanium, 5))
      parent.add(boxMesh(0.1, 0.08, 0.1, m.whiteSilk, ringX, Math.cos(a) * r1, Math.sin(a) * r1))
    }

    // Second ring: parallel translation toward the stabilizer at display time.
    const second = new THREE.Group()
    second.position.x = ringX
    parent.add(second)
    second.add(torusX(r2, 0.03, m.whiteSilk, 0, 6, 160))
    second.add(torusX(r2 + 0.04, 0.01, m.glowBlue, 0, 4, 160))

    // Third ring: travels toward the solar-petal side while growing 1.2x.
    const third = new THREE.Group()
    third.position.x = ringX
    parent.add(third)
    third.add(torusX(r3, 0.04, m.titanium, 0, 6, 192))
    third.add(torusX(r3, 0.012, m.glowCyan, -0.015, 4, 192))

    const panelArc = TAU * 0.1
    const plateLength = TAU * r3 * panelArc / TAU
    for (let i = 0; i < 8; i += 1) {
      const a = i * (TAU / 8) + TAU / 16
      const panelRoot = new THREE.Group()
      panelRoot.rotation.x = a
      third.add(panelRoot)
      // The rectangular plate is flipped up 90 degrees: its broad face is
      // radial, so it stands perpendicular to the ring plane.
      panelRoot.add(boxMesh(1.12, 0.16, plateLength * 0.96, m.whiteSilk, 0, r3, 0))
      panelRoot.add(boxMesh(0.96, 0.02, plateLength * 0.82, m.ink, 0, r3 + 0.09, 0))
      panelRoot.add(boxMesh(0.04, 0.2, plateLength * 0.96, m.titanium, -0.55, r3, 0))
      panelRoot.add(boxMesh(0.04, 0.2, plateLength * 0.96, m.titanium, 0.55, r3, 0))
      panelRoot.add(boxMesh(0.03, 0.03, plateLength * 0.7, m.glowCyan, 0, r3 + 0.1, 0))
      panelRoot.add(boxMesh(0.2, 0.3, 0.2, m.gunmetal, 0, r3 - 0.16, 0))
    }

    // Dynamic transparent filaments: six first-to-second stand-offs and
    // 32 second-to-third lines which lengthen as the rings separate.
    const threadMat = new THREE.LineBasicMaterial({
      color: 0xbfefff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const lineSegments = 32 + 6
    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineSegments * 2 * 3), 3))
    const lines = new THREE.LineSegments(lineGeometry, threadMat)
    lines.frustumCulled = false
    parent.add(lines)

    this.hubRingSecond = second
    this.hubRingThird = third
    this.hubRingThreadLines = lines
    this.hubRingBaseX = ringX
    this.hubRingR1 = r1
    this.hubRingR2 = r2
    this.hubRingR3 = r3
    this.hubRingSecondTravel = 1.25
    this.hubRingThirdTravel = 2.3
  }

  _buildHubLink(parent) {
    const m = this.materials
    const group = new THREE.Group()
    group.position.x = 0.74
    parent.add(group)
    this.hubLink = group

    // Continuous energy-output core running through the whole telescope.
    const energyMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.24, 2.5, 3.2),
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    this.hubLinkEnergyMat = energyMat
    group.add(cylinderX(0.14, 0.14, 1.12, energyMat, 0.58, 0, 0, 16))
    const energyPulse = glowSprite(m.maps.glowCyanMap, 0x8ef8ff, 0.55, 0.5)
    energyPulse.position.set(0.4, 0, 0)
    group.add(energyPulse)
    this.hubLinkPulse = energyPulse

    // The axial telescoping spine. It stays hidden while docked and grows
    // between the hub and the petal rotor when the assembly separates.
    group.add(cylinderX(0.4, 0.4, 0.09, m.ink, 0.045, 0, 0, 28))
    group.add(cylinderX(0.32, 0.35, 0.16, m.whiteSilk, 0.17, 0, 0, 28))
    group.add(torusX(0.36, 0.03, m.titanium, 0.11, 8, 64))
    group.add(torusX(0.34, 0.02, m.glowCyan, 0.24, 6, 56))
    group.add(cylinderX(0.24, 0.27, 0.14, m.gunmetal, 0.32, 0, 0, 24))

    // Segmented mechanical sleeve.
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU
      const rib = boxMesh(0.22, 0.05, 0.08, i % 2 ? m.titanium : m.ink, 0.46, Math.cos(a) * 0.27, Math.sin(a) * 0.27)
      rib.rotation.x = a
      group.add(rib)
    }
    group.add(cylinderX(0.28, 0.24, 0.1, m.whiteSilk, 0.46, 0, 0, 24))
    group.add(torusX(0.3, 0.026, m.chrome, 0.53, 6, 56))

    // Bright transfer barrel, the blue section visible in the reference shots.
    group.add(cylinderX(0.22, 0.2, 0.2, m.gunmetal, 0.61, 0, 0, 24))
    group.add(cylinderX(0.16, 0.16, 0.14, m.glowBlue, 0.71, 0, 0, 22))
    group.add(cylinderX(0.23, 0.17, 0.055, m.whiteSilk, 0.65, 0, 0, 22))
    group.add(cylinderX(0.23, 0.17, 0.055, m.whiteSilk, 0.78, 0, 0, 22))
    group.add(torusX(0.25, 0.024, m.glowCyan, 0.64, 6, 60))
    group.add(torusX(0.25, 0.024, m.glowCyan, 0.79, 6, 60))

    // Rib cage and a flange with small guide vanes.
    group.add(cylinderX(0.19, 0.24, 0.18, m.navySilk, 0.88, 0, 0, 22))
    group.add(torusX(0.28, 0.028, m.titanium, 0.83, 8, 56))
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + PI / 4
      const fin = boxMesh(0.2, 0.34, 0.035, m.whiteSilk, 0.93, Math.cos(a) * 0.2, Math.sin(a) * 0.2)
      fin.rotation.x = a
      fin.rotation.z = 0.34
      group.add(fin)
      group.add(boxMesh(0.08, 0.1, 0.045, m.glowCyan, 0.97, Math.cos(a) * 0.3, Math.sin(a) * 0.3))
    }

    // Telescoping end bearing / rotor-side joint.
    group.add(cylinderX(0.36, 0.3, 0.1, m.whiteSilk, 0.99, 0, 0, 28))
    group.add(torusX(0.37, 0.022, m.chrome, 0.955, 6, 64))
    group.add(cylinderX(0.27, 0.33, 0.09, m.gunmetal, 1.06, 0, 0, 24))
    group.add(torusX(0.3, 0.02, m.glowPink, 1.02, 5, 48))

    // Four fine longitudinal rails running the length of the telescope.
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + PI / 4
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.92, 6), m.chrome)
      rail.rotation.z = HALF_PI
      rail.position.set(0.48, Math.cos(a) * 0.315, Math.sin(a) * 0.315)
      group.add(rail)
    }

    // Mechanical end collar to read as a clean connection to the blade rotor.
    const cap = cylinderX(0.44, 0.31, 0.065, m.whiteSilk, 1.11, 0, 0, 28)
    group.add(cap)
    group.add(torusX(0.43, 0.02, m.glowCyan, 1.145, 6, 64))
    const endGlow = glowSprite(m.maps.glowCyanMap, 0x78f2ff, 0.8, 0.28)
    endGlow.position.x = 1.12
    parent.add(endGlow)
    this.hubLinkEndGlow = endGlow
    this.hubLinkEndGlow.visible = false
  }

  // ---------------------------------------------------------------------------
  // FUSION CORE
  // ---------------------------------------------------------------------------

  _buildCore(parent) {
    const m = this.materials
    const core = new THREE.Group()
    core.position.x = 0.52
    parent.add(core)
    this.coreSpin = core

    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.15, 2.5, 2.95),
      toneMapped: false,
    })
    this.coreSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.33, 4), coreMat)
    core.add(this.coreSphere)

    const coreShellMat = m.glowGlass.clone()
    this.coreShellMat = coreShellMat
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 20), coreShellMat)
    core.add(shell)
    this.coreHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 24, 18),
      new THREE.MeshBasicMaterial({
        color: 0x4fe8ff,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    core.add(this.coreHalo)
    this.coreHalloSprite = glowSprite(m.maps.glowCyanMap, 0x76f8ff, 2.9, 0.3)
    core.add(this.coreHalloSprite)
    this.coreLight = new THREE.PointLight(0x67f4ff, 1.35, 5.4, 2)
    core.add(this.coreLight)

    // Containment rings with slight offsets.
    for (let i = 0; i < 6; i += 1) {
      const ring = torusX(0.57 + i * 0.018, 0.018, i % 2 ? m.glowCyan : m.titanium, -0.2 + i * 0.08, 6, 48)
      ring.rotation.x = i * 0.45
      ring.rotation.y = i * 0.2
      core.add(ring)
    }
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + PI / 4
      const cage = makeCurveTube(
        [
          new THREE.Vector3(-0.42, Math.cos(a) * 0.48, Math.sin(a) * 0.48),
          new THREE.Vector3(-0.08, Math.cos(a) * 0.7, Math.sin(a) * 0.7),
          new THREE.Vector3(0.36, Math.cos(a) * 0.48, Math.sin(a) * 0.48),
        ],
        0.028,
        m.chrome,
        24,
        5,
      )
      core.add(cage)
    }
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), i % 3 ? m.glowCyan : m.glowPink)
      node.position.set(0.22, Math.cos(a) * 0.72, Math.sin(a) * 0.72)
      core.add(node)
    }
    const light2 = new THREE.PointLight(0xff5f9a, 1.8, 4.2, 2)
    light2.position.set(0.5, 0.3, 0.15)
    parent.add(light2)
    this.pinkLights.push(light2)
  }

  // ---------------------------------------------------------------------------
  // SIX-BLADE PHOTON ARRAY
  // ---------------------------------------------------------------------------

  _bladeShape(scale = 1, sweep = 0) {
    const points = [
      [-0.33, 0.8],
      [-0.74, 1.56],
      [-0.94, 2.65],
      [-0.86, 3.8],
      [-0.55, 5.2],
      [-0.22, 6.52],
      [0.02, 7.12],
      [0.31, 6.28],
      [0.64, 5.05],
      [0.88, 3.7],
      [0.82, 2.3],
      [0.55, 1.34],
      [0.35, 0.78],
    ]
    return points.map(([x, y]) => [x * scale + sweep, y * scale])
  }

  _buildBladeConnector(root, index) {
    const m = this.materials
    const baseY = 0.52
    const length = 1.8
    const group = new THREE.Group()
    group.position.y = baseY
    root.add(group)
    this.bladeConnectors.push({ group, baseY, length, index })

    // Stepped rear socket that emerges from the gyro collar.
    group.add(cylinderY(0.37, 0.31, 0.2, m.gunmetal, 0, 0.1, 0, 24))
    group.add(cylinderY(0.29, 0.35, 0.12, m.ink, 0, 0.25, 0, 20))
    group.add(torusY(0.38, 0.028, m.titanium, 0.035, 8, 48))
    group.add(torusY(0.4, 0.018, m.glowPink, 0.31, 6, 48))

    // Ribbed mechanical neck.
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU
      const rib = boxMesh(0.035, 0.14, 0.07, i % 2 ? m.titanium : m.ink, Math.cos(a) * 0.285, 0.43, Math.sin(a) * 0.285)
      rib.rotation.y = -a
      group.add(rib)
    }
    group.add(cylinderY(0.24, 0.28, 0.2, m.ink, 0, 0.44, 0, 20))
    group.add(torusY(0.3, 0.025, m.chrome, 0.54, 6, 40))

    // White articulated cuff.
    group.add(cylinderY(0.3, 0.25, 0.22, m.whiteSilk, 0, 0.64, 0, 24))
    group.add(torusY(0.315, 0.02, m.titanium, 0.55, 6, 40))
    group.add(torusY(0.29, 0.02, m.ink, 0.74, 6, 40))
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU
      group.add(boxMesh(0.035, 0.08, 0.06, m.chrome, Math.cos(a) * 0.3, 0.66, Math.sin(a) * 0.3).rotateY(-a))
    }

    // Variable-diameter inner barrel with a bright cyan transfer window.
    group.add(cylinderY(0.2, 0.22, 0.26, m.gunmetal, 0, 0.89, 0, 18))
    group.add(cylinderY(0.165, 0.165, 0.24, m.glowBlue, 0, 1.08, 0, 20))
    group.add(cylinderY(0.235, 0.205, 0.08, m.whiteSilk, 0, 1.0, 0, 22))
    group.add(cylinderY(0.235, 0.205, 0.08, m.whiteSilk, 0, 1.2, 0, 22))
    group.add(torusY(0.255, 0.026, m.glowCyan, 1.0, 6, 48))
    group.add(torusY(0.255, 0.026, m.glowCyan, 1.2, 6, 48))
    group.add(torusY(0.19, 0.018, m.chrome, 1.07, 5, 40))

    // Visible outer barrel: white collars around a glowing transfer window.
    group.add(torusY(0.285, 0.024, m.glowCyan, 1.18, 6, 48))
    group.add(cylinderY(0.255, 0.225, 0.075, m.whiteSilk, 0, 1.24, 0, 24))
    group.add(cylinderY(0.18, 0.18, 0.17, m.glowBlue, 0, 1.35, 0, 22))
    group.add(torusY(0.225, 0.025, m.glowCyan, 1.28, 6, 48))
    group.add(torusY(0.225, 0.025, m.glowCyan, 1.44, 6, 48))
    group.add(cylinderY(0.33, 0.22, 0.09, m.whiteSilk, 0, 1.52, 0, 24))
    group.add(cylinderY(0.27, 0.32, 0.1, m.navySilk, 0, 1.61, 0, 22))
    group.add(cylinderY(0.38, 0.26, 0.12, m.whiteSilk, 0, 1.73, 0, 24))
    group.add(torusY(0.38, 0.026, m.chrome, 1.79, 6, 48))
    group.add(torusY(0.405, 0.034, m.glowCyan, 1.75, 8, 56))
    group.add(torusY(0.28, 0.018, m.glowPink, 1.58, 5, 40))
    group.add(boxMesh(0.035, 0.3, 0.028, m.glowCyan, 0.26, 1.42, 0))
    group.add(boxMesh(0.028, 0.22, 0.026, m.glowCyan, -0.25, 1.4, 0))

    const glow = glowSprite(m.maps.glowCyanMap, 0x80f5ff, 0.62, 0.42)
    glow.position.y = 1.35
    group.add(glow)
    this.nodeSprites.push(glow)

    // Four small white guide fins around the clamp.
    for (const side of [1, -1]) {
      const fin = boxMesh(0.2, 0.32, 0.035, m.whiteSilk, side * 0.24, 1.38, 0)
      fin.rotation.z = side * 0.52
      group.add(fin)
      group.add(boxMesh(0.12, 0.035, 0.045, m.glowCyan, side * 0.31, 1.42, 0.028))
    }

    // Thin longitudinal rails make the coupling read as a real mechanism.
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + PI / 4
      const strutGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.84, 6)
      const strut = new THREE.Mesh(strutGeo, m.chrome)
      strut.position.set(Math.cos(a) * 0.22, 0.46, Math.sin(a) * 0.22)
      group.add(strut)
    }
  }

  _buildRotorHub(rotor) {
    const m = this.materials
    const hub = new THREE.Group()
    hub.visible = false
    rotor.add(hub)
    this.rotorHub = hub

    // Inner rotor socket: the common root of all six articulated petal arms.
    hub.add(cylinderX(0.72, 0.58, 0.34, m.ink, 0, 0, 0, 32))
    hub.add(cylinderX(0.62, 0.55, 0.24, m.gunmetal, 0.04, 0, 0, 32))
    hub.add(cylinderX(0.47, 0.39, 0.3, m.whiteSilk, 0.28, 0, 0, 28))
    hub.add(torusX(0.58, 0.032, m.titanium, -0.18, 8, 64))
    hub.add(torusX(0.64, 0.025, m.glowCyan, -0.04, 6, 64))
    hub.add(torusX(0.5, 0.026, m.glowPink, 0.26, 6, 56))
    hub.add(cylinderX(0.34, 0.42, 0.16, m.navySilk, 0.46, 0, 0, 24))
    hub.add(torusX(0.43, 0.024, m.chrome, 0.51, 6, 56))

    // Rear receiving collar for the axial telescoping link.
    hub.add(cylinderX(0.46, 0.34, 0.16, m.gunmetal, -0.3, 0, 0, 28))
    hub.add(torusX(0.47, 0.026, m.ink, -0.36, 8, 56))
    hub.add(torusX(0.36, 0.018, m.glowCyan, -0.38, 5, 48))

    // Six clamp pads align with the radial connectors.
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU
      const clamp = boxMesh(0.3, 0.16, 0.26, m.whiteSilk, -0.02, Math.cos(a) * 0.58, Math.sin(a) * 0.58)
      clamp.rotation.x = a
      hub.add(clamp)
      hub.add(boxMesh(0.06, 0.08, 0.05, m.glowCyan, 0.14, Math.cos(a) * 0.66, Math.sin(a) * 0.66).rotateX(a))
    }

    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU
      const rib = boxMesh(0.08, 0.22, 0.12, i % 3 === 0 ? m.titanium : m.ink, 0.18, Math.cos(a) * 0.55, Math.sin(a) * 0.55)
      rib.rotation.x = a
      hub.add(rib)
    }

    const socketGlow = glowSprite(m.maps.glowCyanMap, 0x7af5ff, 1.1, 0.22)
    socketGlow.position.set(-0.28, 0, 0)
    hub.add(socketGlow)
    this.nodeSprites.push(socketGlow)
  }

  _buildPetalEnergyRelay() {
    const m = this.materials
    const cradle = this.partGroups.get('cradle')
    const receiver = new THREE.Group()
    receiver.name = 'EPR-PETAL-RELAY-RECEIVER'
    receiver.position.set(-1.56, 0, 0)
    cradle.add(receiver)

    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(3.2, 0.08, 0.18),
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    })
    const portMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(3.8, 0.12, 0.24),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    })
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(4.4, 0.16, 0.28),
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    })

    // Rear receiver plate of the annular stabilizer.
    receiver.add(circleRing(1.08, 0.55, 0.2, m.ink, 0))
    receiver.add(torusX(1.18, 0.07, m.titanium, -0.04, 8, 64))
    receiver.add(torusX(1.1, 0.035, ringMat, -0.12, 6, 64))
    receiver.add(torusX(0.52, 0.03, ringMat, 0.08, 6, 48))
    receiver.add(cylinderX(0.46, 0.52, 0.26, m.gunmetal, -0.1, 0, 0, 24))
    receiver.add(circleRing(0.52, 0.34, 0.06, m.ink, -0.23))
    const coreGlow = glowSprite(m.maps.glowPinkMap, 0xff3048, 1.5, 0)
    coreGlow.position.set(-0.27, 0, 0)
    receiver.add(coreGlow)
    const ringHalo = glowSprite(m.maps.glowPinkMap, 0xff3048, 2.7, 0)
    ringHalo.position.set(-0.28, 0, 0)
    receiver.add(ringHalo)

    const ports = []
    const portRadius = 0.72
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * TAU
      const y = Math.cos(angle) * portRadius
      const z = Math.sin(angle) * portRadius
      const pod = new THREE.Group()
      pod.position.set(0.02, y, z)
      receiver.add(pod)
      pod.add(boxMesh(0.2, 0.22, 0.19, m.gunmetal, 0, 0, 0))
      pod.add(cylinderX(0.13, 0.15, 0.16, portMat, 0.13, 0, 0, 12))
      pod.add(torusX(0.16, 0.025, m.titanium, 0.045, 6, 32))
      const glow = glowSprite(m.maps.glowPinkMap, 0xff3048, 0.44, 0)
      glow.position.set(0.24, 0, 0)
      pod.add(glow)
      ports.push({ pod, local: new THREE.Vector3(0.24, y, z), glow })
    }

    // Six long beams from the six petal-net apexes to the receiver ports.
    const beams = []
    for (let i = 0; i < 6; i += 1) {
      const beamCoreMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(4.2, 0.12, 0.22),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
      })
      const beamGlowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(2.2, 0.035, 0.08),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
        side: THREE.DoubleSide,
      })
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.043, 1, 8, 1, true), beamCoreMat)
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.15, 1, 8, 1, true), beamGlowMat)
      core.frustumCulled = false
      glow.frustumCulled = false
      core.visible = false
      glow.visible = false
      core.renderOrder = 11
      glow.renderOrder = 10
      this.root.add(core, glow)

      const originGlow = glowSprite(m.maps.glowPinkMap, 0xff3048, 0.55, 0)
      const targetGlow = glowSprite(m.maps.glowPinkMap, 0xff3048, 0.62, 0)
      originGlow.visible = false
      targetGlow.visible = false
      this.root.add(originGlow, targetGlow)

      const pulses = []
      for (let j = 0; j < 2; j += 1) {
        const pulse = glowSprite(m.maps.glowPinkMap, 0xff7a88, 0.36, 0)
        pulse.visible = false
        this.root.add(pulse)
        pulses.push({ sprite: pulse, offset: (j * 0.5 + i * 0.07) % 1, speed: 0.24 + i * 0.012 })
      }

      beams.push({
        core,
        glow,
        coreMat: beamCoreMat,
        glowMat: beamGlowMat,
        originGlow,
        targetGlow,
        pulses,
      })
    }

    this.petalEnergyRelay = {
      receiver,
      ringMat,
      portMat,
      coreMat,
      coreGlow,
      ringHalo,
      ports,
      beams,
    }
  }

  _buildEnergyLaunch() {
    const m = this.materials
    const thruster = this.partGroups.get('thruster')

    // Telescoping engine cone. Its base stays on the engine; scale.x extends
    // the cone and the tip object travels with it.
    const coneGroup = new THREE.Group()
    coneGroup.position.set(-7.16, 0, 0)
    thruster.add(coneGroup)
    const coneMesh = (radius, material) => {
      const geometry = new THREE.ConeGeometry(radius, 1, 28, 1, true)
      geometry.translate(0, 0.5, 0)
      geometry.rotateZ(HALF_PI)
      return new THREE.Mesh(geometry, material)
    }
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff2a3d,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff7c88,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const outer = coneMesh(1.02, outerMat)
    const core = coneMesh(0.34, coreMat)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xff4052,
      transparent: true,
      opacity: 0,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const wire = coneMesh(1.06, wireMat)
    coneGroup.add(outer, core, wire)
    const tip = new THREE.Object3D()
    tip.position.x = -1
    coneGroup.add(tip)
    const tipGlow = glowSprite(m.maps.glowPinkMap, 0xff2a3d, 1.1, 0)
    tipGlow.position.x = -1
    coneGroup.add(tipGlow)
    this.engineEnergy = { group: coneGroup, outer, core, wire, tip, tipGlow, outerMat, coreMat, wireMat }

    // Energy transport path from the solar-array end to the engine. The line
    // and the travelling sprites are re-sampled as the station expands.
    const flowGeo = new THREE.BufferGeometry()
    flowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(72 * 3), 3))
    const flowMat = new THREE.LineBasicMaterial({
      color: 0x8ffbff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const flowLine = new THREE.Line(flowGeo, flowMat)
    flowLine.frustumCulled = false
    this.root.add(flowLine)
    const flowSprites = []
    for (let i = 0; i < 40; i += 1) {
      const sprite = glowSprite(
        i % 5 === 0 ? m.maps.glowWarmMap : m.maps.glowCyanMap,
        i % 5 === 0 ? 0xffd48a : 0x8ffbff,
        0.7 + (i % 4) * 0.08,
        0,
      )
      this.root.add(sprite)
      flowSprites.push({ sprite, offset: i / 40, speed: 0.22 + (i % 7) * 0.018 })
    }
    const flowTubeMat = new THREE.MeshBasicMaterial({
      color: 0x8ffbff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const flowTubes = []
    const flowTubeGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 6, 1, true)
    for (let i = 0; i < 36; i += 1) {
      const tube = new THREE.Mesh(flowTubeGeo, flowTubeMat)
      tube.frustumCulled = false
      tube.visible = false
      this.root.add(tube)
      flowTubes.push(tube)
    }
    this.energyFlow = {
      line: flowLine,
      geo: flowGeo,
      mat: flowMat,
      sprites: flowSprites,
      tubes: flowTubes,
      tubeMat: flowTubeMat,
      curve: null,
    }
    flowLine.visible = false
    for (const item of flowSprites) item.sprite.visible = false
    for (const tube of flowTubes) tube.visible = false

    // Earth beam, built along local Y and re-aimed each frame.
    const beamGroup = new THREE.Group()
    this.root.add(beamGroup)
    const beamCoreMat = new THREE.MeshBasicMaterial({
      color: 0xff253d,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    })
    const beamGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff0717,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    })
    const beamCore = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 1, 10, 1, true), beamCoreMat)
    const beamGlow = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.15, 1, 12, 1, true), beamGlowMat)
    beamCore.frustumCulled = false
    beamGlow.frustumCulled = false
    beamCore.renderOrder = 20
    beamGlow.renderOrder = 21
    beamGroup.add(beamGlow, beamCore)
    const impact = glowSprite(m.maps.glowPinkMap, 0xff2f45, 44, 0)
    impact.material.depthTest = true
    impact.renderOrder = 22
    this.root.add(impact)
    const impactRing = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 4.4, 64),
      new THREE.MeshBasicMaterial({
        color: 0xff1f35,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    impactRing.frustumCulled = false
    impactRing.visible = false
    impactRing.material.depthTest = true
    impactRing.renderOrder = 23
    this.root.add(impactRing)
    const originGlow = glowSprite(m.maps.glowPinkMap, 0xff2a3d, 2.2, 0)
    originGlow.material.depthTest = false
    originGlow.renderOrder = 24
    this.root.add(originGlow)
    const beamPulses = []
    for (let i = 0; i < 24; i += 1) {
      const sprite = glowSprite(m.maps.glowPinkMap, i % 4 === 0 ? 0xffb05e : 0xff3348, 1.1, 0)
      sprite.material.depthTest = false
      sprite.renderOrder = 25
      this.root.add(sprite)
      beamPulses.push({ sprite, offset: i / 24, speed: 0.18 + (i % 5) * 0.016 })
    }
    this.energyBeam = {
      group: beamGroup,
      core: beamCore,
      glow: beamGlow,
      coreMat: beamCoreMat,
      glowMat: beamGlowMat,
      impact,
      impactRing,
      originGlow,
      pulses: beamPulses,
    }

    this.root.updateMatrixWorld(true)
    this.setEarthTarget(this.earthTarget)
  }

  setEarthTarget(worldPoint) {
    this.earthTarget.copy(worldPoint)
    this.root.updateMatrixWorld(true)
    this.earthTargetLocal.copy(this.earthTarget)
    this.root.worldToLocal(this.earthTargetLocal)
  }

  setEarthAimPoint(worldPoint) {
    this.earthAimPoint.copy(worldPoint)
    this.root.updateMatrixWorld(true)
    this.earthAimPointLocal.copy(this.earthAimPoint)
    this.root.worldToLocal(this.earthAimPointLocal)
  }

  _updateEnergyLaunch(e, time) {
    const coneOpen = smoothstep(0.68, 0.94, e)
    const flowPower = smoothstep(0.3, 0.72, e)
    const beamPower = smoothstep(0.9, 0.995, e)
    const energy = this.energyFlow
    const beam = this.energyBeam
    const cone = this.engineEnergy
    if (!energy || !beam || !cone) return

    // Engine cone extension after the main energy has reached the front.
    const coneLength = 0.18 + 6.4 * coneOpen
    cone.group.visible = coneOpen > 0.005
    cone.group.scale.x = coneLength
    for (const old of [this.plume, this.energyOuter, this.energyCore, this.energyFilament]) {
      if (old) old.visible = coneOpen < 0.05
    }
    cone.outerMat.opacity = 0.26 * coneOpen
    cone.coreMat.opacity = 0.9 * coneOpen
    cone.wireMat.opacity = 0.34 * coneOpen
    cone.tipGlow.material.opacity = 0.8 * coneOpen
    cone.tipGlow.scale.setScalar(1.1 + 0.25 * coneOpen)

    // Red energy runs down the central connector links from the cannon/petal
    // end toward the engine and Earth. The old top-mounted cyan stream is
    // disabled; the transport is read on the connector rings themselves.
    energy.line.visible = false
    for (const item of energy.sprites) item.sprite.visible = false
    for (const tube of energy.tubes) tube.visible = false
    for (const pulse of this.axialEnergyPulses) {
      const t = (time * pulse.speed + pulse.phase) % 1
      const y = 1 - t
      const fade = Math.sin(t * PI)
      pulse.ring.position.y = y
      pulse.ring.material.opacity = flowPower * fade * 0.95
      pulse.glow.position.y = y
      pulse.glow.visible = flowPower > 0.01
      pulse.glow.material.opacity = flowPower * fade * 0.7
    }
    for (const item of this.axialEnergyCores) {
      item.mat.opacity = flowPower * (0.36 + Math.sin(time * 4.3) * 0.08)
    }

    // Point the telescoping cone at the same Earth limb point the beam uses,
    // so the engine, cone and beam are one straight line with no elbow.
    this.root.updateMatrixWorld(true)
    const thrusterGroup = this.partGroups.get('thruster')
    thrusterGroup.updateWorldMatrix(true, false)
    const baseWorld = thrusterGroup.localToWorld(new THREE.Vector3(-7.16, 0, 0))
    const aimInEngine = thrusterGroup.worldToLocal(this.earthAimPoint.clone())
    const coneDirection = aimInEngine.sub(new THREE.Vector3(-7.16, 0, 0)).normalize()
    cone.group.quaternion.setFromUnitVectors(new THREE.Vector3(-1, 0, 0), coneDirection)

    // Beam from the extended cone tip to the Earth surface.
    this.root.updateMatrixWorld(true)
    const tipWorld = new THREE.Vector3()
    cone.tip.getWorldPosition(tipWorld)
    const tip = this.root.worldToLocal(tipWorld)
    // Fire at a point on the Earth-facing limb. The aim point is already on
    // the sphere, so the beam is a single straight segment from cone tip to
    // surface; it no longer has to subtract a radius after aiming at the
    // Earth centre.
    const target = this.earthAimPointLocal
    const toTarget = target.clone().sub(tip)
    const targetLength = toTarget.length()
    if (targetLength < 0.01) return
    const direction = toTarget.multiplyScalar(1 / targetLength)
    const surface = target.clone()
    const delta = surface.clone().sub(tip)
    const length = delta.length()
    const mid = tip.clone().add(surface).multiplyScalar(0.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize())
    const visible = beamPower > 0.005
    beam.group.visible = visible
    beam.impact.visible = visible
    beam.originGlow.visible = visible
    beam.impactRing.visible = visible
    for (const pulse of beam.pulses) pulse.sprite.visible = visible
    if (!visible) {
      beam.impactRing.material.opacity = 0
      return
    }

    for (const mesh of [beam.core, beam.glow]) {
      mesh.position.copy(mid)
      mesh.quaternion.copy(quaternion)
      mesh.scale.set(1, length, 1)
    }
    beam.coreMat.opacity = 0.88 * beamPower
    beam.glowMat.opacity = 0.16 * beamPower
    beam.impact.position.copy(surface)
    beam.impact.material.opacity = 0.82 * beamPower
    beam.impact.scale.setScalar(11 + Math.sin(time * 4.6) * 1.5)
    beam.impactRing.position.copy(surface).addScaledVector(direction, 1.5)
    beam.impactRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
    const ringPulse = 0.8 + Math.sin(time * 3.2) * 0.18
    beam.impactRing.scale.setScalar(0.75 + ringPulse * 0.3)
    beam.impactRing.material.opacity = 0.68 * beamPower * ringPulse
    beam.impactRing.visible = visible
    beam.originGlow.position.copy(tip)
    beam.originGlow.material.opacity = 0.72 * beamPower
    for (const pulse of beam.pulses) {
      const t = (time * pulse.speed + pulse.offset) % 1
      pulse.sprite.position.copy(tip).lerp(surface, t)
      pulse.sprite.material.opacity = beamPower * Math.sin(t * PI) * 0.8
    }
  }

  _bindArmorMaterial(material, role = 'mid') {
    if (!material || !material.color) return
    this.armorBindings.push({ material, role })
  }

  _bindArmorMaterials() {
    // Firing cone and Earth beam.
    const cone = this.engineEnergy
    if (cone) {
      this._bindArmorMaterial(cone.outerMat, 'deep')
      this._bindArmorMaterial(cone.coreMat, 'core')
      this._bindArmorMaterial(cone.wireMat, 'mid')
      this._bindArmorMaterial(cone.tipGlow.material, 'soft')
    }

    const beam = this.energyBeam
    if (beam) {
      this._bindArmorMaterial(beam.coreMat, 'core')
      this._bindArmorMaterial(beam.glowMat, 'deep')
      this._bindArmorMaterial(beam.impact.material, 'mid')
      this._bindArmorMaterial(beam.impactRing.material, 'mid')
      this._bindArmorMaterial(beam.originGlow.material, 'core')
      beam.pulses.forEach((pulse, index) => {
        this._bindArmorMaterial(pulse.sprite.material, index % 4 === 0 ? 'soft' : 'mid')
      })
    }

    // Central axial transfer rings / cores.
    for (const pulse of this.axialEnergyPulses) {
      this._bindArmorMaterial(pulse.mat, 'mid')
      this._bindArmorMaterial(pulse.glow.material, 'soft')
    }
    for (const item of this.axialEnergyCores) {
      this._bindArmorMaterial(item.mat, 'core')
    }

    // Bus-to-cradle transfer device.
    const bridge = this.energyBridge
    if (bridge) {
      this._bindArmorMaterial(bridge.coreMat, 'core')
      this._bindArmorMaterial(bridge.windowMat, 'mid')
      this._bindArmorMaterial(bridge.ringGlowMat, 'mid')
      this._bindArmorMaterial(bridge.halo.material, 'soft')
      this._bindArmorMaterial(bridge.dockFlare.material, 'soft')
      bridge.pulseRings.forEach((item) => this._bindArmorMaterial(item.material, 'mid'))
      bridge.pulses.forEach((pulse) => this._bindArmorMaterial(pulse.material, 'mid'))
      bridge.claws.forEach((claw) => this._bindArmorMaterial(claw.tipGlow.material, 'mid'))
      bridge.ringPadGlows.forEach((glow) => this._bindArmorMaterial(glow.material, 'mid'))
    }

    // Large petal laser mesh and beams.
    const fx = this.petalLaser
    if (fx) {
      this._bindArmorMaterial(fx.netMat, 'mid')
      this._bindArmorMaterial(fx.beamMat, 'mid')
      this._bindArmorMaterial(fx.bigBeamMat, 'core')
      this._bindArmorMaterial(fx.bigGlowMat, 'deep')
      this._bindArmorMaterial(fx.outlineMat, 'mid')
      fx.apexSprites.forEach((sprite) => this._bindArmorMaterial(sprite.material, 'soft'))
    }

    // Six petal-net relay beams and the aft receiver ring.
    const relay = this.petalEnergyRelay
    if (relay) {
      this._bindArmorMaterial(relay.ringMat, 'mid')
      this._bindArmorMaterial(relay.portMat, 'soft')
      this._bindArmorMaterial(relay.coreMat, 'core')
      this._bindArmorMaterial(relay.coreGlow.material, 'core')
      this._bindArmorMaterial(relay.ringHalo.material, 'soft')
      relay.ports.forEach((port) => this._bindArmorMaterial(port.glow.material, 'soft'))
      relay.beams.forEach((beam) => {
        this._bindArmorMaterial(beam.coreMat, 'core')
        this._bindArmorMaterial(beam.glowMat, 'deep')
        this._bindArmorMaterial(beam.originGlow.material, 'soft')
        this._bindArmorMaterial(beam.targetGlow.material, 'mid')
        beam.pulses.forEach((pulse) => this._bindArmorMaterial(pulse.sprite.material, 'mid'))
      })
    }

    // Five launcher plasma muzzles / cradles.
    this._bindArmorMaterial(this.plasmaRedMat, 'mid')
    for (const muzzle of this.plasmaMuzzles) this._bindArmorMaterial(muzzle.material, 'soft')
    for (const pipe of this.cradlePipes) {
      for (const pulse of pipe.pulses) this._bindArmorMaterial(pulse.sprite.material, 'mid')
      this._bindArmorMaterial(pipe.endGlow.material, 'soft')
    }
    this._bindArmorMaterial(this.cradlePipeCoreMat, 'core')

    // Hub link and five-prong conduit energy.
    this._bindArmorMaterial(this.hubLinkEnergyMat, 'core')
    if (this.hubLinkPulse) this._bindArmorMaterial(this.hubLinkPulse.material, 'mid')
    if (this.hubLinkEndGlow) this._bindArmorMaterial(this.hubLinkEndGlow.material, 'soft')
    this._bindArmorMaterial(this.railEnergyMat, 'mid')
    for (const pulse of this.railPulses) this._bindArmorMaterial(pulse.sprite.material, 'mid')
    for (const glow of this.railTipGlows) this._bindArmorMaterial(glow.material, 'soft')
    for (const pulse of this.railAggregatePulses) this._bindArmorMaterial(pulse.sprite.material, 'soft')

    // Engine port / claws / sparks.
    if (this.energyOuter) this._bindArmorMaterial(this.energyOuter.material, 'deep')
    if (this.energyCore) this._bindArmorMaterial(this.energyCore.material, 'core')
    if (this.energyFilament) this._bindArmorMaterial(this.energyFilament.material, 'soft')
    if (this.energyHalo) this._bindArmorMaterial(this.energyHalo.material, 'soft')
    for (const spark of this.energySparks) this._bindArmorMaterial(spark.material, 'mid')
    for (const claw of this.energyClaws) this._bindArmorMaterial(claw.tipGlow.material, 'mid')

    // Fusion core.
    this._bindArmorMaterial(this.coreSphere?.material, 'core')
    this._bindArmorMaterial(this.coreHalo?.material, 'soft')
    this._bindArmorMaterial(this.coreHalloSprite?.material, 'soft')

    // Engine port rings need private materials; the originals were shared
    // structural cyan/pink glows used elsewhere on the ship.
    this.energyRings.forEach((ring, index) => {
      if (!ring.material?.isMeshBasicMaterial) return
      const material = ring.material.clone()
      ring.material = material
      this._bindArmorMaterial(material, index % 2 === 0 ? 'mid' : 'deep')
    })

    this.armorLights = [this.coreLight, this.energyBridge?.chargeLight, this.energyPortLight].filter(Boolean)
    this.armorGlassMaterials = [this.railGlassMat, this.coreShellMat].filter(Boolean)
  }

  getArmorScreenView(id = 'long') {
    const profile = getArmorProfile(id)
    const entry = this.cradleEmitters.find((item) => item.index === profile.screenIndex)
    if (!entry) return null
    const screen = entry.screens.find((item) => item.side > 0) || entry.screens[0]
    this.root.updateMatrixWorld(true)
    entry.emitter.updateWorldMatrix(true, true)
    screen.mesh.updateWorldMatrix(true, false)
    const point = new THREE.Vector3()
    screen.mesh.getWorldPosition(point)
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(screen.mesh.getWorldQuaternion(new THREE.Quaternion()))
    return { point, normal, profile, screen }
  }

  focusArmorScreen(id = 'long', { immediate = false } = {}) {
    const profile = getArmorProfile(id)
    const index = profile.screenIndex ?? 0
    const desired = -(PI / 2 + (index / 5) * TAU)
    const current = this.plasmaRingRotation
    let delta = desired - current
    delta = ((delta + PI) % TAU + TAU) % TAU - PI
    this.plasmaRingTargetRotation = current + delta
    if (immediate) {
      this.plasmaRingRotation = this.plasmaRingTargetRotation
      this.plasmaRingTween = null
      if (this.plasmaRing) this.plasmaRing.rotation.x = this.plasmaRingRotation
    } else {
      this.plasmaRingTween = {
        from: current,
        to: this.plasmaRingTargetRotation,
        start: performance.now() * 0.001,
        duration: 1.15,
      }
    }
    return profile
  }

  setArmorTheme(id = 'long') {
    const profile = getArmorProfile(id)
    this.armorId = profile.id
    const roles = {}
    for (const [role, values] of Object.entries(profile.energy)) {
      roles[role] = new THREE.Color(...values)
    }
    for (const binding of this.armorBindings) {
      const color = roles[binding.role] || roles.mid
      binding.material.color.copy(color)
    }
    const ui = new THREE.Color(profile.ui)
    for (const light of this.armorLights) light.color.copy(ui)
    for (const material of this.armorGlassMaterials) {
      material.color.copy(ui)
      material.emissive.copy(ui)
      material.emissiveIntensity = 0.9
    }
    return profile
  }

  _updatePetalEnergyRelay(e, time) {
    const relay = this.petalEnergyRelay
    if (!relay) return
    const power = smoothstep(0.85, 0.97, e)
    const pulse = 0.84 + Math.sin(time * 6.4) * 0.12
    relay.ringMat.opacity = 0.1 + power * 0.5 * pulse
    relay.portMat.opacity = 0.16 + power * 0.6 * pulse
    relay.coreMat.opacity = 0.16 + power * 0.72 * pulse
    relay.coreGlow.material.opacity = 0.18 + power * 0.72 * pulse
    if (relay.ringHalo) relay.ringHalo.material.opacity = 0.08 + power * 0.5 * pulse
    for (const port of relay.ports) {
      port.glow.material.opacity = 0.14 + power * 0.72 * pulse
    }

    const apexes = this.petalNetApexes
    const active = power > 0.004 && apexes?.length === 6
    for (const beam of relay.beams) {
      beam.core.visible = active
      beam.glow.visible = active
      beam.originGlow.visible = active
      beam.targetGlow.visible = active
      for (const pulseSprite of beam.pulses) pulseSprite.sprite.visible = active
    }
    if (!active) return

    this.root.updateMatrixWorld(true)
    this.bladeRotor.updateMatrixWorld(true)
    this.partGroups.get('cradle').updateMatrixWorld(true)
    relay.receiver.updateMatrixWorld(true)

    const origins = apexes.map((apex) => {
      const world = this.bladeRotor.localToWorld(apex.clone())
      return this.root.worldToLocal(world)
    })
    const targets = relay.ports.map((port) => {
      const world = relay.receiver.localToWorld(port.local.clone())
      return this.root.worldToLocal(world)
    })

    const up = new THREE.Vector3(0, 1, 0)
    const delta = new THREE.Vector3()
    const mid = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()

    for (let i = 0; i < relay.beams.length; i += 1) {
      const beam = relay.beams[i]
      const origin = origins[i]
      const target = targets[i % targets.length]
      delta.subVectors(target, origin)
      const length = delta.length()
      if (length < 0.02) {
        beam.core.visible = false
        beam.glow.visible = false
        beam.originGlow.visible = false
        beam.targetGlow.visible = false
        continue
      }
      mid.addVectors(origin, target).multiplyScalar(0.5)
      quaternion.setFromUnitVectors(up, delta.multiplyScalar(1 / length))
      for (const mesh of [beam.core, beam.glow]) {
        mesh.position.copy(mid)
        mesh.quaternion.copy(quaternion)
        mesh.scale.set(1, length, 1)
      }
      beam.coreMat.opacity = 0.82 * power * pulse
      beam.glowMat.opacity = 0.16 * power * pulse
      beam.originGlow.position.copy(origin)
      beam.originGlow.material.opacity = 0.8 * power * pulse
      beam.targetGlow.position.copy(target)
      beam.targetGlow.material.opacity = 0.72 * power * pulse
      for (const pulseSprite of beam.pulses) {
        const t = (time * pulseSprite.speed + pulseSprite.offset) % 1
        pulseSprite.sprite.position.copy(origin).lerp(target, t)
        pulseSprite.sprite.material.opacity = power * Math.sin(t * PI) * 0.82
      }
    }
  }

  _updatePetalLasers(e, time) {
    const fx = this.petalLaser
    if (!fx) return
    const power = smoothstep(0.82, 0.995, e)
    const visible = power > 0.005
    fx.netMesh.visible = visible
    fx.beams.visible = visible
    fx.outline.visible = false
    for (const mesh of fx.bigBeams) mesh.visible = visible
    for (const mesh of fx.bigGlows) mesh.visible = visible
    for (const sprite of fx.apexSprites) sprite.visible = visible
    if (!visible) return

    this.bladeRotor.updateMatrixWorld(true)
    const bigTips = []
    const apexes = []
    const armTips = []
    const armRoots = []
    const bigTipLocal = new THREE.Vector3(0, 7.05, 0)
    const apexLocal = new THREE.Vector3(0, 14.05, 0)
    const armTipLocal = new THREE.Vector3(0, 8.45, 0)
    for (const blade of this.bladeRoots) {
      const holder = blade.holder
      const tip = holder.localToWorld(bigTipLocal.clone())
      this.bladeRotor.worldToLocal(tip)
      bigTips.push(tip)
      const apex = holder.localToWorld(apexLocal.clone())
      this.bladeRotor.worldToLocal(apex)
      apexes.push(apex)
    }
    for (const pair of this.scissorArms) {
      const pairTips = []
      const pairRoots = []
      for (const pivot of pair) {
        const tip = pivot.localToWorld(armTipLocal.clone())
        this.bladeRotor.worldToLocal(tip)
        pairTips.push(tip)
        const root = pivot.localToWorld(new THREE.Vector3(0, 0, 0))
        this.bladeRotor.worldToLocal(root)
        pairRoots.push(root)
      }
      armTips.push(pairTips)
      armRoots.push(pairRoots)
    }

    const netPos = fx.netGeo.attributes.position
    const beamPos = fx.beamGeo.attributes.position
    const outPos = fx.outlineGeo.attributes.position
    const setBeam = (attr, index, a, b) => {
      attr.setXYZ(index, a.x, a.y, a.z)
      attr.setXYZ(index + 1, b.x, b.y, b.z)
    }
    let ni = 0
    let bi = 0
    let oi = 0
    const up = new THREE.Vector3(0, 1, 0)
    const mid = new THREE.Vector3()
    const dir = new THREE.Vector3()
    for (let i = 0; i < 6; i += 1) {
      const c = apexes[i]
      const l = armTips[i][0]
      const r = armTips[i][1]
      const rl = armRoots[i][0]
      const rr = armRoots[i][1]
      // One continuous five-sided net per large petal: both root corners,
      // both scissor tips, and the common apex. No central divider.
      for (const [a, b] of [[rl, l], [rl, rr], [rr, r]]) {
        netPos.setXYZ(ni, a.x, a.y, a.z)
        ni += 1
        netPos.setXYZ(ni, b.x, b.y, b.z)
        ni += 1
        netPos.setXYZ(ni, c.x, c.y, c.z)
        ni += 1
      }
      // The two scissor tips each send one red beam to the apex.
      setBeam(beamPos, bi, l, c)
      bi += 2
      setBeam(beamPos, bi, r, c)
      bi += 2
      fx.apexSprites[i].position.copy(c)

      // The large-petal beam is a thick, deeper red tube with an outer glow.
      mid.addVectors(bigTips[i], c).multiplyScalar(0.5)
      dir.subVectors(c, bigTips[i])
      const len = dir.length()
      if (len > 0.001) {
        dir.multiplyScalar(1 / len)
        for (const mesh of [fx.bigBeams[i], fx.bigGlows[i]]) {
          mesh.position.copy(mid)
          mesh.scale.set(1, len, 1)
          mesh.quaternion.setFromUnitVectors(up, dir)
        }
      }
    }
    this.petalNetApexes = apexes.map((apex) => apex.clone())
    netPos.needsUpdate = true
    beamPos.needsUpdate = true
    outPos.needsUpdate = true

    const pulse = 0.82 + Math.sin(time * 7.2) * 0.12
    fx.netMat.opacity = power * 0.6 * pulse
    fx.beamMat.opacity = power * 0.7
    fx.bigBeamMat.opacity = power * 0.98 * pulse
    fx.bigGlowMat.opacity = power * 0.3 * pulse
    for (const sprite of fx.apexSprites) {
      sprite.material.opacity = power * 0.7 * pulse
    }
  }

  _buildBlades(parent) {
    const m = this.materials
    const rotor = new THREE.Group()
    parent.add(rotor)
    this.bladeRotor = rotor

    this._buildRotorHub(rotor)

    const whiteBladeMat = m.ceramic
    const bladeMain = this._bladeShape()
    const innerShape = [
      [-0.12, 1.2],
      [-0.39, 2.2],
      [-0.28, 3.7],
      [-0.09, 5.1],
      [0.03, 6.0],
      [0.16, 5.0],
      [0.33, 3.7],
      [0.33, 2.2],
      [0.16, 1.2],
    ]
    const centralRib = [
      [-0.06, 0.93],
      [-0.16, 2.3],
      [-0.11, 4.2],
      [0.0, 6.8],
      [0.1, 4.2],
      [0.13, 2.1],
      [0.1, 0.94],
    ]
    const scissorShape = [
      [-0.12, 0.0],
      [-0.21, 3.6],
      [-0.1, 7.8],
      [0.0, 8.45],
      [0.1, 7.7],
      [0.18, 3.5],
      [0.1, 0.0],
    ]
    const nodePositions = [
      [1.54, -0.38, 0.42],
      [2.44, 0.23, 0.32],
      [3.28, -0.26, 0.29],
      [4.1, 0.12, 0.26],
      [4.92, -0.12, 0.22],
      [5.66, 0.05, 0.16],
    ]

    for (let i = 0; i < 6; i += 1) {
      const root = new THREE.Group()
      root.rotation.x = (i / 6) * TAU
      rotor.add(root)

      const holder = new THREE.Group()
      root.add(holder)
      this.bladeRoots.push({ root, holder, index: i })
      this._buildBladeConnector(root, i)

      const white = extrudedPlate(bladeMain, 0.18, whiteBladeMat, { bevel: 0.033, segments: 2 })
      white.position.x = 0
      holder.add(white)

      // Dark under-spathes break up the bright silhouette.
      const back = extrudedPlate(this._bladeShape(0.9, -0.16), 0.1, m.navySilk, { bevel: 0.024 })
      back.position.x = -0.15
      back.position.z = 0.02
      holder.add(back)

      const under = extrudedPlate(this._bladeShape(0.72, 0.36), 0.07, m.navy, { bevel: 0.02 })
      under.position.x = -0.24
      holder.add(under)

      // Rear-side treatment: the reverse face used to read as a black slab.
      // A blue solar-cell backing, a titanium spine and red cross-ribs keep it
      // readable from the back without changing the front graphic.
      const backPanel = extrudedPlate(innerShape, 0.035, m.solar, { bevel: 0.008 })
      backPanel.position.x = -0.36
      backPanel.scale.z = 1.04
      holder.add(backPanel)
      holder.add(boxMesh(0.025, 1.15, 0.66, m.solar, -0.385, 2.35, 0))
      holder.add(boxMesh(0.025, 1.35, 0.62, m.solar, -0.385, 3.85, 0))
      holder.add(boxMesh(0.025, 1.0, 0.55, m.solar, -0.385, 5.05, 0))
      holder.add(boxMesh(0.045, 4.7, 0.075, m.titanium, -0.322, 3.9, 0))
      for (const y of [1.9, 3.05, 4.2, 5.35]) {
        holder.add(boxMesh(0.03, 0.06, 0.76, m.glowPink, -0.325, y, 0))
      }
      for (const side of [-1, 1]) {
        holder.add(boxMesh(0.025, 3.9, 0.035, m.glowPink, -0.326, 3.8, side * 0.44))
      }

      const inlay = extrudedPlate(innerShape, 0.06, m.navy, { bevel: 0.013 })
      inlay.position.x = 0.115
      inlay.position.z = 0.02
      holder.add(inlay)

      const rib = extrudedPlate(centralRib, 0.05, m.whiteSilk, { bevel: 0.012 })
      rib.position.x = 0.174
      holder.add(rib)

      const darkTip = extrudedPlate(
        [
          [0.01, 5.85],
          [0.29, 6.22],
          [0.02, 7.08],
          [-0.19, 6.5],
        ],
        0.055,
        m.navySilk,
        { bevel: 0.01 },
      )
      darkTip.position.x = 0.15
      holder.add(darkTip)

      // Central luminous conduit and fine cyan edge traces.
      const conduit = boxMesh(0.025, 2.8, 0.032, m.glowPink, 0.205, 3.4, 0.02)
      holder.add(conduit)
      const edgeLine = boxMesh(0.018, 2.6, 0.018, m.glowCyan, 0.19, 3.55, 0.6)
      edgeLine.rotation.z = 0.055
      holder.add(edgeLine)
      const edgeLine2 = boxMesh(0.018, 2.35, 0.018, m.bladeEdge, 0.19, 3.34, -0.52)
      edgeLine2.rotation.z = -0.06
      holder.add(edgeLine2)

      // Cross ribs.
      for (const [radial, width] of [
        [1.94, 0.65],
        [3.2, 0.9],
        [4.52, 0.72],
        [5.48, 0.4],
      ]) {
        const cross = boxMesh(0.035, 0.04, width, m.gunmetal, 0.19, radial, 0)
        cross.rotation.y = 0.05
        holder.add(cross)
        holder.add(boxMesh(0.042, 0.07, 0.055, m.titanium, 0.19, radial, width / 2))
        holder.add(boxMesh(0.042, 0.07, 0.055, m.titanium, 0.19, radial, -width / 2))
      }

      // Tiny hub-side hinge.
      holder.add(cylinderX(0.17, 0.17, 0.5, m.titanium, 0, 0.76, 0, 16))
      holder.add(cylinderX(0.1, 0.1, 0.56, m.ink, 0.12, 0.76, 0, 16))
      holder.add(torusX(0.27, 0.026, m.chrome, 0.27))
      const rootCap = boxMesh(0.34, 0.24, 0.46, m.whiteSilk, 0.08, 1.05, 0)
      holder.add(rootCap)

      // Pink energy nodes on alternating edges.
      for (const [radial, z, size] of nodePositions) {
        const node = new THREE.Mesh(new THREE.IcosahedronGeometry(size * 0.25, 1), m.glowPink)
        node.position.set(0.205, radial, z)
        holder.add(node)
        const glow = glowSprite(m.maps.glowPinkMap, 0xff5a94, size * 1.45, 0.7)
        glow.position.set(0.22, radial, z)
        holder.add(glow)
        this.nodeSprites.push(glow)
      }

      // Soft magenta auras bridge the hard light nodes into a glowing vein.
      for (const [radial, scale, z] of [
        [2.1, 0.9, 0.12],
        [3.7, 1.02, -0.16],
        [5.15, 0.72, 0.08],
      ]) {
        const aura = glowSprite(m.maps.glowPinkMap, 0xff5d98, scale, 0.22)
        aura.position.set(0.23, radial, z)
        holder.add(aura)
        this.nodeSprites.push(aura)
      }

      const tipGlow = glowSprite(m.maps.glowWhiteMap, 0xeaffff, 0.55, 0.5)
      tipGlow.position.set(0.04, 7.12, 0.02)
      holder.add(tipGlow)

      // Thin blade root strut going back toward the hub.
      holder.add(boxMesh(0.12, 0.68, 0.14, m.ink, -0.1, 0.94, 0.3).rotateX(0.2))

      // Two long scissor-like side arms clamp this large petal. Their length
      // is 1.3x the visible large petal; the tips, not the side petals, emit.
      const armPivots = []
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group()
        pivot.position.set(0, 0.75, side * 1.05)
        pivot.rotation.x = side * 0.03
        holder.add(pivot)
        const arm = extrudedPlate(scissorShape, 0.065, m.whiteSilk, { bevel: 0.012, segments: 1 })
        arm.position.x = -0.03
        pivot.add(arm)
        const armInset = extrudedPlate(
          scissorShape.map(([z, y]) => [z * 0.62, y]),
          0.035,
          m.navySilk,
          { bevel: 0.006, segments: 1 },
        )
        armInset.position.x = 0.025
        pivot.add(armInset)
        pivot.add(boxMesh(0.018, 3.8, 0.022, m.glowPink, 0.035, 4.1, 0.0))
        pivot.add(boxMesh(0.018, 3.4, 0.02, m.glowPink, 0.035, 4.0, 0.09))
        pivot.add(boxMesh(0.018, 3.4, 0.02, m.glowPink, 0.035, 4.0, -0.09))
        pivot.add(cylinderX(0.1, 0.1, 0.24, m.titanium, 0, 0.08, 0, 12))
        pivot.add(boxMesh(0.2, 0.16, 0.42, m.gunmetal, 0, 0.2, 0))
        const tip = glowSprite(m.maps.glowPinkMap, 0xff5a90, 0.25, 0.45)
        tip.position.set(0, 8.4, 0)
        pivot.add(tip)
        armPivots.push(pivot)
      }
      this.scissorArms.push(armPivots)
    }

    for (let i = 0; i < 6; i += 1) {
      const root = new THREE.Group()
      root.rotation.x = (i / 6) * TAU + TAU / 12
      rotor.add(root)
      const holder = new THREE.Group()
      root.add(holder)
      this.bladeSecondaries.push(holder)

      const shape = [
        [-0.34, 1.0],
        [-0.6, 2.2],
        [-0.38, 4.05],
        [-0.08, 5.16],
        [0.26, 4.15],
        [0.39, 2.34],
        [0.18, 1.1],
      ]
      const secondary = extrudedPlate(shape, 0.1, m.navySilk, { bevel: 0.02 })
      secondary.position.x = -0.2
      holder.add(secondary)
      const secondaryEdge = boxMesh(0.035, 2.95, 0.04, m.glowCyan, -0.06, 2.86, 0.06)
      secondaryEdge.rotation.z = 0.045
      holder.add(secondaryEdge)
      const smallWhite = extrudedPlate(
        [
          [-0.17, 1.4],
          [-0.3, 2.4],
          [-0.13, 3.4],
          [0.02, 2.2],
          [0.12, 1.35],
        ],
        0.055,
        m.whiteSilk,
        { bevel: 0.012 },
      )
      smallWhite.position.x = -0.12
      holder.add(smallWhite)
      const tipGlow = glowSprite(m.maps.glowPinkMap, 0xff5e9a, 0.36, 0.5)
      tipGlow.position.set(-0.12, 4.9, 0.03)
      holder.add(tipGlow)
      this.nodeSprites.push(tipGlow)
    }

    // A pair of fine orbital trimming fins on the rotor outside the blades.
    const trim = new THREE.Group()
    trim.rotation.x = 0.35
    rotor.add(trim)
    for (const side of [1, -1]) {
      const fin = plateXY(
        [
          [-0.3, 1.4],
          [0.2, 1.58],
          [0.8, 2.16],
          [0.25, 2.32],
          [-0.2, 2.0],
        ],
        0.06,
        side > 0 ? m.whiteSilk : m.titanium,
        0.012,
      )
      fin.rotation.z = side * 0.04
      fin.position.z = side * 0.2
      trim.add(fin)
    }
    this._buildPetalLaserNet(rotor)
  }

  _buildPetalLaserNet(rotor) {
    const m = this.materials
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.012)'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.lineWidth = 1.8
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)'
    ctx.shadowBlur = 5
    const hexR = 48
    const hexH = hexR * Math.sqrt(3)
    const drawHex = (cx, cy) => {
      ctx.beginPath()
      for (let k = 0; k < 6; k += 1) {
        const a = PI / 6 + k * PI / 3
        const x = cx + Math.cos(a) * hexR
        const y = cy + Math.sin(a) * hexR
        if (k === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    }
    for (let row = -2; row < 10; row += 1) {
      for (let col = -2; col < 10; col += 1) {
        const cx = col * hexR * 1.5
        const cy = row * hexH + (col % 2 ? hexH * 0.5 : 0)
        drawHex(cx, cy)
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2.0, 2.0)
    const netMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    })
    const netGeo = new THREE.BufferGeometry()
    netGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18 * 3 * 3), 3))
    const uv = new Float32Array(18 * 3 * 2)
    for (let i = 0; i < 18; i += 1) {
      uv[i * 6 + 0] = 0
      uv[i * 6 + 1] = 0
      uv[i * 6 + 2] = 1
      uv[i * 6 + 3] = 0
      uv[i * 6 + 4] = 0.5
      uv[i * 6 + 5] = 1
    }
    netGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    const netMesh = new THREE.Mesh(netGeo, netMat)
    netMesh.frustumCulled = false
    netMesh.renderOrder = 10
    netMesh.visible = false
    rotor.add(netMesh)

    const beamGeo = new THREE.BufferGeometry()
    beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 2 * 3), 3))
    const beamMat = new THREE.LineBasicMaterial({
      color: 0xff6a84,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const beams = new THREE.LineSegments(beamGeo, beamMat)
    beams.frustumCulled = false
    beams.visible = false
    rotor.add(beams)

    const bigBeamGeo = new THREE.CylinderGeometry(0.052, 0.052, 1, 8, 1, true)
    const bigGlowGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 8, 1, true)
    const bigBeamMat = new THREE.MeshBasicMaterial({
      color: 0xff0a32,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const bigGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff244b,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    })
    const bigBeams = []
    const bigGlows = []
    for (let i = 0; i < 6; i += 1) {
      const core = new THREE.Mesh(bigBeamGeo, bigBeamMat)
      core.visible = false
      core.frustumCulled = false
      rotor.add(core)
      bigBeams.push(core)
      const glow = new THREE.Mesh(bigGlowGeo, bigGlowMat)
      glow.visible = false
      glow.frustumCulled = false
      rotor.add(glow)
      bigGlows.push(glow)
    }

    const outlineGeo = new THREE.BufferGeometry()
    outlineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * 2 * 3), 3))
    const outlineMat = new THREE.LineBasicMaterial({
      color: 0xff6a8e,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const outline = new THREE.LineSegments(outlineGeo, outlineMat)
    outline.frustumCulled = false
    outline.visible = false
    rotor.add(outline)

    const apexSprites = []
    for (let i = 0; i < 6; i += 1) {
      const sprite = glowSprite(m.maps.glowPinkMap, 0xff3b63, 0.8, 0)
      sprite.visible = false
      rotor.add(sprite)
      apexSprites.push(sprite)
    }

    this.petalLaser = {
      netMesh, netGeo, netMat,
      beams, beamGeo, beamMat,
      bigBeams, bigGlows, bigBeamMat, bigGlowMat,
      outline, outlineGeo, outlineMat,
      apexSprites,
    }
  }

  // ---------------------------------------------------------------------------
  // TRIFURCATE MAGNETIC RAILS
  // ---------------------------------------------------------------------------

  _buildRails(parent) {
    const m = this.materials
    const railEnergyMat = m.glowWarm.clone()
    const railGlassMat = m.glowGlass.clone()
    this.railEnergyMat = railEnergyMat
    this.railGlassMat = railGlassMat
    const count = 5
    const angles = Array.from({ length: count }, (_, i) => HALF_PI + (i / count) * TAU)
    const baseRadius = 1.9
    const tubeLength = 7.4
    const tubeCenter = 5.05
    const shellRadius = 0.43
    const shellLength = 3.35
    this.railProngs = []
    this.railPulses = []
    this.railTipGlows = []
    this.axialEnergyPulses = []
    this.axialEnergyCores = []
    this.railAggregatePulses = []
    this.railSupports = []

    for (let index = 0; index < count; index += 1) {
      const angle = angles[index]
      const angleRoot = new THREE.Group()
      angleRoot.rotation.x = angle
      parent.add(angleRoot)

      // The left/base end is the hinge. The barrel is built with its base at
      // local X=1.3; shifting the content by -1.3 puts that point at the hinge
      // origin, so the base stays fixed while the muzzle end swings outward.
      const hinge = new THREE.Group()
      hinge.position.set(1.3, baseRadius, 0)
      angleRoot.add(hinge)
      const content = new THREE.Group()
      content.position.x = -1.3
      hinge.add(content)

      // The visible energy conduit: a transparent sleeve over a hot inner
      // line. It stays inside the shell until the shell breaks apart.
      content.add(cylinderX(0.2, 0.2, tubeLength, railGlassMat, tubeCenter, 0, 0, 20))
      content.add(cylinderX(0.115, 0.115, tubeLength - 0.18, railEnergyMat, tubeCenter, 0, 0, 16))
      for (let x = 1.9; x <= 8.1; x += 0.78) {
        const coil = torusX(0.235, 0.024, m.titanium, x, 6, 24)
        content.add(coil)
      }
      content.add(cylinderX(0.31, 0.38, 0.46, m.ink, 1.34, 0, 0, 20))
      content.add(cylinderX(0.22, 0.27, 0.32, m.chrome, 1.62, 0, 0, 18))
      content.add(torusX(0.34, 0.035, m.titanium, 1.48, 8, 36))
      content.add(torusX(0.3, 0.028, m.glowPink, 1.56, 8, 36))

      // Energy muzzle at the tip.
      content.add(cylinderX(0.3, 0.36, 0.46, m.ink, 8.55, 0, 0, 20))
      content.add(torusX(0.32, 0.035, m.titanium, 8.36, 8, 36))
      content.add(torusX(0.265, 0.026, railEnergyMat, 8.74, 8, 36))
      content.add(cylinderX(0.12, 0.17, 0.3, railEnergyMat, 8.96, 0, 0, 14))
      const tipGlow = glowSprite(m.maps.glowWarmMap, 0xffc27a, 0.55, 0.6)
      tipGlow.position.set(9.12, 0, 0)
      content.add(tipGlow)
      this.nodeSprites.push(tipGlow)
      this.railTipGlows.push(tipGlow)

      // Six long shell petals. Each shell is split into a forward and an aft
      // half, giving twelve separate armor pieces per barrel.
      const shells = []
      for (let k = 0; k < 6; k += 1) {
        const a = (k / 6) * TAU
        const pivot = new THREE.Group()
        pivot.rotation.x = a
        content.add(pivot)

        const front = new THREE.Group()
        front.position.set(6.35, shellRadius, 0)
        pivot.add(front)
        const rear = new THREE.Group()
        rear.position.set(3.0, shellRadius, 0)
        pivot.add(rear)

        for (const [piece, forward] of [[front, true], [rear, false]]) {
          piece.add(boxMesh(shellLength, 0.13, 0.4, m.whiteSilk, 0, 0, 0))
          piece.add(boxMesh(shellLength * 0.96, 0.03, 0.34, m.titanium, 0, 0.075, 0))
          piece.add(boxMesh(shellLength * 0.9, 0.02, 0.28, m.ink, 0, -0.075, 0))
          for (const side of [-1, 1]) {
            piece.add(boxMesh(shellLength, 0.1, 0.05, m.titanium, 0, 0.02, side * 0.2))
          }
          piece.add(boxMesh(0.07, 0.15, 0.4, m.ink, shellLength / 2 - 0.04, 0, 0))
          piece.add(boxMesh(0.5, 0.025, 0.05, m.glowPink, forward ? 0.32 : -0.32, 0.09, 0))
          piece.add(boxMesh(0.18, 0.18, 0.18, m.gunmetal, 0, -0.09, 0))
          if (forward) {
            piece.add(boxMesh(0.22, 0.08, 0.42, m.hazard, 0.9, 0.08, 0))
          }
        }

        shells.push({
          pivot,
          front,
          rear,
          baseFront: 6.35,
          baseRear: 3.0,
          baseY: shellRadius,
        })
      }

      // Four energy pulses in each exposed conduit.
      for (let j = 0; j < 4; j += 1) {
        const sprite = glowSprite(m.maps.glowWarmMap, 0xffb869, 0.28, 0)
        sprite.position.set(2.2, 0, 0)
        content.add(sprite)
        this.railPulses.push({
          sprite,
          offset: j / 4,
          speed: 0.13 + index * 0.006 + j * 0.004,
        })
      }

      this.railProngs.push({ angleRoot, hinge, content, baseRadius, shells })
    }

    // Two five-sided support frames tying the five barrels together.
    for (const x of [2.46, 6.3]) {
      const support = new THREE.Group()
      support.position.x = x
      parent.add(support)
      for (let i = 0; i < count; i += 1) {
        const a1 = angles[i]
        const a2 = angles[(i + 1) % count]
        const p1 = new THREE.Vector3(0, Math.cos(a1) * 2.38, Math.sin(a1) * 2.38)
        const p2 = new THREE.Vector3(0, Math.cos(a2) * 2.38, Math.sin(a2) * 2.38)
        support.add(
          makeCurveTube([p1, p1.clone().lerp(p2, 0.5).multiplyScalar(1.02), p2], 0.04, m.titanium, 16, 5),
        )
        support.add(
          boxMesh(0.3, 0.22, 0.24, m.ink, 0, Math.cos(a1) * 2.36, Math.sin(a1) * 2.36).rotateX(a1),
        )
        support.add(
          boxMesh(0.16, 0.08, 0.1, m.glowPink, 0.08, Math.cos(a1) * 2.48, Math.sin(a1) * 2.48).rotateX(a1),
        )
        const inner = new THREE.Vector3(0, Math.cos(a1) * 0.74, Math.sin(a1) * 0.74)
        support.add(cylinderBetween(inner, p1, 0.03, m.chrome, 6))
      }
      support.add(torusX(0.76, 0.03, m.glowPink, 0, 8, 40))
      this.railSupports.push({ group: support, x })
    }

    // Pentagonal base yoke feeding the five barrels.
    const yoke = new THREE.Group()
    yoke.position.x = 1.28
    parent.add(yoke)
    for (let i = 0; i < count; i += 1) {
      const a1 = angles[i]
      const a2 = angles[(i + 1) % count]
      const p1 = new THREE.Vector3(0, Math.cos(a1) * 2.0, Math.sin(a1) * 2.0)
      const p2 = new THREE.Vector3(0, Math.cos(a2) * 2.0, Math.sin(a2) * 2.0)
      yoke.add(
        makeCurveTube([p1, p1.clone().lerp(p2, 0.5).multiplyScalar(1.03), p2], 0.045, m.titanium, 18, 5),
      )
      yoke.add(cylinderBetween(new THREE.Vector3(-0.5, 0, 0), p1, 0.04, m.ink, 6))
    }
    yoke.add(torusX(0.55, 0.03, m.glowPink, 0.12))
    yoke.add(circleRing(0.64, 0.52, 0.1, m.ink, -0.18))

    // The central aggregate energy tube: exactly half the barrel length,
    // noticeably wider than a barrel, with an engine-like flared aft bell.
    const aggregate = new THREE.Group()
    parent.add(aggregate)
    const aggCenter = 5.0
    const aggLength = 3.8
    aggregate.add(cylinderX(0.6, 0.68, aggLength, m.ink, aggCenter, 0, 0, 30, true))
    aggregate.add(cylinderX(0.48, 0.54, aggLength - 0.08, railGlassMat, aggCenter, 0, 0, 28, true))
    aggregate.add(cylinderX(0.3, 0.34, aggLength - 0.5, railEnergyMat, aggCenter, 0, 0, 20))
    for (const x of [3.4, 4.4, 5.4, 6.4]) {
      aggregate.add(cylinderX(0.7, 0.7, 0.16, m.whiteSilk, x, 0, 0, 28))
      aggregate.add(torusX(0.71, 0.028, m.titanium, x + 0.1, 8, 44))
    }
    aggregate.add(cylinderX(0.88, 0.63, 0.74, m.ink, 2.92, 0, 0, 30, true))
    aggregate.add(torusX(0.87, 0.05, railEnergyMat, 2.58, 8, 48))
    aggregate.add(cylinderX(0.56, 0.82, 0.36, m.ink, 7.06, 0, 0, 28, true))
    aggregate.add(torusX(0.57, 0.035, railEnergyMat, 7.2, 8, 40))
    aggregate.add(circleRing(0.5, 0.34, 0.08, railEnergyMat, 7.35))

    // Five radial braces from the aggregate to the barrel roots.
    for (let i = 0; i < count; i += 1) {
      const a = angles[i]
      aggregate.add(
        cylinderBetween(
          new THREE.Vector3(5.0, Math.cos(a) * 0.72, Math.sin(a) * 0.72),
          new THREE.Vector3(5.0, Math.cos(a) * 1.82, Math.sin(a) * 1.82),
          0.045,
          m.titanium,
          8,
        ),
      )
    }

    for (let j = 0; j < 5; j += 1) {
      const sprite = glowSprite(m.maps.glowWarmMap, 0xffc27a, 0.32, 0)
      sprite.position.set(3.4 + j * 0.75, 0, 0)
      aggregate.add(sprite)
      this.railAggregatePulses.push({ sprite, offset: j / 5, speed: 0.11 + j * 0.008 })
    }

    // Keep the central coordinate needle short, inside the aggregate bell.
    parent.add(cylinderX(0.07, 0.12, 3.2, m.chrome, 5.0, 0, 0, 12))
    parent.add(cylinderX(0.025, 0.025, 2.7, m.glowCyan, 5.0, 0, 0, 6))
    this.railAggregate = { group: aggregate, center: aggCenter, length: aggLength }
  }


}

export {
  TAU,
  PI,
  HALF_PI,
  clamp01,
  smoothstep,
  buildMaterials,
  cylinderBetween,
  glowSprite,
}

