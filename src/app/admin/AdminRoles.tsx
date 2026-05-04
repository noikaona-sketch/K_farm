import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Check, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { fetchAdminMembers, type AdminMemberRow } from '../../lib/db'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import { DEPT_PERMISSIONS, type Department, type Permission } from '../../lib/permissions'

const DEPARTMENTS: { value: Department; label: string; icon: string }[] = [
  { value: 'agri',       label: 'ฝ่ายเกษตร',     icon: '🌱' },
  { value: 'sales',      label: 'ฝ่ายขาย',       icon: '💰' },
  { value: 'stock',      label: 'ฝ่ายสต็อก',     icon: '📦' },
  { value: 'accounting', label: 'ฝ่ายบัญชี',     icon: '🧾' },
  { value: 'inspection', label: 'ฝ่ายตรวจแปลง', icon: '🔍' },
  { value: 'service',    label: 'ฝ่ายรถ/บริการ', icon: '🚜' },
  { value: 'it',         label: 'ฝ่าย IT',       icon: '🔐' },
]

const ALL_PERMS: { value: Permission; label: string; group: string }[] = [
  { value: 'member.view',     label: 'ดูสมาชิก',           group: 'สมาชิก' },
  { value: 'member.approve',  label: 'อนุมัติสมาชิก',      group: 'สมาชิก' },
  { value: 'member.import',   label: 'Import Excel',       group: 'สมาชิก' },
  { value: 'member.set_role', label: 'กำหนด Role',         group: 'สมาชิก' },
  { value: 'seed.view',       label: 'ดูเมล็ดพันธุ์',      group: 'เมล็ดพันธุ์' },
  { value: 'seed.edit',       label: 'แก้ไขเมล็ดพันธุ์',  group: 'เมล็ดพันธุ์' },
  { value: 'seed.stock',      label: 'รับ Stock',          group: 'เมล็ดพันธุ์' },
  { value: 'seed.sales',      label: 'ขายเมล็ด',           group: 'เมล็ดพันธุ์' },
  { value: 'price.view',      label: 'ดูราคา',             group: 'ราคา' },
  { value: 'price.edit',      label: 'แก้ไขราคา',          group: 'ราคา' },
  { value: 'inspection.view', label: 'ดูการตรวจ',          group: 'ตรวจแปลง' },
  { value: 'inspection.edit', label: 'บันทึกการตรวจ',      group: 'ตรวจแปลง' },
  { value: 'service.view',    label: 'ดูผู้ให้บริการ',     group: 'บริการ' },
  { value: 'service.edit',    label: 'แก้ไขผู้ให้บริการ',  group: 'บริการ' },
  { value: 'report.view',     label: 'ดูรายงาน',           group: 'รายงาน' },
  { value: 'report.export',   label: 'Export รายงาน',      group: 'รายงาน' },
  { value: 'system.roles',    label: 'จัดการสิทธิ์',       group: 'ระบบ' },
  { value: 'system.all',      label: 'ทุกสิทธิ์ (Super)',  group: 'ระบบ' },
]

async function updateDeptPermissions(profileId: string, dept: Department, perms: Permission[]) {
  if (!supabase) { console.info('[mock] updateDeptPermissions', profileId, dept); return }
  const { error } = await supabase
    .from('profiles')
    .update({ department: dept, permissions: perms })
    .eq('id', profileId)
  if (error) throw new Error(error.message)
}

