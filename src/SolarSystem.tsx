import './App.css'
import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { PLANETS, SUN_TEXTURE_URL, SATURN_RING_TEXTURE_URL, MOON_TEXTURE_URL, MILKY_WAY_TEXTURE_URL } from './planets'
import { getPlanetPositions, HelioVector, GeoMoon, BODY_MAP } from './astronomy'
import { getHalleyPosition, getHalleyOrbitPoints } from './halley'
import { TimeControls } from './TimeControls'
import { SPEEDS, REAL_TIME_INDEX } from './timeConstants'
import { getArtemis2Mission } from './missions/artemis2'
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

export function SolarSystem() {
  const mountRef = useRef<HTMLDivElement>(null)

  const [simDate, setSimDate] = useState<Date>(() => new Date())
  const [playbackState, setPlaybackState] = useState<'paused' | 'forward' | 'backward'>('paused')
  const [speedIndex, setSpeedIndex] = useState(0)
  const [showHalley, setShowHalley] = useState(false)
  const [showMission, setShowMission] = useState(false)
  const [activeMission, setActiveMission] = useState<MissionManifest | null>(null)

  const simDateRef = useRef(simDate)
  const playbackRef = useRef(playbackState)
  const speedIndexRef = useRef(speedIndex)
  const showHalleyRef = useRef(showHalley)
  const halleyMeshRef = useRef<THREE.Mesh | null>(null)
  const halleyOrbitRef = useRef<THREE.LineLoop | null>(null)
  const showMissionRef = useRef(showMission)
  const activeMissionRef = useRef(activeMission)
  const missionMeshRef = useRef<THREE.Mesh | null>(null)
  const missionTrailRef = useRef<THREE.Line | null>(null)

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

      if (pd.name === 'Earth') earthMesh = mesh
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

    // Mission spacecraft mesh — child of Earth (like Moon)
    const missionMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    missionMesh.add(makeLabel('Orion'))
    missionMesh.visible = false
    if (earthMesh) (earthMesh as THREE.Mesh).add(missionMesh)
    missionMeshRef.current = missionMesh

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
        const delta = SPEEDS[speedIndexRef.current].msPerSecond * dtSec * direction
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
              if (v && !activeMission) {
                const mission = getArtemis2Mission()
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
                setSpeedIndex(0)
                speedIndexRef.current = 0
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
          onSeek={(timeMs) => {
            const d = new Date(timeMs)
            simDateRef.current = d
            setSimDate(d)
          }}
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
