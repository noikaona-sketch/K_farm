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
  line_user_id?: string
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
  photo_url?: string
  lat?: number
  lng?: number
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
  photo_url?: string
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


// ── Auth: find / login / register ─────────────────────────────────────────────

import type { AuthUser, RegStatus } from '../routes/AuthContext'

export interface RegisterPayload {
  full_name: string
  id_card: string
  phone: string
  province?: string
  district?: string
  village?: string
  bank_name?: string
  bank_account_no?: string
  bank_account_name?: string
}

function mapFarmerRow(row: Record<string, unknown>, profile: Record<string, unknown>): AuthUser {
  return {
    id: String(row.id),
    profileId: String(profile.id ?? row.profile_id ?? ''),
    name: String(profile.full_name ?? 'ไม่ระบุ'),
    role: (String(row.role ?? profile.role ?? 'member')) as import('../routes/AuthContext').AppRole,
    code: String(row.code ?? ''),
    phone: String(profile.phone ?? ''),
    idCard: String(profile.id_card ?? ''),
    province: row.province ? String(row.province) : undefined,
    district: row.district ? String(row.district) : undefined,
    village: row.village ? String(row.village) : undefined,
    bankName: profile.bank_name ? String(profile.bank_name) : undefined,
    bankAccountNo: profile.bank_account_no ? String(profile.bank_account_no) : undefined,
    bankAccountName: profile.bank_account_name ? String(profile.bank_account_name) : undefined,
    registrationStatus: (String(row.status ?? 'pending_leader')) as RegStatus,
  }
}

/** ค้นหา user ด้วย id_card */
export async function findProfileByIdCard(
  idCard: string
): Promise<DbResult<AuthUser | null>> {
  if (!supabase) {
    // Mock: ไม่พบ
    return { data: null, error: null, source: 'mock' }
  }
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, full_name, phone, id_card,
      bank_name, bank_account_no, bank_account_name,
      farmers ( id, code, province, district, village, status )
    `)
    .eq('id_card', idCard.trim())
    .maybeSingle()

  if (error) {
    logSupabaseError('findProfileByIdCard', error)
    return { data: null, error: error.message, source: 'supabase' }
  }
  if (!data) return { data: null, error: null, source: 'supabase' }

  const farmerRows = (data as Record<string, unknown>).farmers as Record<string, unknown>[] | null
  const farmer = Array.isArray(farmerRows) ? farmerRows[0] : null
  if (!farmer) return { data: null, error: null, source: 'supabase' }

  return {
    data: mapFarmerRow(farmer, data as Record<string, unknown>),
    error: null,
    source: 'supabase',
  }
}

/** Login ด้วย id_card + phone */
export async function loginWithIdCardPhone(
  idCard: string,
  phone: string
): Promise<DbResult<AuthUser | null>> {
  if (!supabase) {
    // Mock login for testing
    if (idCard === '1234567890123' && phone === '0812345678') {
      return {
        data: {
          id: 'mock-farmer-1', profileId: 'mock-profile-1',
          name: 'สมชาย ใจดี (Mock)', role: 'farmer', code: 'KF001',
          phone: '0812345678', idCard: '1234567890123',
          province: 'บุรีรัมย์', district: 'เมือง', village: 'บ้านดง',
          registrationStatus: 'approved',
        },
        error: null,
        source: 'mock',
      }
    }
    return { data: null, error: null, source: 'mock' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, full_name, phone, id_card,
      bank_name, bank_account_no, bank_account_name,
      farmers ( id, code, province, district, village, status )
    `)
    .eq('id_card', idCard.trim())
    .eq('phone', phone.trim())
    .maybeSingle()

  if (error) {
    logSupabaseError('loginWithIdCardPhone', error)
    return { data: null, error: error.message, source: 'supabase' }
  }
  if (!data) return { data: null, error: null, source: 'supabase' }

  const farmerRows = (data as Record<string, unknown>).farmers as Record<string, unknown>[] | null
  const farmer = Array.isArray(farmerRows) ? farmerRows[0] : null
  if (!farmer) return { data: null, error: null, source: 'supabase' }

  return {
    data: mapFarmerRow(farmer, data as Record<string, unknown>),
    error: null,
    source: 'supabase',
  }
}

