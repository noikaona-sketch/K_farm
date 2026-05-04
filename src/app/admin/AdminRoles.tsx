import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Check, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { fetchAdminMembers } from '../../lib/db'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import {
  DEPT_PERMISSIONS, ADMIN_MENUS,
  type Department, type Permission,
} from '../../lib/permissions'
import { ROLE_TABS, ROLE_LABEL, type AppRole } from '../../lib/roles'

// ── ฝ่าย (departments) ────────────────────────────────────────────────────────
const DEPARTMENTS: { value: Department; label: string; icon: string }[] = [
  { value: 'agri',       label: 'ฝ่ายเกษตร',     icon: '🌱' },
  { value: 'sales',      label: 'ฝ่ายขาย',       icon: '💰' },
  { value: 'stock',      label: 'ฝ่ายสต็อก',     icon: '📦' },
  { value: 'accounting', label: 'ฝ่ายบัญชี',     icon: '🧾' },
  { value: 'inspection', label: 'ฝ่ายตรวจแปลง', icon: '🔍' },
  { value: 'service',    label: 'ฝ่ายรถ/บริการ', icon: '🚜' },
  { value: 'field_staff',label: 'ทีมภาคสนาม',   icon: '🧑‍🌾' },
  { value: 'it',         label: 'ฝ่าย IT',       icon: '🔐' },
]

// ── permission groups ─────────────────────────────────────────────────────────
const PERM_GROUPS: { group: string; perms: { value: Permission; label: string }[] }[] = [
  { group: 'สมาชิก', perms: [
    { value: 'member.view',     label: 'ดูสมาชิก' },
    { value: 'member.approve',  label: 'อนุมัติสมาชิก' },
    { value: 'member.import',   label: 'Import Excel' },
    { value: 'member.set_role', label: 'กำหนด Role' },
  ]},
  { group: 'เมล็ดพันธุ์', perms: [
    { value: 'seed.view',  label: 'ดูเมล็ดพันธุ์' },
    { value: 'seed.edit',  label: 'แก้ไขเมล็ดพันธุ์' },
    { value: 'seed.stock', label: 'รับ Stock' },
    { value: 'seed.sales', label: 'ขายเมล็ด' },
  ]},
  { group: 'ราคา', perms: [
    { value: 'price.view', label: 'ดูราคา' },
    { value: 'price.edit', label: 'แก้ไขราคา' },
  ]},
  { group: 'ตรวจแปลง', perms: [
    { value: 'inspection.view', label: 'ดูการตรวจ' },
    { value: 'inspection.edit', label: 'บันทึกการตรวจ' },
  ]},
  { group: 'บริการ', perms: [
    { value: 'service.view', label: 'ดูผู้ให้บริการ' },
    { value: 'service.edit', label: 'แก้ไขผู้ให้บริการ' },
  ]},
  { group: 'รายงาน', perms: [
    { value: 'report.view',   label: 'ดูรายงาน' },
    { value: 'report.export', label: 'Export รายงาน' },
  ]},
  { group: 'ระบบ', perms: [
    { value: 'system.roles', label: 'จัดการสิทธิ์' },
    { value: 'system.all',   label: 'ทุกสิทธิ์ (Super)' },
  ]},
]

// LINE role tabs summary
const LINE_ROLES: AppRole[] = ['member','farmer','leader','inspector','service_provider','field_staff']

async function saveProfile(profileId: string, dept: Department, perms: Permission[]) {
  if (!supabase) { console.info('[mock] saveProfile', profileId, dept); return }
  const { error } = await supabase
    .from('profiles')
    .update({ department: dept, permissions: perms })
    .eq('id', profileId)
  if (error) throw new Error(error.message)
}

