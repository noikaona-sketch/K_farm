import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { Camera, FileText, MapPin, Clock, DollarSign, ImagePlus, Sprout, Calendar, Crown } from 'lucide-react'
import { MOCK_FARMS, MOCK_PLANTING_RECORDS, MOCK_PRICES, TIER_CONFIG } from '../../data/mockData'

export default function FarmerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const uid = user?.id ?? 'f1'
  const farms = MOCK_FARMS.filter(f => f.farmerId === uid)
  const records = MOCK_PLANTING_RECORDS.filter(r => r.farmerId === uid)
  const latestPrice = MOCK_PRICES.find(p => p.grade === 'A')
  const tier = TIER_CONFIG[uid === 'f1' ? 'gold' : 'bronze']
  const [profileImage, setProfileImage] = useState<string|null>(null)

  const handleProfileImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setProfileImage(ev.target!.result as string)
    reader.readAsDataURL(file)
  }

  const menus = [
    { Icon: FileText,  label: 'ส่งบิล',    page: '/farmer/register', bg: 'bg-emerald-50',  color: 'text-emerald-600' },
    { Icon: MapPin,    label: 'ปักหมุด',    page: '/farmer/farms',    bg: 'bg-blue-50',     color: 'text-blue-600' },
    { Icon: Clock,     label: 'สถานะ',      page: '/farmer/planting', bg: 'bg-amber-50',    color: 'text-amber-600' },
    { Icon: Sprout,    label: 'แจ้งปลูก',   page: '/farmer/planting', bg: 'bg-green-50',    color: 'text-green-600' },
    { Icon: Calendar,  label: 'จองคิว',     page: '/farmer/planting', bg: 'bg-purple-50',   color: 'text-purple-600' },
    { Icon: DollarSign,label: 'ราคา',       page: '/farmer/prices',   bg: 'bg-rose-50',     color: 'text-rose-600' },
    { Icon: ImagePlus, label: 'ส่งรูป',     page: '/farmer/planting', bg: 'bg-cyan-50',     color: 'text-cyan-600' },
    { Icon: Crown,     label: 'ระดับ',      page: '/farmer/tier',     bg: 'bg-yellow-50',   color: 'text-yellow-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Member Card */}
      <div className="px-5 pt-6 pb-4">
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 rounded-3xl shadow-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
          <div className="absolute top-1/2 right-4 w-16 h-16 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="text-xs text-emerald-200 uppercase mb-1 font-semibold tracking-wider">Member Card</div>
            <div className="text-xl font-bold text-white mb-5">{tier.label.toUpperCase()} TIER</div>
            <div className="flex items-start gap-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center overflow-hidden">
                  {profileImage
                    ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    : <span className="text-3xl font-bold text-white">{user?.name?.charAt(0)}</span>}
                </div>
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleProfileImg} />
                </label>
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg text-white">{user?.name}</div>
                <div className="text-sm text-emerald-100 font-mono mt-1">ID: {user?.code}</div>
                <div className="text-xs text-emerald-200 mt-1">{farms.length} แปลง • {farms.reduce((s,f)=>s+f.area,0).toFixed(1)} ไร่</div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-100 mb-1">โควต้าปัจจุบัน</div>
                  <div className="text-2xl font-bold text-white">10.0 <span className="text-sm font-normal text-emerald-100">ตัน</span></div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-emerald-100 mb-1">ราคาวันนี้ (เกรด A)</div>
                  <div className="text-lg font-bold text-white">{latestPrice?.price.toLocaleString()} <span className="text-xs font-normal text-emerald-100">บ./ตัน</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="px-5 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {menus.map((m, i) => (
            <div key={i} onClick={() => navigate(m.page)}
              className={`${m.bg} rounded-2xl p-5 flex flex-col items-center gap-3 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[.97]`}>
              <m.Icon className={`w-10 h-10 ${m.color}`} strokeWidth={2} />
              <div className="text-sm font-semibold text-gray-800 text-center">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Promo Banner */}
      <div className="px-5 pb-6">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-md">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🎁</div>
            <div>
              <div className="font-bold text-base mb-1">สิทธิพิเศษระดับคุณ</div>
              <div className="text-sm opacity-90">รับโบนัสพิเศษ +100 บาท/ตัน สำหรับสมาชิกที่ไม่เผาซัง</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}