export async function saveProfileLineUserId(profileId: string, lineUserId: string): Promise<void> {
  if (!supabase || !profileId || !lineUserId) return
  const { error } = await supabase
    .from('profiles')
    .update({ line_user_id: lineUserId, line_uid: lineUserId })
    .eq('id', profileId)
  if (error) throw error
}

/** สมัครสมาชิก: check dup → upsert profile → insert farmer */
export async function registerFarmerMember(
  payload: RegisterPayload
): Promise<DbResult<AuthUser>> {
  if (!supabase) {
    const mockUser: AuthUser = {
      id: `mock-farmer-${Date.now()}`,
      profileId: `mock-profile-${Date.now()}`,
      name: payload.full_name,
      role: 'member' as const,
      code: `KF${Date.now().toString().slice(-4)}`,
      phone: payload.phone,
      idCard: payload.id_card,
      province: payload.province,
      district: payload.district,
      village: payload.village,
      bankName: payload.bank_name,
      bankAccountNo: payload.bank_account_no,
      bankAccountName: payload.bank_account_name,
      registrationStatus: 'pending_leader',
    }
    return { data: mockUser, error: null, source: 'mock' }
  }

  // 1. ตรวจสอบว่ามี id_card ซ้ำไหม
  const existing = await findProfileByIdCard(payload.id_card)
  if (existing.error) return { data: null, error: existing.error, source: 'supabase' }

  let profileId: string
  let farmerId: string

  if (existing.data) {
    // มีอยู่แล้ว → update ข้อมูลที่ขาด
    profileId = existing.data.profileId
    farmerId = existing.data.id

    const updateProfile: Record<string, unknown> = {}
    if (!existing.data.name || existing.data.name === 'ไม่ระบุ') updateProfile.full_name = payload.full_name
    if (!existing.data.bankName && payload.bank_name) updateProfile.bank_name = payload.bank_name
    if (!existing.data.bankAccountNo && payload.bank_account_no) updateProfile.bank_account_no = payload.bank_account_no
    if (!existing.data.bankAccountName && payload.bank_account_name) updateProfile.bank_account_name = payload.bank_account_name

    if (Object.keys(updateProfile).length > 0) {
      const { error } = await supabase.from('profiles').update(updateProfile).eq('id', profileId)
      if (error) logSupabaseError('registerFarmerMember:updateProfile', error)
    }

    const updateFarmer: Record<string, unknown> = { status: 'pending_leader' }
    if (payload.province) updateFarmer.province = payload.province
    if (payload.district) updateFarmer.district = payload.district
    if (payload.village) updateFarmer.village = payload.village
    const { error: fe } = await supabase.from('farmers').update(updateFarmer).eq('id', farmerId)
    if (fe) logSupabaseError('registerFarmerMember:updateFarmer', fe)

  } else {
    // ไม่มีอยู่ → insert ใหม่
    const { data: pData, error: pErr } = await supabase
      .from('profiles')
      .insert({
        full_name: payload.full_name,
        phone: payload.phone,
        id_card: payload.id_card,
        role: 'farmer',
        bank_name: payload.bank_name ?? null,
        bank_account_no: payload.bank_account_no ?? null,
        bank_account_name: payload.bank_account_name ?? null,
      })
      .select('id')
      .single()
    if (pErr) {
      logSupabaseError('registerFarmerMember:insertProfile', pErr)
      return { data: null, error: pErr.message, source: 'supabase' }
    }
    profileId = pData.id

    const code = `KF${Date.now().toString().slice(-6)}`
    const { data: fData, error: fErr } = await supabase
      .from('farmers')
      .insert({
        profile_id: profileId,
        code,
        province: payload.province ?? null,
        district: payload.district ?? null,
        village: payload.village ?? null,
        total_area: 0,
        tier: 'bronze',
        status: 'pending_leader',
      })
      .select('id, code')
      .single()
    if (fErr) {
      logSupabaseError('registerFarmerMember:insertFarmer', fErr)
      return { data: null, error: fErr.message, source: 'supabase' }
    }
    farmerId = fData.id

    const authUser: AuthUser = {
      id: farmerId,
      profileId,
      name: payload.full_name,
      role: 'farmer',
      code: fData.code,
      phone: payload.phone,
      idCard: payload.id_card,
      province: payload.province,
      district: payload.district,
      village: payload.village,
      bankName: payload.bank_name,
      bankAccountNo: payload.bank_account_no,
      bankAccountName: payload.bank_account_name,
      registrationStatus: 'pending_leader',
    }
    return { data: authUser, error: null, source: 'supabase' }
  }

  // คืน updated user
  const authUser: AuthUser = {
    id: farmerId,
    profileId,
    name: payload.full_name || existing.data!.name,
    role: 'farmer',
    code: existing.data!.code,
    phone: payload.phone,
    idCard: payload.id_card,
    province: payload.province || existing.data!.province,
    district: payload.district || existing.data!.district,
    village: payload.village || existing.data!.village,
    bankName: payload.bank_name || existing.data!.bankName,
    bankAccountNo: payload.bank_account_no || existing.data!.bankAccountNo,
    bankAccountName: payload.bank_account_name || existing.data!.bankAccountName,
    registrationStatus: 'pending_leader',
  }
  return { data: authUser, error: null, source: 'supabase' }
}

