import React from 'react'
import { useAuth } from '../../routes/AuthContext'
import { TIER_CONFIG } from '../../data/mockData'

export default function MemberTier() {
  const { user } = useAuth()
  const tierKey = user?.id === 'f1' ? 'gold' : 'bronze'
  const points = 1240
  const tier = TIER_CONFIG[tierKey as keyof typeof TIER_CONFIG]
  const tiers = Object.entries(TIER_CONFIG) as [keyof typeof TIER_CONFIG, typeof TIER_CONFIG['bronze']][]
  const nextEntry = tiers.find(([,t]) => t.min > points)
  const progress = nextEntry ? Math.round(((points - tier.min) / (nextEntry[1].min - tier.min)) * 100) : 100

  return (
    <div className="p-4 space-y-4">
      <div><h1 className="font-bold text-gray-800">ระดับสมาชิก</h1><p className="text-xs text-gray-500">ยิ่งปลูกดี ยิ่งได้สิทธิ์มาก</p></div>
      <div className="rounded-2xl p-5 text-center shadow-lg" style={{ background:`linear-gradient(135deg,${tier.color}33,${tier.color}66)`, border:`2px solid ${tier.color}` }}>
        <div className="text-4xl mb-2">🏆</div>
        <div className="text-2xl font-bold" style={{color:tier.color}}>{tier.label}</div>
        <div className="text-gray-600 text-sm mt-1">{user?.name}</div>
        <div className="mt-3"><div className="text-3xl font-bold text-gray-800">{points.toLocaleString()}</div><div className="text-gray-500 text-xs">คะแนนสะสม</div></div>
        {nextEntry && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{tier.label}</span><span>{nextEntry[1].label}</span></div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${progress}%`,backgroundColor:tier.color}}/></div>
            <p className="text-xs text-gray-500 mt-1">อีก {(nextEntry[1].min - points).toLocaleString()} คะแนน → {nextEntry[1].label}</p>
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-gray-700 text-sm mb-3">✨ สิทธิ์ที่ได้รับ</h3>
        {tier.benefits.map(b => (
          <div key={b} className="flex items-center gap-2 text-sm py-1">
            <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
            <span className="text-gray-700">{b}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {tiers.map(([k, t]) => (
          <div key={k} className={`rounded-xl p-3 border-2 flex items-center justify-between ${k===tierKey?'shadow-md':'opacity-60'}`}
            style={{borderColor:k===tierKey?t.color:'#e5e7eb',background:`${t.color}11`}}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{backgroundColor:t.color,color:'white'}}>{t.label.charAt(0)}</div>
              <div>
                <div className="font-bold text-sm" style={{color:t.color}}>{t.label}</div>
                <div className="text-xs text-gray-500">{t.min.toLocaleString()} - {t.max===99999?'∞':t.max.toLocaleString()} คะแนน</div>
              </div>
            </div>
            {k===tierKey && <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-medium">ระดับปัจจุบัน</span>}
          </div>
        ))}
      </div>
    </div>
  )
}