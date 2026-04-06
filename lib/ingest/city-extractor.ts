/**
 * Best-effort city extraction from EU address strings.
 * EU addresses don't follow a single format. We look for postal code + city patterns.
 * Returns null if extraction fails — caller should log and continue.
 */

// Matches: "1220 Vienna", "60325 Frankfurt am Main", "75008 Paris", "B-1000 Brussels"
const POSTAL_CITY_PATTERN = /\b[A-Z]?-?\d{3,6}\s+([A-ZÀ-Ÿa-zà-ÿ][A-Za-zÀ-Ÿà-ÿ\s\-]+?)(?:,|$)/

// For UK-style: "EC2V 8RT London" — less common in ESMA data
const UK_POSTAL_PATTERN = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2}\s+([A-Za-z\s]+?)(?:,|$)/i

export function extractCity(address: string | null | undefined): string | null {
  if (!address) return null

  // Split by comma, try each segment
  const segments = address.split(',').map((s) => s.trim())

  for (const segment of segments) {
    const m = POSTAL_CITY_PATTERN.exec(segment)
    if (m) {
      return m[1].trim()
    }
    const uk = UK_POSTAL_PATTERN.exec(segment)
    if (uk) {
      return uk[1].trim()
    }
  }

  // Fallback: if the address has a segment that looks like a city name (no digits, not too long)
  // Try the second-to-last segment (common in "Street, City, Country" format)
  if (segments.length >= 2) {
    const candidate = segments[segments.length - 2]
    if (candidate && !/\d/.test(candidate) && candidate.length < 40) {
      return candidate.trim()
    }
  }

  return null
}
