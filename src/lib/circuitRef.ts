/**
 * Circuit ID (circuit_ref) generation.
 *
 * Format (human-readable, self-describing, '/'-separated):
 *   <OPERATOR>/<STATION_A>/<STATION_B>/<BANDWIDTH>/<INTERFACE>/<RESTORATION>/<NNN>
 *   e.g. SOMT/DJI/MOG/10G/100GE/R/001
 *
 * Reading the ID tells you, at a glance:
 *   - who carries it            (SOMT  = SOMTEL, first 4 letters)
 *   - the route it lands        (DJI → Mog,    first 3 letters of each station code)
 *   - the capacity              (10G / 100G)
 *   - the client interface      (100GE, OTU4, STM64 …)
 *   - its protection class      (R = restored, NR = no-restored)
 *   - a per-prefix sequence     (001, 002 …) keeping IDs unique
 */

/** Separator used between the ID segments. */
export const REF_SEPARATOR = '/'

/** Uppercase alphanumeric abbreviation, capped at `max` characters. */
function slug(value: string, max: number): string {
  const clean = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, max)
  return clean
}

export interface CircuitRefParts {
  operatorCode: string
  stationACode: string
  stationBCode: string
  bandwidthLabel: string
  interfaceLabel: string
  /** restoration_types.code — e.g. 'restored' / 'no-restored' */
  restorationCode: string
}

/** Builds the stable prefix shared by every circuit of the same "type". */
export function buildCircuitRefPrefix(parts: CircuitRefParts): string {
  const restoration = parts.restorationCode.trim().toLowerCase().startsWith('no') ? 'NR' : 'R'
  return [
    slug(parts.operatorCode, 4),
    slug(parts.stationACode, 3),
    slug(parts.stationBCode, 3),
    slug(parts.bandwidthLabel, 6),
    slug(parts.interfaceLabel, 8),
    restoration,
  ].join(REF_SEPARATOR)
}

/** True when every part of the prefix could be derived (no missing selection). */
export function isCompletePrefix(prefix: string): boolean {
  if (!prefix) return false
  const parts = prefix.split(REF_SEPARATOR)
  return parts.length === 6 && parts.every((p) => p.length > 0)
}

/** '001', '002' … — 3-digit zero-padded sequence. */
export function formatSequence(seq: number): string {
  return String(seq).padStart(3, '0')
}

/** Full ID for a prefix + sequence: `${prefix}/001`. */
export function formatCircuitRef(prefix: string, seq: number): string {
  return `${prefix}${REF_SEPARATOR}${formatSequence(seq)}`
}

/**
 * Next free sequence for `prefix` given every existing ref (circuits AND
 * requests). Only refs that are EXACTLY `prefix/<digits>` are considered, so
 * legacy refs (e.g. 'SOM-DJI-004') never interfere with the new format.
 */
export function nextSequence(prefix: string, existingRefs: readonly (string | null | undefined)[]): number {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}${REF_SEPARATOR}(\\d+)$`)
  let max = 0
  for (const ref of existingRefs) {
    if (!ref) continue
    const m = pattern.exec(ref)
    if (m) {
      const n = Number.parseInt(m[1], 10)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return max + 1
}
