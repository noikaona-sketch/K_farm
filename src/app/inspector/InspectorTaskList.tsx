import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_INSPECTIONS, MOCK_FARMS } from '../../data/mockData'

export default function InspectorTaskList() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all'|'pending'|'completed'>('all')
  const filtered = MOCK_INSPECTIONS.filter(i => filter==='all' || i.status===filter || (filter==='pending'&&i.status==='in_progress'))

  const stCfg: Record<string,{l:string;c:string}> = {
    pending:     {l:'⏳ รอตรวจ',     c:'bg-yellow-100 text-yellow-700'},
    in_progress: {l:'🔍 กำลังตรวจ', c:'bg-blue-100 text-blue-700'},
    completed:   {l:'✓ ตรวจแล้ว',   c:'bg-green-100 text-green-700'},
    failed:      {l:'✗ ไม่ผ่าน',    c:'bg-red-100 text-red-700'},
  }

  return (
    <div className="p-4 space-y-4">
      <div><h1 className="font-bold text-gray-800">รายการตรวจสอบ</h1><p className="text-xs text-gray-500">งาน {MOCK_INSPECTIONS.length} รายการ</p></div>
      <div className="flex gap-2">
        {[['all','ทั้งหมด'],['pending','รอตรวจ'],['completed','เสร็จแล้ว']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k as typeof filter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter===k?'bg-green-600 text-white':'bg-gray-100 text-gray-600'}`}>{l}</button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map(ins => {
          const farm = MOCK_FARMS.find(f => f.id === ins.farmId)
          const st = stCfg[ins.status]
          return (
            <div key={ins.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-[.98] transition-transform"
              onClick={() => navigate(`/inspector/form/${ins.id}`)}>
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-bold text-gray-800 text-sm">{ins.farmerName}</h3><p className="text-xs text-gray-500">{farm?.name} • {farm?.area} ไร่</p></div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.c}`}>{st.l}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>📅 {ins.scheduledDate}</span>
                {ins.score && <span className="font-bold text-green-700">คะแนน: {ins.score}/100</span>}
              </div>
              {ins.status !== 'completed' && (
                <button className="w-full mt-3 bg-green-600 text-white py-2 rounded-xl text-xs font-semibold">เริ่มตรวจสอบ →</button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}