// ── Admin Members (fetchAdminMembers / approveMember / rejectMember / updateRoleGrade) ──

export interface AdminMemberRow {
  id: string
  full_name: string
  id_card: string | null      // อาจ null ถ้าไม่ได้กรอก
  phone: string
  role: string
  grade: string | null
  tier: string | null         // standard / gold / etc.
  line_user_id: string | null
  line_verify_status: string | null
  created_at: string
  farmers: {
    id?: string
    status: string | null
    province: string | null
    district: string | null
    village: string | null
    bank_name: string | null
    bank_account_no: string | null
    bank_account_name: string | null
    citizen_id?: string | null  // farmers table อาจเก็บ citizen_id แยก
  }[]
}

const MOCK_ADMIN_MEMBERS: AdminMemberRow[] = [
  {
    id: 'mock-p1', full_name: 'สมชาย ใจดี', id_card: '1234567890123',
    phone: '0812345678', role: 'member', grade: null,
    tier: 'standard', line_user_id: null, line_verify_status: 'verified', created_at: '2025-04-01T10:00:00Z',
    farmers: [{ status: 'pending_leader', province: 'บุรีรัมย์', district: 'เมือง', village: 'บ้านดง', bank_name: 'ธ.ก.ส.', bank_account_no: '02012345678', bank_account_name: 'สมชาย ใจดี' }],
  },
  {
    id: 'mock-p2', full_name: 'นภา ฟ้าใส', id_card: '9876543210987',
    phone: '0898765432', role: 'farmer', grade: 'A',
    tier: 'gold', line_user_id: null, line_verify_status: 'verified', created_at: '2025-03-15T08:30:00Z',
    farmers: [{ status: 'approved', province: 'บุรีรัมย์', district: 'กระสัง', village: 'บ้านทุ่ง', bank_name: 'ธนาคารกรุงไทย', bank_account_no: '01098765432', bank_account_name: 'นภา ฟ้าใส' }],
  },
  {
    id: 'mock-p3', full_name: 'ประสิทธิ์ ดีงาม', id_card: '1122334455667',
    phone: '0844441111', role: 'member', grade: null,
    tier: 'standard', line_user_id: null, line_verify_status: null, created_at: '2025-04-28T14:00:00Z',
    farmers: [{ status: 'pending_leader', province: 'สุรินทร์', district: 'เมือง', village: 'บ้านโนน', bank_name: 'ธนาคารออมสิน', bank_account_no: '03011223344', bank_account_name: 'ประสิทธิ์ ดีงาม' }],
  },
]

