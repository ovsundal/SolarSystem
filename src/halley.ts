/**
 * Halley's Comet position from Keplerian orbital elements.
 * Returns heliocentric ecliptic cartesian coordinates (AU).
 */

const DEG = Math.PI / 180

// Orbital elements
const a = 17.834        // semi-major axis (AU)
const e = 0.96714       // eccentricity
const i = 162.26 * DEG  // inclination
const Omega = 58.42 * DEG  // longitude of ascending node
const omega = 111.33 * DEG // argument of perihelion
const PERIOD_DAYS = 27505  // ~75.32 years

// Perihelion epoch: 1986-02-09T00:00:00Z
const T0 = Date.UTC(1986, 1, 9) // ms

/** Mean motion (radians per day) */
const n = (2 * Math.PI) / PERIOD_DAYS

/**
 * Solve Kepler's equation M = E - e*sin(E) for E using Newton's method.
 * Uses π as initial guess for high eccentricity to ensure convergence.
 */
function solveKepler(M: number, ecc: number): number {
  // For high eccentricity, E = M is a poor initial guess; start from π instead
  let E = ecc > 0.8 ? Math.PI : M
  for (let iter = 0; iter < 80; iter++) {
    const dE = (E - ecc * Math.sin(E) - M) / (1 - ecc * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-14) break
  }
  return E
}

export interface HalleyPosition {
  x: number
  y: number
  z: number
  auDistance: number
}

/**
 * Compute heliocentric ecliptic position of Halley's Comet at a given date.
 */
export function getHalleyPosition(date: Date): HalleyPosition {
  const dtDays = (date.getTime() - T0) / 86400000
  let M = n * dtDays
  // Normalize M to [0, 2π)
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

  const E = solveKepler(M, e)

  // True anomaly
  const cosV = (Math.cos(E) - e) / (1 - e * Math.cos(E))
  const sinV = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * Math.cos(E))
  const v = Math.atan2(sinV, cosV)

  // Distance from Sun
  const r = a * (1 - e * Math.cos(E))

  // Position in orbital plane
  const xOrb = r * Math.cos(v)
  const yOrb = r * Math.sin(v)

  // Rotate to ecliptic coordinates
  const cosO = Math.cos(Omega)
  const sinO = Math.sin(Omega)
  const cosI = Math.cos(i)
  const sinI = Math.sin(i)
  const cosW = Math.cos(omega)
  const sinW = Math.sin(omega)

  const x = (cosO * cosW - sinO * sinW * cosI) * xOrb + (-cosO * sinW - sinO * cosW * cosI) * yOrb
  const y = (sinO * cosW + cosO * sinW * cosI) * xOrb + (-sinO * sinW + cosO * cosW * cosI) * yOrb
  const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb

  const auDistance = Math.sqrt(x * x + y * y + z * z)
  return { x, y, z, auDistance }
}

/**
 * Sample orbital ring points for Halley's Comet.
 */
export function getHalleyOrbitPoints(N: number): { x: number; y: number; z: number }[] {
  const points: { x: number; y: number; z: number }[] = []
  for (let k = 0; k <= N; k++) {
    const M = (k / N) * 2 * Math.PI
    const E = solveKepler(M, e)
    const cosV = (Math.cos(E) - e) / (1 - e * Math.cos(E))
    const sinV = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * Math.cos(E))
    const v = Math.atan2(sinV, cosV)
    const r = a * (1 - e * Math.cos(E))
    const xOrb = r * Math.cos(v)
    const yOrb = r * Math.sin(v)

    const cosO = Math.cos(Omega)
    const sinO = Math.sin(Omega)
    const cosI = Math.cos(i)
    const sinI = Math.sin(i)
    const cosW = Math.cos(omega)
    const sinW = Math.sin(omega)

    points.push({
      x: (cosO * cosW - sinO * sinW * cosI) * xOrb + (-cosO * sinW - sinO * cosW * cosI) * yOrb,
      y: (sinO * cosW + cosO * sinW * cosI) * xOrb + (-sinO * sinW + cosO * cosW * cosI) * yOrb,
      z: (sinW * sinI) * xOrb + (cosW * sinI) * yOrb,
    })
  }
  return points
}

export const HALLEY_PERIOD_DAYS = PERIOD_DAYS
