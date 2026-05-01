import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Phone, ChevronDown, ChevronUp } from 'lucide-react'
import { SEED_VARIETIES, type SeedVariety } from '../../data/mockData'

function VarietyCard({ v, onSelect }: { v: SeedVariety; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-xl">{v.name}</div>
            <div className="text-emerald-100 text-sm mt-0.5">{v.fullName}</div>
          </div>
          <div className="bg-white/20 rounded-2xl px-3 py-2 text-center">
            <div className="text-2xl font-bold">{v.daysToHarvest}</div>
            <div className="text-emerald-100 text-xs">วัน</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Seller + Mentor */}
        <div className="grid grid-cols-1 gap-2">
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="text-xs text-blue-500 font-semibold mb-0.5">🏪 ผู้ขายเมล็ดพันธุ์</div>
            <div className="text-sm font-semibold text-blue-800">{v.seller}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-emerald-500 font-semibold mb-0.5">👨‍🌾 พี่เลี้ยง / เจ้าหน้าที่</div>
              <div className="text-sm font-semibold text-emerald-800">{v.mentor}</div>
            </div>
            <a href={`tel:${v.mentorPhone}`}
              className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-white" />
            </a>
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'เก็บเกี่ยว', value: `${v.daysToHarvest} วัน`, icon: '📅' },
            { label: 'ผลผลิต', value: `${v.yieldPerRai} ตัน/ไร่`, icon: '📦' },
            { label: 'เมล็ด/ไร่', value: `${v.seedPerRai} กก.`, icon: '🌾' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-2.5">
              <div className="text-lg mb-0.5">{s.icon}</div>
              <div className="font-bold text-gray-800 text-sm">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 rounded-xl p-3">
          <div className="text-xs text-amber-600 font-semibold mb-1">📐 ระยะปลูก</div>
          <div className="text-sm font-semibold text-amber-800">{v.plantingSpacing}</div>
          <div className="text-xs text-amber-600 mt-1">ฤดูกาล: {v.season}</div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3">
          <div className="text-xs text-gray-500 font-semibold mb-1">💡 คำแนะนำ</div>
          <div className="text-sm text-gray-700">{v.notes}</div>
        </div>

        {/* Timeline toggle */}
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-emerald-700">📋 ขั้นตอนการปลูก ({v.steps.length} ขั้นตอน)</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4 text-emerald-600" />}
        </button>

        {expanded && (
          <div className="space-y-2 relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-emerald-200" />
            {v.steps.map((step, i) => (
              <div key={i} className="flex gap-4 relative">
                <div className="w-10 h-10 rounded-full bg-emerald-600 border-2 border-white shadow flex items-center justify-center text-lg flex-shrink-0 relative z-10">
                  {step.icon}
                </div>
                <div className="flex-1 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div className="text-xs text-emerald-600 font-bold">{step.day}</div>
                  <div className="font-semibold text-gray-800 text-sm">{step.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onSelect}
          className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
          เลือกพันธุ์นี้สำหรับแจ้งปลูก →
        </button>
      </div>
    </div>
  )
}

export default function SeedVarieties() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <div className="font-bold text-lg">พันธุ์ข้าวโพด</div>
          <div className="text-xs text-emerald-200">เลือกพันธุ์ที่ซื้อมาปลูก</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <span className="text-lg">ℹ️</span>
          <p className="text-sm text-blue-700">
            เลือกพันธุ์ที่ใช้ปลูก ระบบจะคำนวณวันเก็บเกี่ยวอัตโนมัติ
            และแนะนำขั้นตอนตามคำแนะนำของพี่เลี้ยงค่ะ
          </p>
        </div>

        {SEED_VARIETIES.map(v => (
          <VarietyCard key={v.id} v={v}
            onSelect={() => navigate('/farmer/planting', { state: { selectedVariety: v } })} />
        ))}
      </div>
    </div>
  )
}
