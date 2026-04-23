import { getArtemis2Mission } from './artemis2'
import { getApollo11Mission } from './apollo11'
import type { MissionManifest } from './types'

export interface MissionInfo {
  id: string
  name: string
  getMission: () => MissionManifest
}

export const AVAILABLE_MISSIONS: MissionInfo[] = [
  { id: 'artemis-2', name: 'Artemis II', getMission: getArtemis2Mission },
  { id: 'apollo-11', name: 'Apollo 11', getMission: getApollo11Mission },
]

export function getMissionById(id: string): MissionManifest {
  const info = AVAILABLE_MISSIONS.find(m => m.id === id)
  if (!info) throw new Error(`Unknown mission: ${id}`)
  return info.getMission()
}
