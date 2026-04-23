import type { MissionManifest, TrajectoryPoint, MissionPhase } from './types'
import { GeoMoon } from '../astronomy'

const AU_KM = 149597870.7

const phases: MissionPhase[] = [
  {
    name: 'Launch',
    startEpoch: '1969-07-16T13:32:00Z',
    startMs: Date.UTC(1969, 6, 16, 13, 32, 0),
    endEpoch: '1969-07-16T16:16:16Z',
    endMs: Date.UTC(1969, 6, 16, 16, 16, 16),
    color: '#4CAF50',
  },
  {
    name: 'Trans-Lunar Injection',
    startEpoch: '1969-07-16T16:16:16Z',
    startMs: Date.UTC(1969, 6, 16, 16, 16, 16),
    endEpoch: '1969-07-16T16:30:00Z',
    endMs: Date.UTC(1969, 6, 16, 16, 30, 0),
    color: '#FF9800',
  },
  {
    name: 'Translunar Coast',
    startEpoch: '1969-07-16T16:30:00Z',
    startMs: Date.UTC(1969, 6, 16, 16, 30, 0),
    endEpoch: '1969-07-19T17:21:50Z',
    endMs: Date.UTC(1969, 6, 19, 17, 21, 50),
    color: '#2196F3',
  },
  {
    name: 'Lunar Orbit Insertion',
    startEpoch: '1969-07-19T17:21:50Z',
    startMs: Date.UTC(1969, 6, 19, 17, 21, 50),
    endEpoch: '1969-07-20T20:17:40Z',
    endMs: Date.UTC(1969, 6, 20, 20, 17, 40),
    color: '#9C27B0',
  },
  {
    name: 'Lunar Landing (Eagle)',
    startEpoch: '1969-07-20T20:17:40Z',
    startMs: Date.UTC(1969, 6, 20, 20, 17, 40),
    endEpoch: '1969-07-21T02:56:15Z',
    endMs: Date.UTC(1969, 6, 21, 2, 56, 15),
    color: '#FFD700',
  },
  {
    name: 'Moonwalk (First Steps)',
    startEpoch: '1969-07-21T02:56:15Z',
    startMs: Date.UTC(1969, 6, 21, 2, 56, 15),
    endEpoch: '1969-07-21T05:11:00Z',
    endMs: Date.UTC(1969, 6, 21, 5, 11, 0),
    color: '#E91E63',
  },
  {
    name: 'Lunar Ascent',
    startEpoch: '1969-07-21T05:11:00Z',
    startMs: Date.UTC(1969, 6, 21, 5, 11, 0),
    endEpoch: '1969-07-21T21:35:00Z',
    endMs: Date.UTC(1969, 6, 21, 21, 35, 0),
    color: '#FF5722',
  },
  {
    name: 'Trans-Earth Injection',
    startEpoch: '1969-07-21T21:35:00Z',
    startMs: Date.UTC(1969, 6, 21, 21, 35, 0),
    endEpoch: '1969-07-22T04:55:42Z',
    endMs: Date.UTC(1969, 6, 22, 4, 55, 42),
    color: '#FF9800',
  },
  {
    name: 'Splashdown',
    startEpoch: '1969-07-22T04:55:42Z',
    startMs: Date.UTC(1969, 6, 22, 4, 55, 42),
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
  const tliMs = Date.UTC(1969, 6, 16, 16, 16, 16)
  const loiMs = Date.UTC(1969, 6, 19, 17, 21, 50)
  const teiMs = Date.UTC(1969, 6, 21, 21, 35, 0)
  const splashdownMs = Date.UTC(1969, 6, 24, 16, 50, 35)

  const LEO_R_KM = 6571 // ~191 km parking orbit altitude
  const LEO_R_AU = LEO_R_KM / AU_KM
  const LEO_PERIOD_MS = 88 * 60 * 1000 // ~88 min orbital period

  const OBLIQUITY = 23.4393 * Math.PI / 180
  const cosObl = Math.cos(OBLIQUITY)
  const sinObl = Math.sin(OBLIQUITY)

  // Phase 1: LEO — circular orbit in equatorial plane
  for (let t = launchMs; t < tliMs; t += INTERVAL_MS) {
    const angle = ((t - launchMs) / LEO_PERIOD_MS) * 2 * Math.PI
    points.push(makePoint(t,
      LEO_R_AU * Math.cos(angle),
      LEO_R_AU * Math.sin(angle),
      0
    ))
  }

  // Phase 2 & 3: Outbound — interpolate from LEO to lunar vicinity at LOI
  const outboundStartMs = tliMs
  const outboundEndMs = loiMs
  const outboundDuration = outboundEndMs - outboundStartMs

  // Get Moon position at LOI for targeting
  const moonAtLOI = GeoMoon(new Date(loiMs))
  // Ecliptic→Equatorial: rotate around X by -obliquity
  const moonEqX = moonAtLOI.x
  const moonEqY = cosObl * moonAtLOI.y - sinObl * moonAtLOI.z
  const moonEqZ = sinObl * moonAtLOI.y + cosObl * moonAtLOI.z

  const moonDist = Math.sqrt(moonEqX * moonEqX + moonEqY * moonEqY + moonEqZ * moonEqZ)
  const moonDirX = moonEqX / moonDist
  const moonDirY = moonEqY / moonDist
  const moonDirZ = moonEqZ / moonDist

  // LEO exit angle
  const startAngle = ((tliMs - launchMs) / LEO_PERIOD_MS) * 2 * Math.PI
  const startX = LEO_R_AU * Math.cos(startAngle)
  const startY = LEO_R_AU * Math.sin(startAngle)

  const MAX_DIST_AU = moonDist

  for (let t = outboundStartMs; t < outboundEndMs; t += INTERVAL_MS) {
    const frac = (t - outboundStartMs) / outboundDuration
    const s = 0.5 - 0.5 * Math.cos(frac * Math.PI)

    const arcHeight = MAX_DIST_AU * 0.15 * Math.sin(frac * Math.PI)

    const px = startX * (1 - s) + moonEqX * s
    const py = startY * (1 - s) + moonEqY * s
    const pz = arcHeight + moonEqZ * s

    points.push(makePoint(t, px, py, pz))
  }

  // Phase 4-7: Lunar orbit — circular orbit around Moon at ~111 km altitude (~1849 km from center)
  const lunarOrbitR_KM = 1849
  const lunarOrbitR_AU = lunarOrbitR_KM / AU_KM
  const lunarOrbitPeriodMs = 128 * 60 * 1000 // ~128 min period

  // Compute perpendicular vectors for orbital plane around Moon
  // Use cross product of Moon direction with Z-axis for one perpendicular
  const perpAx = -moonDirY
  const perpAy = moonDirX
  const perpAz = 0
  const perpAlen = Math.sqrt(perpAx * perpAx + perpAy * perpAy + perpAz * perpAz)
  const pAx = perpAx / perpAlen
  const pAy = perpAy / perpAlen
  const pAz = perpAz / perpAlen
  // Second perpendicular: cross moonDir with perpA
  const pBx = moonDirY * pAz - moonDirZ * pAy
  const pBy = moonDirZ * pAx - moonDirX * pAz
  const pBz = moonDirX * pAy - moonDirY * pAx

  for (let t = loiMs; t < teiMs; t += INTERVAL_MS) {
    const moonAtT = GeoMoon(new Date(t))
    const mEqX = moonAtT.x
    const mEqY = cosObl * moonAtT.y - sinObl * moonAtT.z
    const mEqZ = sinObl * moonAtT.y + cosObl * moonAtT.z

    const orbitAngle = ((t - loiMs) / lunarOrbitPeriodMs) * 2 * Math.PI
    const px = mEqX + lunarOrbitR_AU * (pAx * Math.cos(orbitAngle) + pBx * Math.sin(orbitAngle))
    const py = mEqY + lunarOrbitR_AU * (pAy * Math.cos(orbitAngle) + pBy * Math.sin(orbitAngle))
    const pz = mEqZ + lunarOrbitR_AU * (pAz * Math.cos(orbitAngle) + pBz * Math.sin(orbitAngle))

    points.push(makePoint(t, px, py, pz))
  }

  // Phase 8 & 9: Return — interpolate from last lunar orbit position back to near-Earth
  const returnStartMs = teiMs
  const returnEndMs = splashdownMs
  const returnDuration = returnEndMs - returnStartMs

  const lastLunar = points[points.length - 1]

  for (let t = returnStartMs + INTERVAL_MS; t <= returnEndMs; t += INTERVAL_MS) {
    const frac = (t - returnStartMs) / returnDuration
    const s = 0.5 - 0.5 * Math.cos(frac * Math.PI)

    const endR = LEO_R_AU * 2
    const returnAngle = Math.PI * 0.3

    const px = lastLunar.x * (1 - s) + endR * Math.cos(returnAngle) * s
    const py = lastLunar.y * (1 - s) + endR * Math.sin(returnAngle) * s
    const pz = lastLunar.z * (1 - s)

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
    description: 'First crewed Moon landing — Neil Armstrong and Buzz Aldrin walk on the lunar surface (July 1969)',
    startEpoch: '1969-07-16T13:32:00Z',
    startMs: Date.UTC(1969, 6, 16, 13, 32, 0),
    endEpoch: '1969-07-24T16:50:35Z',
    endMs: Date.UTC(1969, 6, 24, 16, 50, 35),
    phases,
    trajectory: buildTrajectoryPoints(),
    spacecraft: {
      name: 'Apollo CSM',
      color: 0xffd700,
      radius: 0.08,
    },
  }

  return cachedMission
}
