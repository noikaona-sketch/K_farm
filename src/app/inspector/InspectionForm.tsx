import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_INSPECTIONS, MOCK_FARMS } from '../../data/mockData'

export default function InspectionForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ins = MOCK_INSPECTIONS.find(i => i.id === id) ?? MOCK_INSPECTIONS[0]
  const farm = MOCK_FARMS.find(f => f.id === ins?.farmId)
  const [checks, setChecks] = useState({ noBurning:ins?.noBurning??false, pesticide:ins?.pesticide??false, soilTest:ins?.soilTest??false, waterQuality:ins?.waterQuality??false, irrigation:false, recordKeeping:false })
  const [notes, setNotes] = useState(ins?.notes ?? '')
  const [submitted, setSubmitted] = useState(false)
  const score = Math.round((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100)
  const items = [
    { key:'noBurning', label:'ไม่เผาตอซัง', icon:'🚫🔥', desc:'ตรวจสอบร่องรอยการเผา' },
    { key:'pesticide', label:'การใช้สารเคมี', icon:'🧪', desc:'ใช้สารเคมีถูกต้องตามมาตรฐาน' },
    { key:'soilTest', label:'การตรวจดิน', icon:'🌱', desc:'มีผลตรวจดินปีปัจจุบัน' },
    { key:'waterQuality', label:'คุณภาพน้ำ', icon:'💧', desc:'แหล่งน้ำไม่ปนเปื้อน' },
    { key:'irrigation', label:'ระบบน้ำ', icon:'🚿', desc:'ระบบน้ำเพียงพอ' },
    { key:'recordKeeping', label:'การบันทึก', icon:'📝', desc:'มีสมุดบันทึกเกษตร' },
  ]

  if (submitted) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-80 text-center gap-4">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-4xl">📋</div>
      <h2 className="text-xl font-bold text-green-700">บันทึกผลสำเร็จ!</h2>
      <div className="text-4xl font-bold text-gray-800">{score}<span className="text-xl text-gray-400">/100</span></div>
      <p className="text-gray-500 text-sm">{score>=80?'🎉 ผ่านการตรวจสอบ':'⚠️ ต้องปรับปรุง'}</p>
      <button onClick={() => navigate('/inspector')} className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm">กลับรายการ</button>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100">←</button>
        <div><h1 className="font-bold text-gray-800">แบบฟอร์มตรวจสอบ</h1><p className="text-xs text-gray-500">{ins?.farmerName} • {farm?.name}</p></div>
      </div>
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-4 text-white flex items-center justify-between">
        <div><div className="text-sm font-semibold">คะแนนปัจจุบัน</div><div className="text-4xl font-bold">{score}</div></div>
        <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center">
          <div className="text-center"><div className="text-xl font-bold">{Object.values(checks).filter(Boolean).length}</div><div className="text-xs text-green-200">/{Object.keys(checks).length}</div></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {items.map(item => (
          <label key={item.key} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50">
            <span className="text-xl">{item.icon}</span>
            <div className="flex-1"><div className="text-sm font-medium text-gray-800">{item.label}</div><div className="text-xs text-gray-500">{item.desc}</div></div>
            <input type="checkbox" checked={checks[item.key as keyof typeof checks]}
              onChange={e => setChecks(c => ({...c,[item.key]:e.target.checked}))} className="w-5 h-5 accent-green-600"/>
          </label>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <label className="text-sm font-semibold text-gray-700 block mb-2">📝 หมายเหตุ</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" placeholder="บันทึกสิ่งที่พบ..."/>
      </div>
      <button onClick={() => setSubmitted(true)} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm shadow-md active:scale-[.98]">
        ✓ บันทึกผลการตรวจ
      </button>
    </div>
  )
}