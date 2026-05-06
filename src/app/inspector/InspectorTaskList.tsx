import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, MapPin, RefreshCw } from 'lucide-react'
import { listMyInspectionTasks, type InspectionStatus, type InspectionTaskRecord } from '../../lib/inspectionTasks'
import { useAuth } from '../../routes/AuthContext'

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: '⏳ รอตรวจ', bg: 'bg-amber-50', text: 'text-amber-700' },
  in_progress: { label: '🔍 กำลังตรวจ', bg: 'bg-blue-50', text: 'text-blue-700' },
  done: { label: '✅ ตรวจแล้ว', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  cancelled: { label: 'ยกเลิก', bg: 'bg-gray-50', text: 'text-gray-700' },
}

export default function InspectorTaskList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tasks, setTasks] = useState<InspectionTaskRecord[]>([])
  const [filter, setFilter] = useState<InspectionStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const profileId = user?.profileId ?? user?.id ?? ''
  const canNoBurnOnly = user?.baseType === 'service' && user?.capabilities?.includes('can_inspect_no_burn') && !user?.capabilities?.includes('can_inspect')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (!profileId) throw new Error('ไม่พบ Profile ID ผู้ตรวจ')
      const rows = await listMyInspectionTasks({
        profileId,
        inspectionType: canNoBurnOnly ? 'no_burn' : 'all',
        status: filter,
      })
      setTasks(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดงานตรวจไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, filter])

  const counts = useMemo(() => ({
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }), [tasks])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-5 pt-6 pb-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-5 text-white shadow-xl">
          <div className="text-xs text-blue-200 uppercase font-semibold tracking-wider mb-2">
            {canNoBurnOnly ? 'No-burn Inspector' : 'Inspector Dashboard'}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-bold">{user?.name || 'ผู้ตรวจแปลง'}</div>
              <div className="text-blue-200 text-xs mt-1">เห็นเฉพาะงานที่ถูก assign ให้ตัวเอง</div>
            </div>
            <button onClick={load} disabled={loading} className="bg-white/15 rounded-xl px-3 py-2 text-sm font-bold flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center"><div className="text-3xl font-bold">{counts.all}</div><div className="text-blue-200 text-xs mt-1">งานทั้งหมด</div></div>
            <div className="text-center border-x border-white/20"><div className="text-3xl font-bold text-amber-300">{counts.pending}</div><div className="text-blue-200 text-xs mt-1">รอตรวจ</div></div>
            <div className="text-center"><div className="text-3xl font-bold text-emerald-300">{counts.done}</div><div className="text-blue-200 text-xs mt-1">เสร็จแล้ว</div></div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-6">
        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {([
            ['all', 'ทั้งหมด'],
            ['pending', 'รอตรวจ'],
            ['in_progress', 'กำลังตรวจ'],
            ['done', 'เสร็จแล้ว'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${filter === k ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {tasks.length === 0 && !loading && (
            <div className="bg-white rounded-2xl p-5 text-center text-gray-500 text-sm">ยังไม่มีงานตรวจตามเงื่อนไข</div>
          )}

          {tasks.map(task => {
            const status = STATUS_CFG[task.status] ?? STATUS_CFG.pending
            const farm = task.farms
            return (
              <div
                key={task.id}
                onClick={() => navigate(`/inspector/form/${task.id}`)}
                className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all active:scale-[.98]"
              >
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 truncate">{farm?.farm_name || 'ไม่ระบุชื่อแปลง'}</h3>
                      {task.inspection_type === 'no_burn' && <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-lg font-bold">ไม่เผา</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{farm?.area_rai ?? '-'} ไร่ • {farm?.subdistrict || farm?.district || '-'}</p>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${status.bg} ${status.text}`}>{status.label}</span>
                </div>
                <div className="flex flex-col gap-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />กำหนดตรวจ: {task.due_date || '-'}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{farm?.district || '-'} / {farm?.province || '-'}</span>
                </div>
                {task.status !== 'done' && (
                  <button className="w-full mt-3 bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">เริ่มตรวจสอบ →</button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
