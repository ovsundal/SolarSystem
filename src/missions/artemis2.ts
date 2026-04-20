import type { MissionManifest, TrajectoryPoint, MissionPhase } from './types'
import { GeoMoon } from '../astronomy'

const AU_KM = 149597870.7

const phases: MissionPhase[] = [
  {
    name: 'Launch & Earth Orbit',
    startEpoch: '2026-04-01T22:35:00Z',
    startMs: Date.UTC(2026, 3, 1, 22, 35, 0),
    endEpoch: '2026-04-02T23:49:00Z',
    endMs: Date.UTC(2026, 3, 2, 23, 49, 0),
    color: '#4CAF50',
  },
  {
    name: 'Trans-Lunar Injection',
    startEpoch: '2026-04-02T23:49:00Z',
    startMs: Date.UTC(2026, 3, 2, 23, 49, 0),
    endEpoch: '2026-04-03T00:00:00Z',
    endMs: Date.UTC(2026, 3, 3, 0, 0, 0),
    color: '#FF9800',
  },
  {
    name: 'Outbound Coast',
    startEpoch: '2026-04-03T00:00:00Z',
    startMs: Date.UTC(2026, 3, 3, 0, 0, 0),
    endEpoch: '2026-04-06T20:00:00Z',
    endMs: Date.UTC(2026, 3, 6, 20, 0, 0),
    color: '#2196F3',
  },
  {
    name: 'Lunar Flyby',
    startEpoch: '2026-04-06T20:00:00Z',
    startMs: Date.UTC(2026, 3, 6, 20, 0, 0),
    endEpoch: '2026-04-07T04:00:00Z',
    endMs: Date.UTC(2026, 3, 7, 4, 0, 0),
    color: '#9C27B0',
  },
  {
    name: 'Return Coast',
    startEpoch: '2026-04-07T04:00:00Z',
    startMs: Date.UTC(2026, 3, 7, 4, 0, 0),
    endEpoch: '2026-04-10T20:00:00Z',
    endMs: Date.UTC(2026, 3, 10, 20, 0, 0),
    color: '#2196F3',
  },
  {
    name: 'Re-entry & Splashdown',
    startEpoch: '2026-04-10T20:00:00Z',
    startMs: Date.UTC(2026, 3, 10, 20, 0, 0),
    endEpoch: '2026-04-11T00:07:27Z',
    endMs: Date.UTC(2026, 3, 11, 0, 7, 27),
    color: '#F44336',
  },
]

/**
 * Generate synthetic Artemis 2 trajectory using patched-conic approximation.
 * Positions are geocentric equatorial J2000 in AU.
 */
