import { supabase } from './supabase'
import {
  MOCK_PRICES,
  MOCK_SALE_HISTORY,
  MOCK_PLANTING_RECORDS,
  type Price,
  type SaleHistory,
  type PlantingRecord,
} from '../data/mockData'

export interface DbResult<T> {
  data: T | null
  error: string | null
  source: 'supabase' | 'mock'
}

// ── Schema types (column names ตรงกับ Supabase) ───────────────────────────────

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

export interface NoBurnApplicationInsert {
  farmer_id: string
  farm_id?: string
  farm_name?: string
  season: string
  year: number
  commitment: string
  status?: string
  bonus_per_ton?: number
}

export interface SaleRequestInsert {
  farmer_id: string
  planting_cycle_id?: string
  variety: string
  grade: 'A' | 'B' | 'C'
  quantity: number
  price_per_ton?: number
  moisture_percent?: number
  buyer?: string
  sale_date?: string
  note?: string
}

export interface PriceUpsert {
  id?: string
  variety: string
  grade: 'A' | 'B' | 'C'
  price: number
  unit?: string
  effective_date?: string
  announced_by?: string
}

// ── helpers ───────────────────────────────────────────────────────────────────

function logSupabaseError(op: string, error: { message: string; code?: string; details?: string }) {
  console.error(
    `[K-Farm DB] ❌ ${op} failed`,
    '\n  message:', error.message,
    '\n  code:', error.code ?? '-',
    '\n  details:', error.details ?? '-',
    '\n  Common causes: RLS policy blocking insert, column name mismatch, invalid uuid'
  )
}

// ── 1. profiles ───────────────────────────────────────────────────────────────

