import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, Truck, Wifi, WifiOff } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'

type VehicleType = 'tractor' | 'harvester' | 'truck'
type Grade = 'A' | 'B' | 'C'

const vehicleTypes: VehicleType[] = ['truck', 'tractor', 'harvester']
const vehicleSizes = ['เล็ก', 'กลาง', 'ใหญ่', '6 ล้อ', '10 ล้อ', 'รถพ่วง', 'รถเทรลเลอร์', 'อื่นๆ']
const grades: Grade[] = ['C', 'B', 'A']
const statuses = ['pending', 'approved', 'rejected', 'suspended']

const VEHICLE_LABEL: Record<VehicleType, string> = {
  truck: 'รถบรรทุก',
  tractor: 'รถไถ / แทรกเตอร์',
  harvester: 'รถเกี่ยว / เก็บเกี่ยว',
}

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-400',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-400',
  suspended: 'bg-gray-400',
}

type ServiceRow = {
  id: string
  profile_id: string
  full_name: string
  phone: string
  province?: string
  district?: string
  subdistrict?: string
  vehicle_type: VehicleType
  vehicle_size: string
  grade: Grade
  license_plate: string
  vehicle_year?: number | null
  driver_name?: string
  driver_phone?: string
  status: string
  created_at?: string
}

type RowEdit = {
  vehicle_type: VehicleType
  vehicle_size: string
  grade: Grade
  status: string
  license_plate: string
  vehicle_year: string
  driver_name: string
  driver_phone: string
}

function asVehicleType(value: unknown): VehicleType {
  return value === 'tractor' || value === 'harvester' ? value : 'truck'
}

function asGrade(value: unknown): Grade {
  return value === 'A' || value === 'B' ? value : 'C'
}

function getVehicleSize(row: Record<string, unknown>) {
  const ocr = row.id_card_ocr_json as Record<string, unknown> | null | undefined
  return String(row.vehicle_size ?? ocr?.vehicle_size ?? ocr?.vehicle_type ?? '') || '6 ล้อ'
}

function readProfile(row: Record<string, unknown>) {
  const profile = row.profiles as Record<string, unknown> | null | undefined
  return profile ?? {}
}

