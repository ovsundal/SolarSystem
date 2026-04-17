interface TimeControlsProps {
  currentDate: Date
  playbackState: 'paused' | 'forward' | 'backward'
  speedIndex: number
  speeds: { label: string; msPerSecond: number }[]
  onPlay: () => void
  onReverse: () => void
  onPause: () => void
  onSpeedChange: (index: number) => void
}

function formatDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm} UTC`
}

export function TimeControls({
  currentDate,
  playbackState,
  speedIndex,
  speeds,
  onPlay,
  onReverse,
  onPause,
  onSpeedChange,
}: TimeControlsProps) {
  return (
    <div className="time-controls">
      <button
        className={playbackState === 'backward' ? 'active' : ''}
        onClick={onReverse}
      >
        &laquo;
      </button>
      <button
        className={playbackState === 'paused' ? 'active' : ''}
        onClick={onPause}
      >
        ||
      </button>
      <button
        className={playbackState === 'forward' ? 'active' : ''}
        onClick={onPlay}
      >
        &raquo;
      </button>
      <select
        value={speedIndex}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
      >
        {speeds.map((s, i) => (
          <option key={i} value={i}>{s.label}</option>
        ))}
      </select>
      <span className="date-display">{formatDate(currentDate)}</span>
    </div>
  )
}
