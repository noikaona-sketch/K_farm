import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, User, Crown, Check, MapPin, Clock,
  Camera, RefreshCw, AlertCircle, Sprout, Leaf,
  TrendingUp, ShoppingCart, Truck, ChevronLeft, Wifi, WifiOff,
} from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import {
  insertPlantingCycle, fetchPlantingCycles,
  insertSaleRequest, fetchSaleRequests,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import {
  MOCK_PLANTING_RECORDS, MOCK_SALE_HISTORY, MOCK_NO_BURN,
  MOCK_FARMS,
  type PlantingRecord, type SaleHistory, type PlantPhoto, type NoBurnPhoto,
} from '../../data/mockData'

// ── EXIF GPS reader ────────────────────────────────────────
function readExifCoords(file: File): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const view = new DataView(e.target!.result as ArrayBuffer)
        if (view.getUint16(0, false) !== 0xFFD8) return resolve(null)
        let off = 2
        while (off < view.byteLength) {
          const marker = view.getUint16(off, false); off += 2
          if (marker === 0xFFE1) {
            const es = String.fromCharCode(...new Uint8Array(e.target!.result as ArrayBuffer, off + 2, 4))
            if (es !== 'Exif') return resolve(null)
            const ts = off + 8; const le = view.getUint16(ts, false) === 0x4949
            const ifd0 = ts + view.getUint32(ts + 4, le); const ent = view.getUint16(ifd0, le)
            let gpsOff: number | null = null
            for (let i = 0; i < ent; i++)
              if (view.getUint16(ifd0 + 2 + i * 12, le) === 0x8825)
                gpsOff = view.getUint32(ifd0 + 2 + i * 12 + 8, le)
            if (gpsOff == null) return resolve(null)
            const gIfd = ts + gpsOff; const ge = view.getUint16(gIfd, le)
            let lr: string | undefined, lv: number | undefined, nr: string | undefined, nv: number | undefined
            for (let i = 0; i < ge; i++) {
              const b = gIfd + 2 + i * 12; const tag = view.getUint16(b, le)
              const vo = view.getUint32(b + 8, le)
              const r = (o: number) => { const n = view.getUint32(ts + o, le), d = view.getUint32(ts + o + 4, le); return d ? n / d : 0 }
              if (tag === 0x0001) lr = String.fromCharCode(view.getUint8(b + 8))
              if (tag === 0x0002) lv = r(vo) + r(vo + 8) / 60 + r(vo + 16) / 3600
              if (tag === 0x0003) nr = String.fromCharCode(view.getUint8(b + 8))
              if (tag === 0x0004) nv = r(vo) + r(vo + 8) / 60 + r(vo + 16) / 3600
            }
            if (lv != null && nv != null)
              return resolve({ lat: lr === 'S' ? -lv : lv, lng: nr === 'W' ? -nv : nv })
            return resolve(null)
          }
          off += view.getUint16(off, false)
        }
        resolve(null)
      } catch { resolve(null) }
    }
    reader.readAsArrayBuffer(file)
  })
}

const STEP_ICONS: Record<string, string> = {
  seed_received: '🌾', land_prep: '🚜', planting: '🌱',
  fertilize1: '💊', fertilize2: '💊', harvest: '🌽', sale_scheduled: '🚛',
}

// ── Photo capture component ────────────────────────────────
function PhotoCapture({ onCapture, label }: { onCapture: (d: string, lat?: number, lng?: number) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { const d = ev.target!.result as string; setPreview(d); onCapture(d) }
    reader.readAsDataURL(file)
    const exif = await readExifCoords(file)
    if (exif) { setCoords(exif); onCapture(URL.createObjectURL(file), exif.lat, exif.lng) }
    else if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(p => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude }
        setCoords(c)
      }, () => { })
  }

  return (
    <div>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      {preview ? (
        <div className="relative">
          <img src={preview} className="w-full h-32 object-cover rounded-xl" />
          {coords && <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-lg">📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>}
          <button onClick={() => { setPreview(null); setCoords(null) }}
            className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-5 flex flex-col items-center gap-2 hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
          <Camera className="w-8 h-8 text-emerald-400" />
          <span className="text-xs text-gray-500">{label}</span>
          <span className="text-[10px] text-gray-400">พิกัด GPS บันทึกอัตโนมัติ</span>
        </button>
      )}
    </div>
  )
}

