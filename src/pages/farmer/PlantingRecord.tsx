import React, { useState } from 'react';
import type { AppPage } from '../../App';
import { MOCK_FARMS, CURRENT_USER } from '../../data/mockData';

interface Props { navigate: (p: AppPage) => void; }

const records = [
  { id: 'r1', farmName: 'แปลงที่ 1 หนองบัว', season: 'ปี 2567/68', variety: 'อ้อยพันธุ์ขอนแก่น 3', plantDate: '2024-11-01', harvestDate: '2025-04-30', estimatedYield: 80, actualYield: 78, status: 'harvested' },
  { id: 'r2', farmName: 'แปลงที่ 2 โนนสูง', season: 'ปี 2567/68', variety: 'อ้อยพันธุ์อู่ทอง 1', plantDate: '2024-11-15', harvestDate: '2025-05-20', estimatedYield: 90, status: 'growing' },
];

export default function PlantingRecord({ navigate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const farms = MOCK_FARMS.filter(f => f.farmerId === CURRENT_USER.id);

  const statusLabel = (s: string) => ({ harvested: { l: '✓ เก็บเกี่ยวแล้ว', c: 'bg-green-100 text-green-700' }, growing: { l: '🌱 กำลังเติบโต', c: 'bg-blue-100 text-blue-700' }, planned: { l: '📅 วางแผน', c: 'bg-gray-100 text-gray-600' } }[s] ?? { l: s, c: 'bg-gray-100 text-gray-600' });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800">บันทึกการปลูก</h1>
          <p className="text-xs text-gray-500">ประวัติการปลูกอ้อยของท่าน</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-semibold">+ บันทึกใหม่</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-md border border-green-100 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm border-b pb-2">📝 บันทึกการปลูกใหม่</h2>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">แปลง</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50">
              {farms.map(f => <option key={f.id}>{f.name}</option>)}
            </select>
          </div>
          {[
            { l: 'พันธุ์อ้อย', p: 'เช่น อ้อยพันธุ์ขอนแก่น 3' },
            { l: 'วันที่ปลูก', p: '', type: 'date' },
            { l: 'วันคาดว่าจะเก็บเกี่ยว', p: '', type: 'date' },
            { l: 'ผลผลิตที่คาดหวัง (ตัน/ไร่)', p: '12' },
          ].map(({ l, p, type }) => (
            <div key={l}>
              <label className="text-xs font-semibold text-gray-600 block mb-1">{l}</label>
              <input type={type ?? 'text'} placeholder={p} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm">ยกเลิก</button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold">บันทึก</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {records.map(r => {
          const st = statusLabel(r.status);
          return (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{r.farmName}</h3>
                    <p className="text-xs text-gray-500">{r.season}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.c}`}>{st.l}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">พันธุ์: </span><span className="font-medium">{r.variety}</span></div>
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">ปลูก: </span><span className="font-medium">{r.plantDate}</span></div>
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">เก็บเกี่ยว: </span><span className="font-medium">{r.harvestDate}</span></div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400">ผลผลิต: </span>
                    <span className="font-medium text-green-700">{r.actualYield ?? r.estimatedYield} ตัน</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
