export const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DE: 'Germany',
  DK: 'Denmark',
  EE: 'Estonia',
  ES: 'Spain',
  FI: 'Finland',
  FR: 'France',
  GR: 'Greece',
  HR: 'Croatia',
  HU: 'Hungary',
  IE: 'Ireland',
  IT: 'Italy',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  MT: 'Malta',
  NL: 'Netherlands',
  NO: 'Norway',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SE: 'Sweden',
  SI: 'Slovenia',
  SK: 'Slovakia',
}

export function countryName(code: string | null | undefined): string {
  if (!code) return '—'
  return COUNTRY_NAMES[code.toUpperCase()] || code
}

export const COUNTRY_FLAGS: Record<string, string> = {
  AT: '🇦🇹', BE: '🇧🇪', BG: '🇧🇬', CY: '🇨🇾', CZ: '🇨🇿',
  DE: '🇩🇪', DK: '🇩🇰', EE: '🇪🇪', ES: '🇪🇸', FI: '🇫🇮',
  FR: '🇫🇷', GR: '🇬🇷', HR: '🇭🇷', HU: '🇭🇺', IE: '🇮🇪',
  IT: '🇮🇹', LI: '🇱🇮', LT: '🇱🇹', LU: '🇱🇺', LV: '🇱🇻',
  MT: '🇲🇹', NL: '🇳🇱', NO: '🇳🇴', PL: '🇵🇱', PT: '🇵🇹',
  RO: '🇷🇴', SE: '🇸🇪', SI: '🇸🇮', SK: '🇸🇰',
}

export function countryFlag(code: string | null | undefined): string {
  if (!code) return ''
  return COUNTRY_FLAGS[code.toUpperCase()] || ''
}