// ── MapView ────────────────────────────────────────────────
function MapView({ photos }: { photos: (PlantPhoto | NoBurnPhoto)[] }) {
  const [selId, setSelId] = useState<string | null>(null)
  const wc = photos.filter(p => p.lat && p.lng)
  if (!wc.length) return <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-xs">ยังไม่มีภาพที่มีพิกัด GPS</div>
  return (
    <div className="space-y-2">
      <div className="relative bg-gradient-to-br from-emerald-100 to-lime-100 rounded-2xl h-44 overflow-hidden border border-emerald-200">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.1) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-2 left-2 bg-white/80 text-[10px] px-2 py-1 rounded-lg font-medium text-gray-600">🗺️ ภาพตามพิกัด GPS</div>
        {wc.map((p, i) => {
          const x = 15 + (i * 19) % 65; const y = 20 + (i * 27) % 55
          const cap = 'caption' in p ? p.caption : p.label; const isSel = p.id === selId
          return (
            <button key={p.id} onClick={() => setSelId(p.id === selId ? null : p.id)}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${isSel ? 'z-10 scale-125' : 'hover:scale-110'}`}>
              <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm ${isSel ? 'bg-yellow-400' : 'bg-emerald-500'}`}>📷</div>
              {isSel && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-xl p-2 w-40 z-20 border border-gray-100">
                  <div className="text-[10px] font-semibold text-gray-700 truncate">{cap}</div>
                  <div className="text-[9px] text-gray-400">📍 {p.lat?.toFixed(4)}, {p.lng?.toFixed(4)}</div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────
export default function PlantingRecord() {
  const { user } = useAuth()
  const uid = user?.id ?? 'f1'

  const [tab, setTab] = useState<'status' | 'crop' | 'noburn'>('status')
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [showNoBurnForm, setShowNoBurnForm] = useState(false)
  const [expandedReg, setExpandedReg] = useState<string | null>('nb1')

  // Data state
  const [cycles, setCycles] = useState<PlantingRecord[]>([])
  const [sales, setSales] = useState<SaleHistory[]>([])
  const [dataSource, setDataSource] = useState<'supabase' | 'mock'>('mock')
  const [dataLoading, setDataLoading] = useState(true)

  // Sale form state
  const [showSaleForm, setShowSaleForm] = useState(false)
  const [saleForm, setSaleForm] = useState({ date: '', qty: '', price: '', grade: 'A', moisture: '', buyer: '' })
  const [savingSale, setSavingSale] = useState(false)
  const [saleErr, setSaleErr] = useState<string | null>(null)

  // Cycle form state
  const [cycleForm, setCycleForm] = useState({ variety: '', plantDate: '', harvestDate: '', seedDate: '', yield: '' })
  const [savingCycle, setSavingCycle] = useState(false)
  const [cycleErr, setCycleErr] = useState<string | null>(null)
  const [cycleSaved, setCycleSaved] = useState(false)

  const farms = MOCK_FARMS.filter(f => f.farmerId === uid)
  const noBurnRegs = MOCK_NO_BURN.filter(r => r.farmerId === uid)

  useEffect(() => { loadData() }, [uid])

  const loadData = async () => {
    setDataLoading(true)
    const [cyclesRes, salesRes] = await Promise.all([
      fetchPlantingCycles(uid),
      fetchSaleRequests(uid),
    ])
    setCycles(cyclesRes.data ?? MOCK_PLANTING_RECORDS.filter(r => r.farmerId === uid))
    setSales(salesRes.data ?? MOCK_SALE_HISTORY.filter(s => s.farmerId === uid))
    setDataSource(cyclesRes.source)
    setDataLoading(false)
  }

  const rec = cycles[0] ?? MOCK_PLANTING_RECORDS.find(r => r.farmerId === uid)
  const ageDays = rec ? Math.max(0, Math.round((Date.now() - new Date(rec.plantDate).getTime()) / 86400000)) : 0
  const totalDays = rec ? Math.max(1, Math.round((new Date(rec.estimatedHarvestDate).getTime() - new Date(rec.plantDate).getTime()) / 86400000)) : 1
  const progress = Math.min(100, Math.round((ageDays / totalDays) * 100))

  const handleSaveSale = async () => {
    if (!saleForm.qty || !saleForm.price) { setSaleErr('กรุณากรอกปริมาณและราคา'); return }
    setSavingSale(true); setSaleErr(null)
    const res = await insertSaleRequest({
      farmer_id: uid,
      variety: 'ข้าวโพดอาหารสัตว์',
      grade: saleForm.grade as 'A' | 'B' | 'C',
      quantity: parseFloat(saleForm.qty),
      price_per_ton: parseFloat(saleForm.price),
      moisture_percent: saleForm.moisture ? parseFloat(saleForm.moisture) : undefined,
      buyer: saleForm.buyer || undefined,
      sale_date: saleForm.date || new Date().toISOString().split('T')[0],
    })
    setSavingSale(false)
    if (res.error && isSupabaseReady) { setSaleErr(res.error); return }
    setShowSaleForm(false)
    setSaleForm({ date: '', qty: '', price: '', grade: 'A', moisture: '', buyer: '' })
    await loadData()
  }

  const handleSaveCycle = async () => {
    if (!cycleForm.variety || !cycleForm.plantDate || !cycleForm.harvestDate) {
      setCycleErr('กรุณากรอกพันธุ์ วันปลูก และวันเก็บเกี่ยว'); return
    }
    setSavingCycle(true); setCycleErr(null)
    const now = new Date()
    const res = await insertPlantingCycle({
      farmer_id: uid,
      variety: cycleForm.variety,
      season: `${now.getFullYear() + 543 - 1}/${String(now.getFullYear() + 543).slice(-2)}`,
      year: now.getFullYear(),
      seed_received_date: cycleForm.seedDate || undefined,
      plant_date: cycleForm.plantDate,
      estimated_harvest_date: cycleForm.harvestDate,
      estimated_yield: cycleForm.yield ? parseFloat(cycleForm.yield) : undefined,
      status: 'growing',
    })
    setSavingCycle(false)
    if (res.error && isSupabaseReady) { setCycleErr(res.error); return }
    setCycleSaved(true)
    setSelectedStage(null)
    await loadData()
    setTimeout(() => setCycleSaved(false), 3000)
  }

  const nbSt: Record<string, { l: string; c: string; icon: string }> = {
    pending: { l: 'รอดำเนินการ', c: 'bg-gray-100 text-gray-600', icon: '⏳' },
    photo_submitted: { l: 'ส่งภาพแล้ว', c: 'bg-blue-100 text-blue-700', icon: '📷' },
    reviewing: { l: 'กำลังตรวจสอบ', c: 'bg-yellow-100 text-yellow-700', icon: '🔍' },
    approved: { l: 'ผ่านการตรวจสอบ', c: 'bg-emerald-100 text-emerald-700', icon: '✅' },
    rejected: { l: 'ไม่ผ่าน', c: 'bg-red-100 text-red-700', icon: '❌' },
  }
  const ptLabels: Record<string, string> = {
    before_harvest: 'แปลงก่อนเก็บเกี่ยว',
    after_harvest: 'แปลงหลังเก็บเกี่ยว',
    field_condition: 'สภาพแปลงปัจจุบัน',
  }

  const statusTimeline = [
    { label: 'ส่งบิล + ปักพิกัด', sub: 'อัปโหลดบิลและรูปแปลง', Icon: Upload, done: true, current: false },
    { label: 'รอหัวหน้ากลุ่มยืนยัน', sub: 'Leader ตรวจสอบข้อมูล', Icon: User, done: false, current: true },
    { label: 'รอ Admin อนุมัติ', sub: 'ตรวจสิทธิ์เข้าร่วมโครงการ', Icon: Crown, done: false, current: false },
    { label: 'เข้าร่วมโครงการสำเร็จ', sub: 'รับสิทธิ์ + โบนัส +100 บาท/ตัน', Icon: Check, done: false, current: false },
  ]

  const cropStages = [
    { id: 'seed', Icon: Sprout, label: 'รับเมล็ดพันธุ์', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300' },
    { id: 'plant', Icon: Leaf, label: 'วันปลูก', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-300' },
    { id: 'growth', Icon: TrendingUp, label: 'การเจริญเติบโต', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-300' },
    { id: 'harvest', Icon: ShoppingCart, label: 'ครบวันเก็บเกี่ยว', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-300' },
    { id: 'sale', Icon: Truck, label: 'นัดวันเข้าขาย', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-300' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Source indicator */}
      <div className="bg-white border-b border-gray-100 px-5 pt-4 pb-0 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {dataSource === 'supabase'
              ? <><Wifi className="w-3 h-3 text-emerald-600" /><span className="text-xs text-emerald-600 font-medium">Supabase</span></>
              : <><WifiOff className="w-3 h-3 text-amber-500" /><span className="text-xs text-amber-600 font-medium">Mock data</span></>}
          </div>
          <button onClick={loadData} className="p-1 rounded-lg hover:bg-gray-100">
            <RefreshCw className={`w-4 h-4 text-gray-400 ${dataLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {([['status', '📋', 'สถานะ'], ['crop', '🌽', 'แจ้งปลูก'], ['noburn', '🚫🔥', 'ไม่เผา']] as [typeof tab, string, string][]).map(([k, ic, lb]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === k ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>
              <span>{ic}</span><span>{lb}</span>
            </button>
          ))}
        </div>
        <div className="h-4" />
      </div>

      <div className="p-5 space-y-4">

        {/* ── STATUS TAB ── */}
        {tab === 'status' && (<>
          {cycleSaved && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <Check className="w-4 h-4" />บันทึกรอบการปลูกสำเร็จ{isSupabaseReady ? ' (Supabase)' : ' (Mock)'}
            </div>
          )}

          {rec && (
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -mr-14 -mt-14" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-emerald-200 uppercase font-semibold tracking-wider">อายุข้าวโพด</div>
                    <div className="text-4xl font-bold mt-1">{ageDays} <span className="text-lg font-normal text-emerald-200">วัน</span></div>
                    <div className="text-emerald-200 text-sm mt-1">{Math.floor(ageDays / 7)} สัปดาห์ • พันธุ์ {rec.variety}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl">🌽</div>
                    {rec.saleScheduledDate && <div className="mt-1 bg-amber-400 text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg">🚛 นัดขาย {rec.saleScheduledDate}</div>}
                  </div>
                </div>
                {rec.status !== 'harvested' && (
                  <div>
                    <div className="flex justify-between text-xs text-emerald-200 mb-1.5">
                      <span>{rec.plantDate}</span><span className="font-bold">{progress}%</span><span>{rec.estimatedHarvestDate}</span>
                    </div>
                    <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-300 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="font-bold text-gray-800 mb-4">ขั้นตอนการดำเนินการ</p>
            <div className="relative pl-10">
              <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-emerald-200 rounded" />
              {statusTimeline.map((s, i) => (
                <div key={i} className={`relative mb-6 ${!s.done && !s.current ? 'opacity-40' : ''}`}>
                  <div className={`absolute -left-8 top-0 w-8 h-8 rounded-full flex items-center justify-center ${s.done ? 'bg-emerald-600 border-4 border-emerald-700' : s.current ? 'bg-amber-500 border-4 border-amber-600 shadow-lg' : 'bg-gray-300 border-4 border-gray-400'}`}>
                    {s.done ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <span className="text-xs font-bold text-white">{i + 1}</span>}
                  </div>
                  <div className={`${s.current ? 'bg-amber-50 border-2 border-amber-400' : 'bg-white border-2 border-gray-100'} rounded-xl p-4`}>
                    <div className="flex items-center gap-2 mb-1">
                      <s.Icon className={`w-4 h-4 ${s.done ? 'text-emerald-700' : s.current ? 'text-amber-700' : 'text-gray-400'}`} />
                      <div className={`font-bold text-sm ${s.done ? 'text-emerald-900' : s.current ? 'text-amber-700' : 'text-gray-500'}`}>{s.label}</div>
                    </div>
                    <div className="text-xs text-gray-500 ml-6">{s.sub}</div>
                    {s.current && <div className="text-xs text-amber-700 font-bold mt-2 ml-6 flex items-center gap-1"><Clock className="w-3 h-3" />กำลังดำเนินการ...</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sale history */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">ประวัติการขาย</h3>
              <button onClick={() => setShowSaleForm(!showSaleForm)}
                className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
                + บันทึก
              </button>
            </div>

            {showSaleForm && (
              <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
                <div className="flex items-center gap-1.5 mb-1">
                  {isSupabaseReady
                    ? <><Wifi className="w-3 h-3 text-emerald-600" /><span className="text-xs text-emerald-600">จะบันทึกลง Supabase</span></>
                    : <><WifiOff className="w-3 h-3 text-amber-500" /><span className="text-xs text-amber-600">Mock mode</span></>}
                </div>
                {saleErr && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{saleErr}</div>}
                <div className="grid grid-cols-2 gap-3">
                  {[['วันที่ขาย', 'date', 'date'], ['ปริมาณ (ตัน)', 'qty', 'number'], ['ราคา บ./ตัน', 'price', 'number'], ['% ความชื้น', 'moisture', 'number']].map(([l, k, t]) => (
                    <div key={k}>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">{l}</label>
                      <input type={t} value={saleForm[k as keyof typeof saleForm]}
                        onChange={e => setSaleForm(f => ({ ...f, [k]: e.target.value }))}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">เกรด</label>
                  <div className="flex gap-2">
                    {['A', 'B', 'C'].map(g => (
                      <button key={g} onClick={() => setSaleForm(f => ({ ...f, grade: g }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${saleForm.grade === g ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200 text-gray-500'}`}>{g}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">ผู้รับซื้อ</label>
                  <input value={saleForm.buyer} onChange={e => setSaleForm(f => ({ ...f, buyer: e.target.value }))}
                    placeholder="โรงงาน / สหกรณ์"
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowSaleForm(false)}
                    className="flex-1 border-2 border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold">ยกเลิก</button>
                  <button onClick={handleSaveSale} disabled={savingSale}
                    className={`flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1 ${savingSale ? 'opacity-70' : 'hover:bg-emerald-700'}`}>
                    {savingSale ? <><RefreshCw className="w-3 h-3 animate-spin" />บันทึก...</> : '✓ บันทึก'}
                  </button>
                </div>
              </div>
            )}

            {dataLoading ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" /></div>
            ) : sales.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีประวัติการขาย</div>
            ) : (
              sales.map(sale => (
                <div key={sale.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-gray-800 text-sm">{sale.buyer || 'ไม่ระบุผู้รับซื้อ'}</div>
                      <div className="text-xs text-gray-500">{sale.saleDate} • ความชื้น {sale.moisturePercent}%</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700">{sale.totalAmount.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">บาท</div>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-gray-100 rounded-lg px-2 py-1">{sale.quantity} ตัน</span>
                    <span className="bg-amber-50 text-amber-700 rounded-lg px-2 py-1">{sale.pricePerTon.toLocaleString()} บ./ตัน</span>
                    <span className={`rounded-lg px-2 py-1 ${sale.grade === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>เกรด {sale.grade}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Photos */}
          {rec && rec.photos.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3">📍 ภาพแปลงตามพิกัด</h3>
              <MapView photos={rec.photos} />
            </div>
          )}
        </>)}

        {/* ── CROP CYCLE TAB ── */}
        {tab === 'crop' && (
          selectedStage ? (
            <div className="space-y-4">
              <button onClick={() => setSelectedStage(null)} className="flex items-center gap-2 text-emerald-600 font-medium">
                <ChevronLeft className="w-5 h-5" />กลับ
              </button>

              {(() => {
                const st = cropStages.find(s => s.id === selectedStage)!
                return (
                  <div className={`${st.bg} border-2 ${st.border} rounded-2xl p-5 space-y-4`}>
                    <div className="flex items-center gap-3">
                      <st.Icon className={`w-8 h-8 ${st.color}`} />
                      <h3 className="font-bold text-gray-800 text-lg">{st.label}</h3>
                    </div>

                    {/* สำหรับ plant stage — บันทึกรอบการปลูกใหม่ลง Supabase */}
                    {selectedStage === 'plant' && (<>
                      <div className="flex items-center gap-1.5">
                        {isSupabaseReady
                          ? <><Wifi className="w-3 h-3 text-emerald-600" /><span className="text-xs text-emerald-600">จะบันทึกลง planting_cycles</span></>
                          : <><WifiOff className="w-3 h-3 text-amber-500" /><span className="text-xs text-amber-600">Mock mode</span></>}
                      </div>
                      {cycleErr && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{cycleErr}</div>}
                      {[
                        { l: 'พันธุ์ข้าวโพด *', k: 'variety', p: 'เช่น PAC339', t: 'text' },
                        { l: 'วันที่รับเมล็ดพันธุ์', k: 'seedDate', p: '', t: 'date' },
                        { l: 'วันที่ปลูก *', k: 'plantDate', p: '', t: 'date' },
                        { l: 'วันคาดว่าจะเก็บเกี่ยว *', k: 'harvestDate', p: '', t: 'date' },
                        { l: 'ผลผลิตที่คาดหวัง (ตัน)', k: 'yield', p: '10', t: 'number' },
                      ].map(({ l, k, p, t }) => (
                        <div key={k}>
                          <label className="text-sm font-medium text-gray-700 block mb-1.5">{l}</label>
                          <input type={t} value={cycleForm[k as keyof typeof cycleForm]}
                            onChange={e => setCycleForm(f => ({ ...f, [k]: e.target.value }))}
                            placeholder={p}
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" />
                        </div>
                      ))}
                      <PhotoCapture label="ถ่ายภาพวันปลูก" onCapture={() => { }} />
                      <button onClick={handleSaveCycle} disabled={savingCycle}
                        className={`w-full bg-emerald-600 text-white rounded-xl py-4 font-bold text-base hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 ${savingCycle ? 'opacity-70' : 'active:scale-[.98]'}`}>
                        {savingCycle ? <><RefreshCw className="w-5 h-5 animate-spin" />กำลังบันทึก...</> : <><Check className="w-5 h-5" />บันทึกการปลูก</>}
                      </button>
                    </>)}

                    {/* Other stages — simple form */}
                    {selectedStage !== 'plant' && (<>
                      {selectedStage === 'seed' && <div><label className="text-sm font-medium text-gray-700 block mb-1.5">วันที่รับเมล็ดพันธุ์</label><input type="date" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" /></div>}
                      {selectedStage === 'growth' && <div><label className="text-sm font-medium text-gray-700 block mb-1.5">บันทึกการเจริญเติบโต</label><textarea rows={3} placeholder="บันทึกสิ่งที่สังเกตเห็น..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 resize-none" /></div>}
                      {selectedStage === 'harvest' && <div><label className="text-sm font-medium text-gray-700 block mb-1.5">วันที่เก็บเกี่ยว</label><input type="date" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" /></div>}
                      {selectedStage === 'sale' && (<>
                        <div><label className="text-sm font-medium text-gray-700 block mb-1.5">วันนัดเข้าขาย</label><input type="date" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" /></div>
                        <div><label className="text-sm font-medium text-gray-700 block mb-1.5">น้ำหนักประมาณ (ตัน)</label><input type="number" placeholder="เช่น 10.5" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" /></div>
                      </>)}
                      <PhotoCapture label="ถ่ายภาพประกอบ" onCapture={() => { }} />
                      <button onClick={() => setSelectedStage(null)}
                        className="w-full bg-emerald-600 text-white rounded-xl py-4 font-bold text-base hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 active:scale-[.98]">
                        <Check className="w-5 h-5" />บันทึก{st.label}
                      </button>
                    </>)}
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-emerald-600 rounded-2xl p-4 text-white">
                <h2 className="font-bold text-lg mb-1">แจ้งสถานะวงจรการเพาะปลูก</h2>
                <p className="text-emerald-100 text-sm">เลือกขั้นตอนที่ต้องการบันทึก</p>
              </div>
              {cycleSaved && <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center gap-2 text-emerald-700 text-sm font-medium"><Check className="w-4 h-4" />บันทึกสำเร็จ{isSupabaseReady ? ' (Supabase)' : ' (Mock)'}</div>}
              {cropStages.map(s => (
                <div key={s.id} onClick={() => setSelectedStage(s.id)}
                  className={`${s.bg} border-2 ${s.border} rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all active:scale-[.98]`}>
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <s.Icon className={`w-7 h-7 ${s.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{s.label}</div>
                    {s.id === 'plant' && isSupabaseReady && <div className="text-xs text-emerald-600 mt-0.5">💾 บันทึกลง Supabase</div>}
                  </div>
                  <span className="text-gray-400 text-xl">›</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── NO BURN TAB ── */}
        {tab === 'noburn' && (<>
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🚫🔥</span>
              <div>
                <div className="font-bold text-lg">โครงการข้าวโพดสด ไม่เผา</div>
                <div className="text-orange-100 text-sm">รับโบนัส <strong>+50 บาท/ตัน</strong></div>
              </div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 space-y-1.5 text-sm text-orange-50">
              {['ลงทะเบียนเข้าร่วมโครงการ', 'ถ่ายภาพแปลงก่อน/หลังเก็บเกี่ยว (พร้อม GPS)', 'ส่งภาพให้เจ้าหน้าที่ตรวจสอบ', 'รอผลการตรวจสอบ → รับโบนัส'].map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="bg-white/30 text-white text-xs font-bold px-1.5 py-0.5 rounded">{i + 1}</span>{t}
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setShowNoBurnForm(!showNoBurnForm)}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-base hover:bg-orange-600 transition-colors">
            🌿 + ลงทะเบียนสิทธิ์ไม่เผา
          </button>

          {showNoBurnForm && (
            <div className="bg-white rounded-2xl shadow-md border border-orange-200 p-5 space-y-4">
              <h3 className="font-bold text-gray-800 border-b pb-2">📝 ลงทะเบียนไม่เผาตอซัง</h3>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">เลือกแปลง</label>
                <select className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                  {farms.map(f => <option key={f.id}>{f.name} ({f.area} ไร่)</option>)}
                </select>
              </div>
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-800 font-semibold mb-1">คำมั่นสัญญา</p>
                <p className="text-sm text-orange-700">ข้าพเจ้าขอให้คำมั่นสัญญาว่าจะไม่เผาตอซังข้าวโพด จะทำการไถกลบหรือสับกลบแทน</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-orange-500" />
                <span className="text-sm text-gray-700">ยอมรับเงื่อนไขและให้คำมั่นสัญญา</span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShowNoBurnForm(false)}
                  className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold">ยกเลิก</button>
                <button onClick={() => setShowNoBurnForm(false)}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600">ลงทะเบียน</button>
              </div>
            </div>
          )}

          {noBurnRegs.map(reg => {
            const st = nbSt[reg.status]; const isExp = expandedReg === reg.id
            return (
              <div key={reg.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button className="w-full p-5 text-left" onClick={() => setExpandedReg(isExp ? null : reg.id)}>
                  <div className="flex items-start justify-between">
                    <div><div className="font-bold text-gray-800">{reg.farmName}</div><div className="text-sm text-gray-500 mt-0.5">{reg.season}</div></div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0 ml-2 ${st.c}`}>{st.icon} {st.l}</span>
                  </div>
                  {reg.status === 'approved' && (
                    <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex justify-between">
                      <span className="text-sm text-emerald-700">โบนัสที่ได้รับ</span>
                      <span className="font-bold text-emerald-700">+{reg.bonusPerTon} บาท/ตัน</span>
                    </div>
                  )}
                  {reg.reviewNote && <div className="mt-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-2">{reg.reviewNote}</div>}
                  <div className="mt-2 text-right text-xs text-gray-400">{isExp ? '▲ ซ่อน' : '▼ ดู/ส่งภาพ'}</div>
                </button>
                {isExp && (
                  <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50/50">
                    {reg.photos.length > 0 && (
                      <div><h4 className="text-sm font-bold text-gray-600 mb-2">📷 ภาพที่ส่งแล้ว</h4><MapView photos={reg.photos} /></div>
                    )}
                    {reg.status !== 'approved' && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-600 mb-3">📤 ส่งภาพเพิ่มเติม</h4>
                        {(['before_harvest', 'after_harvest', 'field_condition'] as const).map(type => {
                          if (reg.photos.some(p => p.photoType === type)) return null
                          return (
                            <div key={type} className="mb-3">
                              <div className="text-xs text-gray-500 mb-1.5 font-medium">{ptLabels[type]}</div>
                              <PhotoCapture label={`ถ่าย: ${ptLabels[type]}`} onCapture={() => { }} />
                            </div>
                          )
                        })}
                        <button className="w-full mt-2 bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-colors">📤 ส่งภาพให้เจ้าหน้าที่ตรวจสอบ</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </>)}
      </div>
    </div>
  )
}
