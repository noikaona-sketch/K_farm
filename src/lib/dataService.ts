import { supabase, hasSupabaseEnv } from './supabase'
import { MOCK_FARMERS, MOCK_FARMS, MOCK_NO_BURN, MOCK_PRICES, MOCK_SALE_REQUESTS_EXTENDED } from '../data/mockData'

export async function registerFarmer(payload: { name: string; phone: string; idcard: string; lat?: number; lng?: number }) {
  if (!hasSupabaseEnv) return { ok: true, mock: true }
  const profileRes = await supabase!.from('profiles').insert({ full_name: payload.name, phone: payload.phone, citizen_id: payload.idcard, role: 'farmer' })
  const profileId = Array.isArray(profileRes.data) ? profileRes.data[0]?.id : undefined
  await supabase!.from('farmers').insert({ profile_id: profileId, status: 'pending', lat: payload.lat, lng: payload.lng })
  return { ok: true, mock: false }
}
export async function createFarm(payload: Record<string, unknown>) { if (!hasSupabaseEnv) return { ok: true, mock: true }; await supabase!.from('farms').insert(payload); return { ok: true, mock: false } }
export async function createPlantingCycle(payload: Record<string, unknown>) { if (!hasSupabaseEnv) return { ok: true, mock: true }; await supabase!.from('planting_cycles').insert(payload); return { ok: true, mock: false } }
export async function createNoBurnApplication(payload: Record<string, unknown>) { if (!hasSupabaseEnv) return { ok: true, mock: true }; await supabase!.from('no_burn_applications').insert(payload); return { ok: true, mock: false } }
export async function createSaleRequest(payload: Record<string, unknown>) { if (!hasSupabaseEnv) return { ok: true, mock: true }; await supabase!.from('sale_requests').insert(payload); return { ok: true, mock: false } }
export async function getPriceAnnouncements() { if (!hasSupabaseEnv) return MOCK_PRICES; const res = await supabase!.from('price_announcements').select(); return (res.data ?? []) as any[] }
export async function getAdminDashboardData() {
  if (!hasSupabaseEnv) return { farmers: MOCK_FARMERS, farms: MOCK_FARMS, saleRequests: MOCK_SALE_REQUESTS_EXTENDED, noBurnApplications: MOCK_NO_BURN }
  const [farmers, farms, saleRequests, noBurnApplications] = await Promise.all([supabase!.from('farmers').select(), supabase!.from('farms').select(), supabase!.from('sale_requests').select(), supabase!.from('no_burn_applications').select()])
  return { farmers: farmers.data ?? [], farms: farms.data ?? [], saleRequests: saleRequests.data ?? [], noBurnApplications: noBurnApplications.data ?? [] }
}
