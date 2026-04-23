import './App.css'
import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { PLANETS, SUN_TEXTURE_URL, SATURN_RING_TEXTURE_URL, MOON_TEXTURE_URL, MILKY_WAY_TEXTURE_URL } from './planets'
import { getPlanetPositions, HelioVector, GeoMoon, BODY_MAP } from './astronomy'
import { getHalleyPosition, getHalleyOrbitPoints } from './halley'
import { TimeControls } from './TimeControls'
import { SPEEDS, REAL_TIME_INDEX, MISSION_SPEEDS, MISSION_DEFAULT_SPEED_INDEX } from './timeConstants'
import { getMissionById, AVAILABLE_MISSIONS } from './missions/missions'
import { interpolateTrajectory, geoEquatorialToEcliptic } from './missions/missionUtils'
import type { MissionManifest } from './missions/types'
import { MissionReplayPanel } from './MissionReplayPanel'

const SCALE = 20
const MOON_ORBIT_SCALE = 800

function makeLabel(text: string): CSS2DObject {
  const div = document.createElement('div')
  div.className = 'planet-label'
  div.textContent = text
  return new CSS2DObject(div)
}

function createOrionSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  // Glow halo
  const glow = ctx.createRadialGradient(64, 64, 0, 64, 64, 62)
  glow.addColorStop(0, 'rgba(0,255,170,0.6)')
  glow.addColorStop(0.5, 'rgba(0,255,170,0.15)')
  glow.addColorStop(1, 'rgba(0,255,170,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 128, 128)
  // Capsule body
  ctx.beginPath()
  ctx.moveTo(44, 88)
  ctx.lineTo(56, 32)
  ctx.lineTo(64, 24)
  ctx.lineTo(72, 32)
  ctx.lineTo(84, 88)
  ctx.closePath()
  ctx.fillStyle = '#c8c8c8'
  ctx.fill()
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 1
  ctx.stroke()
  // Heat shield
  ctx.beginPath()
  ctx.ellipse(64, 90, 22, 5, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#8B4513'
  ctx.fill()
  // Solar panels
  ctx.fillStyle = '#1a237e'
  ctx.save()
  ctx.translate(28, 54)
  ctx.rotate(-10 * Math.PI / 180)
  ctx.fillRect(-12, -4, 24, 8)
  ctx.strokeStyle = '#3949ab'
  ctx.lineWidth = 0.5
  ctx.strokeRect(-12, -4, 24, 8)
  ctx.restore()
  ctx.save()
  ctx.translate(100, 54)
  ctx.rotate(10 * Math.PI / 180)
  ctx.fillRect(-12, -4, 24, 8)
  ctx.strokeStyle = '#3949ab'
  ctx.lineWidth = 0.5
  ctx.strokeRect(-12, -4, 24, 8)
  ctx.restore()
  // Service module
  ctx.fillStyle = '#a0a0a0'
  ctx.fillRect(48, 90, 32, 12)
  // Windows
  ctx.fillStyle = '#4488bb'
  ctx.beginPath()
  ctx.arc(60, 47, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(68, 47, 2, 0, Math.PI * 2)
  ctx.fill()
  // NASA stripe
  ctx.fillStyle = 'rgba(204,0,0,0.7)'
  ctx.fillRect(50, 56, 28, 2)
  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  )
  sprite.scale.set(0.4, 0.4, 1)
  return sprite
}

function createApolloCSMSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  // Glow halo — gold tint
  const glow = ctx.createRadialGradient(64, 64, 0, 64, 64, 62)
  glow.addColorStop(0, 'rgba(255,215,0,0.6)')
  glow.addColorStop(0.5, 'rgba(255,215,0,0.15)')
  glow.addColorStop(1, 'rgba(255,215,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 128, 128)
  // Command Module — conical shape
  ctx.beginPath()
  ctx.moveTo(50, 60)
  ctx.lineTo(62, 28)
  ctx.lineTo(64, 24)
  ctx.lineTo(66, 28)
  ctx.lineTo(78, 60)
  ctx.closePath()
  ctx.fillStyle = '#d0d0d0'
  ctx.fill()
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 1
  ctx.stroke()
  // Heat shield at CM base
  ctx.beginPath()
  ctx.ellipse(64, 62, 16, 4, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#8B4513'
  ctx.fill()
  // Service Module — cylindrical rectangle below CM
  ctx.fillStyle = '#a8a8a8'
  ctx.fillRect(50, 64, 28, 28)
  ctx.strokeStyle = '#777'
  ctx.lineWidth = 0.5
  ctx.strokeRect(50, 64, 28, 28)
  // SM panel lines
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(57, 64)
  ctx.lineTo(57, 92)
  ctx.moveTo(64, 64)
  ctx.lineTo(64, 92)
  ctx.moveTo(71, 64)
  ctx.lineTo(71, 92)
  ctx.stroke()
  // Engine bell — trapezoidal nozzle at bottom of SM
  ctx.beginPath()
  ctx.moveTo(56, 92)
  ctx.lineTo(54, 104)
  ctx.lineTo(74, 104)
  ctx.lineTo(72, 92)
  ctx.closePath()
  ctx.fillStyle = '#555'
  ctx.fill()
  // Engine inner glow
  ctx.beginPath()
  ctx.ellipse(64, 104, 8, 3, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,140,0,0.5)'
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  )
  sprite.scale.set(0.4, 0.4, 1)
  return sprite
}

function createSprite(spacecraftName: string): THREE.Group {
  const group = new THREE.Group()
  if (spacecraftName === 'Apollo CSM') {
    group.add(createApolloCSMSprite())
  } else {
    group.add(createOrionSprite())
  }
  group.add(makeLabel(spacecraftName))
  return group
}

export function SolarSystem() {
  const mountRef = useRef<HTMLDivElement>(null)

  const [simDate, setSimDate] = useState<Date>(() => new Date())
  const [playbackState, setPlaybackState] = useState<'paused' | 'forward' | 'backward'>('paused')
  const [speedIndex, setSpeedIndex] = useState(0)
  const [showHalley, setShowHalley] = useState(false)
  const [showMission, setShowMission] = useState(false)
  const [activeMission, setActiveMission] = useState<MissionManifest | null>(null)

  const [missionSpeedIndex, setMissionSpeedIndex] = useState(MISSION_DEFAULT_SPEED_INDEX)

  const simDateRef = useRef(simDate)
  const playbackRef = useRef(playbackState)
  const speedIndexRef = useRef(speedIndex)
  const missionSpeedIndexRef = useRef(missionSpeedIndex)
  const showHalleyRef = useRef(showHalley)
  const halleyMeshRef = useRef<THREE.Mesh | null>(null)
  const halleyOrbitRef = useRef<THREE.LineLoop | null>(null)
  const showMissionRef = useRef(showMission)
  const activeMissionRef = useRef(activeMission)
  const missionMeshRef = useRef<THREE.Group | null>(null)
  const missionTrailRef = useRef<THREE.Line | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const earthMeshRef = useRef<THREE.Mesh | null>(null)

  useEffect(() => {
    const mount = mountRef.current!
    const w = mount.clientWidth
    const h = mount.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    // CSS2D label renderer
    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(w, h)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0'
    labelRenderer.domElement.style.pointerEvents = 'none'
    mount.appendChild(labelRenderer.domElement)

    // Scene
    const scene = new THREE.Scene()
    scene.background = null

    // Camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 10000)
    camera.position.set(0, 60, 150)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    cameraRef.current = camera
    controlsRef.current = controls

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.3))
    scene.add(new THREE.PointLight(0xffffff, 2, 0))

    const loader = new THREE.TextureLoader()

    // Milky Way background sphere
    const milkyWay = new THREE.Mesh(
      new THREE.SphereGeometry(1000, 32, 32),
      new THREE.MeshBasicMaterial({
        map: loader.load(MILKY_WAY_TEXTURE_URL),
        side: THREE.BackSide,
      })
    )
    scene.add(milkyWay)

    // Sun
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(3, 32, 32),
      new THREE.MeshBasicMaterial({ map: loader.load(SUN_TEXTURE_URL) })
    )
    sun.add(makeLabel('Sun'))
    scene.add(sun)

    // Planets
    const now = new Date()
    const positions = getPlanetPositions(now)
    const planetMeshes: Map<string, THREE.Mesh> = new Map()
    let earthMesh: THREE.Mesh | null = null
    positions.forEach(pos => {
      const pd = PLANETS.find(p => p.name === pos.name)!
      const factor = pos.auDistance > 0 ? Math.pow(pos.auDistance, 0.5) * SCALE / pos.auDistance : 0

      // Orbital path ring: sample HelioVector over one full orbital period —
      // identical coordinate transform as planet positions, guarantees alignment.
      const body = BODY_MAP[pd.name as keyof typeof BODY_MAP]
      const periodMs = pd.orbitalPeriodDays * 24 * 3600 * 1000
      const orbitPoints: THREE.Vector3[] = []
      const N = 128
      for (let k = 0; k <= N; k++) {
        const t = new Date(now.getTime() + (k / N) * periodMs)
        const v = HelioVector(body, t)
        const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
        const f = SCALE / Math.sqrt(r)
        orbitPoints.push(new THREE.Vector3(v.x * f, v.z * f, -v.y * f))
      }

      const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints)
      const orbitLine = new THREE.LineLoop(orbitGeom, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }))
      scene.add(orbitLine)

      const material = new THREE.MeshStandardMaterial({ map: loader.load(pd.textureUrl) })

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(pd.radius, 32, 32),
        material
      )
      mesh.position.set(pos.x * factor, pos.z * factor, -pos.y * factor)
      mesh.add(makeLabel(pd.name))

      if (pd.hasSaturnRing) {
        const ringTex = loader.load(SATURN_RING_TEXTURE_URL)
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(pd.radius * 1.4, pd.radius * 2.2, 64),
          new THREE.MeshBasicMaterial({
            map: ringTex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            alphaMap: ringTex,
          })
        )
        ring.rotation.x = Math.PI / 2 - 0.47
        mesh.add(ring)
      }

      if (pd.name === 'Earth') { earthMesh = mesh; earthMeshRef.current = mesh }
      planetMeshes.set(pd.name, mesh)

      scene.add(mesh)
    })

    // Moon — positioned relative to Earth using geocentric coordinates
    let moonMeshRef: THREE.Mesh | null = null
    let moonOrbitLineRef: THREE.LineLoop | null = null
    if (earthMesh) {
      const moonGeo = GeoMoon(now)

      const moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 * 0.27, 32, 32),
        new THREE.MeshStandardMaterial({ map: loader.load(MOON_TEXTURE_URL) })
      )
      moonMesh.position.set(
        moonGeo.x * MOON_ORBIT_SCALE,
        moonGeo.z * MOON_ORBIT_SCALE,
        -moonGeo.y * MOON_ORBIT_SCALE
      )
      moonMesh.add(makeLabel('Moon'))
      ;(earthMesh as THREE.Mesh).add(moonMesh)
      moonMeshRef = moonMesh

      // Moon orbit ring (27.322-day period, centered on current time)
      const moonPeriodMs = 27.322 * 24 * 3600 * 1000
      const moonOrbitPoints: THREE.Vector3[] = []
      const MN = 128
      for (let k = 0; k <= MN; k++) {
        const t = new Date(now.getTime() - moonPeriodMs / 2 + (k / MN) * moonPeriodMs)
        const mg = GeoMoon(t)
        moonOrbitPoints.push(new THREE.Vector3(
          mg.x * MOON_ORBIT_SCALE,
          mg.z * MOON_ORBIT_SCALE,
          -mg.y * MOON_ORBIT_SCALE
        ))
      }
      const moonOrbitGeom = new THREE.BufferGeometry().setFromPoints(moonOrbitPoints)
      const moonOrbitLine = new THREE.LineLoop(moonOrbitGeom, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }))
      ;(earthMesh as THREE.Mesh).add(moonOrbitLine)
      moonOrbitLineRef = moonOrbitLine
    }

    // Mission spacecraft marker — sprite drawn on canvas (child of Earth)
    const missionGroup = createSprite('Orion')
    missionGroup.visible = false
    if (earthMesh) (earthMesh as THREE.Mesh).add(missionGroup)
    missionMeshRef.current = missionGroup

    // Mission trajectory trail — also child of Earth
    const trailGeom = new THREE.BufferGeometry()
    const trailMat = new THREE.LineBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.6 })
    const missionTrail = new THREE.Line(trailGeom, trailMat)
    missionTrail.visible = false
    if (earthMesh) (earthMesh as THREE.Mesh).add(missionTrail)
    missionTrailRef.current = missionTrail

    // Halley's Comet
    const halleyPos = getHalleyPosition(now)
    const halleyFactor = halleyPos.auDistance > 0 ? Math.pow(halleyPos.auDistance, 0.5) * SCALE / halleyPos.auDistance : 0
    const halleyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xaaccff })
    )
    halleyMesh.position.set(halleyPos.x * halleyFactor, halleyPos.z * halleyFactor, -halleyPos.y * halleyFactor)
    halleyMesh.add(makeLabel('Halley'))
    halleyMesh.visible = showHalleyRef.current
    scene.add(halleyMesh)
    halleyMeshRef.current = halleyMesh

    // Halley orbit ring
    const halleyOrbitPts = getHalleyOrbitPoints(256)
    const halleyOrbitVerts = halleyOrbitPts.map(p => {
      const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
      const f = SCALE / Math.sqrt(r)
      return new THREE.Vector3(p.x * f, p.z * f, -p.y * f)
    })
    const halleyOrbitGeom = new THREE.BufferGeometry().setFromPoints(halleyOrbitVerts)
    const halleyOrbitLine = new THREE.LineLoop(halleyOrbitGeom, new THREE.LineBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.2 }))
    halleyOrbitLine.visible = showHalleyRef.current
    scene.add(halleyOrbitLine)
    halleyOrbitRef.current = halleyOrbitLine

    // Resize handler
    const onResize = () => {
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
      labelRenderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    // Animate
    let animId: number
    let lastTime = performance.now()
    let frameCount = 0
    const MIN_DATE_MS = new Date('1700-01-01T00:00:00Z').getTime()
    const MAX_DATE_MS = new Date('2200-01-01T00:00:00Z').getTime()
    const animate = () => {
      animId = requestAnimationFrame(animate)
      const now = performance.now()
      const dtSec = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      // Update simulated time based on playback state
      if (playbackRef.current !== 'paused') {
        const direction = playbackRef.current === 'forward' ? 1 : -1
        const activeSpeeds = showMissionRef.current ? MISSION_SPEEDS : SPEEDS
        const activeSpeedIdx = showMissionRef.current ? missionSpeedIndexRef.current : speedIndexRef.current
        const delta = activeSpeeds[activeSpeedIdx].msPerSecond * dtSec * direction
        const rawMs = simDateRef.current.getTime() + delta
        const newDate = new Date(Math.max(MIN_DATE_MS, Math.min(MAX_DATE_MS, rawMs)))
        simDateRef.current = newDate
        frameCount++
        if (frameCount % 6 === 0) {
          setSimDate(newDate)
        }

        // Recalculate planet positions
        const newPositions = getPlanetPositions(newDate)
        newPositions.forEach(pos => {
          const mesh = planetMeshes.get(pos.name)
          if (!mesh) return
          const factor = pos.auDistance > 0 ? Math.pow(pos.auDistance, 0.5) * SCALE / pos.auDistance : 0
          mesh.position.set(pos.x * factor, pos.z * factor, -pos.y * factor)
        })

        // Recalculate Halley's Comet position
        const hp = getHalleyPosition(newDate)
        const hf = hp.auDistance > 0 ? Math.pow(hp.auDistance, 0.5) * SCALE / hp.auDistance : 0
        halleyMesh.position.set(hp.x * hf, hp.z * hf, -hp.y * hf)

        // Recalculate moon position and orbit ring
        if (moonMeshRef) {
          const moonGeo = GeoMoon(newDate)
          moonMeshRef.position.set(
            moonGeo.x * MOON_ORBIT_SCALE,
            moonGeo.z * MOON_ORBIT_SCALE,
            -moonGeo.y * MOON_ORBIT_SCALE
          )

          // Update moon orbit ring to stay centered on current simulated time
          if (moonOrbitLineRef) {
            const moonPeriodMs = 27.322 * 24 * 3600 * 1000
            const MN = 128
            const pts: THREE.Vector3[] = []
            for (let k = 0; k <= MN; k++) {
              const t = new Date(newDate.getTime() - moonPeriodMs / 2 + (k / MN) * moonPeriodMs)
              const mg = GeoMoon(t)
              pts.push(new THREE.Vector3(
                mg.x * MOON_ORBIT_SCALE,
                mg.z * MOON_ORBIT_SCALE,
                -mg.y * MOON_ORBIT_SCALE
              ))
            }
            moonOrbitLineRef.geometry.dispose()
            moonOrbitLineRef.geometry = new THREE.BufferGeometry().setFromPoints(pts)
          }
        }

        // Keep camera focused on Earth while mission mode is active
        if (showMissionRef.current && controlsRef.current) {
          const earthMesh = earthMeshRef.current
          if (earthMesh) {
            const earthWorldPos = new THREE.Vector3()
            ;(earthMesh as THREE.Mesh).getWorldPosition(earthWorldPos)
            controlsRef.current.target.copy(earthWorldPos)
          }
        }

        // Update mission spacecraft position
        if (showMissionRef.current && activeMissionRef.current) {
          const mission = activeMissionRef.current
          const timeMs = newDate.getTime()
          const pos = interpolateTrajectory(mission.trajectory, timeMs)
          if (pos && missionMeshRef.current) {
            const ecl = geoEquatorialToEcliptic(pos.x, pos.y, pos.z)
            missionMeshRef.current.position.set(
              ecl.x * MOON_ORBIT_SCALE,
              ecl.z * MOON_ORBIT_SCALE,
              -ecl.y * MOON_ORBIT_SCALE
            )
            missionMeshRef.current.visible = true
          } else if (missionMeshRef.current) {
            missionMeshRef.current.visible = false
          }

        }
      }

      controls.update()
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      mount.removeChild(labelRenderer.domElement)
    }
  }, [])

  const focusEarth = () => {
    if (earthMeshRef.current && cameraRef.current && controlsRef.current) {
      const earthPos = new THREE.Vector3()
      earthMeshRef.current.getWorldPosition(earthPos)
      controlsRef.current.target.copy(earthPos)
      cameraRef.current.position.set(earthPos.x + 2, earthPos.y + 3, earthPos.z + 5)
      controlsRef.current.update()
    }
  }

  const focusSun = () => {
    if (cameraRef.current && controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      cameraRef.current.position.set(0, 60, 150)
      controlsRef.current.update()
    }
  }

  const handleJumpToLaunch = () => {
    if (!activeMission) return
    const startDate = new Date(activeMission.startMs)
    simDateRef.current = startDate
    setSimDate(startDate)
    setPlaybackState('forward')
    playbackRef.current = 'forward'
    focusEarth()
  }

  const updateMissionSprite = (mission: MissionManifest) => {
    if (!missionMeshRef.current || !earthMeshRef.current) return
    const parent = earthMeshRef.current as THREE.Mesh
    // Dispose old sprite resources
    const oldGroup = missionMeshRef.current
    oldGroup.traverse((child) => {
      if (child instanceof THREE.Sprite) {
        child.material.map?.dispose()
        child.material.dispose()
      }
    })
    parent.remove(oldGroup)
    // Create new group with appropriate sprite
    const newGroup = createSprite(mission.spacecraft.name)
    newGroup.visible = showMissionRef.current
    parent.add(newGroup)
    missionMeshRef.current = newGroup
  }

  const handleMissionChange = (missionId: string) => {
    const mission = getMissionById(missionId)
    setActiveMission(mission)
    activeMissionRef.current = mission
    // Rebuild trail geometry
    if (missionTrailRef.current) {
      const trailPoints = mission.trajectory.map(pt => {
        const ecl = geoEquatorialToEcliptic(pt.x, pt.y, pt.z)
        return new THREE.Vector3(
          ecl.x * MOON_ORBIT_SCALE,
          ecl.z * MOON_ORBIT_SCALE,
          -ecl.y * MOON_ORBIT_SCALE
        )
      })
      missionTrailRef.current.geometry.dispose()
      missionTrailRef.current.geometry = new THREE.BufferGeometry().setFromPoints(trailPoints)
    }
    // Update sprite and label
    updateMissionSprite(mission)
    // Jump to new mission's start
    const startDate = new Date(mission.startMs)
    simDateRef.current = startDate
    setSimDate(startDate)
    setPlaybackState('forward')
    playbackRef.current = 'forward'
    setMissionSpeedIndex(MISSION_DEFAULT_SPEED_INDEX)
    missionSpeedIndexRef.current = MISSION_DEFAULT_SPEED_INDEX
    focusEarth()
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%' }}
      />
      <div className="toggle-bar">
        <label className="halley-toggle">
          <input
            type="checkbox"
            checked={showHalley}
            onChange={(e) => {
              const v = e.target.checked
              setShowHalley(v)
              showHalleyRef.current = v
              if (halleyMeshRef.current) halleyMeshRef.current.visible = v
              if (halleyOrbitRef.current) halleyOrbitRef.current.visible = v
            }}
          />
          Halley's Comet
        </label>
        <label className="mission-toggle">
          <input
            type="checkbox"
            checked={showMission}
            onChange={(e) => {
              const v = e.target.checked
              setShowMission(v)
              showMissionRef.current = v
              if (v) {
                if (!activeMission) {
                  const mission = getMissionById(AVAILABLE_MISSIONS[0].id)
                  setActiveMission(mission)
                  activeMissionRef.current = mission
                  // Build trail geometry
                  if (missionTrailRef.current) {
                    const trailPoints = mission.trajectory.map(pt => {
                      const ecl = geoEquatorialToEcliptic(pt.x, pt.y, pt.z)
                      return new THREE.Vector3(
                        ecl.x * MOON_ORBIT_SCALE,
                        ecl.z * MOON_ORBIT_SCALE,
                        -ecl.y * MOON_ORBIT_SCALE
                      )
                    })
                    missionTrailRef.current.geometry.dispose()
                    missionTrailRef.current.geometry = new THREE.BufferGeometry().setFromPoints(trailPoints)
                  }
                  // Jump time to mission start
                  const startDate = new Date(mission.startMs)
                  simDateRef.current = startDate
                  setSimDate(startDate)
                  setPlaybackState('forward')
                  playbackRef.current = 'forward'
                  // Use mission-specific speed (default: 1 hr/sec)
                  setMissionSpeedIndex(MISSION_DEFAULT_SPEED_INDEX)
                  missionSpeedIndexRef.current = MISSION_DEFAULT_SPEED_INDEX
                }
                focusEarth()
              } else {
                focusSun()
              }
              if (missionMeshRef.current) missionMeshRef.current.visible = v
              if (missionTrailRef.current) missionTrailRef.current.visible = v
            }}
          />
          Missions
        </label>
      </div>
      {showMission && activeMission && (
        <MissionReplayPanel
          mission={activeMission}
          currentTimeMs={simDate.getTime()}
          playbackState={playbackState}
          speedIndex={missionSpeedIndex}
          speeds={MISSION_SPEEDS}
          onMissionChange={handleMissionChange}
          onSeek={(timeMs) => {
            const d = new Date(timeMs)
            simDateRef.current = d
            setSimDate(d)
          }}
          onPlay={() => { setPlaybackState('forward'); playbackRef.current = 'forward' }}
          onPause={() => { setPlaybackState('paused'); playbackRef.current = 'paused' }}
          onJumpToLaunch={handleJumpToLaunch}
          onSpeedChange={(i) => { setMissionSpeedIndex(i); missionSpeedIndexRef.current = i }}
          onClose={() => {
            setShowMission(false)
            showMissionRef.current = false
            if (missionMeshRef.current) missionMeshRef.current.visible = false
            if (missionTrailRef.current) missionTrailRef.current.visible = false
          }}
        />
      )}
      <TimeControls
        currentDate={simDate}
        playbackState={playbackState}
        speedIndex={speedIndex}
        speeds={SPEEDS}
        onPlay={() => { setPlaybackState('forward'); playbackRef.current = 'forward' }}
        onReverse={() => { setPlaybackState('backward'); playbackRef.current = 'backward' }}
        onPause={() => { setPlaybackState('paused'); playbackRef.current = 'paused' }}
        onToday={() => {
          const now = new Date()
          simDateRef.current = now
          setSimDate(now)
          setPlaybackState('forward')
          playbackRef.current = 'forward'
          setSpeedIndex(REAL_TIME_INDEX)
          speedIndexRef.current = REAL_TIME_INDEX
        }}
        onSpeedChange={(i) => { setSpeedIndex(i); speedIndexRef.current = i }}
      />
    </div>
  )
}
