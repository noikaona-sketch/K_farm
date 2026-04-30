import React, { useState } from 'react';
import type { AppPage } from '../../App';
import { MOCK_FARMERS, MOCK_FARMS, MOCK_PRICES, MOCK_INSPECTIONS, MOCK_SALE_REQUESTS_EXTENDED, TIER_CONFIG } from '../../data/mockData';

interface Props { navigate: (p: AppPage) => void; }

export function AdminDashboard({ navigate }: Props) {
  const stats = [
    { label: 'เกษตรกรทั้งหมด', value: MOCK_FARMERS.length, icon: '👥', color: 'bg-blue-50 text-blue-700 border-blue-100', sub: 'คน' },
    { label: 'แปลงทั้งหมด', value: MOCK_FARMS.length, icon: '🌾', color: 'bg-green-50 text-green-700 border-green-100', sub: 'แปลง' },
    { label: 'พื้นที่รวม', value: MOCK_FARMS.reduce((s, f) => s + f.area, 0).toFixed(0), icon: '📐', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', sub: 'ไร่' },
    { label: 'คำขอขาย', value: MOCK_SALE_REQUESTS_EXTENDED.length, icon: '🛒', color: 'bg-yellow-50 text-yellow-700 border-yellow-100', sub: 'รายการ' },
    { label: 'รอตรวจสอบ', value: MOCK_INSPECTIONS.filter(i => i.status === 'pending').length, icon: '🔍', color: 'bg-orange-50 text-orange-700 border-orange-100', sub: 'แปลง' },
    { label: 'ผ่านการตรวจ', value: MOCK_INSPECTIONS.filter(i => i.status === 'completed').length, icon: '✅', color: 'bg-purple-50 text-purple-700 border-purple-100', sub: 'แปลง' },
  ];

  const tierCounts = Object.fromEntries(Object.keys(TIER_CONFIG).map(k => [k, MOCK_FARMERS.filter(f => f.tier === k).length]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs opacity-60">{s.sub}</div>
            <div className="text-xs font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Tier distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-700 mb-3">🏆 การกระจายระดับสมาชิก</h3>
          <div className="space-y-2">
            {(Object.entries(TIER_CONFIG) as [keyof typeof TIER_CONFIG, typeof TIER_CONFIG['bronze']][]).map(([k, tier]) => {
              const count = tierCounts[k] ?? 0;
              const pct = Math.round((count / MOCK_FARMERS.length) * 100);
              return (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium" style={{ color: tier.color }}>{tier.label}</span>
                    <span className="text-gray-500">{count} คน ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: tier.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent sale requests */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-700">🛒 คำขอขายล่าสุด</h3>
            <button onClick={() => navigate('adminFarmers')} className="text-xs text-green-600">ดูทั้งหมด</button>
          </div>
          <div className="space-y-2">
            {MOCK_SALE_REQUESTS_EXTENDED.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-800">{r.farmerName}</div>
                  <div className="text-xs text-gray-500">{r.variety} {r.quantity} ตัน</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  r.status === 'approved' ? 'bg-green-100 text-green-700' :
                  r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  r.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                }`}>
                  {r.status === 'approved' ? 'อนุมัติ' : r.status === 'pending' ? 'รออนุมัติ' : r.status === 'completed' ? 'สำเร็จ' : 'ปฏิเสธ'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'แผนที่แปลง', icon: '🗺️', page: 'adminMap', color: 'bg-green-600' },
          { label: 'จัดการราคา', icon: '💰', page: 'adminPrices', color: 'bg-yellow-500' },
          { label: 'ตารางเกษตรกร', icon: '👥', page: 'adminFarmers', color: 'bg-blue-600' },
        ].map(({ label, icon, page, color }) => (
          <button key={page} onClick={() => navigate(page as AppPage)}
            className={`${color} text-white rounded-2xl p-4 flex items-center gap-3 shadow-md active:scale-95 transition-transform`}>
            <span className="text-2xl">{icon}</span>
            <span className="font-semibold text-sm">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AdminMap({ navigate }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Mock map */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="relative bg-gradient-to-br from-green-100 to-emerald-50 h-72 flex items-center justify-center">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `radial-gradient(circle at 30% 40%, #16a34a 1px, transparent 1px), radial-gradient(circle at 70% 60%, #16a34a 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />

          {MOCK_FARMS.map((farm, i) => {
            const x = 15 + (i * 17) % 70;
            const y = 20 + (i * 23) % 55;
            return (
              <button
                key={farm.id}
                onClick={() => setSelected(farm.id === selected ? null : farm.id)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${selected === farm.id ? 'scale-150 z-10' : 'hover:scale-125'}`}
              >
                <div className={`w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-sm ${farm.confirmed ? 'bg-green-500' : 'bg-yellow-400'}`}>
                  🌾
                </div>
                {selected === farm.id && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-lg p-2 w-36 text-xs z-20 border border-gray-100">
                    <div className="font-bold text-gray-800 truncate">{farm.name}</div>
                    <div className="text-gray-500">{farm.area} ไร่</div>
                    <div className={`mt-1 ${farm.confirmed ? 'text-green-600' : 'text-yellow-600'}`}>
                      {farm.confirmed ? '✓ ยืนยันแล้ว' : '⏳ รอยืนยัน'}
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-xl p-2 text-xs shadow">
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> ยืนยันแล้ว</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> รอยืนยัน</div>
          </div>

          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-xl px-3 py-1.5 text-xs shadow font-medium text-gray-700">
            📍 บุรีรัมย์
          </div>
        </div>
      </div>

      {/* Farm list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-gray-700 mb-3">แปลงทั้งหมด ({MOCK_FARMS.length})</h3>
        <div className="space-y-2">
          {MOCK_FARMS.map(farm => {
            const farmer = MOCK_FARMERS.find(f => f.id === farm.farmerId);
            return (
              <div key={farm.id}
                onClick={() => setSelected(farm.id === selected ? null : farm.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${selected === farm.id ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${farm.confirmed ? 'bg-green-100' : 'bg-yellow-100'}`}>🌾</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{farm.name}</div>
                  <div className="text-xs text-gray-500">{farmer?.name} • {farm.area} ไร่</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${farm.confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {farm.confirmed ? 'ยืนยัน' : 'รอ'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AdminFarmersTable({ navigate }: Props) {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  const filtered = MOCK_FARMERS.filter(f =>
    (tierFilter === 'all' || f.tier === tierFilter) &&
    (f.name.includes(search) || f.code.includes(search) || f.district.includes(search))
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ค้นหาชื่อ รหัส หรืออำเภอ..."
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ k: 'all', l: 'ทั้งหมด' }, { k: 'platinum', l: '🏆 แพลทินัม' }, { k: 'gold', l: '⭐ โกลด์' }, { k: 'silver', l: '🥈 ซิลเวอร์' }, { k: 'bronze', l: '🥉 บรอนซ์' }].map(({ k, l }) => (
          <button key={k} onClick={() => setTierFilter(k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tierFilter === k ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>
            {l}
          </button>
        ))}
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
                const tier = TIER_CONFIG[f.tier];
                return (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                          {f.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{f.name}</div>
                          <div className="text-xs text-gray-400">{f.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{f.district}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: `${tier.color}22`, color: tier.color }}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">{f.totalArea} ไร่</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        f.status === 'active' ? 'bg-green-100 text-green-700' : f.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {f.status === 'active' ? 'ใช้งาน' : f.status === 'pending' ? 'รออนุมัติ' : 'ระงับ'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">ไม่พบข้อมูล</div>
          )}
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
          แสดง {filtered.length} จาก {MOCK_FARMERS.length} รายการ
        </div>
      </div>
    </div>
  );
}

export function AdminPriceManagement({ navigate }: Props) {
  const [prices, setPrices] = useState(MOCK_PRICES);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saved, setSaved] = useState(false);

  const startEdit = (id: string, current: number) => { setEditing(id); setEditValue(String(current)); setSaved(false); };
  const saveEdit = () => {
    setPrices(ps => ps.map(p => p.id === editing ? { ...p, price: Number(editValue) } : p));
    setEditing(null); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-green-700 text-sm font-medium">
          ✓ บันทึกราคาเรียบร้อย
        </div>
      )}

      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💰</span>
          <div>
            <div className="font-bold">ประกาศราคาอ้อย</div>
            <div className="text-yellow-100 text-xs">ฤดูกาล 2567/68 • อัปเดตล่าสุด: 30 เม.ย. 2568</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-700 text-sm">ตารางราคา</h3>
          <button className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold">+ เพิ่มราคา</button>
        </div>
        <div className="divide-y divide-gray-50">
          {prices.map(p => (
            <div key={p.id} className="px-4 py-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                p.grade === 'A' ? 'bg-yellow-100 text-yellow-700' : p.grade === 'B' ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'
              }`}>{p.grade}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{p.variety}</div>
                <div className="text-xs text-gray-400">มีผล {p.effectiveDate}</div>
              </div>
              {editing === p.id ? (
                <div className="flex items-center gap-2">
                  <input value={editValue} onChange={e => setEditValue(e.target.value)} type="number"
                    className="w-20 border border-green-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400" />
                  <button onClick={saveEdit} className="bg-green-600 text-white text-xs px-2 py-1 rounded-lg font-medium">บันทึก</button>
                  <button onClick={() => setEditing(null)} className="text-gray-400 text-xs px-1">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-bold text-green-700">{p.price.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">บาท/{p.unit}</div>
                  </div>
                  <button onClick={() => startEdit(p.id, p.price)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">✏️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button className="w-full bg-yellow-500 text-white py-3 rounded-xl font-semibold text-sm shadow-md active:scale-95 transition-transform">
        📢 ประกาศราคาใหม่ทันที
      </button>
    </div>
  );
}
