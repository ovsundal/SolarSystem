export interface PlanetData {
  name: string
  bodyName: string
  color: number
  radius: number
  hasSaturnRing?: boolean
  textureUrl: string
  semiMajorAxisAU: number
  eccentricity: number       // e — how elliptical (0=circle)
  inclinationDeg: number     // i — tilt relative to ecliptic (degrees)
  anDeg: number              // Ω — longitude of ascending node (degrees)
  aopDeg: number             // ω — argument of periapsis (degrees)
  orbitalPeriodDays: number  // sidereal orbital period in days
}

export const PLANETS: PlanetData[] = [
  { name: 'Mercury', bodyName: 'Mercury', color: 0xb5b5b5, radius: 0.3, textureUrl: '/textures/2k_mercury.jpg', semiMajorAxisAU: 0.387,  eccentricity: 0.2056, inclinationDeg: 7.005,  anDeg: 48.331,  aopDeg: 29.124,  orbitalPeriodDays: 87.969    },
  { name: 'Venus',   bodyName: 'Venus',   color: 0xe8cda0, radius: 0.5, textureUrl: '/textures/2k_venus_surface.jpg', semiMajorAxisAU: 0.723,  eccentricity: 0.0068, inclinationDeg: 3.395,  anDeg: 76.680,  aopDeg: 54.884,  orbitalPeriodDays: 224.701   },
  { name: 'Earth',   bodyName: 'Earth',   color: 0x2e86de, radius: 0.5, textureUrl: '/textures/2k_earth_daymap.jpg', semiMajorAxisAU: 1.000,  eccentricity: 0.0167, inclinationDeg: 0.000,  anDeg: 0.000,   aopDeg: 102.937, orbitalPeriodDays: 365.256   },
  { name: 'Mars',    bodyName: 'Mars',    color: 0xc1440e, radius: 0.4, textureUrl: '/textures/2k_mars.jpg', semiMajorAxisAU: 1.524,  eccentricity: 0.0934, inclinationDeg: 1.850,  anDeg: 49.558,  aopDeg: 286.502, orbitalPeriodDays: 686.971   },
  { name: 'Jupiter', bodyName: 'Jupiter', color: 0xc88b3a, radius: 1.2, textureUrl: '/textures/2k_jupiter.jpg', semiMajorAxisAU: 5.203,  eccentricity: 0.0489, inclinationDeg: 1.303,  anDeg: 100.464, aopDeg: 273.867, orbitalPeriodDays: 4332.589  },
  { name: 'Saturn',  bodyName: 'Saturn',  color: 0xe4d191, radius: 1.0, hasSaturnRing: true, textureUrl: '/textures/2k_saturn.jpg', semiMajorAxisAU: 9.537,  eccentricity: 0.0565, inclinationDeg: 2.489,  anDeg: 113.665, aopDeg: 339.392, orbitalPeriodDays: 10759.22  },
  { name: 'Uranus',  bodyName: 'Uranus',  color: 0x7de8e8, radius: 0.7, textureUrl: '/textures/2k_uranus.jpg', semiMajorAxisAU: 19.191, eccentricity: 0.0463, inclinationDeg: 0.773,  anDeg: 74.006,  aopDeg: 96.998,  orbitalPeriodDays: 30688.5   },
  { name: 'Neptune', bodyName: 'Neptune', color: 0x3f54ba, radius: 0.7, textureUrl: '/textures/2k_neptune.jpg', semiMajorAxisAU: 30.069, eccentricity: 0.0097, inclinationDeg: 1.770,  anDeg: 131.784, aopDeg: 276.340, orbitalPeriodDays: 60182.0   },
]

export const SUN_TEXTURE_URL = '/textures/2k_sun.jpg'
export const SATURN_RING_TEXTURE_URL = '/textures/2k_saturn_ring_alpha.png'
export const MOON_TEXTURE_URL = '/textures/2k_moon.jpg'
export const MILKY_WAY_TEXTURE_URL = '/textures/2k_stars_milky_way.jpg'
