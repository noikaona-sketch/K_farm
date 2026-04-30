import React from 'react';
import type { AppPage } from '../../App';
import { MOCK_FARMERS, MOCK_FARMS, MOCK_INSPECTIONS } from '../../data/mockData';

interface Props { navigate: (p: AppPage) => void; }

export function LeaderDashboard({ navigate }: Props) {
  const pendingFarms = MOCK_FARMS.filter(f => !f.confirmed);
  const totalFarmers = MOCK_FARMERS.filter(f => f.status === 'active').length;
  const totalArea = MOCK_FARMS.reduce((s, f) => s + f.area, 0);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="font-bold text-gray-800 text-lg">แดชบอร์ดหัวหน้ากลุ่ม</h1>
        <p className="text-xs text-gray-500">กลุ่มเกษตรกร บุรีรัมย์เขต 1</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'เกษตรกรทั้งหมด', value: totalFarmers, icon: '👥', color: 'bg-blue-50 text-blue-700', sub: 'คน' },
          { label: 'พื้นที่รวม', value: totalArea.toFixed(0), icon: '🌾', color: 'bg-green-50 text-green-700', sub: 'ไร่' },
          { label: 'รอยืนยันแปลง', value: pendingFarms.length, icon: '⏳', color: 'bg-yellow-50 text-yellow-700', sub: 'แปลง' },
          { label: 'ตรวจสอบแล้ว', value: MOCK_INSPECTIONS.filter(i => i.status === 'completed').length, icon: '✅', color: 'bg-emerald-50 text-emerald-700', sub: 'ครั้ง' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs opacity-70">{s.sub}</div>
            <div className="text-xs font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {pendingFarms.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="font-semibold text-yellow-800 text-sm">รอการยืนยัน {pendingFarms.length} แปลง</span>
            </div>
            <button onClick={() => navigate('farmConfirmation')} className="text-xs text-yellow-700 font-bold bg-yellow-100 px-3 py-1.5 rounded-lg">ดำเนินการ →</button>
          </div>
          {pendingFarms.slice(0, 2).map(f => {
            const farmer = MOCK_FARMERS.find(m => m.id === f.farmerId);
            return (
              <div key={f.id} className="flex items-center gap-2 text-xs py-1.5 border-t border-yellow-200">
                <span className="text-yellow-600">📍</span>
                <span className="text-yellow-800 font-medium">{f.name}</span>
                <span className="text-yellow-600">• {farmer?.name}</span>
                <span className="text-yellow-600 ml-auto">{f.area} ไร่</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-gray-700 text-sm mb-3">สมาชิกกลุ่ม</h3>
        <div className="space-y-2">
          {MOCK_FARMERS.slice(0, 4).map(f => (
            <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                {f.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{f.name}</div>
                <div className="text-xs text-gray-500">{f.totalArea} ไร่ • {f.district}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                f.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>{f.status === 'active' ? 'ใช้งาน' : 'รออนุมัติ'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FarmConfirmation({ navigate }: Props) {
  const [confirmed, setConfirmed] = React.useState<string[]>([]);
  const [rejected, setRejected] = React.useState<string[]>([]);
  const pendingFarms = MOCK_FARMS.filter(f => !f.confirmed && !confirmed.includes(f.id) && !rejected.includes(f.id));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('leaderDashboard')} className="p-2 rounded-xl hover:bg-gray-100">←</button>
        <div>
          <h1 className="font-bold text-gray-800">ยืนยันแปลงเกษตร</h1>
          <p className="text-xs text-gray-500">รอดำเนินการ {pendingFarms.length} แปลง</p>
        </div>
      </div>

      {pendingFarms.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">✅</div>
          <p className="font-medium">ดำเนินการครบแล้ว</p>
          <p className="text-xs mt-1">ไม่มีแปลงที่รอยืนยัน</p>
        </div>
      )}

      {pendingFarms.map(farm => {
        const farmer = MOCK_FARMERS.find(f => f.id === farm.farmerId);
        return (
          <div key={farm.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-yellow-400 h-1.5" />
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">🌾</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800">{farm.name}</h3>
                  <p className="text-xs text-gray-500">{farmer?.name} • {farm.area} ไร่</p>
                  <p className="text-xs text-gray-400">{farm.village}, {farm.district}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">ประเภทดิน: </span><span className="font-medium">{farm.soilType}</span></div>
                <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">แหล่งน้ำ: </span><span className="font-medium">{farm.waterSource}</span></div>
                <div className="bg-gray-50 rounded-lg p-2 col-span-2"><span className="text-gray-400">พิกัด: </span><span className="font-medium">{farm.lat.toFixed(4)}, {farm.lng.toFixed(4)}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRejected(r => [...r, farm.id])} className="flex-1 border-2 border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50">
                  ✗ ปฏิเสธ
                </button>
                <button onClick={() => setConfirmed(c => [...c, farm.id])} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700">
                  ✓ ยืนยัน
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {(confirmed.length > 0 || rejected.length > 0) && (
        <div className="bg-gray-50 rounded-2xl p-3 text-xs text-gray-600 text-center">
          ยืนยันแล้ว {confirmed.length} แปลง • ปฏิเสธ {rejected.length} แปลง
        </div>
      )}
    </div>
  );
}