// ── component ─────────────────────────────────────────────────────────────────
export default function AdminRoles() {
  const [members, setMembers] = useState<Record<string,unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [acting, setActing]   = useState<string|null>(null)
  const [toast, setToast]     = useState<{ok:boolean;msg:string}|null>(null)
  const [tab, setTab]         = useState<'assign'|'matrix'>('assign')

  // per-row edit state
  const [editDept,  setEditDept]  = useState<Record<string,Department>>({})
  const [editPerms, setEditPerms] = useState<Record<string,Permission[]>>({})

  const flash = (ok:boolean, msg:string) => {
    setToast({ok,msg}); setTimeout(()=>setToast(null),4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAdminMembers()
      const admins = (res as unknown as Record<string,unknown>[])
        .filter(u => u.role === 'admin')
      setMembers(admins)
    } catch { flash(false,'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const getDept  = (u: Record<string,unknown>) => editDept[String(u.id)] ?? (u.department as Department) ?? null
  const getPerms = (u: Record<string,unknown>): Permission[] =>
    editPerms[String(u.id)] ?? (u.permissions as Permission[]) ?? []

  const setDept = (id: string, dept: Department) => {
    setEditDept(d => ({...d, [id]: dept}))
    setEditPerms(p => ({...p, [id]: [...(DEPT_PERMISSIONS[dept] ?? [])]}))
  }
  const togglePerm = (id: string, perm: Permission, cur: Permission[]) =>
    setEditPerms(p => ({...p, [id]: cur.includes(perm) ? cur.filter(x=>x!==perm) : [...cur,perm]}))

  const handleSave = async (u: Record<string,unknown>) => {
    const id = String(u.id)
    const dept = getDept(u)
    if (!dept) { flash(false,'กรุณาเลือกฝ่ายก่อน'); return }
    setActing(id)
    try {
      await saveProfile(id, dept, getPerms(u))
      flash(true, `✅ บันทึกสิทธิ์ ${String(u.full_name)} → ${DEPARTMENTS.find(d=>d.value===dept)?.label}`)
      await load()
    } catch(e) { flash(false, e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ') }
    finally { setActing(null) }
  }

  const rows = members.filter(u =>
    String(u.full_name??'').includes(search) || String(u.id_card??'').includes(search)
  )

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-2xl p-1">
        {([['assign','👤','กำหนดสิทธิ์ User'],['matrix','📊','ตาราง Role × เมนู']] as const).map(([k,ic,lb])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${tab===k?'bg-white text-emerald-700 shadow-sm':'text-gray-500'}`}>
            <span>{ic}</span><span>{lb}</span>
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border
          ${toast.ok?'bg-emerald-50 border-emerald-300 text-emerald-700':'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok?<Check className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}
          {toast.msg}
          <button onClick={()=>setToast(null)} className="ml-auto text-lg opacity-60 leading-none">×</button>
        </div>
      )}

      {/* ── TAB 1: กำหนดสิทธิ์ User ── */}
      {tab === 'assign' && (
        <>
          {!isSupabaseReady && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-sm text-amber-700">
              ⚠️ ต้องรัน SQL migration ก่อน:
              <code className="block bg-white rounded px-2 py-1 mt-1 text-xs font-mono">
                ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT, permissions JSONB DEFAULT '[]';
              </code>
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
              <p className="text-xs mt-1 text-gray-300">ตั้ง role=admin ในหน้าสมาชิกก่อน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((u,idx) => {
                const id    = String(u.id)
                const dept  = getDept(u)
                const perms = getPerms(u)
                const isA   = acting === id
                return (
                  <div key={id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-base flex-shrink-0">
                        {idx+1}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">{String(u.full_name??'-')}</div>
                        <div className="text-xs text-gray-400">{String(u.id_card??'')} • role: {String(u.role??'')}</div>
                      </div>
                      {dept && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                          {DEPARTMENTS.find(d=>d.value===dept)?.icon} {DEPARTMENTS.find(d=>d.value===dept)?.label}
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Department picker */}
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">ฝ่าย (Department)</div>
                        <div className="flex flex-wrap gap-2">
                          {DEPARTMENTS.map(d=>(
                            <button key={d.value} onClick={()=>setDept(id,d.value)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                                ${dept===d.value
                                  ?'bg-purple-600 border-purple-600 text-white shadow-sm'
                                  :'bg-white border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                              <span>{d.icon}</span>{d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Permissions — Web Admin menus */}
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                          สิทธิ์ (Permissions) — เมนู Web Admin
                        </div>
                        <div className="space-y-3">
                          {PERM_GROUPS.map(pg=>(
                            <div key={pg.group}>
                              <div className="text-xs text-gray-400 font-semibold mb-1.5">{pg.group}</div>
                              <div className="flex flex-wrap gap-2">
                                {pg.perms.map(p=>(
                                  <button key={p.value}
                                    onClick={()=>togglePerm(id,p.value,perms)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all
                                      ${perms.includes(p.value)
                                        ?'bg-emerald-600 border-emerald-600 text-white'
                                        :'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'}`}>
                                    {perms.includes(p.value)&&<Check className="w-3 h-3"/>}
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Save */}
                      <button onClick={()=>handleSave(u)} disabled={isA||!dept}
                        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                          ${!dept?'bg-gray-100 text-gray-400 cursor-not-allowed'
                          :isA?'bg-emerald-100 text-emerald-400 cursor-wait'
                          :'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[.98]'}`}>
                        {isA?<><RefreshCw className="w-4 h-4 animate-spin"/>กำลังบันทึก...</>:<><Check className="w-4 h-4"/>บันทึกสิทธิ์</>}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: ตาราง Role × เมนู (master reference) ── */}
      {tab === 'matrix' && (
        <div className="space-y-6">
          {/* Web Admin matrix */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm">💻 Web Admin — เมนูตาม Department</h3>
              <p className="text-xs text-gray-400 mt-0.5">admin เห็นเมนูที่มี permission ตรงกับที่ได้รับ</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-gray-500 font-semibold">เมนู</th>
                    {DEPARTMENTS.map(d=>(
                      <th key={d.value} className="text-center px-2 py-2.5 text-gray-500 font-semibold whitespace-nowrap">
                        {d.icon}<br/><span className="text-[10px]">{d.label.replace('ฝ่าย','').replace('ทีม','')}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ADMIN_MENUS.filter(m=>m.to!=='/admin').map(m=>{
                    return (
                      <tr key={m.to} className="hover:bg-gray-50/60">
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                          {m.icon} {m.label}
                        </td>
                        {DEPARTMENTS.map(d=>{
                          const dPerms = DEPT_PERMISSIONS[d.value] ?? []
                          const has = dPerms.includes('system.all' as Permission) || dPerms.includes(m.permission)
                          return (
                            <td key={d.value} className="px-2 py-2 text-center">
                              {has
                                ? <span className="inline-block w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] flex items-center justify-center">✓</span>
                                : <span className="inline-block w-4 h-4 text-gray-200 text-center">–</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* LINE Mini App matrix */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm">📱 LINE Mini App — แท็บตาม Role</h3>
              <p className="text-xs text-gray-400 mt-0.5">สมาชิกเห็นแท็บตาม role ที่ได้รับ</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-gray-500 font-semibold">Role</th>
                    <th className="text-left px-3 py-2.5 text-gray-500 font-semibold">แท็บที่เห็น</th>
                    <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {LINE_ROLES.map(role=>{
                    const tabs = ROLE_TABS[role] ?? []
                    return (
                      <tr key={role} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-800">{ROLE_LABEL[role]}</span>
                          <span className="ml-2 text-gray-400 text-[10px] font-mono">{role}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {tabs.map(t=>(
                              <span key={t.to} className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-semibold">
                                {t.icon} {t.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-base">📱</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">ผู้ดูแลระบบ</span>
                      <span className="ml-2 text-gray-400 text-[10px] font-mono">admin</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="bg-gray-100 border border-gray-200 text-gray-500 px-2 py-1 rounded-lg text-[10px] font-semibold">
                        เข้าผ่าน Web Browser เท่านั้น
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-base">💻</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
