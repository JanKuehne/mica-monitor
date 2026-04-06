import type { Company } from '@/lib/supabase'
import { countryName } from '@/lib/countries'

interface CompanyWithServices extends Company {
  company_services?: { service_name: string }[]
}

const D365_FIELDS = [
  'Account Name',
  'LEI',
  'Website',
  'Address',
  'City',
  'Country',
  'Description',
  'Industry',
  'Source',
  'Segment',
  'Service Profile',
  'Passporting Scope',
  'Passporting Countries',
  'LinkedIn',
  'Notes',
  'Status',
  'Authorization Date',
]

function csvEscape(val: string | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportToD365Csv(companies: CompanyWithServices[]): string {
  const header = D365_FIELDS.join(',')

  const rows = companies.map((c) => {
    const serviceProfile = c.company_services
      ? c.company_services.map((s) => s.service_name).join('; ')
      : ''
    const passportingScope =
      c.passporting_count > 20
        ? `Pan-European (${c.passporting_count} countries)`
        : c.passporting_count === 1
        ? `Local (1 country)`
        : `Regional (${c.passporting_count} countries)`

    const values = [
      c.commercial_name || c.company_name,
      c.lei,
      c.website || '',
      c.address || '',
      c.city || '',
      countryName(c.country || c.home_member_state),
      c.description || '',
      'Crypto-Asset Service Provider',
      'MiCA Dashboard',
      c.segment || '',
      serviceProfile,
      passportingScope,
      (c.passporting_countries || []).join('; '),
      c.linkedin_url || '',
      c.notes || '',
      c.status,
      c.authorization_date || '',
    ]

    return values.map(csvEscape).join(',')
  })

  return [header, ...rows].join('\n')
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