export async function fetchAdminMembers() {
  if (!supabase) {
    console.info('[mock] fetchAdminMembers')
    return MOCK_ADMIN_MEMBERS
  }

  const { data: profiles, error: e1 } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: farmers, error: e2 } = await supabase
    .from('farmers')
    .select('*')

  if (e1 || e2) {
    console.error('โหลดสมาชิกไม่สำเร็จ', e1 || e2)
    throw new Error('โหลดสมาชิกไม่สำเร็จ')
  }

  // merge เอง (true left join — profiles ไม่หายแม้ไม่มี farmer row)
  const merged = (profiles ?? []).map((p: Record<string, unknown>) => {
    const f = (farmers ?? []).find((x: Record<string, unknown>) => x.profile_id === p.id) ?? null
    return {
      ...p,
      farmer:  f,
      farmers: f ? [f] : [],            // AdminMemberRow compat
      status:  (f as Record<string,unknown>)?.status ?? 'pending_leader',
      grade:   p.grade ?? p.tier ?? 'C',
    }
  })

  console.log('[fetchAdminMembers] profiles:', profiles?.length, '| farmers:', farmers?.length, '| merged:', merged.length)
  return merged as unknown as AdminMemberRow[]
}

export async function approveMember(profileId: string): Promise<void> {
  if (!supabase) { console.info('[mock] approveMember', profileId); return }

  // 1. อัปเดต profiles.role → farmer
  const { error: pe } = await supabase
    .from('profiles')
    .update({ role: 'farmer' })
    .eq('id', profileId)
  if (pe) { logSupabaseError('approveMember:profiles', pe); throw new Error(pe.message) }

  // 2. ถ้ามี farmers row → update status; ถ้าไม่มี → insert ใหม่
  const { data: existing } = await supabase
    .from('farmers')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existing) {
    const { error: fe } = await supabase
      .from('farmers')
      .update({ status: 'approved' })
      .eq('profile_id', profileId)
    if (fe) { logSupabaseError('approveMember:farmers.update', fe); throw new Error(fe.message) }
  } else {
    // สร้าง farmers row ใหม่ถ้ายังไม่มี
    const { error: fe } = await supabase
      .from('farmers')
      .insert({ profile_id: profileId, status: 'approved', tier: 'bronze', total_area: 0 })
    if (fe) { logSupabaseError('approveMember:farmers.insert', fe); throw new Error(fe.message) }
  }
}

export async function rejectMember(profileId: string): Promise<void> {
  if (!supabase) { console.info('[mock] rejectMember', profileId); return }

  const { data: existing } = await supabase
    .from('farmers')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('farmers')
      .update({ status: 'rejected' })
      .eq('profile_id', profileId)
    if (error) { logSupabaseError('rejectMember', error); throw new Error(error.message) }
  } else {
    const { error } = await supabase
      .from('farmers')
      .insert({ profile_id: profileId, status: 'rejected', tier: 'bronze', total_area: 0 })
    if (error) { logSupabaseError('rejectMember:insert', error); throw new Error(error.message) }
  }
}

export async function updateRoleGrade(profileId: string, role: string, grade: string): Promise<void> {
  if (!supabase) { console.info('[mock] updateRoleGrade', profileId, role, grade); return }
  const { error } = await supabase
    .from('profiles')
    .update({ role, grade: grade || null })
    .eq('id', profileId)
  if (error) {
    logSupabaseError('updateRoleGrade', error)
    throw new Error(error.message)
  }
}

export interface MemberAdminFields {
  role?: string
  grade?: string
  status?: string
}

function isServiceProviderRole(role?: string) {
  return role === 'harvester' || role === 'tractor' || role === 'truck'
}

async function ensureFarmerFromProfile(profileId: string, status = 'pending_leader') {
  if (!supabase) return
  const { data: existing } = await supabase.from('farmers').select('id').eq('profile_id', profileId).maybeSingle()
  if (existing) return
  const { error } = await supabase.from('farmers').insert({ profile_id: profileId, status, member_status: status, role: 'member' })
  if (error) throw error
}

