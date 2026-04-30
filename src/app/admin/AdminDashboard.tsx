import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MapPin, BarChart3, TrendingUp, DollarSign } from 'lucide-react'
import { MOCK_PRICES } from '../../data/mockData'
import { getAdminDashboardData } from '../../lib/dataService'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [data, setData] = useState<{farmers:any[];farms:any[];saleRequests:any[];noBurnApplications:any[]}>({farmers:[],farms:[],saleRequests:[],noBurnApplications:[]})
  useEffect(()=>{(async()=>{try{setData(await getAdminDashboardData())}catch{setErr('โหลดข้อมูลแดชบอร์ดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')}finally{setLoading(false)}})()},[])
  const stats = [
    {label:'เกษตรกรทั้งหมด',value:data.farmers.length,unit:'คน',Icon:Users,bg:'bg-emerald-50',text:'text-emerald-700',border:'border-emerald-100'},
    {label:'แปลงทั้งหมด',value:data.farms.length,unit:'แปลง',Icon:MapPin,bg:'bg-blue-50',text:'text-blue-700',border:'border-blue-100'},
    {label:'พื้นที่รวม',value:data.farms.reduce((s,f)=>s+(Number(f.area)||0),0).toFixed(0),unit:'ไร่',Icon:BarChart3,bg:'bg-purple-50',text:'text-purple-700',border:'border-purple-100'},
    {label:'คำขอขาย',value:data.saleRequests.length,unit:'รายการ',Icon:TrendingUp,bg:'bg-amber-50',text:'text-amber-700',border:'border-amber-100'},
    {label:'คำขอไม่เผา',value:data.noBurnApplications.length,unit:'รายการ',Icon:DollarSign,bg:'bg-orange-50',text:'text-orange-700',border:'border-orange-100'},
    {label:'ราคาปัจจุบัน',value:MOCK_PRICES.find(p=>p.grade==='A')?.price.toLocaleString()||'-',unit:'บ./ตัน',Icon:DollarSign,bg:'bg-rose-50',text:'text-rose-700',border:'border-rose-100'},
  ]
  if (loading) return <div>กำลังโหลดแดชบอร์ด...</div>
  return <div className="space-y-6">{err && <p className="text-sm text-red-600">{err}</p>}<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{stats.map(s => <div key={s.label} className={`${s.bg} border-2 ${s.border} rounded-2xl p-5`}><s.Icon className={`w-5 h-5 ${s.text}`}/><div className={`text-3xl font-bold ${s.text}`}>{s.value}</div><div className="text-sm text-gray-500 mt-0.5">{s.unit}</div><div className="text-sm font-semibold text-gray-700 mt-1">{s.label}</div></div>)}</div><div className="grid sm:grid-cols-3 gap-4">{[{label:'แผนที่แปลง',icon:'🗺️',to:'/admin/map',bg:'bg-emerald-600'},{label:'ตารางเกษตรกร',icon:'👥',to:'/admin/farmers',bg:'bg-blue-600'},{label:'จัดการราคา',icon:'💰',to:'/admin/prices',bg:'bg-amber-500'}].map(({label,icon,to,bg})=><button key={to} onClick={()=>navigate(to)} className={`${bg} text-white rounded-2xl p-5 flex items-center gap-3`}><span>{icon}</span><span>{label}</span></button>)}</div></div>
}
