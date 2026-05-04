import type { MissionManifest, TrajectoryPoint, MissionPhase } from './types'
import { GeoMoon } from '../astronomy'

const AU_KM = 149597870.7

// Apollo 11 timeline (UTC)
// Launch:               1969-07-16T13:32:00Z
// Trans-Lunar Injection:1969-07-16T16:22:00Z
// Lunar Orbit Insertion:1969-07-19T17:22:00Z
// Landing (Sea of Tran):1969-07-20T20:17:40Z
// Moonwalk begins:      1969-07-21T02:56:00Z
// Lunar Ascent:         1969-07-21T17:54:00Z
// Transearth Injection: 1969-07-22T04:55:00Z
// Splashdown:           1969-07-24T16:50:35Z

const phases: MissionPhase[] = [
  {
    name: 'Launch & Earth Orbit',
    startEpoch: '1969-07-16T13:32:00Z',
    startMs: Date.UTC(1969, 6, 16, 13, 32, 0),
    endEpoch: '1969-07-16T16:22:00Z',
    endMs: Date.UTC(1969, 6, 16, 16, 22, 0),
    color: '#4CAF50',
  },
  {
    name: 'Trans-Lunar Injection',
    startEpoch: '1969-07-16T16:22:00Z',
    startMs: Date.UTC(1969, 6, 16, 16, 22, 0),
    endEpoch: '1969-07-16T16:45:00Z',
    endMs: Date.UTC(1969, 6, 16, 16, 45, 0),
    color: '#FF9800',
  },
  {
    name: 'Outbound Coast',
    startEpoch: '1969-07-16T16:45:00Z',
    startMs: Date.UTC(1969, 6, 16, 16, 45, 0),
    endEpoch: '1969-07-19T17:22:00Z',
    endMs: Date.UTC(1969, 6, 19, 17, 22, 0),
    color: '#2196F3',
  },
  {
    name: 'Lunar Orbit',
    startEpoch: '1969-07-19T17:22:00Z',
    startMs: Date.UTC(1969, 6, 19, 17, 22, 0),
    endEpoch: '1969-07-20T20:17:40Z',
    endMs: Date.UTC(1969, 6, 20, 20, 17, 40),
    color: '#9C27B0',
  },
  {
    name: 'Moon Landing',
    startEpoch: '1969-07-20T20:17:40Z',
    startMs: Date.UTC(1969, 6, 20, 20, 17, 40),
    endEpoch: '1969-07-21T17:54:00Z',
    endMs: Date.UTC(1969, 6, 21, 17, 54, 0),
    color: '#FFC107',
  },
  {
    name: 'Return Coast',
    startEpoch: '1969-07-21T17:54:00Z',
    startMs: Date.UTC(1969, 6, 21, 17, 54, 0),
    endEpoch: '1969-07-24T16:50:35Z',
    endMs: Date.UTC(1969, 6, 24, 16, 50, 35),
    color: '#2196F3',
  },
  {
    name: 'Re-entry & Splashdown',
    startEpoch: '1969-07-24T16:00:00Z',
    startMs: Date.UTC(1969, 6, 24, 16, 0, 0),
    endEpoch: '1969-07-24T16:50:35Z',
    endMs: Date.UTC(1969, 6, 24, 16, 50, 35),
    color: '#F44336',
  },
]

/**
 * Generate synthetic Apollo 11 trajectory using patched-conic approximation.
 * Positions are geocentric equatorial J2000 in AU.
 */
