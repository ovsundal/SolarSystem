import { describe, it, expect } from 'vitest'
import {
  interpolateTrajectory,
  geoEquatorialToEcliptic,
  getCurrentPhase,
  getMissionProgress,
  distanceFromEarthKm,
} from './missionUtils'
import type { TrajectoryPoint, MissionPhase, MissionManifest } from './types'

function mkPoint(epochMs: number, x: number, y: number, z: number): TrajectoryPoint {
  return { epoch: new Date(epochMs).toISOString(), epochMs, x, y, z }
}

describe('interpolateTrajectory', () => {
  it('returns null for empty array', () => {
    expect(interpolateTrajectory([], 100)).toBeNull()
  })

  it('clamps to first point when timeMs is before trajectory', () => {
    const traj = [mkPoint(100, 1, 2, 3), mkPoint(200, 4, 5, 6)]
    const result = interpolateTrajectory(traj, 50)
    expect(result).toMatchObject({ x: 1, y: 2, z: 3 })
  })

  it('clamps to last point when timeMs is after trajectory', () => {
    const traj = [mkPoint(100, 1, 2, 3), mkPoint(200, 4, 5, 6)]
    const result = interpolateTrajectory(traj, 300)
    expect(result).toMatchObject({ x: 4, y: 5, z: 6 })
  })

  it('returns exact point on epoch match', () => {
    const traj = [mkPoint(100, 1, 0, 0), mkPoint(200, 2, 0, 0), mkPoint(300, 3, 0, 0)]
    const result = interpolateTrajectory(traj, 200)
    expect(result).toEqual({ x: 2, y: 0, z: 0 })
  })

  it('interpolates midpoint correctly', () => {
    const traj = [mkPoint(0, 0, 0, 0), mkPoint(100, 10, 20, 30)]
    const result = interpolateTrajectory(traj, 50)!
    expect(result.x).toBeCloseTo(5)
    expect(result.y).toBeCloseTo(10)
    expect(result.z).toBeCloseTo(15)
  })

  it('interpolates at 25% correctly', () => {
    const traj = [mkPoint(0, 0, 0, 0), mkPoint(100, 10, 0, 0)]
    const result = interpolateTrajectory(traj, 25)!
    expect(result.x).toBeCloseTo(2.5)
  })

  it('works with single-element trajectory', () => {
    const traj = [mkPoint(100, 5, 6, 7)]
    expect(interpolateTrajectory(traj, 50)).toMatchObject({ x: 5, y: 6, z: 7 })
    expect(interpolateTrajectory(traj, 100)).toMatchObject({ x: 5, y: 6, z: 7 })
    expect(interpolateTrajectory(traj, 200)).toMatchObject({ x: 5, y: 6, z: 7 })
  })
})

describe('geoEquatorialToEcliptic', () => {
  it('leaves x unchanged', () => {
    const result = geoEquatorialToEcliptic(5, 0, 0)
    expect(result.x).toBeCloseTo(5)
  })

  it('preserves vector magnitude', () => {
    const x = 1, y = 2, z = 3
    const magBefore = Math.sqrt(x * x + y * y + z * z)
    const result = geoEquatorialToEcliptic(x, y, z)
    const magAfter = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2)
    expect(magAfter).toBeCloseTo(magBefore)
  })

  it('identity for origin', () => {
    const result = geoEquatorialToEcliptic(0, 0, 0)
    expect(result).toEqual({ x: 0, y: 0, z: 0 })
  })
})

describe('getCurrentPhase', () => {
  const phases: MissionPhase[] = [
    { name: 'A', startEpoch: '', startMs: 0, endEpoch: '', endMs: 100, color: 'red' },
    { name: 'B', startEpoch: '', startMs: 100, endEpoch: '', endMs: 200, color: 'blue' },
  ]

  it('returns matching phase', () => {
    expect(getCurrentPhase(phases, 50)?.name).toBe('A')
    expect(getCurrentPhase(phases, 150)?.name).toBe('B')
  })

  it('start is inclusive', () => {
    expect(getCurrentPhase(phases, 0)?.name).toBe('A')
    expect(getCurrentPhase(phases, 100)?.name).toBe('B')
  })

  it('end is exclusive', () => {
    expect(getCurrentPhase(phases, 99)?.name).toBe('A')
  })

  it('returns null before all phases', () => {
    expect(getCurrentPhase(phases, -1)).toBeNull()
  })

  it('returns null after all phases', () => {
    expect(getCurrentPhase(phases, 200)).toBeNull()
  })
})

describe('getMissionProgress', () => {
  const mission = {
    startMs: 100,
    endMs: 200,
  } as MissionManifest

  it('returns 0 before mission', () => {
    expect(getMissionProgress(mission, 50)).toBe(0)
  })

  it('returns 1 after mission', () => {
    expect(getMissionProgress(mission, 300)).toBe(1)
  })

  it('returns 0.5 at midpoint', () => {
    expect(getMissionProgress(mission, 150)).toBeCloseTo(0.5)
  })

  it('clamps at boundaries', () => {
    expect(getMissionProgress(mission, 100)).toBe(0)
    expect(getMissionProgress(mission, 200)).toBe(1)
  })
})

describe('distanceFromEarthKm', () => {
  it('returns 0 at origin', () => {
    expect(distanceFromEarthKm(0, 0, 0)).toBe(0)
  })

  it('returns ~149.6M km for 1 AU', () => {
    const km = distanceFromEarthKm(1, 0, 0)
    expect(km).toBeCloseTo(149597870.7, 0)
  })

  it('computes 3D distance correctly', () => {
    // 3-4-5 triangle scaled: sqrt(9+16+0) = 5 AU
    const km = distanceFromEarthKm(3, 4, 0)
    expect(km).toBeCloseTo(5 * 149597870.7, 0)
  })
})
