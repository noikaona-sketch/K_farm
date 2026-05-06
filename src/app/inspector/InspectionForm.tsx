import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Check, ExternalLink, RefreshCw } from 'lucide-react'
import { getInspectionTask, submitInspectionResult, type InspectionTaskRecord } from '../../lib/inspectionTasks'
import { googleMapsUrl } from '../../lib/farms'
import { useAuth } from '../../routes/AuthContext'

type CheckKey = 'noBurning' | 'noSmokeTrace' | 'residueManaged' | 'photoReady' | 'gpsConfirmed' | 'neighborRisk'

const ITEMS: { key: CheckKey; label: string; icon: string; desc: string }[] = [
  { key: 'noBurning', label: 'ไม่พบร่องรอยการเผา', icon: '🚫🔥', desc: 'ไม่พบขี้เถ้า/รอยไหม้ใหม่ในแปลง' },
  { key: 'noSmokeTrace', label: 'ไม่พบควันหรือกลิ่นไหม้', icon: '💨', desc: 'ตรวจสอบสภาพแวดล้อมรอบแปลง' },
  { key: 'residueManaged', label: 'จัดการเศษวัสดุหลังเก็บเกี่ยว', icon: '🌾', desc: 'ไถกลบ/คลุมดิน/อัดฟาง หรือจัดการแบบไม่เผา' },
  { key: 'photoReady', label: 'มีรูปหลักฐาน', icon: '📷', desc: 'บันทึกภาพแปลงสำหรับแนบภายหลัง' },
  { key: 'gpsConfirmed', label: 'พิกัดตรงกับแปลง', icon: '📍', desc: 'ตรวจตำแหน่ง GPS แล้วว่าอยู่ในพื้นที่จริง' },
  { key: 'neighborRisk', label: 'ไม่พบความเสี่ยงจากพื้นที่ข้างเคียง', icon: '🧭', desc: 'รอบแปลงไม่มีจุดเสี่ยงที่อาจกระทบผลตรวจ' },
]

const emptyChecks: Record<CheckKey, boolean> = {
  noBurning: false,
  noSmokeTrace: false,
  residueManaged: false,
  photoReady: false,
  gpsConfirmed: false,
  neighborRisk: false,
}

export default function InspectionForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [task, setTask] = useState<InspectionTaskRecord | null>(null)
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>(emptyChecks)
  const [notes, setNotes] = useState('')
  const [finding, setFinding] = useState<'confirmed_no_burn' | 'suspected_burn' | 'need_recheck'>('confirmed_no_burn')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const actorId = user?.profileId ?? user?.id ?? null

  const score = useMemo(() => Math.round((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100), [checks])

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const row = await getInspectionTask(id)
      setTask(row)
      const result = row.result ?? {}
      if (typeof result.notes === 'string') setNotes(result.notes)
      if (typeof result.finding === 'string') setFinding(result.finding as typeof finding)
      if (result.checks && typeof result.checks === 'object') {
        setChecks({ ...emptyChecks, ...(result.checks as Partial<Record<CheckKey, boolean>>) })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดงานตรวจไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const save = async () => {
    if (!id) return
    setSaving(true)
    setError('')
    try {
      await submitInspectionResult({
        taskId: id,
        actorId,
        status: 'done',
        result: {
          inspection_type: task?.inspection_type ?? 'general',
          finding,
          score,
          checks,
          notes,
          submitted_at: new Date().toISOString(),
          submitted_by: actorId,
        },
      })
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกผลตรวจไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5 text-center">
      <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6 shadow-xl" style={{ background: `conic-gradient(#059669 0% ${score}%, #e5e7eb ${score}% 100%)` }}>
        <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-gray-800">{score}</div>
          <div className="text-xs text-gray-400">/ 100</div>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">บันทึกผลสำเร็จ</h2>
      <p className="text-gray-500 mb-1">{task?.farms?.farm_name || 'แปลงเกษตร'}</p>
      <p className={`text-base font-bold mb-6 ${finding === 'confirmed_no_burn' ? 'text-emerald-600' : 'text-amber-600'}`}>{finding === 'confirmed_no_burn' ? '✅ ไม่พบการเผา' : '⚠️ ต้องตรวจสอบเพิ่ม'}</p>
      <button onClick={() => navigate('/inspector')} className="w-full max-w-sm bg-emerald-600 text-white rounded-xl py-4 font-bold hover:bg-emerald-700 transition-colors">กลับรายการ</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <div>
          <div className="font-bold text-lg">แบบฟอร์มตรวจแปลง</div>
          <div className="text-xs opacity-80">{task?.inspection_type === 'no_burn' ? 'กิจกรรมไม่เผา' : 'ตรวจทั่วไป'} • {task?.farms?.farm_name || '-'}</div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {loading && <div className="rounded-xl bg-blue-50 border border-blue-200 text-blue-700 p-3 text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />กำลังโหลดงานตรวจ...</div>}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white flex items-center justify-between shadow-lg">
          <div>
            <div className="text-sm text-emerald-200 mb-1">คะแนนปัจจุบัน</div>
            <div className="text-5xl font-bold">{score}</div>
            <div className="text-emerald-200 text-sm">/100 คะแนน</div>
          </div>
          <div className="w-20 h-20 rounded-full border-4 border-white/30 flex flex-col items-center justify-center bg-white/10">
            <div className="text-2xl font-bold">{Object.values(checks).filter(Boolean).length}</div>
            <div className="text-xs text-emerald-200">/{Object.keys(checks).length}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2 text-sm">
          <div className="font-bold text-gray-800">ข้อมูลแปลง</div>
          <div>{task?.farms?.farm_name || '-'} • {task?.farms?.area_rai ?? '-'} ไร่</div>
          <div className="text-gray-500">{task?.farms?.subdistrict || '-'} / {task?.farms?.district || '-'} / {task?.farms?.province || '-'}</div>
          <div className="text-gray-400 font-mono text-xs">{task?.farms?.center_lat ?? '-'}, {task?.farms?.center_lng ?? '-'}</div>
          {task?.farms?.center_lat && task?.farms?.center_lng && (
            <a href={googleMapsUrl(task.farms.center_lat, task.farms.center_lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 font-bold">
              <ExternalLink className="w-4 h-4" /> เปิด Google Maps
            </a>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {ITEMS.map((item, i) => (
            <label key={item.key} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${i < ITEMS.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{item.label}</div>
                <div className="text-sm text-gray-500 mt-0.5">{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={checks[item.key]}
                onChange={e => setChecks(c => ({ ...c, [item.key]: e.target.checked }))}
                className="w-6 h-6 accent-emerald-600 flex-shrink-0"
              />
            </label>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <label className="font-semibold text-gray-800 block">ผลสรุปเบื้องต้น</label>
          <select value={finding} onChange={e => setFinding(e.target.value as typeof finding)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white">
            <option value="confirmed_no_burn">ไม่พบการเผา</option>
            <option value="suspected_burn">สงสัยว่ามีการเผา</option>
            <option value="need_recheck">ต้องตรวจซ้ำ / ขอข้อมูลเพิ่ม</option>
          </select>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 resize-none"
            placeholder="บันทึกสิ่งที่พบ..."
          />
        </div>

        <button disabled={saving || loading || !task} onClick={save} className="w-full bg-emerald-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 active:scale-[.98]">
          {saving ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
          {saving ? 'กำลังบันทึก...' : 'บันทึกผลการตรวจ'}
        </button>
      </div>
    </div>
  )
}