export async function insertProfile(
  profile: ProfileInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    return { data: { id: 'mock-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select('id')
    .single()
  if (error) logSupabaseError('insertProfile', error)
  return { data, error: error?.message ?? null, source: 'supabase' }
}

// ── 2. farmers ────────────────────────────────────────────────────────────────

export async function insertFarmer(
  farmer: FarmerInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    return { data: { id: 'mock-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('farmers')
    .insert(farmer)
    .select('id')
    .single()
  if (error) logSupabaseError('insertFarmer', error)
  return { data, error: error?.message ?? null, source: 'supabase' }
}

// ── 3. farms ──────────────────────────────────────────────────────────────────

export async function insertFarm(
  farm: FarmInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    return { data: { id: 'mock-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('farms')
    .insert(farm)
    .select('id')
    .single()
  if (error) logSupabaseError('insertFarm', error)
  return { data, error: error?.message ?? null, source: 'supabase' }
}

// ── 4. planting_cycles ────────────────────────────────────────────────────────

export async function insertPlantingCycle(
  cycle: PlantingCycleInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    return { data: { id: 'mock-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('planting_cycles')
    .insert(cycle)
    .select('id')
    .single()
  if (error) logSupabaseError('insertPlantingCycle', error)
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
    logSupabaseError('fetchPlantingCycles', error)
    return {
      data: MOCK_PLANTING_RECORDS.filter(r => r.farmerId === farmerId),
      error: error.message,
      source: 'mock',
    }
  }
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

// ── 5. no_burn_applications ───────────────────────────────────────────────────

export async function insertNoBurnApplication(
  app: NoBurnApplicationInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    return { data: { id: 'mock-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('no_burn_applications')
    .insert(app)
    .select('id')
    .single()
  if (error) logSupabaseError('insertNoBurnApplication', error)
  return { data, error: error?.message ?? null, source: 'supabase' }
}

// ── 6. sale_requests ──────────────────────────────────────────────────────────

export async function insertSaleRequest(
  req: SaleRequestInsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    return { data: { id: 'mock-' + Date.now() }, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('sale_requests')
    .insert(req)
    .select('id')
    .single()
  if (error) logSupabaseError('insertSaleRequest', error)
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
    .order('created_at', { ascending: false })
  if (error) {
    logSupabaseError('fetchSaleRequests', error)
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

// ── 7. price_announcements ────────────────────────────────────────────────────

export async function fetchPrices(): Promise<DbResult<Price[]>> {
  if (!supabase) {
    return { data: MOCK_PRICES, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('price_announcements')
    .select('id, variety, grade, price, unit, effective_date, announced_by')
    .order('effective_date', { ascending: false })
    .limit(50)
  if (error) {
    logSupabaseError('fetchPrices', error)
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

export async function upsertPrice(
  price: PriceUpsert
): Promise<DbResult<{ id: string }>> {
  if (!supabase) {
    return { data: { id: 'mock-' + Date.now() }, error: null, source: 'mock' }
  }
  const row: Record<string, unknown> = {
    variety: price.variety,
    grade: price.grade,
    price: price.price,
    unit: price.unit ?? 'ตัน',
    effective_date: price.effective_date ?? new Date().toISOString().split('T')[0],
    announced_by: price.announced_by ?? '',
  }
  if (price.id) row.id = price.id

  const { data, error } = await supabase
    .from('price_announcements')
    .upsert(row, { onConflict: 'id' })
    .select('id')
    .single()
  if (error) logSupabaseError('upsertPrice', error)
  return { data, error: error?.message ?? null, source: 'supabase' }
}


// ── Admin: fetch pending registrations from profiles + farmers ────────────────

export interface PendingRegistration {
  id: string            // profiles.id
  farmerId?: string     // farmers.id
  fullName: string
  phone: string
  idCard?: string
  code?: string
  province?: string
  district?: string
  village?: string
  status: string        // farmers.status
  createdAt: string
}

export async function fetchPendingRegistrations(): Promise<DbResult<PendingRegistration[]>> {
  if (!supabase) {
    // Mock pending data
    return {
      data: [
        { id: 'p1', farmerId: 'f-new-1', fullName: 'สมชาย ใจดี (Mock)', phone: '0812345678', code: 'KF001', province: 'บุรีรัมย์', district: 'เมือง', village: 'บ้านดง', status: 'pending', createdAt: new Date().toISOString() },
        { id: 'p2', farmerId: 'f-new-2', fullName: 'นภา ฟ้าใส (Mock)', phone: '0823456789', code: 'KF002', province: 'บุรีรัมย์', district: 'กระสัง', village: 'บ้านทุ่ง', status: 'pending', createdAt: new Date().toISOString() },
      ],
      error: null,
      source: 'mock',
    }
  }
  // join profiles + farmers where status = pending
  const { data, error } = await supabase
    .from('farmers')
    .select(`
      id,
      code,
      province,
      district,
      village,
      status,
      created_at,
      profiles (
        id,
        full_name,
        phone,
        id_card
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('fetchPendingRegistrations', error)
    return { data: [], error: error.message, source: 'supabase' }
  }

  const mapped: PendingRegistration[] = (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as Record<string, unknown> | null
    return {
      id: String(profile?.id ?? row.id),
      farmerId: String(row.id),
      fullName: String(profile?.full_name ?? 'ไม่ระบุ'),
      phone: String(profile?.phone ?? ''),
      idCard: profile?.id_card ? String(profile.id_card) : undefined,
      code: String(row.code ?? ''),
      province: String(row.province ?? ''),
      district: String(row.district ?? ''),
      village: String(row.village ?? ''),
      status: String(row.status ?? 'pending'),
      createdAt: String(row.created_at ?? ''),
    }
  })
  return { data: mapped, error: null, source: 'supabase' }
}

export async function fetchAllFarmers(): Promise<DbResult<PendingRegistration[]>> {
  if (!supabase) {
    return {
      data: [
        { id: 'p1', farmerId: 'f1', fullName: 'สมชาย ใจดี (Mock)', phone: '0812345678', code: 'KF001', province: 'บุรีรัมย์', district: 'เมือง', village: 'บ้านดง', status: 'approved', createdAt: '2024-11-01' },
        { id: 'p2', farmerId: 'f2', fullName: 'สมหญิง รักษ์ไทย (Mock)', phone: '0898765432', code: 'KF002', province: 'บุรีรัมย์', district: 'ประโคนชัย', village: 'บ้านโนน', status: 'approved', createdAt: '2024-11-05' },
        { id: 'p3', farmerId: 'f3', fullName: 'นภา ฟ้าใส (Mock)', phone: '0823456789', code: 'KF003', province: 'บุรีรัมย์', district: 'กระสัง', village: 'บ้านทุ่ง', status: 'pending', createdAt: '2025-04-30' },
      ],
      error: null,
      source: 'mock',
    }
  }
  const { data, error } = await supabase
    .from('farmers')
    .select(`id, code, province, district, village, status, created_at, profiles(id, full_name, phone, id_card)`)
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('fetchAllFarmers', error)
    return { data: [], error: error.message, source: 'supabase' }
  }
  const mapped: PendingRegistration[] = (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as Record<string, unknown> | null
    return {
      id: String(profile?.id ?? row.id),
      farmerId: String(row.id),
      fullName: String(profile?.full_name ?? 'ไม่ระบุ'),
      phone: String(profile?.phone ?? ''),
      idCard: profile?.id_card ? String(profile.id_card) : undefined,
      code: String(row.code ?? ''),
      province: String(row.province ?? ''),
      district: String(row.district ?? ''),
      village: String(row.village ?? ''),
      status: String(row.status ?? 'pending'),
      createdAt: String(row.created_at ?? ''),
    }
  })
  return { data: mapped, error: null, source: 'supabase' }
}

export async function updateFarmerStatus(
  farmerId: string,
  status: 'approved' | 'rejected',
  note?: string
): Promise<DbResult<null>> {
  if (!supabase) {
    console.info('[mock] updateFarmerStatus', farmerId, status)
    return { data: null, error: null, source: 'mock' }
  }
  const { error } = await supabase
    .from('farmers')
    .update({ status, admin_note: note ?? null })
    .eq('id', farmerId)

  if (error) logSupabaseError('updateFarmerStatus', error)
  return { data: null, error: error?.message ?? null, source: 'supabase' }
}
