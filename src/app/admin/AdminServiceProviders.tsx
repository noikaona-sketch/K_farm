import { useEffect, useState, useCallback } from 'react'
import { fetchAdminMembers, approveMember, rejectMember, updateMemberAdminFields } from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { RefreshCw, Search, Check, X, Wifi, WifiOff } from 'lucide-react'

const STATUS_DOT: Record<string, string> = {
  pending_leader: 'bg-amber-400', pending_admin: 'bg-orange-400',
  approved: 'bg-emerald-500', rejected: 'bg-red-400',
}
const SERVICE_TYPES = ['ทั่วไป','รถไถ','รถเกี่ยว','รถขนส่ง','inspector']

export default function AdminServiceProviders() {
  const [data, setData]       = useState<Record<string,unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [acting, setActing]   = useState<string|null>(null)
  const [toast, setToast]     = useState<{ok:boolean;msg:string}|null>(null)

  const flash = (ok:boolean, msg:string) => {
    setToast({ok,msg}); setTimeout(()=>setToast(null),4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAdminMembers()
      // เฉพาะ service_provider
      setData((res as unknown as Record<string,unknown>[]).filter(u => u.role === 'service_provider'))
    } catch { flash(false,'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (id:string, fn:()=>Promise<void>, msg:string) => {
    setActing(id)
    try { await fn(); flash(true,msg); await load() }
    catch(e) { flash(false, e instanceof Error ? e.message : 'ไม่สำเร็จ') }
    finally { setActing(null) }
  }

  const rows = data.filter(u =>
    String(u.full_name??'').includes(search) ||
    String(u.phone??'').includes(search)
  )

  const total    = data.length
  const pending  = data.filter(u=>String(u.status??'').includes('pending')).length
  const approved = data.filter(u=>u.status==='approved').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">รถ / ผู้ให้บริการ</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase · role = service_provider</span></>
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
          ${toast.ok?'bg-emerald-50 border-emerald-300 text-emerald-700':'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok?'✅':'❌'} {toast.msg}
          <button onClick={()=>setToast(null)} className="ml-auto text-lg leading-none opacity-60">×</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {l:'ทั้งหมด',    n:total,   bg:'border-gray-200 bg-gray-50 text-gray-700'},
          {l:'รออนุมัติ',  n:pending, bg:'border-amber-200 bg-amber-50 text-amber-700'},
          {l:'อนุมัติแล้ว',n:approved,bg:'border-emerald-200 bg-emerald-50 text-emerald-700'},
        ].map(({l,n,bg})=>(
          <div key={l} className={`border-2 rounded-2xl p-4 text-center ${bg}`}>
            <div className="text-3xl font-bold">{loading?'…':n}</div>
            <div className="text-sm font-semibold mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <strong>ผู้ให้บริการ</strong> = รถที่ขึ้นทะเบียนในระบบ สมัครผ่าน LINE Mini App เช่นเดียวกับสมาชิก
        แต่ใช้ role = <code className="bg-blue-100 px-1 rounded">service_provider</code>
        · ถ้าได้รับการรับรอง inspector จะขึ้นทะเบียนเป็นผู้รับรองได้
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ หรือเบอร์โทร"
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"/>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin"/></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">🚜</div>
          <p className="font-medium">ยังไม่มีผู้ให้บริการ</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  <th className="text-left px-4 py-3">ชื่อ</th>
                  <th className="text-left px-3 py-3">โทร</th>
                  <th className="text-left px-3 py-3">พื้นที่</th>
                  <th className="text-center px-3 py-3">สถานะ</th>
                  <th className="text-center px-3 py-3">Inspector</th>
                  <th className="text-center px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(u => {
                  const id  = String(u.id)
                  const st  = String(u.status ?? 'pending_leader')
                  const dot = STATUS_DOT[st] ?? 'bg-gray-300'
                  const isA = acting === id
                  const isPending = st.includes('pending')
                  const farmerObj = u.farmer as Record<string,unknown>|null
                  return (
                    <tr key={id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">🚜</div>
                          <div>
                            <div className="font-semibold text-gray-900 whitespace-nowrap">{String(u.full_name??'-')}</div>
                            <div className="text-xs text-gray-400">{String(u.id_card??'')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <a href={`tel:${u.phone}`} className="text-blue-600 hover:underline font-mono text-xs">{String(u.phone??'-')}</a>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {farmerObj ? `${farmerObj.province??''} / ${farmerObj.district??''}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${dot}`}/>
                          <span className="text-xs text-gray-600">{
                            st==='approved'?'อนุมัติ':st.includes('pending')?'รออนุมัติ':'ปฏิเสธ'
                          }</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {Boolean(u.can_inspect)
                          ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">✓ รับรองได้</span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-center">
                          {isPending && <>
                            <button onClick={()=>act(id,()=>rejectMember(id),'❌ ปฏิเสธ')} disabled={isA}
                              className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors ${isA?'bg-gray-100 text-gray-300 cursor-wait':'bg-red-500 text-white hover:bg-red-600'}`}>
                              {isA?'…':'✖'}
                            </button>
                            <button onClick={()=>act(id,()=>approveMember(id),'✅ อนุมัติ')} disabled={isA}
                              className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors ${isA?'bg-gray-100 text-gray-300 cursor-wait':'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                              {isA?'…':'✔'}
                            </button>
                          </>}
                          {!isPending && (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-500">
            แสดง {rows.length} จาก {total} ผู้ให้บริการ
          </div>
        </div>
      )}
    </div>
  )
}
