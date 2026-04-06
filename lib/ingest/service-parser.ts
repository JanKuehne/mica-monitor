import type { ServiceCode } from '../supabase'

export const SERVICE_CODE_MAP: Record<ServiceCode, string> = {
  a: 'Custody and administration of crypto-assets',
  b: 'Operation of a trading platform',
  c: 'Exchange of crypto-assets for funds',
  d: 'Exchange of crypto-assets for other crypto-assets',
  e: 'Execution of orders',
  f: 'Placing of crypto-assets',
  g: 'Reception and transmission of orders',
  h: 'Providing advice on crypto-assets',
  i: 'Portfolio management',
  j: 'Transfer services for crypto-assets',
}

/**
 * Keyword-based fuzzy matching for ESMA service codes.
 * The ac_serviceCode field has 52+ variants due to inconsistent delimiters,
 * prefixes, typos, and truncation across different national regulators.
 */
function detectServicesInSegment(text: string): ServiceCode[] {
  const t = text.toLowerCase()
  const found = new Set<ServiceCode>()

  // Order matters: check more specific patterns before broad ones
  if (t.includes('trading platform') || t.includes('operation of a trading')) {
    found.add('b')
  }
  if ((t.includes('exchange') && t.includes('fund')) || (t.includes('exchange') && t.includes('fiat'))) {
    found.add('c')
  }
  if (t.includes('exchange') && (t.includes('other crypto') || t.includes('for other'))) {
    found.add('d')
  }
  if (t.includes('custody') || t.includes('administration of crypto')) {
    found.add('a')
  }
  if (t.includes('execution')) {
    found.add('e')
  }
  if (t.includes('placing')) {
    found.add('f')
  }
  if (t.includes('reception') || t.includes('transmission')) {
    found.add('g')
  }
  if (t.includes('advice') || t.includes('advic')) {
    found.add('h')
  }
  if (t.includes('portfolio')) {
    found.add('i')
  }
  if (t.includes('transfer')) {
    found.add('j')
  }

  return Array.from(found)
}

/**
 * Parse the messy ac_serviceCode field into clean service codes.
 * Handles pipes, semicolons, commas, tabs as delimiters.
 * Also handles comma-separated services within a single pipe segment.
 */
export function parseServiceCodes(raw: string): ServiceCode[] {
  if (!raw || !raw.trim()) return []

  const found = new Set<ServiceCode>()

  // Split on primary delimiters: pipe, semicolon, tab
  const primarySegments = raw.split(/[|;\t]/)

  for (const segment of primarySegments) {
    // Within each segment, check for comma-separated services (e.g., "e. execution..., g. reception...")
    // Look for comma followed by a service letter prefix like "a.", "b. ", etc.
    const hasMultipleServices = /,\s*[a-j][\.\s]/i.test(segment)

    if (hasMultipleServices) {
      const subSegments = segment.split(/,\s*(?=[a-j][\.\s])/i)
      for (const sub of subSegments) {
        for (const code of detectServicesInSegment(sub)) {
          found.add(code)
        }
      }
    } else {
      for (const code of detectServicesInSegment(segment)) {
        found.add(code)
      }
    }
  }

  return Array.from(found).sort()
}

export function parsePassportingCountries(raw: string): string[] {
  if (!raw || !raw.trim()) return []
  return raw
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length === 2)
}
