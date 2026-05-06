import { Fragment, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, UserCog, Wifi, WifiOff, Settings2 } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { DEPT_PERMISSIONS, type Permission } from '../../lib/permissions'
import type { Capability } from '../../lib/roles'
import AdminQuickCreate from './AdminQuickCreate'

type Department = 'agri' | 'sales' | 'stock' | 'accounting' | 'inspection' | 'service' | 'it'

const departments: Department[] = ['agri', 'sales', 'stock', 'accounting', 'inspection', 'service', 'it']
const levels = ['staff', 'supervisor', 'manager', 'admin']
const CAPABILITY_OPTIONS: { value: Capability; label: string; short: string }[] = [
  { value: 'can_inspect', label: 'ผู้ตรวจทั่วไป', short: 'ตรวจ' },
  { value: 'can_inspect_no_burn', label: 'ตรวจไม่เผา', short: 'ไม่เผา' },
  { value: 'manage_all', label: 'Admin เต็มระบบ', short: 'Admin' },
]

const DEPT_LABEL: Record<Department, string> = {
  agri: 'เกษตร',
  sales: 'ขาย',
  stock: 'สต็อก',
  accounting: 'บัญชี',
  inspection: 'ตรวจสอบ',
  service: 'รถร่วม/บริการ',
  it: 'IT',
}

const DEPT_BADGE: Record<Department, string> = {
  agri: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sales: 'bg-sky-50 text-sky-700 border-sky-200',
  stock: 'bg-amber-50 text-amber-700 border-amber-200',
  accounting: 'bg-violet-50 text-violet-700 border-violet-200',
  inspection: 'bg-orange-50 text-orange-700 border-orange-200',
  service: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  it: 'bg-blue-50 text-blue-700 border-blue-200',
}

const LEVEL_BADGE: Record<string, string> = {
  staff: 'bg-gray-50 text-gray-700 border-gray-200',
  supervisor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  manager: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-red-50 text-red-700 border-red-200',
}

const PERMISSION_LABEL: Record<Permission, string> = {
  'member.view': 'ดูสมาชิก',
  'member.approve': 'อนุมัติสมาชิก',
  'member.import': 'Import สมาชิก',
  'member.set_role': 'กำหนดสิทธิ์สมาชิก',
  'team.view': 'ดูทีมงาน',
  'team.edit': 'แก้ไขทีมงาน',
  'seed.view': 'ดูเมล็ดพันธุ์',
  'seed.edit': 'แก้ไขเมล็ดพันธุ์',
  'seed.stock': 'สต็อกเมล็ดพันธุ์',
  'seed.sales': 'จอง/ขายเมล็ดพันธุ์',
  'seed.debt': 'ลูกหนี้เมล็ดพันธุ์',
  'price.view': 'ดูราคา',
  'price.edit': 'แก้ไขราคา',
  'inspection.view': 'ดูงานตรวจ',
  'inspection.edit': 'แก้ไขงานตรวจ',
  'service.view': 'ดูรถร่วม',
  'service.edit': 'แก้ไขรถร่วม',
  'field.view': 'ดูงานภาคสนาม',
  'field.seed_booking': 'จองเมล็ดภาคสนาม',
  'field.farm_inspection': 'ตรวจแปลงภาคสนาม',
  'field.no_burn': 'กิจกรรมไม่เผา',
  'field.member_register': 'สมัครสมาชิกภาคสนาม',
  'field.machine_check': 'ตรวจเครื่องจักร',
  'field.transport_check': 'ตรวจขนส่ง',
  'report.view': 'ดูรายงาน',
  'report.export': 'Export รายงาน',
  'system.roles': 'จัดการ role',
  'system.all': 'ทุกสิทธิ์',
}

