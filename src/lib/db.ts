import { supabase } from './supabase'
import {
  MOCK_PRICES,
  MOCK_SALE_HISTORY,
  MOCK_PLANTING_RECORDS,
  type Price,
  type SaleHistory,
  type PlantingRecord,
} from '../data/mockData'

// ── Shared result wrapper ──────────────────────────────────
export interface DbResult<T> {
  data: T | null
  error: string | null
  source: 'supabase' | 'mock'
}

// ── Insert types (snake_case matching Supabase columns) ────

export interface ProfileInsert {
  line_uid?: string
  full_name: string
  phone: string
  id_card?: string
  role?: 'farmer' | 'leader' | 'inspector' | 'admin'
}

export interface FarmerInsert {
  profile_id?: string
  code: string
  province: string
  district: string
  village: string
  total_area?: number
  tier?: string
  status?: string
}

export interface FarmInsert {
  farmer_id: string
  name: string
  area: number
  province: string
  district: string
  village: string
  lat?: number
  lng?: number
  soil_type?: string
  water_source?: string
}

export interface PlantingCycleInsert {
  farmer_id: string
  farm_id?: string
  variety: string
  season: string
  year: number
  seed_received_date?: string
  plant_date: string
  estimated_harvest_date: string
  estimated_yield?: number
  status?: string
}

export interface SaleRequestInsert {
  farmer_id: string
  variety: string
  grade: 'A' | 'B' | 'C'
  quantity: number
  price_per_ton?: number
  moisture_percent?: number
  buyer?: string
  sale_date?: string
  note?: string
}

// ── 1. Register Farmer ─────────────────────────────────────

export async function insertProfile(
  profile: ProfileInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    console.info('[mock] insertProfile', profile)
    return { data: { id: 'mock-profile-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select('id')
    .single()
  return { data, error: error?.message ?? null, source: 'supabase' }
}

export async function insertFarmer(
  farmer: FarmerInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    console.info('[mock] insertFarmer', farmer)
    return { data: { id: 'mock-farmer-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('farmers')
    .insert(farmer)
    .select('id')
    .single()
  return { data, error: error?.message ?? null, source: 'supabase' }
}

// ── 2. Add Farm ────────────────────────────────────────────

export async function insertFarm(
  farm: FarmInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    console.info('[mock] insertFarm', farm)
    return { data: { id: 'mock-farm-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('farms')
    .insert(farm)
    .select('id')
    .single()
  return { data, error: error?.message ?? null, source: 'supabase' }
}

// ── 3. Planting Cycles ─────────────────────────────────────

export async function insertPlantingCycle(
  cycle: PlantingCycleInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    console.info('[mock] insertPlantingCycle', cycle)
    return { data: { id: 'mock-cycle-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('planting_cycles')
    .insert(cycle)
    .select('id')
    .single()
  return { data, error: error?.message ?? null, source: 'supabase' }
}

export async function fetchPlantingCycles(
  farmerId: string
): Promise<DbResult<PlantingRecord[]>> {
  if (!supabase) {
    return {
      data: MOCK_PLANTING_RECORDS.filter(r => r.farmerId === farmerId),
      error: null,
      source: 'mock',
    }
  }
  const { data, error } = await supabase
    .from('planting_cycles')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
  if (error) {
    return {
      data: MOCK_PLANTING_RECORDS.filter(r => r.farmerId === farmerId),
      error: error.message,
      source: 'mock',
    }
  }
  // Map snake_case DB rows → PlantingRecord shape (keep steps/photos empty; enriched client-side)
  const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    farmId: String(row.farm_id ?? ''),
    farmerId: String(row.farmer_id),
    season: String(row.season ?? ''),
    year: Number(row.year ?? new Date().getFullYear()),
    variety: String(row.variety ?? ''),
    seedReceivedDate: String(row.seed_received_date ?? ''),
    plantDate: String(row.plant_date ?? ''),
    estimatedHarvestDate: String(row.estimated_harvest_date ?? ''),
    estimatedYield: Number(row.estimated_yield ?? 0),
    status: String(row.status ?? 'growing') as PlantingRecord['status'],
    steps: [],
    photos: [],
  }))
  return { data: mapped as PlantingRecord[], error: null, source: 'supabase' }
}

// ── 4. Price Announcements ─────────────────────────────────

export async function fetchPrices(): Promise<DbResult<Price[]>> {
  if (!supabase) {
    return { data: MOCK_PRICES, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('price_announcements')
    .select('id, variety, grade, price, unit, effective_date, announced_by')
    .order('effective_date', { ascending: false })
    .limit(30)

  if (error) {
    return { data: MOCK_PRICES, error: error.message, source: 'mock' }
  }
  const mapped: Price[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    variety: String(row.variety ?? ''),
    grade: String(row.grade ?? 'A') as Price['grade'],
    price: Number(row.price ?? 0),
    unit: String(row.unit ?? 'ตัน'),
    effectiveDate: String(row.effective_date ?? ''),
    announcedBy: String(row.announced_by ?? ''),
  }))
  return { data: mapped, error: null, source: 'supabase' }
}

// ── 5. Sale Requests ───────────────────────────────────────

export async function insertSaleRequest(
  req: SaleRequestInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    console.info('[mock] insertSaleRequest', req)
    return { data: { id: 'mock-sale-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('sale_requests')
    .insert(req)
    .select('id')
    .single()
  return { data, error: error?.message ?? null, source: 'supabase' }
}

export async function fetchSaleRequests(
  farmerId: string
): Promise<DbResult<SaleHistory[]>> {
  if (!supabase) {
    return {
      data: MOCK_SALE_HISTORY.filter(s => s.farmerId === farmerId),
      error: null,
      source: 'mock',
    }
  }
  const { data, error } = await supabase
    .from('sale_requests')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('sale_date', { ascending: false })
  if (error) {
    return {
      data: MOCK_SALE_HISTORY.filter(s => s.farmerId === farmerId),
      error: error.message,
      source: 'mock',
    }
  }
  const mapped: SaleHistory[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    farmerId: String(row.farmer_id),
    recordId: String(row.planting_cycle_id ?? ''),
    saleDate: String(row.sale_date ?? ''),
    quantity: Number(row.quantity ?? 0),
    pricePerTon: Number(row.price_per_ton ?? 0),
    totalAmount: Number(row.quantity ?? 0) * Number(row.price_per_ton ?? 0),
    buyer: String(row.buyer ?? ''),
    grade: String(row.grade ?? 'A') as SaleHistory['grade'],
    moisturePercent: Number(row.moisture_percent ?? 0),
    note: String(row.note ?? ''),
  }))
  return { data: mapped, error: null, source: 'supabase' }
}
