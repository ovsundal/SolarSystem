export interface PlanetData {
  name: string
  bodyName: string
  color: number
  radius: number
  hasSaturnRing?: boolean
  textureUrl: string
  semiMajorAxisAU: number
}

export const PLANETS: PlanetData[] = [
  { name: 'Mercury', bodyName: 'Mercury', color: 0xb5b5b5, radius: 0.3, textureUrl: '/textures/2k_mercury.jpg', semiMajorAxisAU: 0.387 },
  { name: 'Venus',   bodyName: 'Venus',   color: 0xe8cda0, radius: 0.5, textureUrl: '/textures/2k_venus_surface.jpg', semiMajorAxisAU: 0.723 },
  { name: 'Earth',   bodyName: 'Earth',   color: 0x2e86de, radius: 0.5, textureUrl: '/textures/2k_earth_daymap.jpg', semiMajorAxisAU: 1.000 },
  { name: 'Mars',    bodyName: 'Mars',    color: 0xc1440e, radius: 0.4, textureUrl: '/textures/2k_mars.jpg', semiMajorAxisAU: 1.524 },
  { name: 'Jupiter', bodyName: 'Jupiter', color: 0xc88b3a, radius: 1.2, textureUrl: '/textures/2k_jupiter.jpg', semiMajorAxisAU: 5.203 },
  { name: 'Saturn',  bodyName: 'Saturn',  color: 0xe4d191, radius: 1.0, hasSaturnRing: true, textureUrl: '/textures/2k_saturn.jpg', semiMajorAxisAU: 9.537 },
  { name: 'Uranus',  bodyName: 'Uranus',  color: 0x7de8e8, radius: 0.7, textureUrl: '/textures/2k_uranus.jpg', semiMajorAxisAU: 19.191 },
  { name: 'Neptune', bodyName: 'Neptune', color: 0x3f54ba, radius: 0.7, textureUrl: '/textures/2k_neptune.jpg', semiMajorAxisAU: 30.069 },
]

export const SUN_TEXTURE_URL = '/textures/2k_sun.jpg'
export const SATURN_RING_TEXTURE_URL = '/textures/2k_saturn_ring_alpha.png'
