import React, { useState } from 'react'
import { MOCK_PRICES } from '../../data/mockData'

export default function AdminPrices() {
  const [prices, setPrices] = useState(MOCK_PRICES)
  const [editing, setEditing] = useState<string|null>(null)
  const [editVal, setEditVal] = useState('')
  const [saved, setSaved] = useState(false)
  const saveEdit = () => {
    setPrices(ps => ps.map(p => p.id===editing ? {...p,price:Number(editVal)} : p))
    setEditing(null); setSaved(true); setTimeout(()=>setSaved(false),2000)
  }
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold text-gray-800">จัดการราคา</h2><p className="text-sm text-gray-500">ราคาข้าวโพดอาหารสัตว์</p></div>
      {saved && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm font-medium flex items-center gap-2">✓ บันทึกราคาเรียบร้อย</div>}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3"><span className="text-3xl">💰</span><div><div className="font-bold text-lg">ประกาศราคาข้าวโพด</div><div className="text-yellow-100 text-xs">ฤดูกาล 2567/68 • อัปเดต 30 เม.ย. 2568</div></div></div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-700">ตารางราคา</h3>
          <button className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold">+ เพิ่มราคา</button>
        </div>
        {prices.map(p => (
          <div key={p.id} className="px-4 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${p.grade==='A'?'bg-yellow-100 text-yellow-700':p.grade==='B'?'bg-gray-100 text-gray-700':'bg-orange-100 text-orange-700'}`}>{p.grade}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">{p.variety}</div>
              <div className="text-xs text-gray-400">มีผล {p.effectiveDate}</div>
            </div>
            {editing===p.id ? (
              <div className="flex items-center gap-2">
                <input value={editVal} onChange={e=>setEditVal(e.target.value)} type="number" className="w-24 border border-green-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400"/>
                <button onClick={saveEdit} className="bg-green-600 text-white text-xs px-2 py-1 rounded-lg">บันทึก</button>
                <button onClick={()=>setEditing(null)} className="text-gray-400 text-xs px-1">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-right"><div className="font-bold text-green-700">{p.price.toLocaleString()}</div><div className="text-xs text-gray-400">บาท/{p.unit}</div></div>
                <button onClick={()=>{setEditing(p.id);setEditVal(String(p.price))}} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">✏️</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="w-full bg-yellow-500 text-white py-3 rounded-xl font-semibold text-sm shadow-md active:scale-[.98]">📢 ประกาศราคาใหม่ทันที</button>
    </div>
  )
}