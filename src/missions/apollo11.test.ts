import { describe, it, expect } from 'vitest'
import { getApollo11Mission } from './apollo11'

describe('getApollo11Mission', () => {
  const mission = getApollo11Mission()

  it('has correct mission metadata', () => {
    expect(mission.id).toBe('apollo-11')
    expect(mission.name).toBe('Apollo 11')
    expect(mission.spacecraft.name).toBe('Apollo CSM')
  })

  it('has 9 phases covering the full mission', () => {
    expect(mission.phases).toHaveLength(9)
    expect(mission.phases[0].name).toBe('Launch')
  })

  it('generates a non-trivial trajectory', () => {
    expect(mission.trajectory.length).toBeGreaterThan(100)
  })

  it('trajectory spans the full mission duration', () => {
    const first = mission.trajectory[0]
    const last = mission.trajectory[mission.trajectory.length - 1]
    expect(first.epochMs).toBe(mission.startMs)
    expect(last.epochMs).toBeLessThanOrEqual(mission.endMs)
  })

  it('trajectory stays within reasonable geocentric distance', () => {
    const AU_KM = 149597870.7
    const maxDistAU = Math.max(...mission.trajectory.map(p =>
      Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
    ))
    const maxDistKm = maxDistAU * AU_KM
    expect(maxDistKm).toBeLessThan(500_000)
    expect(maxDistKm).toBeGreaterThan(300_000)
  })

  it('caches the mission object', () => {
    expect(getApollo11Mission()).toBe(mission)
  })
})
