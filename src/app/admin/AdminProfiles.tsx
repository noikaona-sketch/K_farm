import { useEffect, useState, useCallback } from 'react'
import { fetchAdminMembers } from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'

const ROLE_BADGE: Record<string, { label:string; bg:string; text:string }> = {
  member:           { label:'สมาชิกใหม่',    bg:'bg-gray-100',    text:'text-gray-600' },
  farmer:           { label:'เกษตรกร',       bg:'bg-emerald-100', text:'text-emerald-700' },
  leader:           { label:'หัวหน้ากลุ่ม',  bg:'bg-amber-100',   text:'text-amber-700' },
  inspector:        { label:'ตรวจแปลง',      bg:'bg-blue-100',    text:'text-blue-700' },
  service_provider: { label:'ผู้ให้บริการ',  bg:'bg-purple-100',  text:'text-purple-700' },
  admin:            { label:'Admin',         bg:'bg-red-100',     text:'text-red-700' },
}

const PLATFORM_MAP: Record<string, { label:string; icon:string }> = {
  member:           { label:'LINE',  icon:'📱' },
  farmer:           { label:'LINE',  icon:'📱' },
  leader:           { label:'LINE',  icon:'📱' },
  inspector:        { label:'LINE',  icon:'📱' },
  service_provider: { label:'LINE',  icon:'📱' },
  admin:            { label:'Web',   icon:'💻' },
}

export default function AdminProfiles() {
  const [data, setData]       = useState<Record<string,unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterRole, setFilterRole] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAdminMembers()
      setData(res as unknown as Record<string,unknown>[])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const rows = data.filter(u => {
    const matchRole = filterRole === 'all' || u.role === filterRole
    const matchSearch =
      String(u.full_name??'').includes(search) ||
      String(u.id_card??'').includes(search) ||
      String(u.phone??'').includes(search)
    return matchRole && matchSearch
  })

  const roleCounts = ['member','farmer','leader','inspector','service_provider','admin']
    .map(r => ({ r, n: data.filter(u=>u.role===r).length }))
    .filter(x => x.n > 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Profile ทั้งหมด</h1>
          <p className="text-sm text-gray-500 mt-0.5">entry point ของทุกคน — ทุก role รวมกัน</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs">
            {isSupabaseReady
              ? <><Wifi className="w-3 h-3 text-emerald-600"/><span className="text-emerald-600">Supabase · profiles</span></>
              : <><WifiOff className="w-3 h-3 text-amber-500"/><span className="text-amber-600">Mock</span></>}
          </div>
        </div>
        <button onClick={()=>{setLoading(true);load()}}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm">
          <RefreshCw className="w-4 h-4"/>รีโหลด
        </button>
      </div>

      {/* Role summary chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setFilterRole('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
            ${filterRole==='all'?'bg-gray-800 text-white border-gray-800':'bg-white border-gray-200 text-gray-600'}`}>
          ทั้งหมด ({data.length})
        </button>
        {roleCounts.map(({r,n})=>{
          const rb = ROLE_BADGE[r] ?? {label:r, bg:'bg-gray-100', text:'text-gray-600'}
          return (
            <button key={r} onClick={()=>setFilterRole(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                ${filterRole===r?'bg-gray-800 text-white border-gray-800':'bg-white border-gray-200 text-gray-600'}`}>
              {PLATFORM_MAP[r]?.icon} {rb.label} ({n})
            </button>
          )
        })}
      </div>

      {/* Platform legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>📱 LINE Mini App — farmer, leader, inspector, service_provider</span>
        <span>💻 Web Browser — admin เท่านั้น</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ เลขบัตร หรือเบอร์"
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"/>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin"/></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">👤</div>
          <p className="font-medium">ไม่พบข้อมูล</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  <th className="text-left px-4 py-3">ชื่อ</th>
                  <th className="text-left px-3 py-3">เลขบัตร</th>
                  <th className="text-left px-3 py-3">โทร</th>
                  <th className="text-center px-3 py-3">Role</th>
                  <th className="text-center px-3 py-3">Platform</th>
                  <th className="text-left px-3 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(u => {
                  const id = String(u.id)
                  const rb = ROLE_BADGE[String(u.role??'member')] ?? {label:String(u.role), bg:'bg-gray-100', text:'text-gray-600'}
                  const pm = PLATFORM_MAP[String(u.role??'member')] ?? {label:'LINE', icon:'📱'}
                  return (
                    <tr key={id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {String(u.full_name??'?').charAt(0)}
                          </div>
                          <div className="font-semibold text-gray-900 whitespace-nowrap">{String(u.full_name??'-')}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-500">{String(u.id_card??'-')}</td>
                      <td className="px-3 py-3">
                        <a href={`tel:${u.phone}`} className="text-blue-600 hover:underline font-mono text-xs">{String(u.phone??'-')}</a>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${rb.bg} ${rb.text}`}>{rb.label}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-base" title={pm.label}>{pm.icon}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-500">{String(u.status??'—')}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-500">
            แสดง {rows.length} จาก {data.length} รายการ
          </div>
        </div>
      )}
    </div>
  )
}