const PERMISSION_GROUPS: { title: string; items: Permission[] }[] = [
  { title: 'สมาชิก', items: ['member.view', 'member.approve', 'member.import', 'member.set_role'] },
  { title: 'ทีมงาน', items: ['team.view', 'team.edit'] },
  { title: 'เมล็ดพันธุ์', items: ['seed.view', 'seed.edit', 'seed.stock', 'seed.sales', 'seed.debt'] },
  { title: 'ราคา/รายงาน', items: ['price.view', 'price.edit', 'report.view', 'report.export'] },
  { title: 'ตรวจแปลง', items: ['inspection.view', 'inspection.edit'] },
  { title: 'รถร่วม', items: ['service.view', 'service.edit'] },
  { title: 'ภาคสนาม', items: ['field.view', 'field.seed_booking', 'field.farm_inspection', 'field.no_burn', 'field.member_register', 'field.machine_check', 'field.transport_check'] },
  { title: 'ระบบ', items: ['system.roles', 'system.all'] },
]

type StaffRow = {
  id: string
  full_name: string
  phone: string
  role?: string
  base_type?: string
  department?: Department
  level?: string
  can_fieldwork?: boolean
  permissions?: Permission[]
  capabilities?: Capability[]
  created_at?: string
}

type RowEdit = {
  department: Department
  level: string
  can_fieldwork: boolean
  permissions: Permission[]
  capabilities: Capability[]
}

function asDepartment(value: unknown): Department {
  return departments.includes(value as Department) ? value as Department : 'agri'
}

function normalizePermissions(value: unknown, department: Department): Permission[] {
  if (Array.isArray(value)) return value.filter((v): v is Permission => typeof v === 'string' && v in PERMISSION_LABEL)
  return DEPT_PERMISSIONS[department] ?? []
}

function normalizeCapabilities(value: unknown): Capability[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is Capability =>
    v === 'is_leader' || v === 'can_inspect' || v === 'can_inspect_no_burn' || v === 'manage_all'
  )
}

function readProfile(row: Record<string, unknown>) {
  const profile = row.profiles as Record<string, unknown> | null | undefined
  return profile ?? row
}

function hasPerm(list: Permission[], perm: Permission) {
  return list.includes('system.all') || list.includes(perm)
}

function toggle<T extends string>(list: T[], item: T) {
  return list.includes(item) ? list.filter(v => v !== item) : [...list, item]
}

function sameList(a: string[] = [], b: string[] = []) {
  const aa = [...a].sort().join('|')
  const bb = [...b].sort().join('|')
  return aa === bb
}

function isDirty(row: StaffRow, edit?: RowEdit) {
  if (!edit) return false
  const basePerms = row.permissions ?? []
  const baseCaps = row.capabilities ?? []
  return (
    edit.department !== (row.department ?? 'agri') ||
    edit.level !== (row.level ?? 'staff') ||
    edit.can_fieldwork !== Boolean(row.can_fieldwork) ||
    !sameList(edit.permissions, basePerms) ||
    !sameList(edit.capabilities, baseCaps)
  )
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>
}

