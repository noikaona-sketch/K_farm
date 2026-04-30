import React, { useState } from 'react'
import { MOCK_FARMERS, TIER_CONFIG } from '../../data/mockData'

export default function AdminFarmers() {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const filtered = MOCK_FARMERS.filter(f =>
    (tierFilter==='all' || f.tier===tierFilter) &&
    (f.name.includes(search) || f.code.includes(search) || f.district.includes(search))
  )
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold text-gray-800">ตารางเกษตรกร</h2><p className="text-sm text-gray-500">สมาชิกทั้งหมด {MOCK_FARMERS.length} คน</p></div>
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ค้นหาชื่อ รหัส หรืออำเภอ..."
          className="flex-1 min-w-48 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"/>
        <div className="flex gap-2 overflow-x-auto">
          {[['all','ทั้งหมด'],['platinum','🏆'],['gold','⭐'],['silver','🥈'],['bronze','🥉']].map(([k,l]) => (
            <button key={k} onClick={() => setTierFilter(k)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tierFilter===k?'bg-green-600 text-white':'bg-white border border-gray-200 text-gray-600'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold">เกษตรกร</th>
                <th className="text-left px-4 py-3 font-semibold">อำเภอ</th>
                <th className="text-center px-3 py-3 font-semibold">ระดับ</th>
                <th className="text-right px-4 py-3 font-semibold">พื้นที่</th>
                <th className="text-center px-3 py-3 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(f => {
                const tier = TIER_CONFIG[f.tier]
                return (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 flex-shrink-0">{f.name.charAt(0)}</div>
                        <div><div className="font-medium text-gray-800">{f.name}</div><div className="text-xs text-gray-400">{f.code}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{f.district}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{backgroundColor:`${tier.color}22`,color:tier.color}}>{tier.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">{f.totalArea} ไร่</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${f.status==='active'?'bg-green-100 text-green-700':f.status==='pending'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>
                        {f.status==='active'?'ใช้งาน':f.status==='pending'?'รออนุมัติ':'ระงับ'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length===0 && <div className="text-center py-10 text-gray-400 text-sm">ไม่พบข้อมูล</div>}
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">แสดง {filtered.length} จาก {MOCK_FARMERS.length} รายการ</div>
      </div>
    </div>
  )
}