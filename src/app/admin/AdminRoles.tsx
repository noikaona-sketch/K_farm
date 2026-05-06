import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Check, AlertCircle, Wifi, WifiOff, Search } from 'lucide-react'
import { isSupabaseReady } from '../../lib/supabase'
import { DEPT_PERMISSIONS, type Department, type Permission } from '../../lib/permissions'
import type { BaseType, Capability, Grade } from '../../lib/roles'
import {
  fetchPermissionMembers,
  formatMemberAddress,
  updatePermissionMember,
  type AdminPermissionMember,
} from '../../lib/adminPermissions'

const DEPARTMENTS: { value: Department; label: string; icon: string }[] = [
  { value: 'agri', label: 'ฝ่ายเกษตร', icon: '🌱' },
  { value: 'sales', label: 'ฝ่ายขาย', icon: '💰' },
  { value: 'stock', label: 'ฝ่ายสต็อก', icon: '📦' },
  { value: 'accounting', label: 'ฝ่ายบัญชี', icon: '🧾' },
  { value: 'inspection', label: 'ฝ่ายตรวจแปลง', icon: '🔍' },
  { value: 'service', label: 'ฝ่ายรถ/บริการ', icon: '🚜' },
  { value: 'it', label: 'ฝ่าย IT', icon: '🔐' },
]

const ALL_PERMS: { value: Permission; label: string; group: string }[] = [
  { value: 'member.view', label: 'ดูสมาชิก', group: 'สมาชิก' },
  { value: 'member.approve', label: 'อนุมัติสมาชิก', group: 'สมาชิก' },
  { value: 'member.import', label: 'Import Excel', group: 'สมาชิก' },
  { value: 'member.set_role', label: 'กำหนด Role', group: 'สมาชิก' },
  { value: 'seed.view', label: 'ดูเมล็ดพันธุ์', group: 'เมล็ดพันธุ์' },
  { value: 'seed.edit', label: 'แก้ไขเมล็ดพันธุ์', group: 'เมล็ดพันธุ์' },
  { value: 'seed.stock', label: 'รับ Stock', group: 'เมล็ดพันธุ์' },
  { value: 'seed.sales', label: 'ขายเมล็ด', group: 'เมล็ดพันธุ์' },
  { value: 'price.view', label: 'ดูราคา', group: 'ราคา' },
  { value: 'price.edit', label: 'แก้ไขราคา', group: 'ราคา' },
  { value: 'inspection.view', label: 'ดูการตรวจ', group: 'ตรวจแปลง' },
  { value: 'inspection.edit', label: 'บันทึก/อนุมัติการตรวจ', group: 'ตรวจแปลง' },
  { value: 'service.view', label: 'ดูผู้ให้บริการ', group: 'บริการ' },
  { value: 'service.edit', label: 'แก้ไขผู้ให้บริการ', group: 'บริการ' },
  { value: 'field.view', label: 'ดูงานภาคสนาม', group: 'ภาคสนาม' },
  { value: 'field.no_burn', label: 'งานไม่เผา', group: 'ภาคสนาม' },
  { value: 'report.view', label: 'ดูรายงาน', group: 'รายงาน' },
  { value: 'report.export', label: 'Export รายงาน', group: 'รายงาน' },
  { value: 'system.roles', label: 'จัดการสิทธิ์', group: 'ระบบ' },
  { value: 'system.all', label: 'ทุกสิทธิ์ (Super)', group: 'ระบบ' },
]

const ROLES = ['member', 'farmer', 'leader', 'inspector', 'admin', 'vehicle', 'service']
const BASE_TYPES: BaseType[] = ['farmer', 'service', 'staff']
const GRADES: Grade[] = ['C', 'B', 'A']
const CAPABILITIES: { value: Capability; label: string }[] = [
  { value: 'is_leader', label: 'หัวหน้ากลุ่ม' },
  { value: 'can_inspect', label: 'ผู้ตรวจทั่วไป' },
  { value: 'can_inspect_no_burn', label: 'ตรวจไม่เผา' },
  { value: 'manage_all', label: 'Admin เต็มระบบ' },
]

type RowEdit = {
  role: string
  baseType: BaseType
  grade: Grade
  department: Department | ''
  permissions: Permission[]
  capabilities: Capability[]
}

function asBaseType(value: unknown): BaseType {
  return value === 'service' || value === 'staff' ? value : 'farmer'
}

function asGrade(value: unknown): Grade {
  return value === 'A' || value === 'B' ? value : 'C'
}

function makeEdit(row: AdminPermissionMember): RowEdit {
  const baseType = asBaseType(row.base_type)
  return {
    role: String(row.role ?? (baseType === 'service' ? 'service' : baseType === 'staff' ? 'field' : 'member')),
    baseType,
    grade: asGrade(row.grade),
    department: (row.department as Department) || '',
    permissions: row.permissions ?? [],
    capabilities: row.capabilities ?? [],
  }
}

function toggle<T extends string>(list: T[], item: T) {
  return list.includes(item) ? list.filter(v => v !== item) : [...list, item]
}

