import * as THREE from 'three'

const CYAN = 0x6ce8ff
const AMBER = 0xffb15e
const RED = 0xff4a63

const makeLabelTexture = (title, subtitle, accent = '#6ce8ff') => {
  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 220
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(3, 14, 22, 0.82)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = accent
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)
  ctx.globalAlpha = 1

  ctx.fillStyle = accent
  ctx.fillRect(0, 0, 8, canvas.height)

  ctx.fillStyle = '#e9fdff'
  ctx.font = '600 58px "Microsoft YaHei", "Noto Sans SC", sans-serif'
  ctx.fillText(title, 34, 86)

  ctx.fillStyle = accent
  ctx.font = '400 34px Bahnschrift, "Arial Narrow", sans-serif'
  ctx.fillText(subtitle, 34, 150)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

const makeLabel = (title, subtitle, accent) => {
  const material = new THREE.SpriteMaterial({
    map: makeLabelTexture(title, subtitle, accent),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(7.4, 2.08, 1)
  sprite.renderOrder = 40
  return sprite
}

const makeBerth = (position, label, title, accent) => {
  const group = new THREE.Group()
  group.position.copy(position)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.8, 2.2, 64),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  ring.renderOrder = 30
  group.add(ring)

  const inner = new THREE.Mesh(
    new THREE.RingGeometry(0.64, 0.7, 48),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  inner.renderOrder = 30
  group.add(inner)

  const diamond = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.72, 0)),
    new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  diamond.renderOrder = 31
  group.add(diamond)

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 2.4, 6, 1, true),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  beacon.position.y = 1.2
  group.add(beacon)

  const tag = makeLabel(title, label, accent)
  tag.scale.set(17, 5.2, 1)
  tag.position.set(0, 2.15, 0)
  group.add(tag)

  return { group, ring, inner, diamond, beacon, tag, baseY: position.y }
}

export function createMuseum(scene, { heroRoot = null } = {}) {
  const group = new THREE.Group()
  group.name = 'EPR-OPEN-ORBIT-MUSEUM'
  scene.add(group)

  // The museum ring is centred on Earth, not on the satellite. This is the
  // visual anchor that makes the scene read as an Earth-orbit museum.
  const earthCenter = new THREE.Vector3(-80, 0, -120)
  const orbitRadius = 108
  const orbitTilt = 0.17
  const orbitPoint = (angle) =>
    new THREE.Vector3(
      earthCenter.x + Math.cos(angle) * orbitRadius,
      earthCenter.y + Math.sin(angle) * orbitRadius * Math.cos(orbitTilt),
      earthCenter.z + Math.sin(angle) * orbitRadius * Math.sin(orbitTilt),
    )
  const orbitTangent = (angle) =>
    new THREE.Vector3(
      -Math.sin(angle),
      Math.cos(angle) * Math.cos(orbitTilt),
      Math.cos(angle) * Math.sin(orbitTilt),
    )

  const arcPoints = []
  for (let i = 0; i <= 240; i += 1) arcPoints.push(orbitPoint((i / 240) * Math.PI * 2))
  const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints)
  const arcMaterial = new THREE.LineBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const arc = new THREE.Line(arcGeometry, arcMaterial)
  arc.renderOrder = 20
  group.add(arc)

  // A second, fainter rail gives the orbit a sense of thickness.
  const ghostPoints = arcPoints.map((p) => p.clone().add(new THREE.Vector3(0, 0.42, 0)))
  const ghost = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ghostPoints),
    new THREE.LineBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.11,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  ghost.renderOrder = 19
  group.add(ghost)

  const tickPositions = []
  for (let i = 0; i <= 96; i += 1) {
    const angle = (i / 96) * Math.PI * 2
    const p = orbitPoint(angle)
    const tangent = orbitTangent(angle)
    const side = new THREE.Vector3(-tangent.y, tangent.x, tangent.z).normalize()
    const half = i % 8 === 0 ? 0.8 : 0.24
    tickPositions.push(p.x - side.x * half, p.y - side.y * half, p.z - side.z * half)
    tickPositions.push(p.x + side.x * half, p.y + side.y * half, p.z + side.z * half)
  }
  const ticks = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(tickPositions, 3)),
    new THREE.LineBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  ticks.renderOrder = 21
  group.add(ticks)

  const berthDefs = [
    { offset: THREE.MathUtils.degToRad(62), accent: '#6ce8ff', code: '02' },
    { offset: THREE.MathUtils.degToRad(135), accent: '#ffb15e', code: '03' },
    { offset: THREE.MathUtils.degToRad(230), accent: '#8dffcf', code: '04' },
    { offset: THREE.MathUtils.degToRad(302), accent: '#ff6475', code: '05' },
  ]
  const berths = berthDefs.map((def) => {
    const color = new THREE.Color(def.accent).getHex()
    const berth = makeBerth(orbitPoint(def.offset), 'RESERVED BERTH', `${def.code} · 待布展`, color)
    berth.offset = def.offset
    return berth
  })
  for (const berth of berths) group.add(berth.group)

  const heroTag = makeLabel('01 · 轨道光能传输阵列', 'HERO EXHIBIT / LS-07', '#eafcff')
  heroTag.position.set(0, 19.5, -2)
  heroTag.scale.set(17, 5.2, 1)
  group.add(heroTag)

  const heroBaseQuaternion = heroRoot ? heroRoot.quaternion.clone() : null
  const heroBaseScale = heroRoot ? heroRoot.scale.clone() : null
  let paused = false

  const orbitSpeed = 0.06
  let currentAngle = 0
  let lastTime = 0

  const update = (nextTime) => {
    if (!paused) currentAngle += Math.max(0, nextTime - lastTime) * orbitSpeed
    lastTime = nextTime
    const angle = currentAngle
    const heroPoint = orbitPoint(angle)

    if (heroRoot) {
      heroRoot.position.copy(heroPoint)
      heroRoot.quaternion.copy(heroBaseQuaternion)
      heroRoot.scale.copy(heroBaseScale)
    }
    heroTag.position.set(heroPoint.x, heroPoint.y + 19.5, heroPoint.z)

    for (let i = 0; i < berths.length; i += 1) {
      const berth = berths[i]
      const berthAngle = angle + berth.offset
      const p = orbitPoint(berthAngle)
      berth.group.position.set(p.x, p.y, p.z)
      berth.diamond.rotation.y = nextTime * 0.32 + i * 0.8
      berth.diamond.rotation.x = 0.35 + Math.sin(nextTime * 0.4 + i) * 0.12
      berth.ring.material.opacity = 0.28 + Math.sin(nextTime * 1.1 + i) * 0.08
      berth.inner.material.opacity = 0.18 + Math.sin(nextTime * 1.7 + i) * 0.06
      berth.beacon.material.opacity = 0.14 + Math.sin(nextTime * 1.4 + i) * 0.05
      berth.group.position.y = p.y + Math.sin(nextTime * 0.5 + i) * 0.06
    }
    arcMaterial.opacity = 0.28 + Math.sin(nextTime * 0.7) * 0.04
  }

  const setPaused = (value) => { paused = Boolean(value) }
  const syncHeroToCurrent = () => { if (heroRoot) heroRoot.position.copy(orbitPoint(currentAngle)) }

  return { group, arc, berths, heroTag, update, setPaused, syncHeroToCurrent }
}