async function ensureServiceProviderFromProfile(profileId: string, role: string) {
  if (!supabase) return
  const { data: existing } = await supabase.from('service_providers').select('id').eq('profile_id', profileId).eq('provider_type', role).maybeSingle()
  if (existing) return
  const { data: profile } = await supabase.from('profiles').select('full_name, grade, sub_role').eq('id', profileId).maybeSingle()
  const { error } = await supabase.from('service_providers').insert({
    profile_id: profileId,
    provider_type: role,
    provider_name: profile?.full_name ?? null,
    sub_role: profile?.sub_role ?? null,
    grade: profile?.grade ?? 'C',
  })
  if (error) throw error
}

export async function updateMemberAdminFields(
  id: string,
  payload: MemberAdminFields
): Promise<void> {
  const { role, grade, status } = payload

  if (!supabase) {
    console.info('[mock] updateMemberAdminFields', id, payload)
    return
  }

  if (role !== undefined || grade !== undefined) {
    const { error } = await supabase
      .from('profiles')
      .update({ role, grade })
      .eq('id', id)
    if (error) {
      logSupabaseError('updateMemberAdminFields:profiles', error)
      throw new Error(error.message)
    }
  }

  if (role === 'farmer') {
    try {
      await ensureFarmerFromProfile(id, status ?? 'pending_leader')
    } catch (error) {
      logSupabaseError('updateMemberAdminFields:ensureFarmer', error as { message: string; code?: string; details?: string })
      throw error
    }
  } else if (isServiceProviderRole(role)) {
    try {
      await ensureServiceProviderFromProfile(id, role)
    } catch (error) {
      logSupabaseError('updateMemberAdminFields:ensureServiceProvider', error as { message: string; code?: string; details?: string })
      throw error
    }
  }

  if (status !== undefined) {
    const { error } = await supabase
      .from('farmers')
      .update({ status, member_status: status })
      .eq('profile_id', id)
    if (error) {
      logSupabaseError('updateMemberAdminFields:farmers', error)
      throw new Error(error.message)
    }
  }
}

// ── Member Import (findByIdCard / upsertMember) ────────────────────────────────

export interface ImportRow {
  id_card?: string
  full_name?: string
  phone?: string
  province?: string
  district?: string
  village?: string
  bank_name?: string
  bank_account_no?: string
  bank_account_name?: string
  role?: string
  grade?: string
  status?: string
}

export async function findByIdCard(id_card: string): Promise<{ id: string } | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id_card', id_card)
    .maybeSingle()
  return data as { id: string } | null
}

