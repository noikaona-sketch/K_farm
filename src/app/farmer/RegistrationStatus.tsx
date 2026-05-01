import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { Check, Clock, X, ChevronLeft, Phone } from 'lucide-react'

export default function RegistrationStatus() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // ใช้ status จาก user (จาก Supabase จริง หรือ mock)
  const status = user?.registrationStatus ?? 'pending'

  const steps = [
    {
      key: 'submitted',
      label: 'ยื่นเอกสาร/บิล',
      sub: 'ส่งข้อมูลการลงทะเบียนเรียบร้อย',
      done: true,
      current: false,
    },
    {
      key: 'leader',
      label: 'หัวหน้ากลุ่มตรวจสอบ',
      sub: 'Leader ตรวจสอบเอกสารและแปลง',
      done: status === 'approved',
      current: status === 'pending',
    },
    {
      key: 'admin',
      label: 'Admin อนุมัติ',
      sub: 'ตรวจสิทธิ์และเพิ่มเข้าระบบ',
      done: status === 'approved',
      current: false,
    },
    {
      key: 'approved',
      label: 'ลงทะเบียนสำเร็จ',
      sub: 'ได้รับสิทธิ์สมาชิกเต็มรูปแบบ',
      done: status === 'approved',
      current: false,
    },
  ]

  const statusConfig = {
    none: {
      color: 'bg-gray-100',
      textColor: 'text-gray-600',
      label: 'ยังไม่ได้ลงทะเบียน',
      icon: '📋',
      desc: 'กดปุ่มด้านล่างเพื่อเริ่มลงทะเบียน',
    },
    pending: {
      color: 'bg-amber-50',
      textColor: 'text-amber-700',
      label: 'รออนุมัติ',
      icon: '⏳',
      desc: 'เอกสารของท่านถูกส่งแล้ว รอ Leader และ Admin ตรวจสอบ ระบบจะแจ้งผ่าน LINE',
    },
    approved: {
      color: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      label: 'อนุมัติแล้ว',
      icon: '✅',
      desc: 'ท่านเป็นสมาชิกเต็มรูปแบบแล้ว สามารถใช้งานได้ทุกฟีเจอร์',
    },
    rejected: {
      color: 'bg-red-50',
      textColor: 'text-red-700',
      label: 'ไม่ผ่าน',
      icon: '❌',
      desc: 'เอกสารไม่ผ่านการตรวจสอบ กรุณาติดต่อพี่เลี้ยงของท่าน',
    },
  }
  const cfg = statusConfig[status]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <div className="font-bold text-lg">สถานะการลงทะเบียน</div>
          <div className="text-xs text-emerald-200">ตรวจสอบความคืบหน้า</div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Status card */}
        <div className={`${cfg.color} rounded-3xl p-6 border-2 ${status === 'approved' ? 'border-emerald-300' : status === 'rejected' ? 'border-red-300' : 'border-amber-300'}`}>
          <div className="text-center">
            <div className="text-5xl mb-3">{cfg.icon}</div>
            <div className={`text-2xl font-bold ${cfg.textColor}`}>{cfg.label}</div>
            {user?.name && <div className="text-gray-600 text-sm mt-1">{user.name} • {user.code}</div>}
            <p className={`text-sm ${cfg.textColor} mt-3 leading-relaxed`}>{cfg.desc}</p>
          </div>
        </div>

        {/* Timeline */}
        {status !== 'none' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">ขั้นตอนการอนุมัติ</h3>
            <div className="relative pl-10">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-emerald-200" />
              {steps.map((s, i) => (
                <div key={s.key} className={`relative mb-5 last:mb-0 ${!s.done && !s.current ? 'opacity-40' : ''}`}>
                  <div className={`absolute -left-8 top-0 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${s.done ? 'bg-emerald-600 border-4 border-emerald-700'
                      : s.current ? 'bg-amber-400 border-4 border-amber-500 shadow-lg'
                      : 'bg-gray-200 border-4 border-gray-300'}`}>
                    {s.done
                      ? <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      : s.current
                        ? <Clock className="w-3.5 h-3.5 text-white" />
                        : <span className="text-xs font-bold text-gray-400">{i + 1}</span>}
                  </div>
                  <div className={`rounded-xl p-3.5 border-2 ${s.done ? 'bg-emerald-50 border-emerald-200' : s.current ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-100'}`}>
                    <div className={`font-bold text-sm ${s.done ? 'text-emerald-800' : s.current ? 'text-amber-800' : 'text-gray-400'}`}>{s.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
                    {s.current && (
                      <div className="flex items-center gap-1 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs text-amber-600 font-semibold">กำลังดำเนินการ...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact mentor */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-700 mb-3">📞 ติดต่อพี่เลี้ยง</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-800">คุณวิชัย สุขสม</div>
              <div className="text-sm text-gray-500">พี่เลี้ยงประจำกลุ่มบุรีรัมย์เขต 1</div>
              <div className="text-sm text-emerald-600 font-mono mt-0.5">081-234-5678</div>
            </div>
            <a href="tel:0812345678"
              className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center shadow-md">
              <Phone className="w-6 h-6 text-white" />
            </a>
          </div>
        </div>

        {/* Action buttons */}
        {status === 'none' && (
          <button onClick={() => navigate('/farmer/register')}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-700 transition-colors">
            📋 เริ่มลงทะเบียน
          </button>
        )}
        {status === 'rejected' && (
          <button onClick={() => navigate('/farmer/register')}
            className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-base hover:bg-red-600 transition-colors">
            🔄 ลงทะเบียนใหม่
          </button>
        )}
        {status === 'approved' && (
          <button onClick={() => navigate('/farmer')}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-700 transition-colors">
            🏠 กลับหน้าหลัก
          </button>
        )}
      </div>
    </div>
  )
}
