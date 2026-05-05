import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, UserCog, Wifi, WifiOff } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'

type Department = 'agri' | 'sales' | 'stock' | 'accounting' | 'inspection' | 'service' | 'it'

const departments: Department[] = ['agri', 'sales', 'stock', 'accounting', 'inspection', 'service', 'it']
const levels = ['staff', 'supervisor', 'manager', 'admin']

const DEPT_LABEL: Record<Department, string> = {
  agri: 'เกษตร',
  sales: 'ขาย',
  stock: 'สต็อก',
  accounting: 'บัญชี',
  inspection: 'ตรวจสอบ',
  service: 'รถร่วม/บริการ',
  it: 'IT',
}

type StaffRow = {
  id: string
  full_name: string
  phone: string
  role?: string
  base_type?: string
  department?: Department
  level?: string
  can_fieldwork?: boolean
  permissions?: Record<string, unknown>
  created_at?: string
}

type RowEdit = {
  department: Department
  level: string
  can_fieldwork: boolean
}

function asDepartment(value: unknown): Department {
  return departments.includes(value as Department) ? value as Department : 'agri'
}

function readProfile(row: Record<string, unknown>) {
  const profile = row.profiles as Record<string, unknown> | null | undefined
  return profile ?? row
}

export default function AdminStaff() {
  const [rows, setRows] = useState<StaffRow[]>([])
  const [edits, setEdits] = useState<Record<string, RowEdit>>({})
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState<'all' | Department>('all')
  const [filterFieldwork, setFilterFieldwork] = useState<'all' | 'yes' | 'no'>('all')
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
        .from('staff_profiles')
        .select('id, profile_id, department, level, can_fieldwork, permissions, created_at, profiles(id, full_name, phone, role, base_type)')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      const mapped: StaffRow[] = (data ?? []).map((row: Record<string, unknown>) => {
        const profile = readProfile(row)
        return {
          id: String(profile.id ?? row.profile_id ?? row.id),
          full_name: String(profile.full_name ?? '-'),
          phone: String(profile.phone ?? '-'),
          role: String(profile.role ?? 'staff'),
          base_type: String(profile.base_type ?? 'staff'),
          department: asDepartment(row.department),
          level: String(row.level ?? 'staff'),
          can_fieldwork: Boolean(row.can_fieldwork),
          permissions: row.permissions as Record<string, unknown> | undefined,
          created_at: String(row.created_at ?? ''),
        }
      })

      setRows(mapped)
      const init: Record<string, RowEdit> = {}
      mapped.forEach(row => {
        init[row.id] = {
          department: row.department ?? 'agri',
          level: row.level ?? 'staff',
          can_fieldwork: Boolean(row.can_fieldwork),
        }
      })
      setEdits(init)
    } catch (e) {
      console.error('[AdminStaff] load failed', e)
      flash(false, e instanceof Error ? e.message : 'โหลดข้อมูลพนักงานไม่สำเร็จ')
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
      String(row.department ?? '').includes(q)
    const matchDept = filterDept === 'all' || row.department === filterDept
    const matchFieldwork = filterFieldwork === 'all' ||
      (filterFieldwork === 'yes' && row.can_fieldwork) ||
      (filterFieldwork === 'no' && !row.can_fieldwork)
    return matchSearch && matchDept && matchFieldwork
  }), [rows, search, filterDept, filterFieldwork])

  const setEdit = (id: string, patch: Partial<RowEdit>) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        department: prev[id]?.department ?? 'agri',
        level: prev[id]?.level ?? 'staff',
        can_fieldwork: prev[id]?.can_fieldwork ?? false,
        ...patch,
      },
    }))
  }

  const save = async (id: string) => {
    const edit = edits[id]
    if (!edit || !supabase) return
    setActing(id)
    try {
      const { data: existing, error: findErr } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('profile_id', id)
        .maybeSingle()
      if (findErr) throw new Error(findErr.message)

      const payload = {
        profile_id: id,
        department: edit.department,
        level: edit.level,
        can_fieldwork: edit.can_fieldwork,
      }

      const result = existing
        ? await supabase.from('staff_profiles').update(payload).eq('profile_id', id)
        : await supabase.from('staff_profiles').insert(payload)

      if (result.error) throw new Error(result.error.message)

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ base_type: 'staff', role: 'field' })
        .eq('id', id)
      if (profileErr) throw new Error(profileErr.message)

      flash(true, 'บันทึกข้อมูลพนักงานแล้ว')
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
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><UserCog className="w-5 h-5" />พนักงาน</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock</span></>}
            <span className="text-gray-400">• เฉพาะ staff • {rows.length} รายการ</span>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm"><RefreshCw className="w-4 h-4"/>รีโหลด</button>
      </div>

      {toast && <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${toast.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'}`}>{toast.ok ? '✅' : '❌'} {toast.msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา ชื่อ/เบอร์/ฝ่าย" className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <select value={filterDept} onChange={e=>setFilterDept(e.target.value as 'all' | Department)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกฝ่าย</option>
          {departments.map(d => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
        </select>
        <select value={filterFieldwork} onChange={e=>setFilterFieldwork(e.target.value as 'all' | 'yes' | 'no')} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกสิทธิ์ภาคสนาม</option>
          <option value="yes">เปิดภาคสนาม</option>
          <option value="no">ไม่เปิดภาคสนาม</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide font-semibold">
                <th className="text-left px-4 py-3">ชื่อ</th>
                <th className="text-left px-3 py-3">โทร</th>
                <th className="text-center px-3 py-3">ฝ่าย</th>
                <th className="text-center px-3 py-3">ระดับ</th>
                <th className="text-center px-3 py-3">ภาคสนาม</th>
                <th className="text-center px-4 py-3">บันทึก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(row => {
                const edit = edits[row.id] ?? { department: row.department ?? 'agri', level: row.level ?? 'staff', can_fieldwork: Boolean(row.can_fieldwork) }
                const isA = acting === row.id
                return (
                  <tr key={row.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{row.full_name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-blue-600 whitespace-nowrap">{row.phone}</td>
                    <td className="px-3 py-3 text-center">
                      <select value={edit.department} onChange={e=>setEdit(row.id,{department:e.target.value as Department})} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                        {departments.map(d => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <select value={edit.level} onChange={e=>setEdit(row.id,{level:e.target.value})} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                        {levels.map(l => <option key={l}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <label className="inline-flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={edit.can_fieldwork} onChange={e=>setEdit(row.id,{can_fieldwork:e.currentTarget.checked})} /> เปิด
                      </label>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button disabled={isA} onClick={()=>save(row.id)} className={`px-3 h-8 rounded-lg text-xs font-bold ${isA ? 'bg-blue-100 text-blue-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>{isA ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">ยังไม่มีพนักงาน</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