export default function AdminRoles() {
  const [members, setMembers] = useState<AdminMemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [acting, setActing]   = useState<string | null>(null)
  const [toast, setToast]     = useState<{ ok: boolean; msg: string } | null>(null)
  const [editDept, setEditDept]   = useState<Record<string, Department>>({})
  const [editPerms, setEditPerms] = useState<Record<string, Permission[]>>({})

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg }); setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminMembers()
      // show only admin-role users
      const admins = (data as unknown as Record<string, unknown>[]).filter(u => u.role === 'admin')
      setMembers(admins as unknown as AdminMemberRow[])
    } catch (e) {
      flash(false, 'โหลดข้อมูลไม่สำเร็จ')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const getDept = (u: Record<string, unknown>) =>
    (editDept[String(u.id)] ?? u.department ?? '') as Department | ''

  const getPerms = (u: Record<string, unknown>): Permission[] => {
    if (editPerms[String(u.id)]) return editPerms[String(u.id)]
    try { return (u.permissions as Permission[]) ?? [] }
    catch { return [] }
  }

  const setDept = (id: string, dept: Department) => {
    setEditDept(d => ({ ...d, [id]: dept }))
    // auto-fill default permissions for that dept
    setEditPerms(p => ({ ...p, [id]: [...DEPT_PERMISSIONS[dept]] }))
  }

  const togglePerm = (id: string, perm: Permission, current: Permission[]) => {
    const next = current.includes(perm)
      ? current.filter(p => p !== perm)
      : [...current, perm]
    setEditPerms(p => ({ ...p, [id]: next }))
  }

  /** สิทธิ์ที่ field staff กำหนดให้ผู้ใหม่ได้: member (รอ approve) + service_provider เท่านั้น */
  const FIELD_STAFF_DEPTS = ['agri','sales','inspection','service','accounting']
  const isFieldStaff = (dept: string) => FIELD_STAFF_DEPTS.includes(dept)

  const handleSave = async (u: Record<string, unknown>) => {
    const id   = String(u.id)
    const dept = getDept(u) as Department
    if (!dept) { flash(false, 'กรุณาเลือกฝ่ายก่อน'); return }
    const perms = getPerms(u)
    setActing(id)
    try {
      await updateDeptPermissions(id, dept, perms)
      flash(true, `✅ บันทึกสิทธิ์ ${String(u.full_name)} สำเร็จ${isSupabaseReady ? ' (Supabase)' : ' (Mock)'}`)
      await load()
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally { setActing(null) }
  }

  const rows = (members as unknown as Record<string, unknown>[])
    .filter(u => String(u.full_name ?? '').includes(search) || String(u.id_card ?? '').includes(search))

  // group permissions by group
  const groups = [...new Set(ALL_PERMS.map(p => p.group))]

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">กำหนดสิทธิ์ / Role / Department</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock</span></>}
          </div>
        </div>
        <button onClick={()=>{setLoading(true);load()}}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm">
          <RefreshCw className="w-4 h-4"/>รีโหลด
        </button>
      </div>

      {toast && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border
          ${toast.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok ? <Check className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
          {toast.msg}
          <button onClick={()=>setToast(null)} className="ml-auto opacity-60 text-lg leading-none">×</button>
        </div>
      )}

      {/* SQL reminder */}
      {!isSupabaseReady && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
          <p className="font-bold text-amber-800 text-sm mb-1">⚠️ ต้องรัน SQL migration ก่อน</p>
          <p className="text-amber-700 text-xs">รัน <code className="bg-white px-1 rounded">supabase/migrations/add_department_permissions.sql</code> ใน Supabase SQL Editor</p>
        </div>
      )}

      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="ค้นหาชื่อ หรือเลขบัตร..."
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"/>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin"/></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔐</div>
          <p className="font-medium">ไม่มีผู้ใช้ role admin</p>
          <p className="text-xs mt-1">ตั้ง role = admin ในหน้า สมาชิก ก่อน</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(u => {
            const id    = String(u.id)
            const dept  = getDept(u)
            const perms = getPerms(u)
            const isA   = acting === id

            return (
              <div key={id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* User header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center flex-shrink-0">
                    {String(u.full_name ?? '?').charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{String(u.full_name ?? '-')}</div>
                    <div className="text-xs text-gray-400">{String(u.id_card ?? '')} • role: {String(u.role ?? '')}</div>
                  </div>
                  <div className="ml-auto">
                    {dept && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                        {DEPARTMENTS.find(d=>d.value===dept)?.icon} {DEPARTMENTS.find(d=>d.value===dept)?.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Department picker */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">ฝ่าย (Department)</label>
                    <div className="flex flex-wrap gap-2">
                      {DEPARTMENTS.map(d => (
                        <button key={d.value} onClick={()=>setDept(id, d.value)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                            ${dept===d.value
                              ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                          <span>{d.icon}</span>{d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Permission checkboxes grouped */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">สิทธิ์ (Permissions)</label>
                    <div className="space-y-3">
                      {groups.map(group => (
                        <div key={group}>
                          <div className="text-xs text-gray-400 font-semibold mb-1.5">{group}</div>
                          <div className="flex flex-wrap gap-2">
                            {ALL_PERMS.filter(p=>p.group===group).map(p => (
                              <button key={p.value}
                                onClick={()=>togglePerm(id, p.value, perms)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all
                                  ${perms.includes(p.value)
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'}`}>
                                {perms.includes(p.value) && <Check className="w-3 h-3"/>}
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save */}
                  <button onClick={()=>handleSave(u)} disabled={isA || !dept}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                      ${!dept ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : isA ? 'bg-emerald-100 text-emerald-400 cursor-wait'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[.98]'}`}>
                    {isA ? <><RefreshCw className="w-4 h-4 animate-spin"/>กำลังบันทึก...</> : <><Check className="w-4 h-4"/>บันทึกสิทธิ์</>}
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
