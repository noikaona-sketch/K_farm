import { useEffect, useState } from 'react'
import { CheckCircle, ExternalLink, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import {
  finalReviewInspectionTask,
  listSubmittedInspectionTasks,
  type InspectionTaskRecord,
} from '../../lib/inspectionTasks'
import { googleMapsUrl } from '../../lib/farms'
import { useAuth } from '../../routes/AuthContext'

type FinalState = 'pending_final' | 'finalized' | 'all'

function getResultValue(result: Record<string, unknown> | undefined, key: string) {
  if (!result) return undefined
  return result[key]
}

function labelFinding(value: unknown) {
  if (value === 'confirmed_no_burn') return 'ไม่พบการเผา'
  if (value === 'suspected_burn') return 'สงสัยว่ามีการเผา'
  if (value === 'need_recheck') return 'ต้องตรวจซ้ำ'
  return '-'
}

function finalDecisionLabel(value: unknown) {
  if (value === 'approved') return 'Final approved'
  if (value === 'rejected') return 'Final rejected'
  return 'รอ final review'
}

function finalDecisionClass(value: unknown) {
  if (value === 'approved') return 'bg-emerald-100 text-emerald-700'
  if (value === 'rejected') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

export default function AdminInspectionFinalReview() {
  const { user } = useAuth()
  const [rows, setRows] = useState<InspectionTaskRecord[]>([])
  const [selected, setSelected] = useState<InspectionTaskRecord | null>(null)
  const [finalState, setFinalState] = useState<FinalState>('pending_final')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const actorId = user?.profileId ?? user?.id ?? null

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listSubmittedInspectionTasks({ inspectionType: 'no_burn', finalState })
      setRows(data)
      if (selected && !data.some(r => r.id === selected.id)) setSelected(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดผลตรวจไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalState])

  const finalReview = async (decision: 'approved' | 'rejected') => {
    if (!selected) return
    setSaving(true)
    setOk('')
    setError('')
    try {
      const updated = await finalReviewInspectionTask({
        taskId: selected.id,
        decision,
        actorId,
        note,
      })
      setOk(decision === 'approved' ? 'อนุมัติผลตรวจสุดท้ายแล้ว' : 'Reject ผลตรวจสุดท้ายแล้ว')
      setSelected({ ...selected, ...updated })
      setNote('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึก final review ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const result = selected?.result ?? {}
  const score = getResultValue(result, 'score')
  const finding = getResultValue(result, 'finding')
  const finalDecision = getResultValue(result, 'final_decision')
  const checks = getResultValue(result, 'checks') as Record<string, boolean> | undefined

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Final Review ผลตรวจไม่เผา</h2>
          <p className="text-gray-500 mt-1">Admin ตรวจทานผลจาก Inspector/ทีมรถ ก่อนปิดสถานะกิจกรรม</p>
        </div>
        <button onClick={load} disabled={loading} className="rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white px-4 py-2 font-bold flex items-center gap-2 justify-center">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
        </button>
      </div>

      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-2">
        {([
          ['pending_final', 'รอ final'],
          ['finalized', 'ปิดแล้ว'],
          ['all', 'ทั้งหมด'],
        ] as const).map(([value, label]) => (
          <button key={value} onClick={() => setFinalState(value)} className={`rounded-xl px-4 py-2 text-sm font-bold ${finalState === value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">ผลตรวจที่ส่งแล้ว</h3>
          <div className="space-y-3 max-h-[640px] overflow-auto pr-1">
            {rows.length === 0 && !loading && <div className="text-sm text-gray-500">ไม่พบผลตรวจตามเงื่อนไข</div>}
            {rows.map(row => {
              const rowResult = row.result ?? {}
              const rowDecision = getResultValue(rowResult, 'final_decision')
              return (
                <button
                  key={row.id}
                  onClick={() => { setSelected(row); setNote(String(getResultValue(rowResult, 'final_note') ?? '')) }}
                  className={`w-full text-left rounded-2xl border p-4 transition ${selected?.id === row.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate">{row.farms?.farm_name || 'ไม่ระบุชื่อแปลง'}</div>
                      <div className="text-xs text-gray-500 mt-1">ผู้ตรวจ: {row.member_id || '-'}</div>
                      <div className="text-xs text-gray-500 mt-1">{row.farms?.subdistrict || '-'} / {row.farms?.district || '-'} / {row.farms?.province || '-'}</div>
                    </div>
                    <span className={`text-xs rounded-lg px-2 py-1 font-bold ${finalDecisionClass(rowDecision)}`}>{finalDecisionLabel(rowDecision)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="bg-white rounded-lg px-2 py-1">ผล: {labelFinding(getResultValue(rowResult, 'finding'))}</span>
                    <span className="bg-white rounded-lg px-2 py-1">คะแนน: {String(getResultValue(rowResult, 'score') ?? '-')}</span>
                    <span className="bg-white rounded-lg px-2 py-1">ส่งเมื่อ: {String(getResultValue(rowResult, 'submitted_at') ?? '-').slice(0, 10)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {!selected ? (
            <div className="text-gray-500 text-sm">เลือกรายการผลตรวจจากด้านซ้าย</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold text-gray-900"><ShieldCheck className="w-5 h-5" />รายละเอียดผลตรวจ</div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">แปลง:</span> {selected.farms?.farm_name || selected.farm_id}</div>
                <div><span className="text-gray-400">พื้นที่:</span> {selected.farms?.area_rai ?? '-'} ไร่</div>
                <div><span className="text-gray-400">ผลตรวจ:</span> {labelFinding(finding)}</div>
                <div><span className="text-gray-400">คะแนน:</span> {String(score ?? '-')}</div>
                <div><span className="text-gray-400">สถานะ final:</span> {finalDecisionLabel(finalDecision)}</div>
                <div><span className="text-gray-400">ผู้ตรวจ:</span> {selected.member_id || '-'}</div>
              </div>

              <div className="rounded-2xl bg-gray-50 border p-4 text-sm space-y-2">
                <div className="font-bold">ตำแหน่งแปลง</div>
                <div>{selected.farms?.subdistrict || '-'} / {selected.farms?.district || '-'} / {selected.farms?.province || '-'}</div>
                <div className="text-xs text-gray-500 font-mono">{selected.farms?.center_lat ?? '-'}, {selected.farms?.center_lng ?? '-'}</div>
                {selected.farms?.center_lat && selected.farms?.center_lng && (
                  <a href={googleMapsUrl(selected.farms.center_lat, selected.farms.center_lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 font-bold">
                    <ExternalLink className="w-4 h-4" /> เปิด Google Maps
                  </a>
                )}
              </div>

              <div className="rounded-2xl bg-gray-50 border p-4 text-sm space-y-2">
                <div className="font-bold">Checklist</div>
                {checks ? Object.entries(checks).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3 border-b last:border-0 py-1">
                    <span className="text-gray-600">{key}</span>
                    <span className={value ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{value ? 'ผ่าน' : 'ไม่ผ่าน'}</span>
                  </div>
                )) : <div className="text-gray-500">ไม่มี checklist</div>}
              </div>

              <div className="rounded-2xl bg-gray-50 border p-4 text-sm">
                <div className="font-bold mb-1">หมายเหตุผู้ตรวจ</div>
                <div className="text-gray-600 whitespace-pre-wrap">{String(getResultValue(result, 'notes') ?? '-')}</div>
              </div>

              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ final review" className="w-full border rounded-xl p-3 min-h-24" />

              <div className="grid sm:grid-cols-2 gap-2">
                <button disabled={saving || Boolean(finalDecision)} onClick={() => finalReview('approved')} className="rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" />Final Approve</button>
                <button disabled={saving || Boolean(finalDecision)} onClick={() => finalReview('rejected')} className="rounded-xl bg-red-600 disabled:bg-gray-300 text-white py-3 font-bold flex items-center justify-center gap-2"><XCircle className="w-4 h-4" />Final Reject</button>
              </div>
              {Boolean(finalDecision) && <div className="text-xs text-gray-500">รายการนี้ผ่าน final review แล้ว</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
