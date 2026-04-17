export interface PlanetData {
  name: string
  bodyName: string
  color: number
  radius: number
  hasSaturnRing?: boolean
}

export const PLANETS: PlanetData[] = [
  { name: 'Mercury', bodyName: 'Mercury', color: 0xb5b5b5, radius: 0.3 },
  { name: 'Venus',   bodyName: 'Venus',   color: 0xe8cda0, radius: 0.5 },
  { name: 'Earth',   bodyName: 'Earth',   color: 0x2e86de, radius: 0.5 },
  { name: 'Mars',    bodyName: 'Mars',    color: 0xc1440e, radius: 0.4 },
  { name: 'Jupiter', bodyName: 'Jupiter', color: 0xc88b3a, radius: 1.2 },
  { name: 'Saturn',  bodyName: 'Saturn',  color: 0xe4d191, radius: 1.0, hasSaturnRing: true },
  { name: 'Uranus',  bodyName: 'Uranus',  color: 0x7de8e8, radius: 0.7 },
  { name: 'Neptune', bodyName: 'Neptune', color: 0x3f54ba, radius: 0.7 },
]
