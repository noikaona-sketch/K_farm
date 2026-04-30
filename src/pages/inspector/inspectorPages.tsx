import React, { useState } from 'react';
import type { AppPage } from '../../App';
import { MOCK_INSPECTIONS, MOCK_FARMS } from '../../data/mockData';

interface Props { navigate: (p: AppPage) => void; }

export function InspectorTaskList({ navigate, onSelectInspection }: Props & { onSelectInspection: (id: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const filtered = MOCK_INSPECTIONS.filter(i => filter === 'all' || i.status === filter || (filter === 'pending' && i.status === 'in_progress'));

  const statusConfig: Record<string, { l: string; c: string }> = {
    pending: { l: '⏳ รอตรวจ', c: 'bg-yellow-100 text-yellow-700' },
    in_progress: { l: '🔍 กำลังตรวจ', c: 'bg-blue-100 text-blue-700' },
    completed: { l: '✓ ตรวจแล้ว', c: 'bg-green-100 text-green-700' },
    failed: { l: '✗ ไม่ผ่าน', c: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="font-bold text-gray-800">รายการตรวจสอบ</h1>
        <p className="text-xs text-gray-500">งานของฉัน {MOCK_INSPECTIONS.length} รายการ</p>
      </div>

      <div className="flex gap-2">
        {[{ k: 'all', l: 'ทั้งหมด' }, { k: 'pending', l: 'รอตรวจ' }, { k: 'completed', l: 'เสร็จแล้ว' }].map(({ k, l }) => (
          <button key={k} onClick={() => setFilter(k as typeof filter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === k ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(ins => {
          const farm = MOCK_FARMS.find(f => f.id === ins.farmId);
          const st = statusConfig[ins.status];
          return (
            <div key={ins.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-98 transition-transform"
              onClick={() => onSelectInspection(ins.id)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{ins.farmerName}</h3>
                  <p className="text-xs text-gray-500">{farm?.name} • {farm?.area} ไร่</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.c}`}>{st.l}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>📅 {ins.scheduledDate}</span>
                {ins.score && <span className="font-bold text-green-700">คะแนน: {ins.score}/100</span>}
              </div>
              {ins.status !== 'completed' && (
                <button className="w-full mt-3 bg-green-600 text-white py-2 rounded-xl text-xs font-semibold">
                  เริ่มตรวจสอบ →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InspectionForm({ navigate, inspectionId }: Props & { inspectionId: string | null }) {
  const ins = MOCK_INSPECTIONS.find(i => i.id === inspectionId) ?? MOCK_INSPECTIONS[0];
  const farm = MOCK_FARMS.find(f => f.id === ins?.farmId);
  const [checks, setChecks] = useState({
    noBurning: ins?.noBurning ?? false,
    pesticide: ins?.pesticide ?? false,
    soilTest: ins?.soilTest ?? false,
    waterQuality: ins?.waterQuality ?? false,
    irrigation: false,
    recordKeeping: false,
  });
  const [notes, setNotes] = useState(ins?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  const score = Math.round((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100);

  const checkItems = [
    { key: 'noBurning', label: 'ไม่เผาตอซัง', icon: '🚫🔥', desc: 'ตรวจสอบร่องรอยการเผา' },
    { key: 'pesticide', label: 'การใช้สารเคมี', icon: '🧪', desc: 'ใช้สารเคมีถูกต้องตามมาตรฐาน' },
    { key: 'soilTest', label: 'การตรวจดิน', icon: '🌱', desc: 'มีผลการตรวจดินปีปัจจุบัน' },
    { key: 'waterQuality', label: 'คุณภาพน้ำ', icon: '💧', desc: 'แหล่งน้ำไม่ปนเปื้อน' },
    { key: 'irrigation', label: 'ระบบน้ำ', icon: '🚿', desc: 'ระบบน้ำเพียงพอและเหมาะสม' },
    { key: 'recordKeeping', label: 'การบันทึก', icon: '📝', desc: 'มีสมุดบันทึกการเกษตร' },
  ];

  if (submitted) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-80 text-center gap-4">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-4xl">📋</div>
      <h2 className="text-xl font-bold text-green-700">บันทึกผลสำเร็จ!</h2>
      <div className="text-4xl font-bold text-gray-800">{score}<span className="text-xl text-gray-400">/100</span></div>
      <p className="text-gray-500 text-sm">{score >= 80 ? '🎉 ผ่านการตรวจสอบ' : '⚠️ ต้องปรับปรุง'}</p>
      <button onClick={() => navigate('taskList')} className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm">กลับรายการ</button>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('taskList')} className="p-2 rounded-xl hover:bg-gray-100">←</button>
        <div>
          <h1 className="font-bold text-gray-800">แบบฟอร์มตรวจสอบ</h1>
          <p className="text-xs text-gray-500">{ins?.farmerName} • {farm?.name}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-4 text-white flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">คะแนนปัจจุบัน</div>
          <div className="text-4xl font-bold">{score}</div>
        </div>
        <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-bold">{Object.values(checks).filter(Boolean).length}</div>
            <div className="text-xs text-green-200">/{Object.keys(checks).length}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {checkItems.map(item => (
          <label key={item.key} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
            <span className="text-xl">{item.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{item.label}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
            <input
              type="checkbox"
              checked={checks[item.key as keyof typeof checks]}
              onChange={e => setChecks(c => ({ ...c, [item.key]: e.target.checked }))}
              className="w-5 h-5 accent-green-600"
            />
          </label>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <label className="text-sm font-semibold text-gray-700 block mb-2">📝 หมายเหตุ</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="บันทึกสิ่งที่พบ..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 resize-none" />
      </div>

      <button onClick={() => setSubmitted(true)} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm shadow-md active:scale-95 transition-transform">
        ✓ บันทึกผลการตรวจ
      </button>
    </div>
  );
}
