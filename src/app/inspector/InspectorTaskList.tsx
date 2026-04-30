import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Check, Clock, RefreshCw } from 'lucide-react'
import { MOCK_INSPECTIONS, MOCK_FARMS } from '../../data/mockData'

export default function InspectorTaskList() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all'|'pending'|'completed'>('all')
  const filtered = MOCK_INSPECTIONS.filter(i => filter==='all'||i.status===filter||(filter==='pending'&&i.status==='in_progress'))

  const stCfg: Record<string,{l:string;bg:string;text:string}> = {
    pending:     {l:'⏳ รอตรวจ',    bg:'bg-amber-50',   text:'text-amber-700'},
    in_progress: {l:'🔍 กำลังตรวจ', bg:'bg-blue-50',    text:'text-blue-700'},
    completed:   {l:'✅ ตรวจแล้ว',  bg:'bg-emerald-50', text:'text-emerald-700'},
    failed:      {l:'❌ ไม่ผ่าน',   bg:'bg-red-50',     text:'text-red-700'},
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-5 pt-6 pb-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-5 text-white shadow-xl">
          <div className="text-xs text-blue-200 uppercase font-semibold tracking-wider mb-2">Inspector Dashboard</div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center"><div className="text-3xl font-bold">{MOCK_INSPECTIONS.length}</div><div className="text-blue-200 text-xs mt-1">งานทั้งหมด</div></div>
            <div className="text-center border-x border-white/20"><div className="text-3xl font-bold text-amber-300">{MOCK_INSPECTIONS.filter(i=>i.status==='pending'||i.status==='in_progress').length}</div><div className="text-blue-200 text-xs mt-1">รอตรวจ</div></div>
            <div className="text-center"><div className="text-3xl font-bold text-emerald-300">{MOCK_INSPECTIONS.filter(i=>i.status==='completed').length}</div><div className="text-blue-200 text-xs mt-1">เสร็จแล้ว</div></div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-6">
        <div className="flex gap-2 mb-4">
          {[['all','ทั้งหมด'],['pending','รอตรวจ'],['completed','เสร็จแล้ว']].map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k as typeof filter)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter===k?'bg-emerald-600 text-white shadow-sm':'bg-white border border-gray-200 text-gray-600'}`}>{l}</button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(ins => {
            const farm = MOCK_FARMS.find(f=>f.id===ins.farmId)
            const st = stCfg[ins.status]
            return (
              <div key={ins.id} onClick={()=>navigate(`/inspector/form/${ins.id}`)}
                className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all active:scale-[.98]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{ins.farmerName}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{farm?.name} • {farm?.area} ไร่</p>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${st.bg} ${st.text}`}>{st.l}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/>📅 {ins.scheduledDate}</span>
                  {ins.score&&<span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">คะแนน: {ins.score}/100</span>}
                </div>
                {ins.status!=='completed'&&(
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