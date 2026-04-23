import { describe, it, expect } from 'vitest'
import { getMissionById, AVAILABLE_MISSIONS } from './missions'

describe('getMissionById', () => {
  it('returns Artemis 2 mission by ID', () => {
    const mission = getMissionById('artemis-2')
    expect(mission.id).toBe('artemis-2')
    expect(mission.trajectory.length).toBeGreaterThan(0)
  })

  it('returns Apollo 11 mission by ID', () => {
    const mission = getMissionById('apollo-11')
    expect(mission.id).toBe('apollo-11')
    expect(mission.trajectory.length).toBeGreaterThan(0)
  })

  it('throws for unknown mission ID', () => {
    expect(() => getMissionById('gemini-4')).toThrow('Unknown mission: gemini-4')
  })
})

describe('AVAILABLE_MISSIONS', () => {
  it('has unique IDs', () => {
    const ids = AVAILABLE_MISSIONS.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