export async function upsertMember(row: ImportRow): Promise<'inserted' | 'updated'> {
  if (!supabase) {
    console.info('[mock] upsertMember', row.id_card)
    return 'inserted'
  }

  const exist = await findByIdCard(row.id_card!)

  if (exist) {
    // update profiles
    await supabase.from('profiles').update({
      full_name: row.full_name,
      phone:     row.phone,
      role:      row.role  || 'member',
      grade:     row.grade || 'C',
    }).eq('id', exist.id)

    if (row.role === 'farmer') await ensureFarmerFromProfile(exist.id, row.status || 'pending_leader')
    if (isServiceProviderRole(row.role)) await ensureServiceProviderFromProfile(exist.id, row.role)

    // update farmers (upsert ถ้าไม่มี row)
    const { data: f } = await supabase.from('farmers').select('id').eq('profile_id', exist.id).maybeSingle()
    if (f) {
      await supabase.from('farmers').update({
        province:         row.province,
        district:         row.district,
        village:          row.village,
        bank_name:        row.bank_name,
        bank_account_no:  row.bank_account_no,
        bank_account_name:row.bank_account_name,
        status:           row.status || 'pending_line_verify',
      }).eq('profile_id', exist.id)
    } else {
      await supabase.from('farmers').insert({
        profile_id:       exist.id,
        province:         row.province,
        district:         row.district,
        village:          row.village,
        bank_name:        row.bank_name,
        bank_account_no:  row.bank_account_no,
        bank_account_name:row.bank_account_name,
        status:           row.status || 'pending_line_verify',
        total_area:       0,
        tier:             'bronze',
      })
    }
    return 'updated'

  } else {
    // insert profiles
    const { data: p, error: pe } = await supabase.from('profiles').insert({
      id_card:            row.id_card,
      full_name:          row.full_name,
      phone:              row.phone,
      role:               row.role  || 'member',
      grade:              row.grade || 'C',
      line_verify_status: 'line_pending',
    }).select('id').single()
    if (pe) throw new Error(pe.message)

    if (row.role === 'farmer') await ensureFarmerFromProfile(p.id, row.status || 'pending_leader')
    if (isServiceProviderRole(row.role)) await ensureServiceProviderFromProfile(p.id, row.role)
    await supabase.from('farmers').upsert({
      profile_id:       p.id,
      province:         row.province,
      district:         row.district,
      village:          row.village,
      bank_name:        row.bank_name,
      bank_account_no:  row.bank_account_no,
      bank_account_name:row.bank_account_name,
      status:           row.status || 'pending_line_verify',
      member_status:    row.status || 'pending_line_verify',
      total_area:       0,
      tier:             'bronze',
    }, { onConflict: 'profile_id' })
    return 'inserted'
  }
}

export interface SeedSupplier {
  id: string
  supplier_name: string
  seed_brand: string | null
  contact_name: string | null
  phone: string | null
  address: string | null
  contract_terms: string | null
  active_status: boolean
  show_to_farmer: boolean
}

export interface SeedSupplierPayload {
  supplier_name: string
  seed_brand?: string | null
  contact_name?: string | null
  phone?: string | null
  address?: string | null
  contract_terms?: string | null
  active_status?: boolean
  show_to_farmer?: boolean
}

export interface SeedVariety {
  id: string
  supplier_id: string
  supplier_name?: string | null
  variety_name: string
  brand: string | null
  bag_weight_kg: number | null
  price_per_bag: number | null
  unit: string | null
  maturity_days: number | null
  recommended_area: string | null
  soil_requirement: string | null
  water_requirement: string | null
  disease_resistance: string | null
  planting_spacing: string | null
  fertilizer_recommendation: string | null
  restrictions: string | null
  planting_steps: string | null
  expected_yield: string | null
  active_status: boolean
  show_to_farmer: boolean
}

export interface SeedVarietyPayload {
  supplier_id: string
  variety_name: string
  brand?: string | null
  bag_weight_kg?: number | null
  price_per_bag?: number | null
  unit?: string | null
  maturity_days?: number | null
  recommended_area?: string | null
  soil_requirement?: string | null
  water_requirement?: string | null
  disease_resistance?: string | null
  planting_spacing?: string | null
  fertilizer_recommendation?: string | null
  restrictions?: string | null
  planting_steps?: string | null
  expected_yield?: string | null
  active_status?: boolean
  show_to_farmer?: boolean
}

export async function fetchSeedSuppliers(): Promise<DbResult<SeedSupplier[]>> {
  if (!supabase) return { data: [], error: null, source: 'mock' }
  const { data, error } = await supabase.from('seed_suppliers').select('*').order('supplier_name')
  if (error) {
    logSupabaseError('fetchSeedSuppliers', error)
    return { data: [], error: error.message, source: 'supabase' }
  }
  return { data: (data ?? []) as SeedSupplier[], error: null, source: 'supabase' }
}

export async function createSeedSupplier(payload: SeedSupplierPayload): Promise<DbResult<{ id: string }>> {
  if (!supabase) return { data: { id: `mock-${Date.now()}` }, error: null, source: 'mock' }
  const { data, error } = await supabase.from('seed_suppliers').insert(payload).select('id').single()
  if (error) logSupabaseError('createSeedSupplier', error)
  return { data, error: error?.message ?? null, source: 'supabase' }
}

