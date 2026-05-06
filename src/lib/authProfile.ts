import { requireSupabase, supabase } from './supabase'
import type { AuthUser, RegStatus } from '../routes/AuthContext'
import type { AppRole, BaseType, Capability, Grade, VehicleType } from './roles'
import type { Department, Permission } from './permissions'

type QueryResult<T> = {
  data: T | null
  error: { message: string } | null
}

type AuthResult = {
  data: {
    user: { id: string } | null
    session?: unknown
  }
  error: { message: string } | null
}

type SessionResult = {
  data: {
    session: {
      user: { id: string }
    } | null
  }
  error: { message: string } | null
}

function normalizeArray<T extends string>(value: unknown): T[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is T => typeof v === 'string')
}

function asRole(value: unknown): AppRole {
  const v = String(value ?? 'member')
  if (v === 'farmer' || v === 'field' || v === 'leader' || v === 'inspector' || v === 'admin' || v === 'vehicle' || v === 'service') return v
  return 'member'
}

function asBaseType(value: unknown): BaseType | undefined {
  return value === 'farmer' || value === 'service' || value === 'staff' ? value : undefined
}

function asGrade(value: unknown): Grade | undefined {
  return value === 'A' || value === 'B' || value === 'C' ? value : undefined
}

function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}

export function mapProfileToAuthUser(profile: Record<string, unknown>): AuthUser {
  return {
    id: String(profile.id),
    profileId: String(profile.id),
    name: String(profile.full_name ?? profile.name ?? 'ไม่ระบุ'),
    role: asRole(profile.role),
    code: String(profile.code ?? ''),
    phone: String(profile.phone ?? ''),
    idCard: String(profile.id_card ?? ''),
    province: profile.province ? String(profile.province) : undefined,
    district: profile.district ? String(profile.district) : undefined,
    village: profile.village ? String(profile.village) : undefined,
    bankName: profile.bank_name ? String(profile.bank_name) : undefined,
    bankAccountNo: profile.bank_account_no ? String(profile.bank_account_no) : undefined,
    bankAccountName: profile.bank_account_name ? String(profile.bank_account_name) : undefined,
    registrationStatus: String(profile.status ?? 'approved') as RegStatus,
    baseType: asBaseType(profile.base_type),
    capabilities: normalizeArray<Capability>(profile.capabilities),
    grade: asGrade(profile.grade),
    vehicleType: profile.vehicle_type as VehicleType | undefined,
    canFieldwork: Boolean(profile.can_fieldwork),
    department: profile.department as Department | undefined,
    permissions: normalizeArray<Permission>(profile.permissions),
  }
}

export async function getProfileByAuthUserId(authUserId: string) {
  const db = requireSupabase()
  const query = db
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle() as unknown as PromiseLike<QueryResult<Record<string, unknown>>>

  const { data, error } = await withTimeout(
    query,
    12000,
    'โหลด profile จาก auth_user_id ไม่สำเร็จภายในเวลาที่กำหนด',
  )

  if (error) throw new Error(error.message)
  return data ? mapProfileToAuthUser(data) : null
}

export async function signInAdminWithPassword(email: string, password: string) {
  const db = requireSupabase()
  const authRequest = db.auth.signInWithPassword({ email, password }) as unknown as PromiseLike<AuthResult>
  const { data, error } = await withTimeout(
    authRequest,
    12000,
    'เข้าสู่ระบบ Supabase Auth ไม่สำเร็จภายในเวลาที่กำหนด',
  )

  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('ไม่พบผู้ใช้จาก Supabase Auth')

  const profile = await getProfileByAuthUserId(data.user.id)
  if (!profile) {
    await db.auth.signOut()
    throw new Error('บัญชีนี้ยังไม่ได้ผูกกับ profiles.auth_user_id')
  }

  return profile
}

export async function getCurrentAuthProfile() {
  if (!supabase) return null
  const sessionRequest = supabase.auth.getSession() as unknown as PromiseLike<SessionResult>
  const { data, error } = await withTimeout(
    sessionRequest,
    12000,
    'โหลด session ไม่สำเร็จภายในเวลาที่กำหนด',
  )
  if (error) throw new Error(error.message)
  const user = data.session?.user
  if (!user) return null
  return getProfileByAuthUserId(user.id)
}

export async function signOutSupabase() {
  if (!supabase) return
  await supabase.auth.signOut()
}
