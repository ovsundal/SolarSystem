import './App.css'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { PLANETS } from './planets'
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

    // Sun
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(3, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    )
    sun.add(makeLabel('Sun'))
    scene.add(sun)

    // Jupiter banding texture
    function makeJupiterTexture(): THREE.CanvasTexture {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')!
      const bands: { color: string; frac: number }[] = [
        { color: '#f5e6c8', frac: 0.12 },
        { color: '#c88b3a', frac: 0.09 },
        { color: '#f5e6c8', frac: 0.13 },
        { color: '#a0522d', frac: 0.07 },
        { color: '#f5e6c8', frac: 0.16 },
        { color: '#c88b3a', frac: 0.09 },
        { color: '#a0522d', frac: 0.07 },
        { color: '#f5e6c8', frac: 0.13 },
        { color: '#c88b3a', frac: 0.09 },
        { color: '#f5e6c8', frac: 0.05 },
      ]
      let y = 0
      bands.forEach(({ color, frac }) => {
        ctx.fillStyle = color
        const h = Math.round(frac * 64)
        ctx.fillRect(0, y, 64, h)
        y += h
      })
      ctx.fillStyle = '#f5e6c8'
      ctx.fillRect(0, y, 64, 64 - y)
      return new THREE.CanvasTexture(canvas)
    }
    const jupiterTexture = makeJupiterTexture()

    // Planets
    const positions = getPlanetPositions(new Date())
    positions.forEach(pos => {
      const pd = PLANETS.find(p => p.name === pos.name)!
      const scaledR = Math.pow(pos.auDistance, 0.5) * SCALE
      const factor = pos.auDistance > 0 ? scaledR / pos.auDistance : 0

      // Orbital path ring in XZ plane
      const orbitCurve = new THREE.EllipseCurve(0, 0, scaledR, scaledR, 0, 2 * Math.PI, false, 0)
      const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitCurve.getPoints(128))
      const orbitLine = new THREE.LineLoop(
        orbitGeom,
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })
      )
      orbitLine.rotation.x = -Math.PI / 2
      scene.add(orbitLine)

      const material = pd.name === 'Jupiter'
        ? new THREE.MeshStandardMaterial({ map: jupiterTexture })
        : new THREE.MeshStandardMaterial({ color: pd.color })

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(pd.radius, 32, 32),
        material
      )
      mesh.position.set(pos.x * factor, pos.z * factor, -pos.y * factor)
      mesh.add(makeLabel(pd.name))

      if (pd.hasSaturnRing) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(pd.radius * 1.4, pd.radius * 2.2, 64),
          new THREE.MeshBasicMaterial({
            color: 0xd4b483,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
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
