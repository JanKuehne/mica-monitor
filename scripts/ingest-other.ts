#!/usr/bin/env tsx
/**
 * Ingest OTHER.csv (token issuer white papers) into token_issuers table.
 * Also updates companies.linked_token_issuers_count.
 * Usage: npx tsx scripts/ingest-other.ts ~/Downloads/OTHER.csv
 */

import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import fs from 'fs'
import path from 'path'

import { config } from 'dotenv'
config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function parseDDMMYYYY(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw.trim())
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/ingest-other.ts <path-to-OTHER.csv>')
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
  }

  const rows = result.data as Record<string, string>[]
  console.log(`Parsed ${rows.length} rows from CSV`)

  // Clear existing token_issuers before re-ingest
  const { error: deleteError } = await supabase.from('token_issuers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteError) {
    console.warn('Could not clear token_issuers:', deleteError.message)
  }

  let inserted = 0
  let failed = 0
  let linked = 0

  const BATCH_SIZE = 50
  const issuers = []

  for (const row of rows) {
    const issuerName = row['ae_lei_name']?.trim()
    if (!issuerName) {
      failed++
      continue
    }

    const offerCountriesRaw = row['ae_offerCode_cou']?.trim() || ''
    const offerCountries = offerCountriesRaw
      ? offerCountriesRaw.split('|').map((c) => c.trim()).filter((c) => c)
      : null

    const linkedCaspLei = row['ae_lei_casp']?.trim() || null
    if (linkedCaspLei) linked++

    issuers.push({
      lei: row['ae_lei']?.trim() || null,
      issuer_name: issuerName,
      country_code: row['ae_homeMemberState']?.trim() || row['ae_lei_cou_code']?.trim() || null,
      linked_casp_lei: linkedCaspLei,
      linked_casp_name: row['ae_lei_name_casp']?.trim() || null,
      offer_countries: offerCountries,
      dti: row['ae_DTI']?.trim() || null,
      white_paper_url: row['wp_url']?.trim() || null,
      last_updated: parseDDMMYYYY(row['wp_lastupdate']),
    })
  }

  // Batch insert
  for (let i = 0; i < issuers.length; i += BATCH_SIZE) {
    const batch = issuers.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('token_issuers').insert(batch)
    if (error) {
      console.error(`Batch insert error at offset ${i}: ${error.message}`)
      failed += batch.length
    } else {
      inserted += batch.length
      console.log(`  Inserted ${Math.min(i + BATCH_SIZE, issuers.length)} / ${issuers.length}`)
    }
  }

  // Update companies.linked_token_issuers_count via RPC or manual count
  console.log('\nUpdating companies.linked_token_issuers_count...')

  // Get distinct CASP LEIs with counts
  const { data: countData, error: countError } = await supabase
    .from('token_issuers')
    .select('linked_casp_lei')
    .not('linked_casp_lei', 'is', null)

  if (countError) {
    console.warn('Could not compute linked_token_issuers_count:', countError.message)
  } else if (countData) {
    const countMap: Record<string, number> = {}
    for (const row of countData) {
      if (row.linked_casp_lei) {
        countMap[row.linked_casp_lei] = (countMap[row.linked_casp_lei] || 0) + 1
      }
    }

    for (const [caspLei, count] of Object.entries(countMap)) {
      await supabase
        .from('companies')
        .update({ linked_token_issuers_count: count })
        .eq('lei', caspLei)
    }
    console.log(`  Updated counts for ${Object.keys(countMap).length} companies`)
  }

  console.log('\n=== Ingest complete ===')
  console.log(`  Token issuers inserted: ${inserted}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  With CASP linkage: ${linked}`)

  const { count } = await supabase
    .from('token_issuers')
    .select('*', { count: 'exact', head: true })
  console.log(`\n  token_issuers table: ${count} rows`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
