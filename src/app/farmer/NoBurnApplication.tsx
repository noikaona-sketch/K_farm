import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Flame, MapPin, RefreshCw } from 'lucide-react'
import { listFarms, type FarmRecord } from '../../lib/farms'
import { ensureDefaultNoBurnActivity, submitNoBurnApplication, type SaleHistoryStatus } from '../../lib/noBurn'
import { useAuth } from '../../routes/AuthContext'

const SALE_STATUS_OPTIONS: { value: SaleHistoryStatus; label: string }[] = [
  { value: 'unknown', label: 'ยังไม่ทราบ / ให้ Admin ตรวจ' },
  { value: 'has_recent_sale', label: 'มีประวัติขายล่าสุดกับเรา' },
  { value: 'has_old_sale', label: 'มีประวัติขาย แต่ข้อมูลเก่า' },
  { value: 'no_sale_history', label: 'ยังไม่มีประวัติขาย' },
  { value: 'import_required', label: 'ต้องนำเข้าข้อมูลขายเพิ่ม' },
]

export default function NoBurnApplication() {
  const { user } = useAuth()
  const [farms, setFarms] = useState<FarmRecord[]>([])
  const [selectedFarmId, setSelectedFarmId] = useState('')
  const [saleHistoryStatus, setSaleHistoryStatus] = useState<SaleHistoryStatus>('unknown')
  const [latestSaleDate, setLatestSaleDate] = useState('')
  const [latestSaleSeason, setLatestSaleSeason] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const profileId = user?.profileId ?? user?.id ?? ''

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (!profileId) throw new Error('ไม่พบ Profile ID ผู้ใช้')
      const rows = await listFarms({ profileId })
      setFarms(rows)
      if (rows.length > 0 && !selectedFarmId) setSelectedFarmId(rows[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดแปลงไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  const selectedFarm = useMemo(() => farms.find(f => f.id === selectedFarmId), [farms, selectedFarmId])

  const submit = async () => {
    setSaving(true)
    setOk('')
    setError('')
    try {
      if (!profileId) throw new Error('ไม่พบ Profile ID ผู้ใช้')
      if (!selectedFarmId) throw new Error('กรุณาเลือกแปลง')
      const activity = await ensureDefaultNoBurnActivity(profileId)
      await submitNoBurnApplication({
        activityId: activity.id,
        memberId: profileId,
        farmId: selectedFarmId,
        saleHistoryStatus,
        latestSaleDate: latestSaleDate || null,
        latestSaleSeason: latestSaleSeason || null,
        actorId: profileId,
      })
      setOk('ส่งสมัครกิจกรรมไม่เผาแล้ว รอ Admin ตรวจสอบ')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ส่งสมัครไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24 space-y-4">
      <div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Flame className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold">เข้าร่วมกิจกรรมไม่เผา</h1>
            <p className="text-sm text-emerald-100">เลือกแปลงที่จะเข้าร่วมก่อนส่งให้ Admin ตรวจสิทธิ์</p>
          </div>
        </div>
      </div>

      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold flex items-center gap-2"><MapPin className="w-5 h-5" />เลือกแปลง</div>
          <button onClick={load} disabled={loading} className="text-xs text-emerald-700 font-bold flex items-center gap-1">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
          </button>
        </div>

        {farms.length === 0 && !loading ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 space-y-2">
            <div>ยังไม่มีแปลงในระบบ ต้องเพิ่มแปลงก่อนสมัครกิจกรรมไม่เผา</div>
            <Link to="/farmer/farms/add" className="inline-block rounded-xl bg-amber-500 text-white px-4 py-2 font-bold">เพิ่มแปลง</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {farms.map(farm => (
              <label key={farm.id} className={`block rounded-xl border p-3 cursor-pointer ${selectedFarmId === farm.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex gap-3">
                  <input type="radio" checked={selectedFarmId === farm.id} onChange={() => setSelectedFarmId(farm.id)} />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{farm.farm_name || 'ไม่ระบุชื่อแปลง'}</div>
                    <div className="text-xs text-gray-500 mt-1">{farm.area_rai ?? '-'} ไร่ • {farm.subdistrict || '-'} / {farm.district || '-'} / {farm.province || '-'}</div>
                    <div className="text-xs text-gray-400 mt-1">สถานะแปลง: {farm.verified_status}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>

      {selectedFarm && (
        <section className="bg-white rounded-2xl border p-4 space-y-3">
          <div className="font-bold">ข้อมูลขาย / ให้ Admin ตรวจ</div>
          <select value={saleHistoryStatus} onChange={(e) => setSaleHistoryStatus(e.target.value as SaleHistoryStatus)} className="w-full border rounded-xl p-3 bg-white">
            {SALE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input value={latestSaleDate} onChange={(e) => setLatestSaleDate(e.target.value)} type="date" className="w-full border rounded-xl p-3" />
          <input value={latestSaleSeason} onChange={(e) => setLatestSaleSeason(e.target.value)} placeholder="ฤดูขายล่าสุด เช่น 2026/1" className="w-full border rounded-xl p-3" />
          <div className="text-xs text-gray-500 leading-relaxed">
            ถ้าข้อมูลขายเก่า หรือยังไม่พบประวัติ ระบบจะส่งสถานะให้ Admin ตรวจสอบก่อนอนุมัติไปขั้นตรวจแปลง
          </div>
        </section>
      )}

      <button disabled={saving || loading || !selectedFarmId} onClick={submit} className="w-full rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex justify-center gap-2">
        {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
        {saving ? 'กำลังส่ง...' : 'ส่งสมัครกิจกรรมไม่เผา'}
      </button>
    </div>
  )
}
