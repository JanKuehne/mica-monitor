#!/usr/bin/env tsx
/**
 * Ingest CASPS.csv into Supabase companies + company_services tables.
 * Usage: npx tsx scripts/ingest-casps.ts ~/Downloads/CASPS.csv
 */

import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import fs from 'fs'
import path from 'path'
import { parseServiceCodes, parsePassportingCountries, SERVICE_CODE_MAP } from '../lib/ingest/service-parser'
import { extractCity } from '../lib/ingest/city-extractor'

// Load env vars from .env.local
import { config } from 'dotenv'
config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const GEOCODE_DELAY_MS = 1100 // Nominatim: max 1 req/sec

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function geocode(city: string | null, country: string | null, address: string | null): Promise<{ lat: number; lng: number } | null> {
  async function query(q: string) {
    await sleep(GEOCODE_DELAY_MS)
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MiCA-Entities-Dashboard/1.0 (internal tool)',
        'Accept-Language': 'en',
      },
    })
    if (!res.ok) return null
    const data = await res.json() as Array<{ lat: string; lon: string }>
    if (!data || data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }

  if (city && country) {
    const r = await query(`${city}, ${country}`)
    if (r) return r
  }
  if (address) {
    const r = await query(address)
    if (r) return r
  }
  if (country) {
    return query(country)
  }
  return null
}

function parseDDMMYYYY(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw.trim())
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/ingest-casps.ts <path-to-CASPS.csv>')
    process.exit(1)
  }

  const resolvedPath = path.resolve(csvPath.replace('~', process.env.HOME!))
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`)
    process.exit(1)
  }

  console.log(`Reading ${resolvedPath}...`)
  const fileContent = fs.readFileSync(resolvedPath, 'utf-8')

  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (result.errors.length > 0) {
    console.warn(`CSV parse warnings: ${result.errors.length}`)
    result.errors.slice(0, 5).forEach((e) => console.warn(' -', e.message))
  }

  const rows = result.data as Record<string, string>[]
  console.log(`Parsed ${rows.length} rows from CSV`)

  const skipGeocode = process.argv.includes('--no-geocode')
  if (!skipGeocode) console.log('Geocoding enabled (Nominatim). Pass --no-geocode to skip.\n')

  let inserted = 0
  let updated = 0
  let failed = 0
  let cityFailed = 0
  let geocoded = 0

  for (const row of rows) {
    const lei = row['ae_lei']?.trim()
    if (!lei) {
      console.warn('Skipping row with no LEI')
      failed++
      continue
    }

    const country = row['ae_homeMemberState']?.trim() || row['ae_lei_cou_code']?.trim() || null
    const address = row['ae_address']?.trim() || null
    const city = extractCity(address)
    if (!city) cityFailed++

    const passportingCountries = parsePassportingCountries(row['ac_serviceCode_cou'] || '')
    const serviceCodes = parseServiceCodes(row['ac_serviceCode'] || '')

    const companyData = {
      lei,
      lei_cou_code: row['ae_lei_cou_code']?.trim() || null,
      company_name: row['ae_lei_name']?.trim() || lei,
      commercial_name: row['ae_commercial_name']?.trim() || null,
      competent_authority: row['ae_competentAuthority']?.trim() || null,
      home_member_state: row['ae_homeMemberState']?.trim() || null,
      address,
      city,
      country,
      website: row['ae_website']?.trim() || null,
      website_platform: row['ae_website_platform']?.trim() || null,
      authorization_date: parseDDMMYYYY(row['ac_authorisationNotificationDate']),
      authorization_end_date: parseDDMMYYYY(row['ac_authorisationEndDate']),
      last_updated_esma: parseDDMMYYYY(row['ac_lastupdate']),
      passporting_countries: passportingCountries.length > 0 ? passportingCountries : null,
      passporting_count: passportingCountries.length,
      esma_comments: row['ac_comments']?.trim() || null,
      service_count: serviceCodes.length,
    }

    // Upsert company (on conflict: lei)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .upsert(companyData, { onConflict: 'lei', ignoreDuplicates: false })
      .select('id, lei')
      .single()

    if (companyError || !company) {
      console.error(`Failed to upsert ${lei}: ${companyError?.message}`)
      failed++
      continue
    }

    const isNew = !companyError

    // Insert services (ignore duplicates)
    if (serviceCodes.length > 0) {
      const serviceRows = serviceCodes.map((code) => ({
        company_id: company.id,
        service_code: code,
        service_name: SERVICE_CODE_MAP[code],
      }))

      const { error: serviceError } = await supabase
        .from('company_services')
        .upsert(serviceRows, { onConflict: 'company_id,service_code', ignoreDuplicates: true })

      if (serviceError) {
        console.warn(`Services insert warning for ${lei}: ${serviceError.message}`)
      }
    }

    // Geocode new companies (or ones missing coordinates)
    if (!skipGeocode) {
      const { data: existing } = await supabase
        .from('companies')
        .select('lat')
        .eq('id', company.id)
        .single()

      if (!existing?.lat) {
        const coords = await geocode(city, country, address)
        if (coords) {
          await supabase
            .from('companies')
            .update({ lat: coords.lat, lng: coords.lng, geocoded_at: new Date().toISOString() })
            .eq('id', company.id)
          geocoded++
          console.log(`  📍 Geocoded ${lei}: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
        }
      }
    }

    if (isNew) inserted++
    else updated++

    if ((inserted + updated) % 25 === 0) {
      console.log(`  Progress: ${inserted + updated} companies processed...`)
    }
  }

  console.log('\n=== Ingest complete ===')
  console.log(`  Upserted: ${inserted + updated} companies`)
  console.log(`  Failed:   ${failed}`)
  console.log(`  City extraction failed: ${cityFailed} (stored as null)`)
  if (!skipGeocode) console.log(`  Geocoded:         ${geocoded}`)

  // Verify counts
  const { count: companyCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
  const { count: serviceCount } = await supabase
    .from('company_services')
    .select('*', { count: 'exact', head: true })

  console.log(`\n  companies table: ${companyCount} rows`)
  console.log(`  company_services table: ${serviceCount} rows`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
