import React from 'react';
import type { AppPage } from '../../App';
import { MOCK_FARMS, CURRENT_USER } from '../../data/mockData';

interface Props { navigate: (p: AppPage) => void; }

export default function MyFarms({ navigate }: Props) {
  const farms = MOCK_FARMS.filter(f => f.farmerId === CURRENT_USER.id);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800">แปลงของฉัน</h1>
          <p className="text-xs text-gray-500">ทั้งหมด {farms.length} แปลง • {farms.reduce((s, f) => s + f.area, 0).toFixed(1)} ไร่</p>
        </div>
        <button
          onClick={() => navigate('addFarm')}
          className="bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-1 shadow-sm"
        >
          + เพิ่มแปลง
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'ทั้งหมด', value: farms.length, color: 'bg-green-50 text-green-700' },
          { label: 'ยืนยันแล้ว', value: farms.filter(f => f.confirmed).length, color: 'bg-blue-50 text-blue-700' },
          { label: 'รอยืนยัน', value: farms.filter(f => !f.confirmed).length, color: 'bg-yellow-50 text-yellow-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Farm list */}
      <div className="space-y-3">
        {farms.map(farm => (
          <div key={farm.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 h-2" />
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">🌾</div>
                  <div>
                    <h3 className="font-bold text-gray-800">{farm.name}</h3>
                    <p className="text-xs text-gray-500">{farm.village}, {farm.district}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  farm.confirmed ? 'bg-green-100 text-green-700' : 
                  farm.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                  {farm.confirmed ? '✓ ยืนยันแล้ว' : farm.status === 'pending' ? '⏳ รอยืนยัน' : '✗ ไม่ผ่าน'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { icon: '📐', label: 'พื้นที่', value: `${farm.area} ไร่` },
                  { icon: '🌍', label: 'ประเภทดิน', value: farm.soilType },
                  { icon: '💧', label: 'แหล่งน้ำ', value: farm.waterSource },
                  { icon: '📍', label: 'พิกัด', value: `${farm.lat.toFixed(3)}, ${farm.lng.toFixed(3)}` },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400">{icon} {label}: </span>
                    <span className="font-medium text-gray-700">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <button className="flex-1 border border-gray-200 text-gray-600 text-xs py-2 rounded-lg hover:bg-gray-50">
                  🗺️ ดูแผนที่
                </button>
                <button className="flex-1 border border-green-200 text-green-600 text-xs py-2 rounded-lg hover:bg-green-50">
                  📝 แก้ไข
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {farms.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🌾</div>
          <p className="font-medium">ยังไม่มีแปลง</p>
          <p className="text-xs mt-1">กดปุ่ม + เพิ่มแปลง เพื่อเริ่มต้น</p>
        </div>
      )}
    </div>
  );
}
