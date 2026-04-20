import type { MissionManifest } from './missions/types'
import { getCurrentPhase, getMissionProgress, distanceFromEarthKm, interpolateTrajectory } from './missions/missionUtils'

interface MissionReplayPanelProps {
  mission: MissionManifest
  currentTimeMs: number
  onSeek: (timeMs: number) => void
  onClose: () => void
}

function formatDistance(km: number): string {
  if (km < 1000) return `${Math.round(km)} km`
  return `${Math.round(km).toLocaleString()} km`
}

function formatDateUTC(ms: number): string {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm} UTC`
}

export function MissionReplayPanel({
  mission,
  currentTimeMs,
  onSeek,
  onClose,
}: MissionReplayPanelProps) {
  const phase = getCurrentPhase(mission.phases, currentTimeMs)
  const progress = getMissionProgress(mission, currentTimeMs)

  // Compute distance from interpolated trajectory position
  const inWindow = currentTimeMs >= mission.startMs && currentTimeMs <= mission.endMs
  let distKm = 0
  if (inWindow) {
    const pos = interpolateTrajectory(mission.trajectory, currentTimeMs)
    if (pos) distKm = distanceFromEarthKm(pos.x, pos.y, pos.z)
  }

  return (
    <div className="mission-panel" onPointerDown={(e) => e.stopPropagation()}>
      <div className="mission-panel-header">
        <strong>{mission.name}</strong>
        <button className="mission-close" onClick={onClose}>&times;</button>
      </div>

      <div className="mission-description">{mission.description}</div>

      {phase && (
        <div className="mission-phase">
          <span className="mission-phase-dot" style={{ background: phase.color }} />
          {phase.name}
        </div>
      )}

      <div className="mission-distance">
        Distance from Earth: <strong>{formatDistance(distKm)}</strong>
      </div>

      <div className="mission-datetime">
        {formatDateUTC(currentTimeMs)}
      </div>

      <div className="mission-timeline">
        <input
          type="range"
          min={mission.startMs}
          max={mission.endMs}
          value={Math.max(mission.startMs, Math.min(mission.endMs, currentTimeMs))}
          onChange={(e) => onSeek(Number(e.target.value))}
          step={60000}
        />
        <div className="mission-progress-label">{Math.round(progress * 100)}%</div>
      </div>
    </div>
  )
}