export async function updateSeedSupplier(id: string, payload: SeedSupplierPayload): Promise<DbResult<{ id: string }>> {
  if (!supabase) return { data: { id }, error: null, source: 'mock' }
  const { data, error } = await supabase.from('seed_suppliers').update(payload).eq('id', id).select('id').single()
  if (error) logSupabaseError('updateSeedSupplier', error)
  return { data, error: error?.message ?? null, source: 'supabase' }
}

export async function fetchSeedVarieties(filters?: { supplierId?: string; search?: string }): Promise<DbResult<SeedVariety[]>> {
  if (!supabase) return { data: [], error: null, source: 'mock' }
  let query = supabase.from('seed_varieties').select('*, seed_suppliers:supplier_id (supplier_name)').order('created_at', { ascending: false })
  if (filters?.supplierId) query = query.eq('supplier_id', filters.supplierId)
  if (filters?.search) {
    query = query.or(`variety_name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`)
  }
  const { data, error } = await query
  if (error) {
    logSupabaseError('fetchSeedVarieties', error)
    return { data: [], error: error.message, source: 'supabase' }
  }
  const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ''),
    supplier_id: String(row.supplier_id ?? ''),
    supplier_name: (row.seed_suppliers as { supplier_name?: string } | null)?.supplier_name ?? null,
    variety_name: String(row.variety_name ?? ''),
    brand: (row.brand as string | null) ?? null,
    bag_weight_kg: (row.bag_weight_kg as number | null) ?? null,
    price_per_bag: (row.price_per_bag as number | null) ?? null,
    unit: (row.unit as string | null) ?? null,
    maturity_days: (row.maturity_days as number | null) ?? null,
    recommended_area: (row.recommended_area as string | null) ?? null,
    soil_requirement: (row.soil_requirement as string | null) ?? null,
    water_requirement: (row.water_requirement as string | null) ?? null,
    disease_resistance: (row.disease_resistance as string | null) ?? null,
    planting_spacing: (row.planting_spacing as string | null) ?? null,
    fertilizer_recommendation: (row.fertilizer_recommendation as string | null) ?? null,
    restrictions: (row.restrictions as string | null) ?? null,
    planting_steps: (row.planting_steps as string | null) ?? null,
    expected_yield: (row.expected_yield as string | null) ?? null,
    active_status: Boolean(row.active_status),
    show_to_farmer: Boolean(row.show_to_farmer),
  }))
  return { data: mapped as SeedVariety[], error: null, source: 'supabase' }
}

export async function fetchSeedVarietiesBySupplier(supplierId: string): Promise<DbResult<SeedVariety[]>> {
  return fetchSeedVarieties({ supplierId })
}

export async function createSeedVariety(payload: SeedVarietyPayload): Promise<DbResult<{ id: string }>> {
  if (!supabase) return { data: { id: `mock-${Date.now()}` }, error: null, source: 'mock' }
  const { data: supplierExists } = await supabase.from('seed_suppliers').select('id').eq('id', payload.supplier_id).maybeSingle()
  if (!supplierExists) return { data: null, error: 'ไม่พบ Supplier ที่เลือก', source: 'supabase' }
  const { data, error } = await supabase.from('seed_varieties').insert(payload).select('id').single()
  if (error) logSupabaseError('createSeedVariety', error)
  return { data, error: error?.message ?? null, source: 'supabase' }
}

export async function updateSeedVariety(id: string, payload: SeedVarietyPayload): Promise<DbResult<{ id: string }>> {
  if (!supabase) return { data: { id }, error: null, source: 'mock' }
  const { data: supplierExists } = await supabase.from('seed_suppliers').select('id').eq('id', payload.supplier_id).maybeSingle()
  if (!supplierExists) return { data: null, error: 'ไม่พบ Supplier ที่เลือก', source: 'supabase' }
  const { data, error } = await supabase.from('seed_varieties').update(payload).eq('id', id).select('id').single()
  if (error) logSupabaseError('updateSeedVariety', error)
  return { data, error: error?.message ?? null, source: 'supabase' }
}