export default function AdminServiceProviders() {
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [edits, setEdits] = useState<Record<string, RowEdit>>({})
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | VehicleType>('all')
  const [filterSize, setFilterSize] = useState('all')
  const [filterGrade, setFilterGrade] = useState<'all' | Grade>('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const load = async () => {
    setLoading(true)
    try {
      if (!supabase) {
        setRows([])
        return
      }

      const { data, error } = await supabase
        .from('service_providers')
        .select('id, profile_id, vehicle_type, grade, license_plate, vehicle_year, driver_name, driver_phone, status, created_at, profiles(id, full_name, phone, province, district, subdistrict, id_card_ocr_json, base_type)')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      const mapped: ServiceRow[] = (data ?? []).map((row: Record<string, unknown>) => {
        const profile = readProfile(row)
        const profileOcr = profile.id_card_ocr_json as Record<string, unknown> | null | undefined
        return {
          id: String(row.id),
          profile_id: String(row.profile_id),
          full_name: String(profile.full_name ?? '-'),
          phone: String(profile.phone ?? '-'),
          province: String(profile.province ?? ''),
          district: String(profile.district ?? ''),
          subdistrict: String(profile.subdistrict ?? ''),
          vehicle_type: asVehicleType(row.vehicle_type),
          vehicle_size: String((row as any).vehicle_size ?? profileOcr?.vehicle_size ?? profileOcr?.vehicle_type ?? '6 ล้อ'),
          grade: asGrade(row.grade),
          license_plate: String(row.license_plate ?? ''),
          vehicle_year: row.vehicle_year ? Number(row.vehicle_year) : null,
          driver_name: String(row.driver_name ?? ''),
          driver_phone: String(row.driver_phone ?? ''),
          status: String(row.status ?? 'pending'),
          created_at: String(row.created_at ?? ''),
        }
      })

      setRows(mapped)
      const init: Record<string, RowEdit> = {}
      mapped.forEach(row => {
        init[row.id] = {
          vehicle_type: row.vehicle_type,
          vehicle_size: row.vehicle_size || '6 ล้อ',
          grade: row.grade,
          status: row.status,
          license_plate: row.license_plate,
          vehicle_year: row.vehicle_year ? String(row.vehicle_year) : '',
          driver_name: row.driver_name ?? '',
          driver_phone: row.driver_phone ?? '',
        }
      })
      setEdits(init)
    } catch (e) {
      console.error('[AdminServiceProviders] load failed', e)
      flash(false, e instanceof Error ? e.message : 'โหลดข้อมูลรถร่วมไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => rows.filter(row => {
    const q = search.trim()
    const matchSearch = !q ||
      row.full_name.includes(q) ||
      row.phone.includes(q) ||
      row.license_plate.includes(q) ||
      String(row.driver_name ?? '').includes(q) ||
      String(row.driver_phone ?? '').includes(q)
    const matchType = filterType === 'all' || row.vehicle_type === filterType
    const matchSize = filterSize === 'all' || row.vehicle_size === filterSize
    const matchGrade = filterGrade === 'all' || row.grade === filterGrade
    const matchStatus = filterStatus === 'all' || row.status === filterStatus
    return matchSearch && matchType && matchSize && matchGrade && matchStatus
  }), [rows, search, filterType, filterSize, filterGrade, filterStatus])

  const total = rows.length
  const pending = rows.filter(r => r.status === 'pending').length
  const approved = rows.filter(r => r.status === 'approved').length
  const suspended = rows.filter(r => r.status === 'suspended').length

  const setEdit = (id: string, patch: Partial<RowEdit>) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        vehicle_type: prev[id]?.vehicle_type ?? 'truck',
        vehicle_size: prev[id]?.vehicle_size ?? '6 ล้อ',
        grade: prev[id]?.grade ?? 'C',
        status: prev[id]?.status ?? 'pending',
        license_plate: prev[id]?.license_plate ?? '',
        vehicle_year: prev[id]?.vehicle_year ?? '',
        driver_name: prev[id]?.driver_name ?? '',
        driver_phone: prev[id]?.driver_phone ?? '',
        ...patch,
      },
    }))
  }

  const save = async (row: ServiceRow) => {
    const edit = edits[row.id]
    if (!edit || !supabase) return
    setActing(row.id)
    try {
      const { error: serviceErr } = await supabase
        .from('service_providers')
        .update({
          vehicle_type: edit.vehicle_type,
          grade: edit.grade,
          license_plate: edit.license_plate.trim(),
          vehicle_year: edit.vehicle_year ? Number(edit.vehicle_year) : null,
          driver_name: edit.driver_name.trim() || null,
          driver_phone: edit.driver_phone.trim() || null,
          status: edit.status,
        })
        .eq('id', row.id)
      if (serviceErr) throw new Error(serviceErr.message)

      const { data: profile, error: profileFindErr } = await supabase
        .from('profiles')
        .select('id_card_ocr_json')
        .eq('id', row.profile_id)
        .maybeSingle()
      if (profileFindErr) throw new Error(profileFindErr.message)
      const currentJson = (profile?.id_card_ocr_json ?? {}) as Record<string, unknown>

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          base_type: 'service',
          role: 'service',
          grade: edit.grade,
          id_card_ocr_json: {
            ...currentJson,
            vehicle_type: edit.vehicle_type,
            vehicle_size: edit.vehicle_size,
            license_plate: edit.license_plate.trim(),
          },
        })
        .eq('id', row.profile_id)
      if (profileErr) throw new Error(profileErr.message)

      flash(true, 'บันทึกข้อมูลรถร่วมแล้ว')
      await load()
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setActing(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24 gap-3 text-gray-500"><RefreshCw className="w-6 h-6 animate-spin"/>กำลังโหลด...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Truck className="w-5 h-5" />รถร่วม / ผู้ให้บริการ</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock</span></>}
            <span className="text-gray-400">• เฉพาะ service • {total} รายการ</span>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm"><RefreshCw className="w-4 h-4"/>รีโหลด</button>
      </div>

      {toast && <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${toast.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'}`}>{toast.ok ? '✅' : '❌'} {toast.msg}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {l:'ทั้งหมด', n:total, bg:'bg-gray-50 border-gray-200 text-gray-700'},
          {l:'รออนุมัติ', n:pending, bg:'bg-amber-50 border-amber-200 text-amber-700'},
          {l:'อนุมัติแล้ว', n:approved, bg:'bg-emerald-50 border-emerald-200 text-emerald-700'},
          {l:'ระงับ', n:suspended, bg:'bg-gray-50 border-gray-200 text-gray-700'},
        ].map(({l,n,bg}) => <div key={l} className={`border-2 rounded-2xl p-4 text-center ${bg}`}><div className="text-3xl font-bold">{n}</div><div className="text-sm font-semibold mt-0.5">{l}</div></div>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา ทะเบียน/ชื่อ/เบอร์" className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <select value={filterType} onChange={e=>setFilterType(e.target.value as 'all' | VehicleType)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกประเภทรถ</option>
          {vehicleTypes.map(v => <option key={v} value={v}>{VEHICLE_LABEL[v]}</option>)}
        </select>
        <select value={filterSize} onChange={e=>setFilterSize(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกขนาดรถ</option>
          {vehicleSizes.map(v => <option key={v}>{v}</option>)}
        </select>
        <select value={filterGrade} onChange={e=>setFilterGrade(e.target.value as 'all' | Grade)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกเกรด</option>
          {grades.map(g => <option key={g}>{g}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกสถานะ</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide font-semibold">
                <th className="text-left px-4 py-3">เจ้าของ / รถ</th>
                <th className="text-left px-3 py-3">คนขับ</th>
                <th className="text-center px-3 py-3">ประเภท</th>
                <th className="text-center px-3 py-3">ขนาด</th>
                <th className="text-center px-3 py-3">เกรด</th>
                <th className="text-center px-3 py-3">สถานะ</th>
                <th className="text-center px-4 py-3">บันทึก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(row => {
                const edit = edits[row.id] ?? {
                  vehicle_type: row.vehicle_type,
                  vehicle_size: row.vehicle_size,
                  grade: row.grade,
                  status: row.status,
                  license_plate: row.license_plate,
                  vehicle_year: row.vehicle_year ? String(row.vehicle_year) : '',
                  driver_name: row.driver_name ?? '',
                  driver_phone: row.driver_phone ?? '',
                }
                const isA = acting === row.id
                const dot = STATUS_DOT[edit.status] ?? 'bg-gray-300'
                return (
                  <tr key={row.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 min-w-56">
                      <div className="font-semibold text-gray-900">{row.full_name}</div>
                      <div className="text-xs text-gray-500">{row.phone}</div>
                      <input value={edit.license_plate} onChange={e=>setEdit(row.id,{license_plate:e.target.value})} placeholder="ทะเบียน" className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1 text-xs" />
                    </td>
                    <td className="px-3 py-3 min-w-52">
                      <input value={edit.driver_name} onChange={e=>setEdit(row.id,{driver_name:e.target.value})} placeholder="ชื่อคนขับ" className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs mb-1" />
                      <input value={edit.driver_phone} onChange={e=>setEdit(row.id,{driver_phone:e.target.value})} placeholder="เบอร์คนขับ" className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs" />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <select value={edit.vehicle_type} onChange={e=>setEdit(row.id,{vehicle_type:e.target.value as VehicleType})} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                        {vehicleTypes.map(v => <option key={v} value={v}>{VEHICLE_LABEL[v]}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <select value={edit.vehicle_size} onChange={e=>setEdit(row.id,{vehicle_size:e.target.value})} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                        {vehicleSizes.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <select value={edit.grade} onChange={e=>setEdit(row.id,{grade:e.target.value as Grade})} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                        {grades.map(g => <option key={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                        <select value={edit.status} onChange={e=>setEdit(row.id,{status:e.target.value})} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                          {statuses.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button disabled={isA} onClick={()=>save(row)} className={`px-3 h-8 rounded-lg text-xs font-bold ${isA ? 'bg-blue-100 text-blue-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>{isA ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">ยังไม่มีข้อมูลรถร่วม</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-500">แสดง {filtered.length} จาก {total} รายการ</div>
      </div>
    </div>
  )
}
