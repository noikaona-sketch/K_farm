import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { Camera, FileText, MapPin, Clock, DollarSign, ImagePlus, Sprout, Calendar, Crown, Leaf } from 'lucide-react'
import { MOCK_FARMS, MOCK_PLANTING_RECORDS, MOCK_PRICES, TIER_CONFIG } from '../../data/mockData'

export default function FarmerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const uid = user?.id ?? 'f1'
  const farms = MOCK_FARMS.filter(f => f.farmerId === uid)
  const records = MOCK_PLANTING_RECORDS.filter(r => r.farmerId === uid)
  const latestPrice = MOCK_PRICES.find(p => p.grade === 'A')
  const tier = TIER_CONFIG[uid === 'f1' ? 'gold' : 'bronze']
  const regStatus = user?.registrationStatus ?? 'pending'
  const [profileImage, setProfileImage] = useState<string | null>(null)

  const handleProfileImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setProfileImage(ev.target!.result as string)
    reader.readAsDataURL(file)
  }

  const menus = [
    {
      Icon: FileText,
      label: 'ส่งบิล',
      sub: 'ลงทะเบียนสมาชิก',
      page: '/farmer/register',
      bg: 'bg-emerald-50', color: 'text-emerald-600',
    },
    {
      Icon: Clock,
      label: 'สถานะ',
      sub: 'ความคืบหน้าการสมัคร',
      page: '/farmer/status',
      bg: 'bg-amber-50', color: 'text-amber-600',
      badge: regStatus === 'pending' ? '⏳' : regStatus === 'approved' ? '✅' : undefined,
    },
    {
      Icon: MapPin,
      label: 'ปักหมุด',
      sub: 'แจ้งที่ตั้งแปลง',
      page: '/farmer/pin',
      bg: 'bg-blue-50', color: 'text-blue-600',
    },
    {
      Icon: Sprout,
      label: 'แจ้งปลูก',
      sub: 'บันทึกรอบการปลูก',
      page: '/farmer/planting',
      bg: 'bg-green-50', color: 'text-green-600',
    },
    {
      Icon: Leaf,
      label: 'พันธุ์ข้าวโพด',
      sub: 'ข้อมูลเมล็ด + พี่เลี้ยง',
      page: '/farmer/seeds',
      bg: 'bg-lime-50', color: 'text-lime-600',
    },
    {
      Icon: Calendar,
      label: 'จองคิว',
      sub: 'นัดวันขาย',
      page: '/farmer/planting',
      bg: 'bg-purple-50', color: 'text-purple-600',
    },
    {
      Icon: DollarSign,
      label: 'ราคา',
      sub: 'ราคาตามพันธุ์',
      page: '/farmer/prices',
      bg: 'bg-rose-50', color: 'text-rose-600',
    },
    {
      Icon: ImagePlus,
      label: 'ส่งรูป',
      sub: 'รูปแปลง / ไม่เผา',
      page: '/farmer/planting',
      bg: 'bg-cyan-50', color: 'text-cyan-600',
    },
    {
      Icon: Crown,
      label: 'ระดับ',
      sub: 'สิทธิ์สมาชิก',
      page: '/farmer/tier',
      bg: 'bg-yellow-50', color: 'text-yellow-600',
    },
  ]

  const activeRecord = records.find(r => r.status === 'growing')
  const ageDays = activeRecord
    ? Math.max(0, Math.round((Date.now() - new Date(activeRecord.plantDate).getTime()) / 86400000))
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Member Card */}
      <div className="px-5 pt-6 pb-4">
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 rounded-3xl shadow-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
          <div className="relative">
            <div className="text-[10px] text-emerald-200 uppercase tracking-widest font-semibold mb-3">Member Card</div>
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center overflow-hidden">
                  {profileImage
                    ? <img src={profileImage} alt="profile" className="w-full h-full object-cover" />
                    : <span className="text-2xl font-bold text-white">{user?.name?.charAt(0) ?? 'ก'}</span>}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-md">
                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleProfileImg} />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg text-white truncate">{user?.name}</div>
                <div className="text-emerald-100 text-xs font-mono">ID: {user?.code}</div>
                <div className="text-emerald-200 text-xs mt-1">{farms.length} แปลง • {farms.reduce((s, f) => s + f.area, 0).toFixed(1)} ไร่</div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
                  <span className="text-xs font-semibold" style={{ color: tier.color }}>🏆 {tier.label}</span>
                </div>
              </div>
            </div>

            {/* Quota + Price */}
            <div className="mt-4 bg-white/10 border border-white/20 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-100">โควต้าปัจจุบัน</div>
                <div className="text-2xl font-bold text-white">10.0 <span className="text-sm font-normal text-emerald-200">ตัน</span></div>
              </div>
              {latestPrice && (
                <div className="text-right">
                  <div className="text-xs text-emerald-100">ราคาวันนี้ (เกรด A)</div>
                  <div className="text-xl font-bold text-white">{latestPrice.price.toLocaleString()} <span className="text-xs font-normal text-emerald-200">บ./ตัน</span></div>
                </div>
              )}
            </div>

            {/* Active crop age */}
            {ageDays !== null && (
              <div className="mt-3 bg-amber-400/90 rounded-xl p-2.5 flex items-center justify-between">
                <div className="text-amber-900 text-sm font-semibold">🌽 {activeRecord?.variety} กำลังเติบโต</div>
                <div className="bg-amber-900/20 rounded-lg px-2.5 py-1">
                  <span className="font-bold text-amber-900">{ageDays}</span>
                  <span className="text-amber-800 text-xs"> วัน</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Registration pending banner */}
      {regStatus === 'pending' && (
        <div className="mx-5 mb-2">
          <div onClick={() => navigate('/farmer/status')}
            className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">⏳</div>
            <div className="flex-1">
              <div className="font-bold text-amber-800 text-sm">รออนุมัติการลงทะเบียน</div>
              <div className="text-xs text-amber-600">กดดูสถานะความคืบหน้า →</div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <div className="px-5 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {menus.map((m, i) => (
            <div key={i} onClick={() => navigate(m.page)}
              className={`${m.bg} rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[.97] relative`}>
              {m.badge && (
                <div className="absolute top-2 right-2 text-base leading-none">{m.badge}</div>
              )}
              <m.Icon className={`w-9 h-9 ${m.color}`} strokeWidth={1.8} />
              <div className="text-center">
                <div className="text-sm font-bold text-gray-800">{m.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{m.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Promo */}
      <div className="px-5 pb-6">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white flex items-start gap-3">
          <div className="text-2xl flex-shrink-0">🎁</div>
          <div>
            <div className="font-bold text-sm mb-1">สิทธิพิเศษระดับคุณ</div>
            <div className="text-emerald-100 text-xs leading-relaxed">
              รับโบนัสพิเศษ +100 บาท/ตัน สำหรับสมาชิกที่ไม่เผาตอซัง
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
