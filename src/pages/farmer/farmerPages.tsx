import React, { useState } from 'react';
import type { AppPage } from '../../App';
import { MOCK_NO_BURNING, MOCK_SALE_REQUESTS, MOCK_PRICES, TIER_CONFIG, CURRENT_USER } from '../../data/mockData';

interface Props { navigate: (p: AppPage) => void; }

export function NoBurningApplication({ navigate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const apps = MOCK_NO_BURNING.filter(a => a.farmerId === CURRENT_USER.id);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800">ไม่เผาตอซัง</h1>
          <p className="text-xs text-gray-500">ยื่นคำมั่นสัญญาไม่เผา</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-orange-500 text-white text-xs px-3 py-2 rounded-xl font-semibold">+ ยื่นคำขอ</button>
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🚫🔥</span>
          <div>
            <div className="font-bold">โครงการอ้อยสด ไม่เผา</div>
            <div className="text-orange-200 text-xs">รับโบนัส +50 บาท/ตัน</div>
          </div>
        </div>
        <p className="text-xs text-orange-100">เกษตรกรที่เข้าร่วมโครงการและผ่านการตรวจสอบจะได้รับราคาพิเศษและคะแนนสะสมเพิ่ม</p>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-md border border-orange-100 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm border-b pb-2">📝 ยื่นคำมั่นสัญญา</h2>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">แปลง</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50">
              <option>แปลงที่ 1 หนองบัว</option>
              <option>แปลงที่ 2 โนนสูง</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">ฤดูกาลผลิต</label>
            <input placeholder="ปี 2567/68" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50" />
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="text-xs text-orange-700 font-medium">ข้าพเจ้าขอให้คำมั่นสัญญาว่าจะไม่เผาตอซังอ้อย และจะตัดอ้อยสดส่งโรงงานในฤดูกาลผลิตนี้</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="w-4 h-4 accent-orange-500" />
            <span className="text-gray-700">ข้าพเจ้ายอมรับเงื่อนไขและให้คำมั่นสัญญา</span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm">ยกเลิก</button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold">ยื่นคำขอ</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {apps.map(a => (
          <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-gray-800 text-sm">ฤดูกาลผลิต {a.year}</div>
                <div className="text-xs text-gray-500">{a.applicationDate}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                a.status === 'approved' ? 'bg-green-100 text-green-700' : a.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {a.status === 'approved' ? '✓ อนุมัติ' : a.status === 'pending' ? '⏳ รออนุมัติ' : '✗ ไม่อนุมัติ'}
              </span>
            </div>
            <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{a.commitment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SaleRequest({ navigate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const requests = MOCK_SALE_REQUESTS.filter(r => r.farmerId === CURRENT_USER.id);

  const statusConfig: Record<string, { l: string; c: string }> = {
    pending: { l: '⏳ รออนุมัติ', c: 'bg-yellow-100 text-yellow-700' },
    approved: { l: '✓ อนุมัติ', c: 'bg-green-100 text-green-700' },
    rejected: { l: '✗ ไม่อนุมัติ', c: 'bg-red-100 text-red-700' },
    completed: { l: '🎉 สำเร็จ', c: 'bg-blue-100 text-blue-700' },
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800">คำขอขายอ้อย</h1>
          <p className="text-xs text-gray-500">จัดการการขายของท่าน</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-yellow-500 text-white text-xs px-3 py-2 rounded-xl font-semibold">+ ยื่นขาย</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-md border border-yellow-100 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm border-b pb-2">🛒 ยื่นคำขอขายอ้อย</h2>
          {[
            { l: 'พันธุ์อ้อย', type: 'select', opts: ['อ้อยโรงงาน', 'อ้อยตอ', 'อ้อยพันธุ์ดี'] },
            { l: 'เกรด', type: 'select', opts: ['A', 'B', 'C'] },
          ].map(({ l, opts }) => (
            <div key={l}>
              <label className="text-xs font-semibold text-gray-600 block mb-1">{l}</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50">
                {opts?.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">ปริมาณ (ตัน)</label>
            <input type="number" placeholder="50" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm">ยกเลิก</button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-yellow-500 text-white py-2.5 rounded-xl text-sm font-semibold">ยื่นคำขอ</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {requests.map(r => {
          const st = statusConfig[r.status];
          return (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-gray-800">{r.variety} เกรด {r.grade}</div>
                  <div className="text-xs text-gray-500">{r.requestDate}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.c}`}>{st.l}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">ปริมาณ: </span><span className="font-bold text-gray-800">{r.quantity} ตัน</span></div>
                <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">ราคา: </span><span className="font-bold text-green-700">{r.price ? `${r.price.toLocaleString()} บ./ตัน` : '-'}</span></div>
              </div>
              {r.price && r.status === 'completed' && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-2 text-center">
                  <span className="text-xs text-gray-500">รวมรับเงิน </span>
                  <span className="font-bold text-green-700 text-base">{(r.price * r.quantity).toLocaleString()} บาท</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PriceAnnouncement({ navigate }: Props) {
  const prices = MOCK_PRICES;
  const varieties = [...new Set(prices.map(p => p.variety))];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="font-bold text-gray-800">ราคาอ้อยประจำวัน</h1>
        <p className="text-xs text-gray-500">อัปเดตล่าสุด: 30 เม.ย. 2568</p>
      </div>

      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📢</span>
          <span className="font-bold">ประกาศราคาอ้อย ฤดูกาล 2567/68</span>
        </div>
        <p className="text-green-200 text-xs">ราคากลางอ้อย: <span className="text-white font-bold text-lg">950</span> บาท/ตัน</p>
        <p className="text-green-200 text-xs mt-1">โดย: {prices[0].announcedBy}</p>
      </div>

      {varieties.map(variety => (
        <div key={variety} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-50 px-4 py-2 border-b border-gray-100">
            <h3 className="font-bold text-green-800 text-sm">🌾 {variety}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {prices.filter(p => p.variety === variety).map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    p.grade === 'A' ? 'bg-yellow-100 text-yellow-700' : p.grade === 'B' ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'
                  }`}>{p.grade}</div>
                  <span className="text-sm text-gray-600">เกรด {p.grade}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-700 text-base">{p.price.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">บาท/{p.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MemberTier({ navigate }: Props) {
  const user = CURRENT_USER;
  const tierInfo = TIER_CONFIG[user.tier];
  const tiers = Object.entries(TIER_CONFIG) as [keyof typeof TIER_CONFIG, typeof TIER_CONFIG['bronze']][];
  const nextTierEntry = tiers.find(([, t]) => t.min > user.points);
  const pointsToNext = nextTierEntry ? nextTierEntry[1].min - user.points : 0;
  const progress = nextTierEntry ? ((user.points - tierInfo.min) / (nextTierEntry[1].min - tierInfo.min)) * 100 : 100;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="font-bold text-gray-800">ระดับสมาชิก</h1>
        <p className="text-xs text-gray-500">ยิ่งปลูกดี ยิ่งได้สิทธิ์มาก</p>
      </div>

      {/* Current tier card */}
      <div className="rounded-2xl p-5 text-center shadow-lg" style={{ background: `linear-gradient(135deg, ${tierInfo.color}33, ${tierInfo.color}66)`, border: `2px solid ${tierInfo.color}` }}>
        <div className="text-4xl mb-2">🏆</div>
        <div className="text-2xl font-bold" style={{ color: tierInfo.color }}>{tierInfo.label}</div>
        <div className="text-gray-600 text-sm mt-1">{user.name}</div>
        <div className="mt-3">
          <div className="text-3xl font-bold text-gray-800">{user.points.toLocaleString()}</div>
          <div className="text-gray-500 text-xs">คะแนนสะสม</div>
        </div>
        {nextTierEntry && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{tierInfo.label}</span>
              <span>{nextTierEntry[1].label}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: tierInfo.color }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">อีก {pointsToNext.toLocaleString()} คะแนน → {nextTierEntry[1].label}</p>
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-gray-700 text-sm mb-3">✨ สิทธิ์ที่ได้รับ</h3>
        <div className="space-y-2">
          {tierInfo.benefits.map(b => (
            <div key={b} className="flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
              <span className="text-gray-700">{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* All tiers */}
      <div>
        <h3 className="font-bold text-gray-700 text-sm mb-3">ระดับทั้งหมด</h3>
        <div className="space-y-2">
          {tiers.map(([key, tier]) => (
            <div key={key} className={`rounded-xl p-3 border-2 flex items-center justify-between ${key === user.tier ? 'shadow-md' : 'opacity-60'}`}
              style={{ borderColor: key === user.tier ? tier.color : '#e5e7eb', background: `${tier.color}11` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: tier.color, color: 'white' }}>
                  {tier.label.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: tier.color }}>{tier.label}</div>
                  <div className="text-xs text-gray-500">{tier.min.toLocaleString()} - {tier.max === 99999 ? '∞' : tier.max.toLocaleString()} คะแนน</div>
                </div>
              </div>
              {key === user.tier && <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-medium">ระดับปัจจุบัน</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
