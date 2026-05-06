import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, MapPin, RefreshCw, Search } from 'lucide-react'
import { googleMapsUrl, listFarms, type FarmRecord, type FarmVerifiedStatus } from '../../lib/farms'

const STATUS_LABEL: Record<string, string> = {
  draft: 'แบบร่าง',
  pending_verify: 'รอยืนยัน',
  verified: 'ยืนยันแล้ว',
  rejected: 'ไม่ผ่าน',
  merged_duplicate: 'รวมรายการซ้ำ',
}

function markerClass(status: string) {
  if (status === 'verified') return 'bg-emerald-500'
  if (status === 'rejected') return 'bg-red-500'
  return 'bg-amber-400'
}

function hasGps(farm: FarmRecord) {
  return typeof farm.center_lat === 'number' && typeof farm.center_lng === 'number'
}

export default function AdminMap() {
  const [farms, setFarms] = useState<FarmRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [subdistrict, setSubdistrict] = useState('')
  const [verifiedStatus, setVerifiedStatus] = useState<FarmVerifiedStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await listFarms({
        province: province || undefined,
        district: district || undefined,
        subdistrict: subdistrict || undefined,
        verifiedStatus,
      })
      setFarms(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลแปลงไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedStatus])

  const farmsWithGps = useMemo(() => farms.filter(hasGps), [farms])
  const selected = farms.find(f => f.id === selectedId) ?? null

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">แผนที่แปลงเกษตร</h2>
          <p className="text-gray-500 mt-1">แสดงจากตาราง farms ทั้งหมด {farms.length} แปลง / มี GPS {farmsWithGps.length} แปลง</p>
        </div>
        <button onClick={load} disabled={loading} className="rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white px-4 py-2 font-bold flex items-center gap-2 justify-center">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          ค้นหา/รีเฟรช
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 grid md:grid-cols-4 gap-3">
        <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="จังหวัด" className="border rounded-xl p-3" />
        <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="อำเภอ" className="border rounded-xl p-3" />
        <input value={subdistrict} onChange={(e) => setSubdistrict(e.target.value)} placeholder="ตำบล" className="border rounded-xl p-3" />
        <select value={verifiedStatus} onChange={(e) => setVerifiedStatus(e.target.value as FarmVerifiedStatus | 'all')} className="border rounded-xl p-3 bg-white">
          <option value="all">ทุกสถานะ</option>
          <option value="pending_verify">รอยืนยัน</option>
          <option value="verified">ยืนยันแล้ว</option>
          <option value="rejected">ไม่ผ่าน</option>
          <option value="draft">แบบร่าง</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="relative bg-gradient-to-br from-emerald-100 via-green-50 to-lime-100 h-96">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.08) 1px,transparent 1px)', backgroundSize: '30px 30px' }} />
          <div className="absolute top-4 left-4 bg-white/95 shadow-lg text-sm font-semibold px-4 py-2 rounded-xl text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Map preview
          </div>
          <div className="absolute top-4 right-4 bg-white/95 shadow-lg rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />ยืนยันแล้ว</div>
            <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />รอยืนยัน</div>
            <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />ไม่ผ่าน</div>
          </div>

          {farmsWithGps.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              ยังไม่มีแปลงที่มี GPS ตามเงื่อนไขที่เลือก
            </div>
          )}

          {farmsWithGps.map((farm, i) => {
            const x = 12 + (i * 17) % 76
            const y = 18 + (i * 23) % 64
            const isSel = farm.id === selectedId
            return (
              <button
                key={farm.id}
                onClick={() => setSelectedId(farm.id === selectedId ? null : farm.id)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${isSel ? 'scale-150 z-10' : 'hover:scale-125'}`}
              >
                <div className={`w-10 h-10 rounded-full border-4 border-white shadow-xl flex items-center justify-center ${markerClass(farm.verified_status)}`}>
                  <span className="text-base">🌾</span>
                </div>
                {isSel && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-2xl p-3 w-56 z-20 border border-gray-100 text-left">
                    <div className="font-bold text-gray-900 truncate">{farm.farm_name || 'ไม่ระบุชื่อแปลง'}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{farm.area_rai ?? '-'} ไร่ • {farm.district || '-'}</div>
                    <div className="text-xs text-gray-400 font-mono mt-1">📍 {farm.center_lat?.toFixed(6)}, {farm.center_lng?.toFixed(6)}</div>
                    <div className="text-xs text-gray-500 mt-1">{farm.subdistrict || '-'} / {farm.province || '-'}</div>
                    <div className={`mt-2 text-xs font-semibold ${farm.verified_status === 'verified' ? 'text-emerald-600' : farm.verified_status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                      {STATUS_LABEL[farm.verified_status] ?? farm.verified_status}
                    </div>
                    {farm.center_lat && farm.center_lng && (
                      <a href={googleMapsUrl(farm.center_lat, farm.center_lng)} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-600 font-medium">
                        <ExternalLink className="w-3 h-3" /> Google Maps
                      </a>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-2">แปลงที่เลือก</h3>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div><span className="text-gray-400">ชื่อแปลง:</span> {selected.farm_name || '-'}</div>
            <div><span className="text-gray-400">พื้นที่:</span> {selected.area_rai ?? '-'} ไร่</div>
            <div><span className="text-gray-400">สถานะ:</span> {STATUS_LABEL[selected.verified_status] ?? selected.verified_status}</div>
            <div><span className="text-gray-400">จังหวัด:</span> {selected.province || '-'}</div>
            <div><span className="text-gray-400">อำเภอ:</span> {selected.district || '-'}</div>
            <div><span className="text-gray-400">ตำบล:</span> {selected.subdistrict || '-'}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 mb-4">รายการแปลง</h3>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {farms.map(farm => (
            <button
              key={farm.id}
              onClick={() => setSelectedId(farm.id === selectedId ? null : farm.id)}
              className={`text-left flex items-center gap-3 p-3 rounded-xl transition-all ${selectedId === farm.id ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${markerClass(farm.verified_status)}`}>🌾</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">{farm.farm_name || 'ไม่ระบุชื่อแปลง'}</div>
                <div className="text-xs text-gray-500">{farm.area_rai ?? '-'} ไร่ • {farm.subdistrict || farm.district || '-'}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-lg font-semibold bg-white text-gray-600">{STATUS_LABEL[farm.verified_status] ?? farm.verified_status}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