function buildTrajectoryPoints(): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = []
  const INTERVAL_MS = 4 * 60 * 1000 // 4 minutes

  const launchMs = Date.UTC(2026, 3, 1, 22, 35, 0)
  const tliMs = Date.UTC(2026, 3, 2, 23, 49, 0)
  const flybyMs = Date.UTC(2026, 3, 6, 23, 0, 0) // closest approach
  const splashdownMs = Date.UTC(2026, 3, 11, 0, 7, 27)

  const LEO_R_KM = 6771 // ~400 km altitude
  const LEO_R_AU = LEO_R_KM / AU_KM
  const LEO_PERIOD_MS = 92 * 60 * 1000 // ~92 min orbital period
  const MAX_DIST_KM = 406771
  const MAX_DIST_AU = MAX_DIST_KM / AU_KM

  // Phase 1: LEO — circular orbit in equatorial plane
  for (let t = launchMs; t < tliMs; t += INTERVAL_MS) {
    const angle = ((t - launchMs) / LEO_PERIOD_MS) * 2 * Math.PI
    points.push(makePoint(t,
      LEO_R_AU * Math.cos(angle),
      LEO_R_AU * Math.sin(angle),
      0
    ))
  }

  // Phase 2 & 3: Outbound — interpolate from LEO to lunar vicinity
  // Use a smooth curve that arcs out to the Moon's position
  const outboundStartMs = tliMs
  const outboundEndMs = flybyMs
  const outboundDuration = outboundEndMs - outboundStartMs

  // Get Moon position at flyby for targeting
  const moonAtFlyby = GeoMoon(new Date(flybyMs))
  // Moon geocentric equatorial J2000 — astronomy-engine GeoMoon returns ecliptic,
  // but we store in equatorial. We need to convert ecliptic→equatorial.
  const OBLIQUITY = 23.4393 * Math.PI / 180
  const cosObl = Math.cos(OBLIQUITY)
  const sinObl = Math.sin(OBLIQUITY)
  // Ecliptic→Equatorial: rotate around X by -obliquity
  const moonEqX = moonAtFlyby.x
  const moonEqY = cosObl * moonAtFlyby.y - sinObl * moonAtFlyby.z
  const moonEqZ = sinObl * moonAtFlyby.y + cosObl * moonAtFlyby.z

  // Flyby closest approach: offset from Moon by ~6545 km on far side
  const moonDist = Math.sqrt(moonEqX * moonEqX + moonEqY * moonEqY + moonEqZ * moonEqZ)
  const moonDirX = moonEqX / moonDist
  const moonDirY = moonEqY / moonDist
  const moonDirZ = moonEqZ / moonDist
  const flybyOffsetAU = 6545 / AU_KM
  const flybyX = moonEqX + moonDirX * flybyOffsetAU
  const flybyY = moonEqY + moonDirY * flybyOffsetAU
  const flybyZ = moonEqZ + moonDirZ * flybyOffsetAU

  for (let t = outboundStartMs; t < outboundEndMs; t += INTERVAL_MS) {
    const frac = (t - outboundStartMs) / outboundDuration
    // Smooth easing — slow departure, accelerate, slow near Moon
    const s = 0.5 - 0.5 * Math.cos(frac * Math.PI)

    // Start position (just after TLI — slightly above LEO)
    const startAngle = ((tliMs - launchMs) / LEO_PERIOD_MS) * 2 * Math.PI
    const startX = LEO_R_AU * Math.cos(startAngle)
    const startY = LEO_R_AU * Math.sin(startAngle)

    // Add a slight out-of-plane arc for visual interest
    const arcHeight = MAX_DIST_AU * 0.15 * Math.sin(frac * Math.PI)

    const px = startX * (1 - s) + flybyX * s
    const py = startY * (1 - s) + flybyY * s
    const pz = arcHeight + flybyZ * s

    points.push(makePoint(t, px, py, pz))
  }

  // Phase 4: Lunar flyby — swing around Moon's far side
  const flybyStartMs = outboundEndMs
  const flybyEndMs = Date.UTC(2026, 3, 7, 4, 0, 0)
  const flybyDuration = flybyEndMs - flybyStartMs

  for (let t = flybyStartMs; t <= flybyEndMs; t += INTERVAL_MS) {
    const frac = (t - flybyStartMs) / flybyDuration
    // Arc around Moon: 180° swing on far side
    const moonAtT = GeoMoon(new Date(t))
    const mEqX = moonAtT.x
    const mEqY = cosObl * moonAtT.y - sinObl * moonAtT.z
    const mEqZ = sinObl * moonAtT.y + cosObl * moonAtT.z

    const swingAngle = frac * Math.PI // 0 to 180°
    const swingR = flybyOffsetAU * (1 + 0.5 * Math.sin(swingAngle)) // vary distance slightly

    // Perpendicular direction for swing (cross Moon direction with Z-axis)
    const perpX = -moonDirY
    const perpY = moonDirX
    const perpZ = 0

    const px = mEqX + moonDirX * swingR * Math.cos(swingAngle) + perpX * swingR * Math.sin(swingAngle)
    const py = mEqY + moonDirY * swingR * Math.cos(swingAngle) + perpY * swingR * Math.sin(swingAngle)
    const pz = mEqZ + moonDirZ * swingR * Math.cos(swingAngle) + perpZ * swingR * Math.sin(swingAngle)

    points.push(makePoint(t, px, py, pz))
  }

  // Phase 5 & 6: Return coast — mirror of outbound, back to Earth
  const returnStartMs = flybyEndMs
  const returnEndMs = splashdownMs
  const returnDuration = returnEndMs - returnStartMs

  // Last flyby point as start of return
  const lastFlyby = points[points.length - 1]

  for (let t = returnStartMs + INTERVAL_MS; t <= returnEndMs; t += INTERVAL_MS) {
    const frac = (t - returnStartMs) / returnDuration
    const s = 0.5 - 0.5 * Math.cos(frac * Math.PI)

    // Return from last flyby position to near-Earth
    const endR = LEO_R_AU * 2 // re-entry altitude
    const returnAngle = Math.PI * 0.3 // approach angle

    const px = lastFlyby.x * (1 - s) + endR * Math.cos(returnAngle) * s
    const py = lastFlyby.y * (1 - s) + endR * Math.sin(returnAngle) * s
    const pz = lastFlyby.z * (1 - s)

    points.push(makePoint(t, px, py, pz))
  }

  return points
}

function makePoint(timeMs: number, x: number, y: number, z: number): TrajectoryPoint {
  return {
    epoch: new Date(timeMs).toISOString(),
    epochMs: timeMs,
    x,
    y,
    z,
  }
}

let cachedMission: MissionManifest | null = null

export function getArtemis2Mission(): MissionManifest {
  if (cachedMission) return cachedMission

  cachedMission = {
    id: 'artemis-2',
    name: 'Artemis II',
    description: 'Crewed lunar flyby — first crewed flight beyond low Earth orbit since Apollo 17 (1972)',
    startEpoch: '2026-04-01T22:35:00Z',
    startMs: Date.UTC(2026, 3, 1, 22, 35, 0),
    endEpoch: '2026-04-11T00:07:27Z',
    endMs: Date.UTC(2026, 3, 11, 0, 7, 27),
    phases,
    trajectory: buildTrajectoryPoints(),
    spacecraft: {
      name: 'Orion',
      color: 0xffffff,
      radius: 0.08,
    },
  }

  return cachedMission
}