function buildTrajectoryPoints(): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = []
  const INTERVAL_MS = 4 * 60 * 1000 // 4 minutes

  const launchMs = Date.UTC(1969, 6, 16, 13, 32, 0)
  const tliMs = Date.UTC(1969, 6, 16, 16, 22, 0)
  const loiMs = Date.UTC(1969, 6, 19, 17, 22, 0)   // Lunar Orbit Insertion
  const landingMs = Date.UTC(1969, 6, 20, 20, 17, 40)
  const ascentMs = Date.UTC(1969, 6, 21, 17, 54, 0)
  const splashdownMs = Date.UTC(1969, 6, 24, 16, 50, 35)

  const LEO_R_KM = 6671    // ~300 km altitude (Apollo parking orbit)
  const LEO_R_AU = LEO_R_KM / AU_KM
  const LEO_PERIOD_MS = 88 * 60 * 1000

  const OBLIQUITY = 23.4393 * Math.PI / 180
  const cosObl = Math.cos(OBLIQUITY)
  const sinObl = Math.sin(OBLIQUITY)

  // Helper: ecliptic → equatorial for GeoMoon output
  function moonEquatorial(t: number) {
    const m = GeoMoon(new Date(t))
    return {
      x: m.x,
      y: cosObl * m.y - sinObl * m.z,
      z: sinObl * m.y + cosObl * m.z,
    }
  }

  // Phase 1: LEO parking orbit (~3 hours)
  for (let t = launchMs; t < tliMs; t += INTERVAL_MS) {
    const angle = ((t - launchMs) / LEO_PERIOD_MS) * 2 * Math.PI
    points.push(makePoint(t,
      LEO_R_AU * Math.cos(angle),
      LEO_R_AU * Math.sin(angle),
      0
    ))
  }

  // Phase 2 & 3: Outbound coast — TLI to LOI (~3 days)
  const moonAtLOI = moonEquatorial(loiMs)
  const moonDist = Math.sqrt(moonAtLOI.x ** 2 + moonAtLOI.y ** 2 + moonAtLOI.z ** 2)
  const moonDirX = moonAtLOI.x / moonDist
  const moonDirY = moonAtLOI.y / moonDist
  const moonDirZ = moonAtLOI.z / moonDist

  // LOR target: ~100 km circular lunar orbit → offset from Moon center
  const LLO_KM = 100 + 1737.4    // altitude + lunar radius
  const LLO_AU = LLO_KM / AU_KM

  // Approach from "behind" Moon relative to Earth
  const loiX = moonAtLOI.x - moonDirX * LLO_AU * 0.5
  const loiY = moonAtLOI.y - moonDirY * LLO_AU * 0.5
  const loiZ = moonAtLOI.z - moonDirZ * LLO_AU * 0.5

  const outboundDuration = loiMs - tliMs
  const startAngle = ((tliMs - launchMs) / LEO_PERIOD_MS) * 2 * Math.PI
  const startX = LEO_R_AU * Math.cos(startAngle)
  const startY = LEO_R_AU * Math.sin(startAngle)

  for (let t = tliMs; t < loiMs; t += INTERVAL_MS) {
    const frac = (t - tliMs) / outboundDuration
    const s = 0.5 - 0.5 * Math.cos(frac * Math.PI)

    const arcHeight = moonDist * 0.1 * Math.sin(frac * Math.PI)

    const px = startX * (1 - s) + loiX * s
    const py = startY * (1 - s) + loiY * s
    const pz = arcHeight + loiZ * s

    points.push(makePoint(t, px, py, pz))
  }

  // Phase 4: Lunar orbit until landing (CSM orbits, LM descends)
  const perpX = -moonDirY
  const perpY = moonDirX
  const perpZ = 0
  const loiDuration = landingMs - loiMs

  for (let t = loiMs; t < landingMs; t += INTERVAL_MS) {
    const frac = (t - loiMs) / loiDuration
    const moonNow = moonEquatorial(t)
    // Simple circular orbit around Moon at ~100 km
    const orbitAngle = frac * 8 * Math.PI  // ~4 orbits over ~27 hours
    const px = moonNow.x + moonDirX * LLO_AU * Math.cos(orbitAngle) + perpX * LLO_AU * Math.sin(orbitAngle)
    const py = moonNow.y + moonDirY * LLO_AU * Math.cos(orbitAngle) + perpY * LLO_AU * Math.sin(orbitAngle)
    const pz = moonNow.z + moonDirZ * LLO_AU * Math.cos(orbitAngle) + perpZ * LLO_AU * Math.sin(orbitAngle)
    points.push(makePoint(t, px, py, pz))
  }

  // Phase 5: Moon surface (LM landed; represented at Moon position)
  const moonRadiusAU = 1737.4 / AU_KM
  for (let t = landingMs; t < ascentMs; t += INTERVAL_MS) {
    const moonNow = moonEquatorial(t)
    // Place at Moon's surface in Sea of Tranquility direction
    const landingDirX = moonDirX
    const landingDirY = moonDirY
    const landingDirZ = moonDirZ
    points.push(makePoint(t,
      moonNow.x - landingDirX * moonRadiusAU,
      moonNow.y - landingDirY * moonRadiusAU,
      moonNow.z - landingDirZ * moonRadiusAU,
    ))
  }

  // Phase 6 & 7: Ascent + return coast back to Earth
  const lastSurface = points[points.length - 1]
  const returnDuration = splashdownMs - ascentMs
  const reentryR = LEO_R_AU * 1.5
  const returnAngle = Math.PI * 1.7

  for (let t = ascentMs; t <= splashdownMs; t += INTERVAL_MS) {
    const frac = (t - ascentMs) / returnDuration
    const s = 0.5 - 0.5 * Math.cos(frac * Math.PI)

    const px = lastSurface.x * (1 - s) + reentryR * Math.cos(returnAngle) * s
    const py = lastSurface.y * (1 - s) + reentryR * Math.sin(returnAngle) * s
    const pz = lastSurface.z * (1 - s)

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

export function getApollo11Mission(): MissionManifest {
  if (cachedMission) return cachedMission

  cachedMission = {
    id: 'apollo-11',
    name: 'Apollo 11',
    description: 'First crewed Moon landing — Neil Armstrong, Buzz Aldrin, Michael Collins (July 1969)',
    startEpoch: '1969-07-16T13:32:00Z',
    startMs: Date.UTC(1969, 6, 16, 13, 32, 0),
    endEpoch: '1969-07-24T16:50:35Z',
    endMs: Date.UTC(1969, 6, 24, 16, 50, 35),
    phases,
    trajectory: buildTrajectoryPoints(),
    spacecraft: {
      name: 'Columbia / Eagle',
      color: 0xffdd44,
      radius: 0.08,
    },
  }

  return cachedMission
}
