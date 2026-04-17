import './App.css'
import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { PLANETS, SUN_TEXTURE_URL, SATURN_RING_TEXTURE_URL, MOON_TEXTURE_URL, MILKY_WAY_TEXTURE_URL } from './planets'
import { getPlanetPositions, HelioVector, GeoMoon, BODY_MAP } from './astronomy'
import { TimeControls } from './TimeControls'
import { SPEEDS } from './timeConstants'

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

  const simDateRef = useRef(simDate)
  const playbackRef = useRef(playbackState)
  const speedIndexRef = useRef(speedIndex)

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

      // Moon orbit ring (27.322-day period)
      const moonPeriodMs = 27.322 * 24 * 3600 * 1000
      const moonOrbitPoints: THREE.Vector3[] = []
      const MN = 128
      for (let k = 0; k <= MN; k++) {
        const t = new Date(now.getTime() + (k / MN) * moonPeriodMs)
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
    }

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

        // Recalculate moon position
        if (moonMeshRef) {
          const moonGeo = GeoMoon(newDate)
          moonMeshRef.position.set(
            moonGeo.x * MOON_ORBIT_SCALE,
            moonGeo.z * MOON_ORBIT_SCALE,
            -moonGeo.y * MOON_ORBIT_SCALE
          )
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
      <TimeControls
        currentDate={simDate}
        playbackState={playbackState}
        speedIndex={speedIndex}
        speeds={SPEEDS}
        onPlay={() => { setPlaybackState('forward'); playbackRef.current = 'forward' }}
        onReverse={() => { setPlaybackState('backward'); playbackRef.current = 'backward' }}
        onPause={() => { setPlaybackState('paused'); playbackRef.current = 'paused' }}
        onSpeedChange={(i) => { setSpeedIndex(i); speedIndexRef.current = i }}
      />
    </div>
  )
}
