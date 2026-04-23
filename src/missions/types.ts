/** A single timestamped position vector in geocentric equatorial (J2000/ICRF) coordinates */
export interface TrajectoryPoint {
  /** ISO-8601 UTC timestamp */
  epoch: string
  /** Milliseconds since Unix epoch (pre-computed for fast lookup) */
  epochMs: number
  /** X position in AU (geocentric equatorial J2000) */
  x: number
  /** Y position in AU */
  y: number
  /** Z position in AU */
  z: number
}

export interface MissionPhase {
  name: string
  /** Phase start as ISO-8601 UTC */
  startEpoch: string
  startMs: number
  /** Phase end as ISO-8601 UTC */
  endEpoch: string
  endMs: number
  /** Color for timeline segment */
  color: string
}

export interface MissionManifest {
  /** Unique mission identifier */
  id: string
  /** Display name */
  name: string
  /** Short description */
  description: string
  /** Mission start (ISO-8601 UTC) */
  startEpoch: string
  startMs: number
  /** Mission end (ISO-8601 UTC) */
  endEpoch: string
  endMs: number
  /** Ordered mission phases */
  phases: MissionPhase[]
  /** Trajectory data: geocentric equatorial J2000 positions in AU,
   *  sorted by epochMs ascending, typically 4-minute intervals */
  trajectory: TrajectoryPoint[]
  /** Spacecraft visual properties */
  spacecraft: {
    name: string
    color: number
    radius: number
  }
}