export type ReservationStatus = 'requested' | 'approved' | 'converted' | 'cancelled'
export type HarvestStatus = 'scheduled' | 'in_progress' | 'completed'

export interface SeedSaleInsert {
  profile_id: string
  lot_id: string
  reservation_id?: string
  quantity: number
  unit_price?: number
  sale_date?: string
  note?: string
}

export interface CropQualityRecordInsert {
  farmer_id?: string
  profile_id?: string
  farm_id?: string
  agri_cycle_id?: string
  crop_type?: string
  sale_date?: string
  weight_kg?: number
  moisture: number
  impurity: number
  broken_kernel: number
  grade: 'A' | 'B' | 'C'
  harvester_provider_id?: string
  transport_provider_id?: string
  note?: string
}

export interface ServiceProviderRatingInsert {
  service_provider_id: string
  farmer_id?: string
  profile_id?: string
  farm_id?: string
  agri_cycle_id?: string
  service_booking_id?: string
  harvest_appointment_id?: string
  provider_type?: string
  score: number
  comment?: string
  rated_by?: string
}

export function getServiceProviderGrade(score: number): 'A' | 'B' | 'C' {
  if (score >= 4.5) return 'A'
  if (score >= 3) return 'B'
  return 'C'
}

export async function createSeedSaleWithStockFlow(payload: SeedSaleInsert): Promise<DbResult<{ id: string }>> {
  if (!supabase) return { data: { id: `mock-${Date.now()}` }, error: null, source: 'mock' }

  const { data: lot, error: lotError } = await supabase
    .from('seed_stock_lots')
    .select('id, quantity_balance')
    .eq('id', payload.lot_id)
    .single()

  if (lotError || !lot) {
    logSupabaseError('createSeedSaleWithStockFlow:loadLot', lotError ?? { message: 'Lot not found' })
    return { data: null, error: lotError?.message ?? 'ไม่พบล็อตคงเหลือ', source: 'supabase' }
  }

  const remaining = Number(lot.quantity_balance ?? 0) - payload.quantity
  if (remaining < 0) {
    return { data: null, error: 'จำนวนสต๊อกไม่เพียงพอ', source: 'supabase' }
  }

  const { data, error } = await supabase.from('seed_sales').insert(payload).select('id').single()
  if (error) {
    logSupabaseError('createSeedSaleWithStockFlow:createSale', error)
    return { data: null, error: error.message, source: 'supabase' }
  }

  const { error: stockError } = await supabase
    .from('seed_stock_lots')
    .update({ quantity_balance: remaining })
    .eq('id', payload.lot_id)
  if (stockError) {
    logSupabaseError('createSeedSaleWithStockFlow:updateStock', stockError)
    return { data: null, error: stockError.message, source: 'supabase' }
  }

  return { data, error: null, source: 'supabase' }
}

export async function createCropQualityRecord(payload: CropQualityRecordInsert): Promise<DbResult<{ id: string }>> {
  if (!supabase) return { data: { id: `mock-${Date.now()}` }, error: null, source: 'mock' }
  const { data, error } = await supabase.from('crop_quality_records').insert(payload).select('id').single()
  if (error) logSupabaseError('createCropQualityRecord', error)
  return { data, error: error?.message ?? null, source: 'supabase' }
}

export async function createServiceProviderRating(payload: ServiceProviderRatingInsert): Promise<DbResult<{ id: string; grade: 'A' | 'B' | 'C' }>> {
  if (!supabase) {
    return { data: { id: `mock-${Date.now()}`, grade: getServiceProviderGrade(payload.score) }, error: null, source: 'mock' }
  }

  const grade = getServiceProviderGrade(payload.score)
  const { data, error } = await supabase
    .from('service_provider_ratings')
    .insert({ ...payload, grade })
    .select('id, grade')
    .single()
  if (error) logSupabaseError('createServiceProviderRating', error)
  return { data: (data as { id: string; grade: 'A' | 'B' | 'C' }) ?? null, error: error?.message ?? null, source: 'supabase' }
}
