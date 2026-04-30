import React, { useState } from 'react';
import type { AppPage } from '../../App';

interface Props { navigate: (p: AppPage) => void; }

export function AddFarm({ navigate }: Props) {
  const [form, setForm] = useState({ name: '', area: '', soilType: 'ดินร่วน', waterSource: 'น้ำฝน', village: '', district: '', province: 'บุรีรัมย์', lat: '', lng: '' });
  const [saved, setSaved] = useState(false);
  const u = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (saved) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-80 text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl">🌾</div>
      <h2 className="text-xl font-bold text-green-700">เพิ่มแปลงสำเร็จ!</h2>
      <p className="text-gray-500 text-sm">แปลงของท่านจะถูกส่งให้หัวหน้ากลุ่มยืนยัน</p>
      <button onClick={() => navigate('farms')} className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm">ดูแปลงของฉัน</button>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('farms')} className="p-2 rounded-xl hover:bg-gray-100">←</button>
        <h1 className="font-bold text-gray-800">เพิ่มแปลงใหม่</h1>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm border-b pb-2">📍 ข้อมูลแปลง</h2>
        {[
          { l: 'ชื่อแปลง *', k: 'name', p: 'เช่น แปลงที่ 1 หนองบัว' },
          { l: 'พื้นที่ (ไร่) *', k: 'area', p: 'เช่น 6.5' },
          { l: 'หมู่บ้าน *', k: 'village', p: 'บ้าน...' },
          { l: 'อำเภอ *', k: 'district', p: 'อำเภอ...' },
          { l: 'ละติจูด', k: 'lat', p: '14.xxx' },
          { l: 'ลองจิจูด', k: 'lng', p: '103.xxx' },
        ].map(({ l, k, p }) => (
          <div key={k}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
            <input value={form[k as keyof typeof form]} onChange={e => u(k as keyof typeof form, e.target.value)} placeholder={p}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
          </div>
        ))}
        {[
          { l: 'ประเภทดิน', k: 'soilType', opts: ['ดินร่วน', 'ดินเหนียว', 'ดินร่วนปนทราย', 'ดินทราย'] },
          { l: 'แหล่งน้ำ', k: 'waterSource', opts: ['น้ำฝน', 'บ่อน้ำ', 'ชลประทาน', 'อ่างเก็บน้ำ'] },
        ].map(({ l, k, opts }) => (
          <div key={k}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
            <select value={form[k as keyof typeof form]} onChange={e => u(k as keyof typeof form, e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50">
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
        <p className="text-xs text-yellow-700">📌 หลังเพิ่มแปลง หัวหน้ากลุ่มจะต้องยืนยันแปลงก่อนจึงจะใช้งานได้</p>
      </div>

      <button onClick={() => setSaved(true)} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm shadow-md active:scale-95 transition-transform">
        ✓ บันทึกแปลง
      </button>
    </div>
  );
}
