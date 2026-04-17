import './App.css'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { PLANETS, SUN_TEXTURE_URL, SATURN_RING_TEXTURE_URL } from './planets'
import { getPlanetPositions } from './astronomy'

const SCALE = 20

function makeLabel(text: string): CSS2DObject {
  const div = document.createElement('div')
  div.className = 'planet-label'
  div.textContent = text
  return new CSS2DObject(div)
}

export function SolarSystem() {
  const mountRef = useRef<HTMLDivElement>(null)

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
    scene.background = new THREE.Color(0x000000)

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

    // Sun
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(3, 32, 32),
      new THREE.MeshBasicMaterial({ map: loader.load(SUN_TEXTURE_URL) })
    )
    sun.add(makeLabel('Sun'))
    scene.add(sun)

    // Planets
    const positions = getPlanetPositions(new Date())
    positions.forEach(pos => {
      const pd = PLANETS.find(p => p.name === pos.name)!
      const factor = pos.auDistance > 0 ? Math.pow(pos.auDistance, 0.5) * SCALE / pos.auDistance : 0

      // Orbital path ring: sample points using actual orbital mechanics + same SCALE/sqrt(r) mapping
      const a = pd.semiMajorAxisAU
      const e = pd.eccentricity
      const toRad = (d: number) => d * Math.PI / 180
      const i = toRad(pd.inclinationDeg)
      const Omega = toRad(pd.anDeg)
      const omega = toRad(pd.aopDeg)

      const cosO = Math.cos(Omega), sinO = Math.sin(Omega)
      const cosi = Math.cos(i), sini = Math.sin(i)
      const cosw = Math.cos(omega), sinw = Math.sin(omega)

      const R = [
        [cosO*cosw - sinO*sinw*cosi,  -cosO*sinw - sinO*cosw*cosi,  sinO*sini],
        [sinO*cosw + cosO*sinw*cosi,  -sinO*sinw + cosO*cosw*cosi,  -cosO*sini],
        [sinw*sini,                    cosw*sini,                     cosi],
      ]

      const semiLatusRectum = a * (1 - e * e)
      const orbitPoints: THREE.Vector3[] = []
      const N = 128
      for (let k = 0; k <= N; k++) {
        const theta = (k / N) * 2 * Math.PI
        const r = semiLatusRectum / (1 + e * Math.cos(theta))
        const x_orb = r * Math.cos(theta)
        const y_orb = r * Math.sin(theta)
        const ex = R[0][0]*x_orb + R[0][1]*y_orb
        const ey = R[1][0]*x_orb + R[1][1]*y_orb
        const ez = R[2][0]*x_orb + R[2][1]*y_orb
        const f = SCALE / Math.sqrt(r)
        orbitPoints.push(new THREE.Vector3(ex * f, ez * f, -ey * f))
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

      scene.add(mesh)
    })

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
    const animate = () => {
      animId = requestAnimationFrame(animate)
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
    <div
      ref={mountRef}
      style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}
    />
  )
}
