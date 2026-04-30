import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MapPin, BarChart3, TrendingUp, DollarSign } from 'lucide-react'
import { MOCK_FARMERS, MOCK_FARMS, MOCK_PRICES, MOCK_INSPECTIONS, MOCK_SALE_REQUESTS_EXTENDED, TIER_CONFIG } from '../../data/mockData'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const stats = [
    {label:'เกษตรกรทั้งหมด',value:MOCK_FARMERS.length,unit:'คน',Icon:Users,bg:'bg-emerald-50',text:'text-emerald-700',border:'border-emerald-100'},
    {label:'แปลงทั้งหมด',value:MOCK_FARMS.length,unit:'แปลง',Icon:MapPin,bg:'bg-blue-50',text:'text-blue-700',border:'border-blue-100'},
    {label:'พื้นที่รวม',value:MOCK_FARMS.reduce((s,f)=>s+f.area,0).toFixed(0),unit:'ไร่',Icon:BarChart3,bg:'bg-purple-50',text:'text-purple-700',border:'border-purple-100'},
    {label:'คำขอขาย',value:MOCK_SALE_REQUESTS_EXTENDED.length,unit:'รายการ',Icon:TrendingUp,bg:'bg-amber-50',text:'text-amber-700',border:'border-amber-100'},
    {label:'รอตรวจสอบ',value:MOCK_INSPECTIONS.filter(i=>i.status==='pending').length,unit:'แปลง',Icon:DollarSign,bg:'bg-orange-50',text:'text-orange-700',border:'border-orange-100'},
    {label:'ราคาปัจจุบัน',value:MOCK_PRICES.find(p=>p.grade==='A')?.price.toLocaleString()||'-',unit:'บ./ตัน',Icon:DollarSign,bg:'bg-rose-50',text:'text-rose-700',border:'border-rose-100'},
  ]
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ภาพรวมระบบ</h2>
        <p className="text-gray-500 mt-1">ข้อมูล ณ วันที่ 30 เม.ย. 2568</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`${s.bg} border-2 ${s.border} rounded-2xl p-5`}>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.Icon className={`w-5 h-5 ${s.text}`}/>
            </div>
            <div className={`text-3xl font-bold ${s.text}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.unit}</div>
            <div className="text-sm font-semibold text-gray-700 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">🏆 การกระจายระดับสมาชิก</h3>
          {(Object.entries(TIER_CONFIG) as [keyof typeof TIER_CONFIG,typeof TIER_CONFIG['bronze']][]).map(([k,tier])=>{
            const count = MOCK_FARMERS.filter(f=>f.tier===k).length
            const pct = Math.round((count/MOCK_FARMERS.length)*100)
            return (
              <div key={k} className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold" style={{color:tier.color}}>{tier.label}</span>
                  <span className="text-gray-500">{count} คน ({pct}%)</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:tier.color}}/>
                </div>
              </div>
            )
          })}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">🛒 คำขอขายล่าสุด</h3>
            <button onClick={()=>navigate('/admin/farmers')} className="text-sm text-emerald-600 font-semibold hover:underline">ดูทั้งหมด</button>
          </div>
          {MOCK_SALE_REQUESTS_EXTENDED.map(r=>(
            <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div><div className="font-semibold text-gray-800">{r.farmerName}</div><div className="text-sm text-gray-500">{r.variety} • {r.quantity} ตัน</div></div>
              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${r.status==='approved'?'bg-emerald-100 text-emerald-700':r.status==='pending'?'bg-amber-100 text-amber-700':r.status==='completed'?'bg-blue-100 text-blue-700':'bg-red-100 text-red-700'}`}>
                {r.status==='approved'?'อนุมัติ':r.status==='pending'?'รออนุมัติ':r.status==='completed'?'สำเร็จ':'ปฏิเสธ'}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {[{label:'แผนที่แปลง',icon:'🗺️',to:'/admin/map',bg:'bg-emerald-600'},{label:'ตารางเกษตรกร',icon:'👥',to:'/admin/farmers',bg:'bg-blue-600'},{label:'จัดการราคา',icon:'💰',to:'/admin/prices',bg:'bg-amber-500'}].map(({label,icon,to,bg})=>(
          <button key={to} onClick={()=>navigate(to)} className={`${bg} text-white rounded-2xl p-5 flex items-center gap-3 shadow-md hover:opacity-90 transition-opacity active:scale-[.98]`}>
            <span className="text-2xl">{icon}</span><span className="font-bold text-lg">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}