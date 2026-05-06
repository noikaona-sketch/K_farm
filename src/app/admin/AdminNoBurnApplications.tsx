import { useEffect, useState } from 'react'
import { CheckCircle, ClipboardCheck, MapPin, RefreshCw, Send, XCircle } from 'lucide-react'
import {
  assignNoBurnInspection,
  listNoBurnApplications,
  reviewNoBurnApplication,
  type AdminReviewStatus,
  type NoBurnApplicationRecord,
} from '../../lib/noBurn'
import { googleMapsUrl } from '../../lib/farms'
import { useAuth } from '../../routes/AuthContext'

const REVIEW_LABEL: Record<string, string> = {
  pending_review: 'รอตรวจ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่ผ่าน',
  need_more_data: 'ขอข้อมูลเพิ่ม',
}

const SALE_LABEL: Record<string, string> = {
  unknown: 'ยังไม่ทราบ',
  has_recent_sale: 'มีขายล่าสุด',
  has_old_sale: 'มีขายแต่ข้อมูลเก่า',
  no_sale_history: 'ไม่มีประวัติขาย',
  import_required: 'ต้องนำเข้าข้อมูล',
}

function statusClass(status: string) {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-700'
  if (status === 'rejected') return 'bg-red-100 text-red-700'
  if (status === 'need_more_data') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-700'
}

