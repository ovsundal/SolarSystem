export const REAL_TIME_INDEX = 0

export const SPEEDS = [
  { label: 'Real Time', msPerSecond: 1000 },
  { label: '1 day/s',   msPerSecond: 1 * 86400000 },
  { label: '1 week/s',  msPerSecond: 7 * 86400000 },
  { label: '1 month/s', msPerSecond: 30 * 86400000 },
  { label: '1 year/s',  msPerSecond: 365 * 86400000 },
]

/** Mission-specific speeds for Earth-Moon scale replays */
export const MISSION_SPEEDS = [
  { label: '1 min/sec',  msPerSecond: 60_000 },
  { label: '1 hr/sec',   msPerSecond: 3_600_000 },
  { label: '6 hr/sec',   msPerSecond: 21_600_000 },
  { label: '1 day/sec',  msPerSecond: 86_400_000 },
]

export const MISSION_DEFAULT_SPEED_INDEX = 1
