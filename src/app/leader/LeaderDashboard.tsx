import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, ChevronRight, AlertCircle } from 'lucide-react'
import { MOCK_FARMERS, MOCK_FARMS } from '../../data/mockData'

export default function LeaderDashboard() {
  const navigate = useNavigate()
  const pending = MOCK_FARMS.filter(f => !f.confirmed)
  const active = MOCK_FARMERS.filter(f => f.status==='active')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stats */}
      <div className="px-5 pt-6 pb-4">
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"/>
          <div className="relative">
            <div className="text-xs text-amber-100 uppercase font-semibold tracking-wider mb-2">Leader Dashboard</div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center"><div className="text-3xl font-bold">{active.length}</div><div className="text-amber-100 text-xs mt-1">สมาชิก</div></div>
              <div className="text-center border-x border-white/20"><div className="text-3xl font-bold">{MOCK_FARMS.reduce((s,f)=>s+f.area,0).toFixed(0)}</div><div className="text-amber-100 text-xs mt-1">ไร่</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-red-200">{pending.length}</div><div className="text-amber-100 text-xs mt-1">รออนุมัติ</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending alert */}
      {pending.length > 0 && (
        <div className="px-5 pb-4">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-600"/><span className="font-bold text-amber-800">รอการยืนยัน {pending.length} แปลง</span></div>
              <button onClick={() => navigate('/leader/confirm')} className="bg-amber-500 text-white text-sm px-4 py-2 rounded-xl font-bold hover:bg-amber-600 transition-colors">ดำเนินการ</button>
            </div>
            {pending.slice(0,2).map(f => {
              const farmer = MOCK_FARMERS.find(m => m.id===f.farmerId)
              return (
                <div key={f.id} className="flex items-center gap-2 text-sm py-2 border-t border-amber-200">
                  <span className="text-amber-600">📍</span>
                  <span className="text-amber-900 font-medium">{f.name}</span>
                  <span className="text-amber-600">• {farmer?.name}</span>
                  <span className="text-amber-500 ml-auto">{f.area} ไร่</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="px-5 pb-6">
        <h3 className="font-bold text-gray-800 mb-3">สมาชิกในกลุ่ม</h3>
        <div className="space-y-2">
          {MOCK_FARMERS.map(f => (
            <div key={f.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-base flex-shrink-0">{f.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{f.name}</div>
                <div className="text-sm text-gray-500">{f.totalArea} ไร่ • {f.district}</div>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${f.status==='active'?'bg-emerald-100 text-emerald-700':f.status==='pending'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>
                {f.status==='active'?'ใช้งาน':f.status==='pending'?'รออนุมัติ':'ระงับ'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}