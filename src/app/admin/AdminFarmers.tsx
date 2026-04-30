import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { MOCK_FARMERS, TIER_CONFIG } from '../../data/mockData'

export default function AdminFarmers() {
  const [search, setSearch] = useState('')
  const [tierF, setTierF] = useState('all')
  const filtered = MOCK_FARMERS.filter(f => (tierF==='all'||f.tier===tierF) && (f.name.includes(search)||f.code.includes(search)||f.district.includes(search)))
  return (
    <div className="space-y-5">
      <div><h2 className="text-2xl font-bold text-gray-900">ตารางเกษตรกร</h2><p className="text-gray-500 mt-1">สมาชิกทั้งหมด {MOCK_FARMERS.length} คน</p></div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาชื่อ รหัส หรืออำเภอ..."
            className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"/>
        </div>
        <div className="flex gap-2">
          {[['all','ทั้งหมด'],['platinum','Platinum'],['gold','Gold'],['silver','Silver'],['bronze','Bronze']].map(([k,l])=>(
            <button key={k} onClick={()=>setTierF(k)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${tierF===k?'bg-emerald-600 text-white':'bg-white border-2 border-gray-200 text-gray-600'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
              <th className="text-left px-5 py-4 font-semibold">เกษตรกร</th>
              <th className="text-left px-4 py-4 font-semibold">อำเภอ</th>
              <th className="text-center px-4 py-4 font-semibold">ระดับ</th>
              <th className="text-right px-4 py-4 font-semibold">พื้นที่</th>
              <th className="text-center px-4 py-4 font-semibold">สถานะ</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(f => {
                const tier = TIER_CONFIG[f.tier]
                return (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 flex-shrink-0">{f.name.charAt(0)}</div>
                        <div><div className="font-semibold text-gray-900">{f.name}</div><div className="text-xs text-gray-400 font-mono">{f.code}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{f.district}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{backgroundColor:`${tier.color}22`,color:tier.color}}>{tier.label}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-700">{f.totalArea} ไร่</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${f.status==='active'?'bg-emerald-100 text-emerald-700':f.status==='pending'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>
                        {f.status==='active'?'ใช้งาน':f.status==='pending'?'รออนุมัติ':'ระงับ'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length===0&&<div className="text-center py-12 text-gray-400">ไม่พบข้อมูล</div>}
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">แสดง {filtered.length} จาก {MOCK_FARMERS.length} รายการ</div>
      </div>
    </div>
  )
}