export default function AdminNoBurnApplications() {
  const { user } = useAuth()
  const [rows, setRows] = useState<NoBurnApplicationRecord[]>([])
  const [filter, setFilter] = useState<AdminReviewStatus | 'all'>('pending_review')
  const [selected, setSelected] = useState<NoBurnApplicationRecord | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [inspectorProfileId, setInspectorProfileId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const actorId = user?.profileId ?? user?.id ?? null

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listNoBurnApplications({ adminReviewStatus: filter })
      setRows(data)
      if (selected && !data.some(r => r.id === selected.id)) setSelected(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดรายการสมัครไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const review = async (decision: AdminReviewStatus) => {
    if (!selected) return
    setSaving(true)
    setOk('')
    setError('')
    try {
      const updated = await reviewNoBurnApplication({
        applicationId: selected.id,
        decision,
        note: reviewNote,
        actorId,
      })
      setOk(`บันทึกผล review: ${REVIEW_LABEL[decision]}`)
      setSelected({ ...selected, ...updated })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึก review ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const assign = async () => {
    if (!selected) return
    setSaving(true)
    setOk('')
    setError('')
    try {
      if (!inspectorProfileId.trim()) throw new Error('กรุณากรอก Profile ID ผู้ตรวจ/ทีมรถตรวจไม่เผา')
      await assignNoBurnInspection({
        applicationId: selected.id,
        inspectorProfileId: inspectorProfileId.trim(),
        farmId: selected.farm_id,
        farmerProfileId: selected.member_id,
        actorId,
        dueDate: dueDate || null,
      })
      setOk('Assign งานตรวจไม่เผาสำเร็จ')
      setInspectorProfileId('')
      setDueDate('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assign งานตรวจไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">กิจกรรมไม่เผา</h2>
          <p className="text-gray-500 mt-1">ตรวจสิทธิ์สมาชิก ตรวจประวัติขาย และมอบหมายงานตรวจแปลง</p>
        </div>
        <button onClick={load} disabled={loading} className="rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white px-4 py-2 font-bold flex items-center gap-2 justify-center">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
        </button>
      </div>

      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-2">
        {(['pending_review', 'approved', 'need_more_data', 'rejected', 'all'] as const).map(v => (
          <button key={v} onClick={() => setFilter(v)} className={`rounded-xl px-4 py-2 text-sm font-bold ${filter === v ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {v === 'all' ? 'ทั้งหมด' : REVIEW_LABEL[v]}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">รายการสมัคร</h3>
          <div className="space-y-3 max-h-[640px] overflow-auto pr-1">
            {rows.length === 0 && !loading && <div className="text-sm text-gray-500">ไม่พบรายการตามเงื่อนไข</div>}
            {rows.map(row => (
              <button
                key={row.id}
                onClick={() => { setSelected(row); setReviewNote(row.review_note ?? '') }}
                className={`w-full text-left rounded-2xl border p-4 transition ${selected?.id === row.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">{row.farms?.farm_name || 'ไม่ระบุชื่อแปลง'}</div>
                    <div className="text-xs text-gray-500 mt-1">สมาชิก: {row.member_id}</div>
                    <div className="text-xs text-gray-500 mt-1">{row.farms?.subdistrict || '-'} / {row.farms?.district || '-'} / {row.farms?.province || '-'}</div>
                  </div>
                  <span className={`text-xs rounded-lg px-2 py-1 font-bold ${statusClass(row.admin_review_status)}`}>{REVIEW_LABEL[row.admin_review_status]}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="bg-white rounded-lg px-2 py-1">ขาย: {SALE_LABEL[row.sale_history_status]}</span>
                  <span className="bg-white rounded-lg px-2 py-1">สถานะ: {row.status}</span>
                  <span className="bg-white rounded-lg px-2 py-1">แปลง: {row.farms?.verified_status || '-'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {!selected ? (
            <div className="text-gray-500 text-sm">เลือกรายการสมัครจากด้านซ้าย</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold text-gray-900"><ClipboardCheck className="w-5 h-5" />รายละเอียดการสมัคร</div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Activity:</span> {selected.activities?.activity_name || selected.activity_id}</div>
                <div><span className="text-gray-400">สมาชิก:</span> {selected.member_id}</div>
                <div><span className="text-gray-400">แปลง:</span> {selected.farms?.farm_name || selected.farm_id}</div>
                <div><span className="text-gray-400">พื้นที่:</span> {selected.farms?.area_rai ?? '-'} ไร่</div>
                <div><span className="text-gray-400">ข้อมูลขาย:</span> {SALE_LABEL[selected.sale_history_status]}</div>
                <div><span className="text-gray-400">ขายล่าสุด:</span> {selected.latest_sale_date || selected.latest_sale_season || '-'}</div>
              </div>

              <div className="rounded-2xl bg-gray-50 border p-4 text-sm space-y-2">
                <div className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4" />ตำแหน่งแปลง</div>
                <div>{selected.farms?.subdistrict || '-'} / {selected.farms?.district || '-'} / {selected.farms?.province || '-'}</div>
                <div className="text-xs text-gray-500 font-mono">{selected.farms?.center_lat ?? '-'}, {selected.farms?.center_lng ?? '-'}</div>
                {selected.farms?.center_lat && selected.farms?.center_lng && (
                  <a href={googleMapsUrl(selected.farms.center_lat, selected.farms.center_lng)} target="_blank" rel="noreferrer" className="inline-block text-blue-600 font-bold">เปิด Google Maps</a>
                )}
              </div>

              <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="บันทึก Admin review" className="w-full border rounded-xl p-3 min-h-24" />

              <div className="grid sm:grid-cols-3 gap-2">
                <button disabled={saving} onClick={() => review('approved')} className="rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" />Approve</button>
                <button disabled={saving} onClick={() => review('need_more_data')} className="rounded-xl bg-amber-500 disabled:bg-gray-300 text-white py-3 font-bold">ขอข้อมูลเพิ่ม</button>
                <button disabled={saving} onClick={() => review('rejected')} className="rounded-xl bg-red-600 disabled:bg-gray-300 text-white py-3 font-bold flex items-center justify-center gap-2"><XCircle className="w-4 h-4" />Reject</button>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="font-bold">Assign งานตรวจไม่เผา</div>
                <input value={inspectorProfileId} onChange={(e) => setInspectorProfileId(e.target.value)} placeholder="Profile ID ผู้ตรวจ / ทีมรถตรวจไม่เผา" className="w-full border rounded-xl p-3" />
                <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="w-full border rounded-xl p-3" />
                <button disabled={saving || selected.admin_review_status !== 'approved'} onClick={assign} className="w-full rounded-xl bg-blue-600 disabled:bg-gray-300 text-white py-3 font-bold flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Assign งานตรวจ
                </button>
                {selected.admin_review_status !== 'approved' && <div className="text-xs text-amber-600">ต้อง Approve รายการก่อน จึง assign งานตรวจได้</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
