import React from 'react';
import type { AppPage } from '../../App';
import { CURRENT_USER, MOCK_FARMS, MOCK_PRICES, MOCK_SALE_REQUESTS, TIER_CONFIG } from '../../data/mockData';

interface Props { navigate: (p: AppPage) => void; }

export default function FarmerDashboard({ navigate }: Props) {
  const user = CURRENT_USER;
  const myFarms = MOCK_FARMS.filter(f => f.farmerId === user.id);
  const myRequests = MOCK_SALE_REQUESTS.filter(r => r.farmerId === user.id);
  const tierInfo = TIER_CONFIG[user.tier];
  const latestPrice = MOCK_PRICES.find(p => p.variety === 'อ้อยโรงงาน' && p.grade === 'A');

  const quickActions = [
    { icon: '🌿', label: 'แปลงของฉัน', page: 'farms' as AppPage, color: 'bg-green-50 text-green-700 border-green-200' },
    { icon: '📝', label: 'บันทึกการปลูก', page: 'planting' as AppPage, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { icon: '🚫🔥', label: 'ไม่เผาตอซัง', page: 'noBurning' as AppPage, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { icon: '🛒', label: 'ขายอ้อย', page: 'sale' as AppPage, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { icon: '💰', label: 'ราคาอ้อย', page: 'prices' as AppPage, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { icon: '⭐', label: 'ระดับสมาชิก', page: 'tier' as AppPage, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Welcome card */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-200 text-sm">ยินดีต้อนรับกลับ</p>
            <h2 className="text-xl font-bold mt-0.5">{user.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{user.id === 'f1' ? 'KF001' : user.id}</span>
              <span className="text-xs font-medium" style={{ color: tierInfo.color }}>
                🏆 {tierInfo.label}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-300">{user.points.toLocaleString()}</div>
            <div className="text-green-200 text-xs">คะแนนสะสม</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-white/20">
          <div className="text-center">
            <div className="text-lg font-bold">{myFarms.length}</div>
            <div className="text-green-200 text-xs">แปลง</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{myFarms.reduce((s, f) => s + f.area, 0).toFixed(1)}</div>
            <div className="text-green-200 text-xs">ไร่</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{myRequests.filter(r => r.status === 'approved').length}</div>
            <div className="text-green-200 text-xs">คำขอขาย</div>
          </div>
        </div>
      </div>

      {/* Today's price */}
      {latestPrice && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center justify-between" onClick={() => navigate('prices')}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <div>
              <div className="text-xs text-yellow-600 font-medium">ราคาอ้อยวันนี้</div>
              <div className="text-sm font-bold text-yellow-800">{latestPrice.variety} เกรด A</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-green-700">{latestPrice.price.toLocaleString()}</div>
            <div className="text-xs text-gray-500">บาท/{latestPrice.unit}</div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-2">เมนูด่วน</h3>
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map((a) => (
            <button
              key={a.page}
              onClick={() => navigate(a.page)}
              className={`${a.color} border rounded-xl p-3 flex flex-col items-center gap-1.5 transition-all active:scale-95`}
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-medium text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* My farms preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-600">แปลงของฉัน</h3>
          <button onClick={() => navigate('farms')} className="text-xs text-green-600 font-medium">ดูทั้งหมด →</button>
        </div>
        <div className="space-y-2">
          {myFarms.slice(0, 2).map(farm => (
            <div key={farm.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">🌾</div>
                <div>
                  <div className="font-medium text-sm text-gray-800">{farm.name}</div>
                  <div className="text-xs text-gray-500">{farm.area} ไร่ • {farm.district}</div>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                farm.confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {farm.confirmed ? '✓ ยืนยันแล้ว' : '⏳ รอยืนยัน'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pending sale requests */}
      {myRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🛒</span>
            <span className="text-sm font-semibold text-blue-800">คำขอขายที่รอดำเนินการ</span>
          </div>
          {myRequests.filter(r => r.status === 'pending').map(req => (
            <div key={req.id} className="flex justify-between text-sm mt-1">
              <span className="text-blue-700">{req.variety} {req.quantity} ตัน</span>
              <span className="text-orange-600 font-medium">⏳ รออนุมัติ</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
