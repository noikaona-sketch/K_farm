import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { MOCK_PRICES } from '../../data/mockData'

export default function AdminPrices() {
  const [prices, setPrices] = useState(MOCK_PRICES)
  const [editing, setEditing] = useState<string|null>(null)
  const [editVal, setEditVal] = useState('')
  const [saved, setSaved] = useState(false)
  const saveEdit = () => { setPrices(ps=>ps.map(p=>p.id===editing?{...p,price:Number(editVal)}:p)); setEditing(null); setSaved(true); setTimeout(()=>setSaved(false),2500) }
  return (
    <div className="space-y-5">
      <div><h2 className="text-2xl font-bold text-gray-900">จัดการราคา</h2><p className="text-gray-500 mt-1">ราคาข้าวโพดอาหารสัตว์ประจำวัน</p></div>
      {saved&&<div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl px-5 py-4 text-emerald-700 font-semibold flex items-center gap-2"><Check className="w-5 h-5"/>บันทึกราคาเรียบร้อยแล้ว</div>}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4"><span className="text-4xl">💰</span><div><div className="font-bold text-xl">ประกาศราคาข้าวโพด</div><div className="text-amber-100 text-sm">ฤดูกาล 2567/68 • อัปเดต 30 เม.ย. 2568</div></div></div>
        <div className="bg-white/20 rounded-xl p-3 flex items-center justify-between">
          <span className="font-medium">ราคากลางวันนี้</span>
          <span className="text-2xl font-bold">{prices.find(p=>p.grade==='A')?.price.toLocaleString()} บาท/ตัน</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">ตารางราคา</h3>
          <button className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">+ เพิ่มราคา</button>
        </div>
        {prices.map((p,i)=>(
          <div key={p.id} className={`px-5 py-4 flex items-center gap-4 ${i<prices.length-1?'border-b border-gray-50':''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${p.grade==='A'?'bg-amber-100 text-amber-700':p.grade==='B'?'bg-gray-100 text-gray-700':'bg-orange-100 text-orange-700'}`}>{p.grade}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">{p.variety}</div>
              <div className="text-sm text-gray-400">เกรด {p.grade} • มีผล {p.effectiveDate}</div>
            </div>
            {editing===p.id
              ? <div className="flex items-center gap-2">
                  <input value={editVal} onChange={e=>setEditVal(e.target.value)} type="number"
                    className="w-28 border-2 border-emerald-400 rounded-xl px-3 py-2 text-sm text-center font-bold focus:outline-none"/>
                  <button onClick={saveEdit} className="bg-emerald-600 text-white text-sm px-3 py-2 rounded-xl font-semibold">บันทึก</button>
                  <button onClick={()=>setEditing(null)} className="text-gray-400 px-2">✕</button>
                </div>
              : <div className="flex items-center gap-3">
                  <div className="text-right"><div className="text-xl font-bold text-emerald-700">{p.price.toLocaleString()}</div><div className="text-xs text-gray-400">บาท/{p.unit}</div></div>
                  <button onClick={()=>{setEditing(p.id);setEditVal(String(p.price))}} className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors text-lg">✏️</button>
                </div>}
          </div>
        ))}
      </div>
      <button className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold text-base shadow-md hover:bg-amber-600 transition-colors active:scale-[.98]">📢 ประกาศราคาใหม่ทันที</button>
    </div>
  )
}