function uniqueOptions(rows: AdminPermissionMember[], key: keyof AdminPermissionMember) {
  return Array.from(new Set(rows.map(r => String(r[key] ?? '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'))
}

export default function AdminRoles() {
  const [members, setMembers] = useState<AdminPermissionMember[]>([])
  const [edits, setEdits] = useState<Record<string, RowEdit>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBaseType, setFilterBaseType] = useState<'all' | BaseType>('all')
  const [filterProvince, setFilterProvince] = useState('all')
  const [acting, setActing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPermissionMembers()
      setMembers(data)
      const init: Record<string, RowEdit> = {}
      data.forEach(row => { init[row.id] = makeEdit(row) })
      setEdits(init)
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const setEdit = (id: string, patch: Partial<RowEdit>) => {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] ?? makeEdit(members.find(m => m.id === id) ?? { id, full_name: '-' })), ...patch } }))
  }

  const setDept = (id: string, dept: Department) => {
    setEdit(id, { department: dept, permissions: [...DEPT_PERMISSIONS[dept]] })
  }

  const save = async (row: AdminPermissionMember) => {
    const edit = edits[row.id]
    if (!edit) return
    setActing(row.id)
    try {
      await updatePermissionMember({
        profileId: row.id,
        role: edit.role,
        baseType: edit.baseType,
        grade: edit.grade,
        capabilities: edit.capabilities,
        department: edit.department || null,
        permissions: edit.permissions,
      })
      flash(true, `บันทึกสิทธิ์ ${row.full_name} สำเร็จ`)
      await load()
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setActing(null)
    }
  }

  const rows = members.filter(row => {
    const q = search.trim()
    const address = formatMemberAddress(row)
    const matchSearch = !q ||
      row.full_name.includes(q) ||
      String(row.id_card ?? '').includes(q) ||
      String(row.phone ?? '').includes(q) ||
      address.includes(q)
    const matchBaseType = filterBaseType === 'all' || row.base_type === filterBaseType
    const matchProvince = filterProvince === 'all' || row.province === filterProvince
    return matchSearch && matchBaseType && matchProvince
  })

  const provinces = uniqueOptions(members, 'province')
  const groups = [...new Set(ALL_PERMS.map(p => p.group))]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">กำหนดสิทธิ์สมาชิก / รถ / พนักงาน</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">Supabase</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-600">Mock</span></>}
            <span className="text-gray-400">• แสดงทุก profile • {members.length} รายการ</span>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm">
          <RefreshCw className="w-4 h-4" />รีโหลด
        </button>
      </div>

      {toast && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border ${toast.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-auto opacity-60 text-lg leading-none">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา ชื่อ/บัตร/โทร/ที่อยู่" className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <select value={filterBaseType} onChange={e => setFilterBaseType(e.target.value as 'all' | BaseType)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกประเภท</option>
          <option value="farmer">เกษตรกร</option>
          <option value="service">รถ/บริการ</option>
          <option value="staff">พนักงาน</option>
        </select>
        <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกจังหวัด</option>
          {provinces.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">ไม่พบรายการ</div>
      ) : (
        <div className="space-y-4">
          {rows.map(row => {
            const edit = edits[row.id] ?? makeEdit(row)
            const isA = acting === row.id
            const dept = edit.department
            return (
              <div key={row.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center flex-shrink-0">{row.full_name.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900">{row.full_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{row.phone || '-'} • {row.id_card || '-'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">ที่อยู่: {formatMemberAddress(row)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">role: {row.role || '-'} • base_type: {row.base_type || '-'} • status: {row.status || '-'}</div>
                  </div>
                  {dept && <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">{DEPARTMENTS.find(d => d.value === dept)?.label}</span>}
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Role</label>
                      <select value={edit.role} onChange={e => setEdit(row.id, { role: e.target.value })} className="w-full border rounded-xl p-2 text-sm bg-white">
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Base type</label>
                      <select value={edit.baseType} onChange={e => setEdit(row.id, { baseType: e.target.value as BaseType })} className="w-full border rounded-xl p-2 text-sm bg-white">
                        {BASE_TYPES.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Grade</label>
                      <select value={edit.grade} onChange={e => setEdit(row.id, { grade: e.target.value as Grade })} className="w-full border rounded-xl p-2 text-sm bg-white">
                        {GRADES.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Capabilities</label>
                    <div className="flex flex-wrap gap-2">
                      {CAPABILITIES.map(cap => (
                        <button key={cap.value} onClick={() => setEdit(row.id, { capabilities: toggle(edit.capabilities, cap.value) as Capability[] })} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${edit.capabilities.includes(cap.value) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'}`}>
                          {edit.capabilities.includes(cap.value) ? '✓ ' : ''}{cap.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">ฝ่าย (Department)</label>
                    <div className="flex flex-wrap gap-2">
                      {DEPARTMENTS.map(d => (
                        <button key={d.value} onClick={() => setDept(row.id, d.value)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${dept === d.value ? 'bg-purple-600 border-purple-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                          <span>{d.icon}</span>{d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">สิทธิ์เมนู Admin</label>
                    <div className="space-y-3">
                      {groups.map(group => (
                        <div key={group}>
                          <div className="text-xs text-gray-400 font-semibold mb-1.5">{group}</div>
                          <div className="flex flex-wrap gap-2">
                            {ALL_PERMS.filter(p => p.group === group).map(p => (
                              <button key={p.value} onClick={() => setEdit(row.id, { permissions: toggle(edit.permissions, p.value) as Permission[] })} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${edit.permissions.includes(p.value) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'}`}>
                                {edit.permissions.includes(p.value) && <Check className="w-3 h-3" />}
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => save(row)} disabled={isA} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isA ? 'bg-emerald-100 text-emerald-400 cursor-wait' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[.98]'}`}>
                    {isA ? <><RefreshCw className="w-4 h-4 animate-spin" />กำลังบันทึก...</> : <><Check className="w-4 h-4" />บันทึกสิทธิ์</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
