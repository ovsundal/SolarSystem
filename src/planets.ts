export interface PlanetData {
  name: string
  bodyName: string
  color: number
  radius: number
  hasSaturnRing?: boolean
  textureUrl: string
}

const BASE = 'https://www.solarsystemscope.com/textures/download'

export const PLANETS: PlanetData[] = [
  { name: 'Mercury', bodyName: 'Mercury', color: 0xb5b5b5, radius: 0.3, textureUrl: `${BASE}/2k_mercury.jpg` },
  { name: 'Venus',   bodyName: 'Venus',   color: 0xe8cda0, radius: 0.5, textureUrl: `${BASE}/2k_venus_surface.jpg` },
  { name: 'Earth',   bodyName: 'Earth',   color: 0x2e86de, radius: 0.5, textureUrl: `${BASE}/2k_earth_daymap.jpg` },
  { name: 'Mars',    bodyName: 'Mars',    color: 0xc1440e, radius: 0.4, textureUrl: `${BASE}/2k_mars.jpg` },
  { name: 'Jupiter', bodyName: 'Jupiter', color: 0xc88b3a, radius: 1.2, textureUrl: `${BASE}/2k_jupiter.jpg` },
  { name: 'Saturn',  bodyName: 'Saturn',  color: 0xe4d191, radius: 1.0, hasSaturnRing: true, textureUrl: `${BASE}/2k_saturn.jpg` },
  { name: 'Uranus',  bodyName: 'Uranus',  color: 0x7de8e8, radius: 0.7, textureUrl: `${BASE}/2k_uranus.jpg` },
  { name: 'Neptune', bodyName: 'Neptune', color: 0x3f54ba, radius: 0.7, textureUrl: `${BASE}/2k_neptune.jpg` },
]

export const SUN_TEXTURE_URL = `${BASE}/2k_sun.jpg`
export const SATURN_RING_TEXTURE_URL = `${BASE}/2k_saturn_ring_alpha.png`
