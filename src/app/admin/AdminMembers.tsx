import { useEffect, useState, useCallback } from 'react'
import {
  fetchAdminMembers,
  updateMemberAdminFields,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'

type BaseType = 'farmer' | 'service' | 'staff'
type Grade = 'A' | 'B' | 'C'

const roles     = ['member','farmer','leader','inspector','admin']
const grades: Grade[] = ['C','B','A']
const statuses  = ['pending_leader','pending_admin','approved','rejected','suspended']

const STATUS_DOT: Record<string, string> = {
  pending_leader: 'bg-amber-400',
  pending_admin:  'bg-orange-400',
  approved:       'bg-emerald-500',
  rejected:       'bg-red-400',
  suspended:      'bg-gray-400',
}

interface RowEdit {
  role: string
  base_type: BaseType
  grade: Grade
  status: string
  is_leader: boolean
  can_inspect: boolean
}

function asGrade(value: unknown): Grade {
  return value === 'A' || value === 'B' ? value : 'C'
}

function defaultEdit(): RowEdit {
  return {
    role: 'member',
    base_type: 'farmer',
    grade: 'C',
    status: 'pending_leader',
    is_leader: false,
    can_inspect: false,
  }
}

function readCapabilities(u: Record<string, unknown>): string[] {
  return Array.isArray(u.capabilities) ? u.capabilities.map(String) : []
}

function makeCapabilities(e: RowEdit): string[] {
  return [
    e.is_leader ? 'is_leader' : null,
    e.can_inspect ? 'can_inspect' : null,
  ].filter(Boolean) as string[]
}

function uniqueOptions(rows: Record<string, unknown>[], key: string) {
  return Array.from(new Set(rows.map(r => String(r[key] ?? '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'))
}

export default function MembersPage() {
  const [data, setData]       = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterProvince, setFilterProvince] = useState('all')
  const [filterDistrict, setFilterDistrict] = useState('all')
  const [filterSubdistrict, setFilterSubdistrict] = useState('all')
  const [filterCapability, setFilterCapability] = useState<'all' | 'leader' | 'inspector' | 'leader_inspector'>('all')
  const [edits, setEdits]     = useState<Record<string, RowEdit>>({})
  const [acting, setActing]   = useState<string|null>(null)
  const [toast, setToast]     = useState<{ok:boolean;msg:string}|null>(null)

  const flash = (ok:boolean, msg:string) => {
    setToast({ok,msg}); setTimeout(()=>setToast(null),4000)
  }

  const setEdit = (id: string, patch: Partial<RowEdit>) =>
    setEdits(prev => ({...prev, [id]: {...(prev[id] ?? defaultEdit()), ...patch}}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAdminMembers()
      console.log('[AdminMembers] data:', res)
      setData(res as unknown[])
      const init: Record<string,RowEdit> = {}
      ;(res as unknown as Record<string,unknown>[]).forEach((u) => {
        const caps = readCapabilities(u)
        init[u.id as string] = {
          role:        String(u.role ?? 'member'),
          base_type:   'farmer',
          grade:       asGrade(u.grade),
          status:      String(u.status ?? 'pending_leader'),
          is_leader:   caps.includes('is_leader'),
          can_inspect: caps.includes('can_inspect') || Boolean(u.can_inspect),
        }
      })
      setEdits(init)
    } catch (e) {
      console.error(e)
      flash(false, 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const rowsAll = data as Record<string,unknown>[]
  const farmerRows = rowsAll.filter(u => String(u.base_type ?? u.baseType ?? 'farmer') === 'farmer')
  const total    = farmerRows.length
  const approved = farmerRows.filter(x => x.status === 'approved').length
  const pending  = farmerRows.filter(x => String(x.status ?? '').includes('pending')).length
  const rejected = farmerRows.filter(x => x.status === 'rejected').length

  const provinces = uniqueOptions(farmerRows, 'province')
  const districts = uniqueOptions(farmerRows.filter(u => filterProvince === 'all' || String(u.province ?? '') === filterProvince), 'district')
  const subdistricts = uniqueOptions(farmerRows.filter(u =>
    (filterProvince === 'all' || String(u.province ?? '') === filterProvince) &&
    (filterDistrict === 'all' || String(u.district ?? '') === filterDistrict)
  ), 'subdistrict')

  const filtered = farmerRows.filter(u => {
    const caps = readCapabilities(u)
    const isLeader = caps.includes('is_leader')
    const canInspect = caps.includes('can_inspect') || Boolean(u.can_inspect)
    const matchSearch =
      String(u.full_name ?? '').includes(search) ||
      String(u.id_card   ?? '').includes(search) ||
      String(u.phone     ?? '').includes(search) ||
      String(u.province  ?? '').includes(search) ||
      String(u.district  ?? '').includes(search) ||
      String(u.subdistrict ?? '').includes(search)
    const matchRole = filterRole === 'all' || u.role === filterRole
    const matchProvince = filterProvince === 'all' || String(u.province ?? '') === filterProvince
    const matchDistrict = filterDistrict === 'all' || String(u.district ?? '') === filterDistrict
    const matchSubdistrict = filterSubdistrict === 'all' || String(u.subdistrict ?? '') === filterSubdistrict
    const matchCapability =
      filterCapability === 'all' ||
      (filterCapability === 'leader' && isLeader) ||
      (filterCapability === 'inspector' && canInspect) ||
      (filterCapability === 'leader_inspector' && isLeader && canInspect)
    return matchSearch && matchRole && matchProvince && matchDistrict && matchSubdistrict && matchCapability
  })

  const act = async (id:string, fn:()=>Promise<void>, msg:string) => {
    setActing(id)
    try   { await fn(); flash(true,msg); await load() }
    catch (e) { flash(false, e instanceof Error ? e.message : 'ไม่สำเร็จ') }
    finally   { setActing(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
      <RefreshCw className="w-6 h-6 animate-spin"/>กำลังโหลด...
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">สมาชิกเกษตรกร</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock</span></>}
            <span className="text-gray-400">• แสดงเฉพาะ farmer • {total} รายการ</span>
          </div>
        </div>
        <button onClick={()=>{setLoading(true);load()}}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm">
          <RefreshCw className="w-4 h-4"/>รีโหลด
        </button>
      </div>

      {toast && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border
          ${toast.ok
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
            : 'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
          <button onClick={()=>setToast(null)} className="ml-auto text-lg leading-none opacity-60">×</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {l:'ทั้งหมด',   n:total,    bg:'bg-gray-50    border-gray-200   text-gray-700'},
          {l:'รออนุมัติ', n:pending,  bg:'bg-amber-50   border-amber-200  text-amber-700'},
          {l:'อนุมัติแล้ว',n:approved,bg:'bg-emerald-50 border-emerald-200 text-emerald-700'},
          {l:'ปฏิเสธ',    n:rejected, bg:'bg-red-50     border-red-200    text-red-700'},
        ].map(({l,n,bg})=>(
          <div key={l} className={`border-2 rounded-2xl p-4 text-center ${bg}`}>
            <div className="text-3xl font-bold">{n}</div>
            <div className="text-sm font-semibold mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {pending > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border-2 border-red-300 rounded-2xl px-4 py-3">
          <span className="w-8 h-8 rounded-full bg-red-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">{pending}</span>
          <span className="font-semibold text-red-800 text-sm">มีคำขอสมัครรออนุมัติ {pending} ราย</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <div className="relative md:col-span-3 xl:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input placeholder="ค้นหา ชื่อ/บัตร/โทร/พื้นที่" value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"/>
        </div>
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุก role</option>
          {roles.map(r=><option key={r}>{r}</option>)}
        </select>
        <select value={filterCapability} onChange={e=>setFilterCapability(e.target.value as typeof filterCapability)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกสิทธิ์</option>
          <option value="leader">หัวหน้าทีม</option>
          <option value="inspector">ผู้ตรวจ</option>
          <option value="leader_inspector">หัวหน้า+ผู้ตรวจ</option>
        </select>
        <select value={filterProvince} onChange={e=>{setFilterProvince(e.target.value); setFilterDistrict('all'); setFilterSubdistrict('all')}} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกจังหวัด</option>
          {provinces.map(p=><option key={p}>{p}</option>)}
        </select>
        <select value={filterDistrict} onChange={e=>{setFilterDistrict(e.target.value); setFilterSubdistrict('all')}} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกอำเภอ</option>
          {districts.map(d=><option key={d}>{d}</option>)}
        </select>
        <select value={filterSubdistrict} onChange={e=>setFilterSubdistrict(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุกตำบล</option>
          {subdistricts.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium">ยังไม่มีสมาชิกเกษตรกร</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  <th className="text-left px-4 py-3">ชื่อ</th>
                  <th className="text-left px-3 py-3">บัตรประชาชน</th>
                  <th className="text-left px-3 py-3">โทร</th>
                  <th className="text-left px-3 py-3">ที่อยู่</th>
                  <th className="text-center px-3 py-3">Role</th>
                  <th className="text-center px-3 py-3">Grade</th>
                  <th className="text-center px-3 py-3">สิทธิ์</th>
                  <th className="text-center px-3 py-3">Status</th>
                  <th className="text-center px-4 py-3">บันทึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => {
                  const id  = String(u.id)
                  const e   = edits[id] ?? {
                    role: String(u.role ?? 'member'),
                    base_type: 'farmer' as BaseType,
                    grade: asGrade(u.grade),
                    status: String(u.status ?? 'pending_leader'),
                    is_leader: false,
                    can_inspect: false,
                  }
                  const isA = acting === id
                  const dot = STATUS_DOT[e.status] ?? 'bg-gray-300'

                  return (
                    <tr key={id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {String(u.full_name ?? '?').charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 whitespace-nowrap">{String(u.full_name ?? '-')}</div>
                            <div className="text-xs text-gray-400">
                              {u.created_at ? new Date(String(u.created_at)).toLocaleDateString('th-TH',{month:'short',day:'numeric',year:'2-digit'}) : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{String(u.id_card ?? '-')}</td>
                      <td className="px-3 py-3">
                        <a href={`tel:${u.phone}`} className="text-blue-600 hover:underline font-mono text-xs whitespace-nowrap">{String(u.phone ?? '-')}</a>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 min-w-48">
                        <div>{String(u.subdistrict ?? '-')} / {String(u.district ?? '-')}</div>
                        <div>{String(u.province ?? '-')}</div>
                        <div className="text-gray-400 truncate max-w-64">{String(u.address ?? u.village ?? '')}</div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <select value={e.role} onChange={ev=>setEdit(id,{role:ev.target.value})}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500">
                          {roles.map(r=><option key={r}>{r}</option>)}
                        </select>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <select value={e.grade} onChange={ev=>setEdit(id,{grade:asGrade(ev.target.value)})}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500 w-20">
                          {grades.map(g=><option key={g}>{g}</option>)}
                        </select>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col gap-1 text-xs text-gray-600 whitespace-nowrap">
                          <label className="flex items-center justify-center gap-1 cursor-pointer select-none">
                            <input type="checkbox" checked={Boolean(e.is_leader)} onChange={ev=>setEdit(id,{is_leader:ev.currentTarget.checked})} /> หัวหน้า
                          </label>
                          <label className="flex items-center justify-center gap-1 cursor-pointer select-none">
                            <input type="checkbox" checked={Boolean(e.can_inspect)} onChange={ev=>setEdit(id,{can_inspect:ev.currentTarget.checked})} /> ตรวจ
                          </label>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`}/>
                          <select value={e.status} onChange={ev=>setEdit(id,{status:ev.target.value})}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500">
                            {statuses.map(s=><option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <button onClick={()=>act(id, ()=>updateMemberAdminFields(id,{
                              role:e.role,
                              base_type:'farmer',
                              grade:e.grade,
                              status:e.status,
                              capabilities: makeCapabilities(e),
                            }), `💾 บันทึก`)}
                            disabled={isA}
                            className={`px-3 h-8 rounded-lg text-xs font-bold transition-colors ${isA?'bg-blue-100 text-blue-300 cursor-wait':'bg-blue-500 text-white hover:bg-blue-600'}`}>
                            {isA?'กำลังบันทึก...':'บันทึก'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-500">
            แสดง {filtered.length} จาก {total} รายการ
          </div>
        </div>
      )}
    </div>
  )
}