export default function AdminStaff() {
  const [rows, setRows] = useState<StaffRow[]>([])
  const [edits, setEdits] = useState<Record<string, RowEdit>>({})
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState<'all' | Department>('all')
  const [filterFieldwork, setFilterFieldwork] = useState<'all' | 'yes' | 'no'>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
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
        .select('id, profile_id, department, level, can_fieldwork, permissions, created_at, profiles(id, full_name, phone, role, base_type, capabilities)')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      const mapped: StaffRow[] = (data ?? []).map((row: Record<string, unknown>) => {
        const profile = readProfile(row)
        const department = asDepartment(row.department)
        return {
          id: String(profile.id ?? row.profile_id ?? row.id),
          full_name: String(profile.full_name ?? '-'),
          phone: String(profile.phone ?? '-'),
          role: String(profile.role ?? 'staff'),
          base_type: String(profile.base_type ?? 'staff'),
          department,
          level: String(row.level ?? 'staff'),
          can_fieldwork: Boolean(row.can_fieldwork),
          permissions: normalizePermissions(row.permissions, department),
          capabilities: normalizeCapabilities(profile.capabilities),
          created_at: String(row.created_at ?? ''),
        }
      })

      setRows(mapped)
      const init: Record<string, RowEdit> = {}
      mapped.forEach(row => {
        const department = row.department ?? 'agri'
        init[row.id] = {
          department,
          level: row.level ?? 'staff',
          can_fieldwork: Boolean(row.can_fieldwork),
          permissions: row.permissions?.length ? row.permissions : (DEPT_PERMISSIONS[department] ?? []),
          capabilities: row.capabilities ?? [],
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
      String(row.department ?? '').includes(q) ||
      DEPT_LABEL[row.department ?? 'agri'].includes(q)
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
        permissions: prev[id]?.permissions ?? [],
        capabilities: prev[id]?.capabilities ?? [],
        ...patch,
      },
    }))
  }

  const openEdit = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const togglePermission = (id: string, perm: Permission, checked: boolean) => {
    const current = edits[id]?.permissions ?? []
    if (perm === 'system.all' && checked) {
      setEdit(id, { permissions: ['system.all'] })
      return
    }
    const withoutAll = current.filter(p => p !== 'system.all')
    const next = checked
      ? Array.from(new Set([...withoutAll, perm]))
      : withoutAll.filter(p => p !== perm)
    setEdit(id, { permissions: next })
  }

  const toggleCapability = (id: string, cap: Capability) => {
    const current = edits[id]?.capabilities ?? []
    setEdit(id, { capabilities: toggle(current, cap) as Capability[] })
  }

  const applyDeptDefault = (id: string) => {
    const dept = edits[id]?.department ?? 'agri'
    setEdit(id, { permissions: DEPT_PERMISSIONS[dept] ?? [] })
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
        permissions: edit.permissions,
        updated_at: new Date().toISOString(),
      }

      const result = existing
        ? await supabase.from('staff_profiles').update(payload).eq('profile_id', id)
        : await supabase.from('staff_profiles').insert(payload)

      if (result.error) throw new Error(result.error.message)

      const role = edit.capabilities.includes('manage_all')
        ? 'admin'
        : edit.can_fieldwork
          ? 'field'
          : edit.capabilities.includes('can_inspect') || edit.capabilities.includes('can_inspect_no_burn')
            ? 'inspector'
            : 'member'

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          base_type: 'staff',
          role,
          capabilities: edit.capabilities,
          department: edit.department,
          permissions: edit.permissions,
          updated_at: new Date().toISOString(),
        })
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
        <div className="flex flex-wrap gap-2">
          <AdminQuickCreate mode="staff" onDone={load} />
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm"><RefreshCw className="w-4 h-4"/>รีโหลด</button>
        </div>
      </div>

      {toast && <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${toast.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'}`}>{toast.ok ? '✅' : '❌'} {toast.msg}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
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
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide font-semibold">
                <th className="text-left px-5 py-3">ชื่อ</th>
                <th className="text-left px-4 py-3">โทร</th>
                <th className="text-center px-4 py-3">ฝ่าย</th>
                <th className="text-center px-4 py-3">ระดับ</th>
                <th className="text-left px-4 py-3">Capability</th>
                <th className="text-center px-4 py-3">สิทธิ์</th>
                <th className="text-center px-5 py-3">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(row => {
                const edit = edits[row.id] ?? {
                  department: row.department ?? 'agri',
                  level: row.level ?? 'staff',
                  can_fieldwork: Boolean(row.can_fieldwork),
                  permissions: row.permissions ?? [],
                  capabilities: row.capabilities ?? [],
                }
                const dirty = isDirty(row, edit)
                const isA = acting === row.id
                return (
                  <Fragment key={row.id}>
                    <tr className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-5 py-4 font-semibold text-gray-900 whitespace-nowrap">{row.full_name}</td>
                      <td className="px-4 py-4 font-mono text-xs text-blue-600 whitespace-nowrap">{row.phone}</td>
                      <td className="px-4 py-4 text-center"><Pill className={DEPT_BADGE[edit.department]}>{DEPT_LABEL[edit.department]}</Pill></td>
                      <td className="px-4 py-4 text-center"><Pill className={LEVEL_BADGE[edit.level] ?? LEVEL_BADGE.staff}>{edit.level}</Pill></td>
                      <td className="px-4 py-4 min-w-56">
                        <div className="flex flex-wrap gap-1.5">
                          {edit.can_fieldwork && <Pill className="bg-emerald-50 text-emerald-700 border-emerald-200">ภาคสนาม</Pill>}
                          {CAPABILITY_OPTIONS.filter(opt => edit.capabilities.includes(opt.value)).map(opt => (
                            <Pill key={opt.value} className="bg-blue-50 text-blue-700 border-blue-200">{opt.short}</Pill>
                          ))}
                          {!edit.can_fieldwork && edit.capabilities.length === 0 && <span className="text-xs text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-3 h-8 inline-flex items-center rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
                          {edit.permissions.includes('system.all') ? 'ทุกสิทธิ์' : `${edit.permissions.length} สิทธิ์`}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button type="button" onClick={() => openEdit(row.id)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700">
                          <Settings2 className="w-3.5 h-3.5" /> แก้ไข
                        </button>
                      </td>
                    </tr>
                    {expanded[row.id] && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div>
                                <div className="font-bold text-gray-900">แก้ไขข้อมูลพนักงาน</div>
                                <div className="text-xs text-gray-500">{row.full_name} • {row.phone}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                {dirty && <span className="text-xs font-semibold text-amber-600">มีการเปลี่ยนแปลง</span>}
                                <button type="button" onClick={() => setExpanded(prev => ({ ...prev, [row.id]: false }))} className="px-3 h-8 rounded-lg bg-white border text-xs font-semibold text-gray-600 hover:bg-gray-50">ปิด</button>
                                <button disabled={!dirty || isA} onClick={()=>save(row.id)} className={`px-3 h-8 rounded-lg text-xs font-bold ${!dirty ? 'bg-gray-100 text-gray-400 cursor-default' : isA ? 'bg-blue-100 text-blue-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>{isA ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <label className="text-xs font-semibold text-gray-600">
                                ฝ่าย
                                <select value={edit.department} onChange={e=>setEdit(row.id,{department:e.target.value as Department, permissions: DEPT_PERMISSIONS[e.target.value as Department] ?? []})} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
                                  {departments.map(d => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
                                </select>
                              </label>
                              <label className="text-xs font-semibold text-gray-600">
                                ระดับ
                                <select value={edit.level} onChange={e=>setEdit(row.id,{level:e.target.value})} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
                                  {levels.map(l => <option key={l}>{l}</option>)}
                                </select>
                              </label>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                              <div className="rounded-xl border p-3">
                                <div className="font-bold text-xs text-gray-700 mb-3">ความสามารถ</div>
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                    <input type="checkbox" checked={edit.can_fieldwork} onChange={e=>setEdit(row.id,{can_fieldwork:e.currentTarget.checked})} /> ภาคสนาม
                                  </label>
                                  {CAPABILITY_OPTIONS.map(opt => (
                                    <label key={opt.value} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                      <input type="checkbox" checked={edit.capabilities.includes(opt.value)} onChange={() => toggleCapability(row.id, opt.value)} /> {opt.label}
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <button type="button" onClick={() => applyDeptDefault(row.id)} className="px-3 py-1.5 rounded-lg bg-white border text-xs font-semibold text-gray-700 hover:bg-gray-50">ใช้ค่าเริ่มต้นตามฝ่าย</button>
                                  <button type="button" onClick={() => setEdit(row.id, { permissions: [] })} className="px-3 py-1.5 rounded-lg bg-white border text-xs font-semibold text-red-600 hover:bg-red-50">ล้างสิทธิ์</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                  {PERMISSION_GROUPS.map(group => (
                                    <div key={group.title} className="rounded-xl border p-3">
                                      <div className="font-bold text-xs text-gray-700 mb-2">{group.title}</div>
                                      <div className="space-y-1.5">
                                        {group.items.map(perm => (
                                          <label key={perm} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                            <input type="checkbox" checked={hasPerm(edit.permissions, perm)} onChange={e => togglePermission(row.id, perm, e.currentTarget.checked)} />
                                            <span>{PERMISSION_LABEL[perm]}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <div className="text-5xl mb-3">👥</div>
                    <div className="font-semibold text-gray-600">{rows.length === 0 ? 'ยังไม่มีพนักงาน' : 'ไม่พบพนักงานตามเงื่อนไขค้นหา'}</div>
                    <div className="text-xs mt-1">ลองเปลี่ยนคำค้นหา หรือปรับตัวกรองใหม่</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
