import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Check } from 'lucide-react'
import { MOCK_INSPECTIONS, MOCK_FARMS } from '../../data/mockData'

export default function InspectionForm() {
  const { id } = useParams<{id:string}>()
  const navigate = useNavigate()
  const ins = MOCK_INSPECTIONS.find(i=>i.id===id) ?? MOCK_INSPECTIONS[0]
  const farm = MOCK_FARMS.find(f=>f.id===ins?.farmId)
  const [checks, setChecks] = useState({
    noBurning:ins?.noBurning??false, pesticide:ins?.pesticide??false,
    soilTest:ins?.soilTest??false, waterQuality:ins?.waterQuality??false,
    irrigation:false, recordKeeping:false
  })
  const [notes, setNotes] = useState(ins?.notes??'')
  const [submitted, setSubmitted] = useState(false)
  const score = Math.round((Object.values(checks).filter(Boolean).length/Object.keys(checks).length)*100)

  const items = [
    {key:'noBurning',label:'ไม่เผาตอซัง',icon:'🚫🔥',desc:'ตรวจสอบร่องรอยการเผา'},
    {key:'pesticide',label:'การใช้สารเคมี',icon:'🧪',desc:'ใช้สารเคมีถูกต้องตามมาตรฐาน'},
    {key:'soilTest',label:'การตรวจดิน',icon:'🌱',desc:'มีผลตรวจดินปีปัจจุบัน'},
    {key:'waterQuality',label:'คุณภาพน้ำ',icon:'💧',desc:'แหล่งน้ำไม่ปนเปื้อน'},
    {key:'irrigation',label:'ระบบน้ำ',icon:'🚿',desc:'ระบบน้ำเพียงพอ'},
    {key:'recordKeeping',label:'การบันทึก',icon:'📝',desc:'มีสมุดบันทึกเกษตร'},
  ]

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5 text-center">
      <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6 shadow-xl" style={{background:`conic-gradient(#059669 0% ${score}%, #e5e7eb ${score}% 100%)`}}>
        <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-gray-800">{score}</div>
          <div className="text-xs text-gray-400">/ 100</div>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">บันทึกผลสำเร็จ!</h2>
      <p className="text-gray-500 mb-1">{ins?.farmerName}</p>
      <p className={`text-base font-bold mb-6 ${score>=80?'text-emerald-600':'text-amber-600'}`}>{score>=80?'✅ ผ่านการตรวจสอบ':'⚠️ ต้องปรับปรุง'}</p>
      <button onClick={()=>navigate('/inspector')} className="w-full max-w-sm bg-emerald-600 text-white rounded-xl py-4 font-bold hover:bg-emerald-700 transition-colors">กลับรายการ</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={()=>navigate(-1)} className="p-1"><ChevronLeft className="w-6 h-6"/></button>
        <div><div className="font-bold text-lg">แบบฟอร์มตรวจสอบ</div><div className="text-xs opacity-80">{ins?.farmerName} • {farm?.name}</div></div>
      </div>

      <div className="p-5 space-y-4">
        {/* Score card */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white flex items-center justify-between shadow-lg">
          <div><div className="text-sm text-emerald-200 mb-1">คะแนนปัจจุบัน</div><div className="text-5xl font-bold">{score}</div><div className="text-emerald-200 text-sm">/100 คะแนน</div></div>
          <div className="w-20 h-20 rounded-full border-4 border-white/30 flex flex-col items-center justify-center bg-white/10">
            <div className="text-2xl font-bold">{Object.values(checks).filter(Boolean).length}</div>
            <div className="text-xs text-emerald-200">/{Object.keys(checks).length}</div>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {items.map((item,i) => (
            <label key={item.key} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${i<items.length-1?'border-b border-gray-100':''}`}>
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{item.label}</div>
                <div className="text-sm text-gray-500 mt-0.5">{item.desc}</div>
              </div>
              <input type="checkbox" checked={checks[item.key as keyof typeof checks]}
                onChange={e=>setChecks(c=>({...c,[item.key]:e.target.checked}))}
                className="w-6 h-6 accent-emerald-600 flex-shrink-0"/>
            </label>
          ))}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="font-semibold text-gray-800 block mb-2">📝 หมายเหตุ</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 resize-none"
            placeholder="บันทึกสิ่งที่พบ..."/>
        </div>

        <button onClick={()=>setSubmitted(true)} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 active:scale-[.98]">
          <Check className="w-6 h-6"/>บันทึกผลการตรวจ
        </button>
      </div>
    </div>
  )
}