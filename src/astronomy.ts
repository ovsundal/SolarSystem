import { Body, HelioVector } from 'astronomy-engine'

export interface PlanetPosition {
  name: string
  x: number
  y: number
  z: number
  auDistance: number
}

export const BODY_MAP = {
  Mercury: Body.Mercury,
  Venus:   Body.Venus,
  Earth:   Body.Earth,
  Mars:    Body.Mars,
  Jupiter: Body.Jupiter,
  Saturn:  Body.Saturn,
  Uranus:  Body.Uranus,
  Neptune: Body.Neptune,
} as const

export { HelioVector }

const BODY_NAMES = Object.keys(BODY_MAP) as Array<keyof typeof BODY_MAP>

export function getPlanetPositions(date: Date): PlanetPosition[] {
  return BODY_NAMES.map(name => {
    const v = HelioVector(BODY_MAP[name], date)
    const auDistance = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
    return { name, x: v.x, y: v.y, z: v.z, auDistance }
  })
}
