import type { MissionManifest } from './missions/types'
import { getCurrentPhase, getMissionProgress, distanceFromEarthKm, interpolateTrajectory } from './missions/missionUtils'

interface MissionReplayPanelProps {
  mission: MissionManifest
  currentTimeMs: number
  playbackState: 'paused' | 'forward' | 'backward'
  speedIndex: number
  speeds: { label: string; msPerSecond: number }[]
  onSeek: (timeMs: number) => void
  onPlay: () => void
  onPause: () => void
  onSpeedChange: (index: number) => void
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

function formatElapsed(ms: number): string {
  if (ms < 0) return '—'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  if (days > 0) return `T+${days}d ${hours}h ${mins}m`
  if (hours > 0) return `T+${hours}h ${mins}m`
  return `T+${mins}m`
}

export function MissionReplayPanel({
  mission,
  currentTimeMs,
  playbackState,
  speedIndex,
  speeds,
  onSeek,
  onPlay,
  onPause,
  onSpeedChange,
  onClose,
}: MissionReplayPanelProps) {
  const phase = getCurrentPhase(mission.phases, currentTimeMs)
  const progress = getMissionProgress(mission, currentTimeMs)
  const elapsedMs = currentTimeMs - mission.startMs

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

      <div className="mission-phases-list">
        {mission.phases.map((p, i) => {
          const isActive = phase?.name === p.name
          return (
            <div key={i} className={`mission-phase-row${isActive ? ' active' : ''}`}>
              <span className="mission-phase-dot" style={{ background: p.color }} />
              <span className="mission-phase-name">{p.name}</span>
              <button
                className="mission-phase-jump"
                title={`Jump to ${p.name}`}
                onClick={() => onSeek(p.startMs)}
              >
                ▶
              </button>
            </div>
          )
        })}
      </div>

      <div className="mission-distance">
        Distance from Earth: <strong>{formatDistance(distKm)}</strong>
      </div>

      <div className="mission-elapsed">
        Elapsed: <strong>{formatElapsed(elapsedMs)}</strong>
      </div>

      <div className="mission-datetime">
        {formatDateUTC(currentTimeMs)}
      </div>

      <div className="mission-playback">
        <button
          className={playbackState === 'forward' ? 'active' : ''}
          onClick={playbackState === 'forward' ? onPause : onPlay}
        >
          {playbackState === 'forward' ? '⏸' : '▶'}
        </button>
        <select
          value={speedIndex}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
        >
          {speeds.map((s, i) => (
            <option key={i} value={i}>{s.label}</option>
          ))}
        </select>
        <span className="mission-rate-label">playback rate</span>
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
