import type { MissionManifest, TrajectoryPoint, MissionPhase } from './types'

/**
 * Binary search + linear interpolation of trajectory position at a given time.
 * Returns geocentric equatorial J2000 position in AU.
 * Returns null if trajectory is empty.
 * Clamps to first/last point if timeMs is outside the trajectory window.
 */
export function interpolateTrajectory(
  trajectory: TrajectoryPoint[],
  timeMs: number
): { x: number; y: number; z: number } | null {
  if (trajectory.length === 0) return null
  if (timeMs <= trajectory[0].epochMs) return trajectory[0]
  if (timeMs >= trajectory[trajectory.length - 1].epochMs) return trajectory[trajectory.length - 1]

  // Binary search for bracketing interval
  let lo = 0, hi = trajectory.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1
    if (trajectory[mid].epochMs <= timeMs) lo = mid
    else hi = mid
  }

  const a = trajectory[lo], b = trajectory[hi]
  const t = (timeMs - a.epochMs) / (b.epochMs - a.epochMs)
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

/**
 * Convert geocentric equatorial J2000 (x,y,z in AU) to ecliptic coordinates.
 * The obliquity of the ecliptic (23.4393°) rotates equatorial to ecliptic.
 */
const OBLIQUITY = 23.4393 * Math.PI / 180
const cosObl = Math.cos(OBLIQUITY)
const sinObl = Math.sin(OBLIQUITY)

export function geoEquatorialToEcliptic(
  x: number, y: number, z: number
): { x: number; y: number; z: number } {
  return {
    x: x,
    y: cosObl * y + sinObl * z,
    z: -sinObl * y + cosObl * z,
  }
}

/**
 * Get the current mission phase for a given time.
 */
export function getCurrentPhase(
  phases: MissionPhase[],
  timeMs: number
): MissionPhase | null {
  for (const phase of phases) {
    if (timeMs >= phase.startMs && timeMs < phase.endMs) return phase
  }
  return null
}

/**
 * Get mission progress as a fraction [0, 1].
 */
export function getMissionProgress(
  mission: MissionManifest,
  timeMs: number
): number {
  if (timeMs <= mission.startMs) return 0
  if (timeMs >= mission.endMs) return 1
  return (timeMs - mission.startMs) / (mission.endMs - mission.startMs)
}

/**
 * Compute distance from Earth in km.
 * Input position is geocentric AU.
 */
const AU_TO_KM = 149597870.7
export function distanceFromEarthKm(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z) * AU_TO_KM
}
