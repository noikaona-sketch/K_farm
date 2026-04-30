import React, { useState, useRef } from 'react'
import { useAuth } from '../../routes/AuthContext'
import { MOCK_PLANTING_RECORDS, MOCK_SALE_HISTORY, MOCK_NO_BURN, MOCK_FARMS, type PlantPhoto, type NoBurnPhoto } from '../../data/mockData'

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

const STEP_ICONS: Record<string, string> = {
  seed_received:'🌾', land_prep:'🚜', planting:'🌱', fertilize1:'💊', fertilize2:'💊', harvest:'🌽', sale_scheduled:'🚛'
}

function PhotoCapture({ onCapture, label }: { onCapture:(d:string,lat?:number,lng?:number)=>void; label:string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string|null>(null)
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null)
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const data = ev.target?.result as string
      setPreview(data)
      if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => { const c={lat:pos.coords.latitude,lng:pos.coords.longitude}; setCoords(c); onCapture(data,c.lat,c.lng) },
          () => onCapture(data)
        )
      } else onCapture(data)
    }
    reader.readAsDataURL(file)
  }
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle}/>
      {preview
        ? <div className="relative"><img src={preview} className="w-full h-32 object-cover rounded-xl"/>
            {coords && <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-lg">📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>}
            <button onClick={()=>{setPreview(null);setCoords(null)}} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
          </div>
        : <button onClick={()=>ref.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl py-5 flex flex-col items-center gap-2 hover:border-green-400 hover:bg-green-50 transition-colors">
            <span className="text-3xl">📷</span>
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-[10px] text-gray-400">พิกัด GPS บันทึกอัตโนมัติ</span>
          </button>
      }
    </div>
  )
}

function MapView({ photos }: { photos:(PlantPhoto|NoBurnPhoto)[] }) {
  const [selId, setSelId] = useState<string|null>(null)
  const wc = photos.filter(p=>p.lat&&p.lng)
  if(!wc.length) return <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-xs">ยังไม่มีภาพที่มีพิกัด GPS</div>
  return (
    <div className="space-y-2">
      <div className="relative bg-gradient-to-br from-green-100 to-lime-100 rounded-2xl h-44 overflow-hidden border border-green-200">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'linear-gradient(rgba(0,0,0,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.1) 1px,transparent 1px)',backgroundSize:'20px 20px'}}/>
        <div className="absolute top-2 left-2 bg-white/80 text-[10px] px-2 py-1 rounded-lg font-medium text-gray-600">🗺️ ภาพตามพิกัด GPS</div>
        {wc.map((p,i) => {
          const x=15+(i*19)%65; const y=20+(i*27)%55; const cap='caption' in p?p.caption:p.label; const isSel=p.id===selId
          return (
            <button key={p.id} onClick={()=>setSelId(p.id===selId?null:p.id)} style={{left:`${x}%`,top:`${y}%`}}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${isSel?'z-10 scale-125':'hover:scale-110'}`}>
              <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm ${isSel?'bg-yellow-400':'bg-green-500'}`}>📷</div>
              {isSel && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-xl p-2 w-40 z-20 border border-gray-100">
                  {p.url?<img src={p.url} className="w-full h-16 object-cover rounded-lg mb-1"/>:<div className="w-full h-14 bg-gray-100 rounded-lg mb-1 flex items-center justify-center text-gray-300">📷</div>}
                  <div className="text-[10px] font-semibold text-gray-700 truncate">{cap}</div>
                  <div className="text-[9px] text-gray-400">📍 {p.lat?.toFixed(4)}, {p.lng?.toFixed(4)}</div>
                </div>
              )}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {wc.map(p => {
          const cap='caption' in p?p.caption:p.label; const date='takenAt' in p?p.takenAt:p.submittedAt
          return (
            <button key={p.id} onClick={()=>setSelId(p.id===selId?null:p.id)}
              className={`rounded-xl overflow-hidden border-2 transition-all ${p.id===selId?'border-green-500':'border-transparent'}`}>
              {p.url?<img src={p.url} alt={cap} className="w-full h-20 object-cover"/>
                :<div className="w-full h-20 bg-gray-100 flex flex-col items-center justify-center gap-1"><span className="text-xl">📷</span><span className="text-[9px] text-gray-400 text-center px-1">{cap}</span></div>}
              <div className="bg-white px-1 py-0.5">
                <div className="text-[9px] text-gray-400 truncate">📍 {p.lat?.toFixed(3)}, {p.lng?.toFixed(3)}</div>
                <div className="text-[9px] text-gray-500 truncate">{date}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function PlantingRecord() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'growth'|'sales'|'noburn'>('growth')
  const [addingStep, setAddingStep] = useState<string|null>(null)
  const [showSaleForm, setShowSaleForm] = useState(false)
  const [showNoBurnForm, setShowNoBurnForm] = useState(false)
  const [expandedReg, setExpandedReg] = useState<string|null>('nb1')

  const uid = user?.id ?? 'f1'
  const records = MOCK_PLANTING_RECORDS.filter(r => r.farmerId === uid)
  const [recId, setRecId] = useState(records[0]?.id ?? 'pr1')
  const rec = records.find(r => r.id === recId) ?? records[0]
  const farms = MOCK_FARMS.filter(f => f.farmerId === uid && f.confirmed)
  const saleHistory = MOCK_SALE_HISTORY.filter(s => s.farmerId === uid)
  const noBurnRegs = MOCK_NO_BURN.filter(r => r.farmerId === uid)

  const today = new Date().toISOString().split('T')[0]
  const ageDays = rec ? Math.max(0, Math.round((Date.now() - new Date(rec.plantDate).getTime()) / 86400000)) : 0
  const totalDays = rec ? daysBetween(rec.plantDate, rec.estimatedHarvestDate) : 1
  const progress = Math.min(100, Math.round((ageDays/totalDays)*100))

  const stColors: Record<string,string> = { harvested:'bg-green-100 text-green-700', growing:'bg-blue-100 text-blue-700', seed_received:'bg-gray-100 text-gray-600', land_prep:'bg-orange-100 text-orange-700' }
  const stLabels: Record<string,string> = { harvested:'✓ เก็บแล้ว', growing:'🌱 กำลังปลูก', seed_received:'🌾 รับเมล็ด', land_prep:'🚜 เตรียมดิน' }

  const nbStatus: Record<string,{l:string;c:string;icon:string}> = {
    pending:         {l:'รอดำเนินการ',    c:'bg-gray-100 text-gray-600',   icon:'⏳'},
    photo_submitted: {l:'ส่งภาพแล้ว',     c:'bg-blue-100 text-blue-700',   icon:'📷'},
    reviewing:       {l:'กำลังตรวจสอบ',   c:'bg-yellow-100 text-yellow-700',icon:'🔍'},
    approved:        {l:'ผ่านการตรวจสอบ', c:'bg-green-100 text-green-700', icon:'✅'},
    rejected:        {l:'ไม่ผ่าน',        c:'bg-red-100 text-red-700',     icon:'❌'},
  }
  const ptLabels: Record<string,string> = {
    before_harvest:'แปลงก่อนเก็บเกี่ยว',
    after_harvest:'แปลงหลังเก็บเกี่ยว (ไม่มีร่องรอยเผา)',
    field_condition:'สภาพแปลงปัจจุบัน',
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-4 pb-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-800">ข้าวโพดอาหารสัตว์</h1>
            <p className="text-xs text-gray-500">บันทึกการปลูกและการขาย</p>
          </div>
          <button className="bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-semibold">+ ฤดูกาลใหม่</button>
        </div>

        {records.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {records.map(r => (
              <button key={r.id} onClick={() => setRecId(r.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all ${r.id===recId?'bg-green-600 text-white border-green-600':'bg-white border-gray-200 text-gray-600'}`}>
                <span>{r.variety}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${r.id===recId?'bg-white/20 text-white':stColors[r.status]??'bg-gray-100'}`}>{stLabels[r.status]}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex bg-gray-100 rounded-2xl p-1">
          {([['growth','🌱','ความคืบหน้า'],['sales','💰','ประวัติขาย'],['noburn','🚫🔥','ไม่เผา']] as [typeof tab,string,string][]).map(([k,ic,lb]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab===k?'bg-white text-green-700 shadow-sm':'text-gray-500'}`}>
              <span>{ic}</span><span>{lb}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 pt-3 space-y-4">
        {tab === 'growth' && rec && (<>
          <div className="bg-gradient-to-r from-green-600 to-lime-600 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-green-200">อายุข้าวโพด</div>
                <div className="text-4xl font-bold">{ageDays} <span className="text-lg font-normal">วัน</span></div>
                <div className="text-green-200 text-xs">{Math.floor(ageDays/7)} สัปดาห์ • พันธุ์ {rec.variety}</div>
              </div>
              <div className="text-right">
                <div className="text-5xl">🌽</div>
                {rec.saleScheduledDate && (
                  <div className="mt-1 bg-yellow-400 text-green-900 text-[11px] font-bold px-2 py-1 rounded-lg whitespace-nowrap">🚛 นัดขาย {rec.saleScheduledDate}</div>
                )}
              </div>
            </div>
            {rec.status !== 'harvested' && (
              <div>
                <div className="flex justify-between text-[10px] text-green-200 mb-1"><span>ลงเมล็ด {rec.plantDate}</span><span>{progress}%</span><span>เก็บเกี่ยว {rec.estimatedHarvestDate}</span></div>
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-yellow-300 rounded-full" style={{width:`${progress}%`}}/></div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700 text-sm">📋 ขั้นตอนการปลูก</h3>
              <span className="text-xs text-gray-400">{rec.steps.filter(s=>s.done).length}/{rec.steps.length} ขั้นตอน</span>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100"/>
              <div className="space-y-5">
                {rec.steps.map((step,idx) => {
                  const photos = rec.photos.filter(p=>p.stepKey===step.stepKey)
                  const isAdding = addingStep === step.stepKey
                  return (
                    <div key={step.id} className="flex gap-4">
                      <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm flex-shrink-0 shadow-sm ${step.done?'bg-green-500 border-green-500 text-white':'bg-white border-gray-200 text-gray-400'}`}>
                        {step.done ? STEP_ICONS[step.stepKey] : <span className="text-xs font-bold">{idx+1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className={`text-sm font-semibold ${step.done?'text-gray-800':'text-gray-400'}`}>{step.label}</div>
                            {step.date && <div className="text-xs text-gray-400">{step.date}</div>}
                            {step.note && <div className="text-xs text-gray-500">{step.note}</div>}
                            {step.lat && <div className="text-[10px] text-blue-400">📍 {step.lat.toFixed(4)}, {step.lng?.toFixed(4)}</div>}
                          </div>
                          {step.done && (
                            <button onClick={() => setAddingStep(isAdding?null:step.stepKey)} className="text-[10px] text-green-600 border border-green-200 bg-green-50 px-2 py-1 rounded-lg flex-shrink-0">📷</button>
                          )}
                        </div>
                        {photos.length > 0 && (
                          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                            {photos.map(ph => (
                              <div key={ph.id} className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                {ph.url ? <img src={ph.url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📷</div>}
                              </div>
                            ))}
                          </div>
                        )}
                        {isAdding && (
                          <div className="mt-2">
                            <PhotoCapture label={`ถ่ายภาพ: ${step.label}`} onCapture={(_d,_lat,_lng) => setAddingStep(null)}/>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {rec.photos.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-700 text-sm mb-3">📍 ภาพทั้งหมดบนแผนที่</h3>
              <MapView photos={rec.photos}/>
            </div>
          )}
        </>)}

        {tab === 'sales' && (<>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
              <div className="text-xs text-green-600 font-medium mb-1">รายได้รวม</div>
              <div className="text-xl font-bold text-green-700">{saleHistory.reduce((s,h)=>s+h.totalAmount,0).toLocaleString()}</div>
              <div className="text-xs text-green-400">บาท</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3 text-center">
              <div className="text-xs text-yellow-600 font-medium mb-1">ราคาเฉลี่ย</div>
              <div className="text-xl font-bold text-yellow-700">{saleHistory.length ? Math.round(saleHistory.reduce((s,h)=>s+h.pricePerTon,0)/saleHistory.length).toLocaleString() : '-'}</div>
              <div className="text-xs text-yellow-400">บาท/ตัน</div>
            </div>
          </div>
          <button onClick={() => setShowSaleForm(!showSaleForm)} className="w-full bg-yellow-500 text-white py-3 rounded-xl font-semibold text-sm">🌽 + บันทึกการขายใหม่</button>
          {showSaleForm && (
            <div className="bg-white rounded-2xl shadow-md border border-yellow-100 p-4 space-y-3">
              <h3 className="font-bold text-gray-700 text-sm border-b pb-2">📝 บันทึกการขาย</h3>
              <div className="grid grid-cols-2 gap-3">
                {[['วันที่ขาย','date'],['ปริมาณ (ตัน)','number'],['ราคา บ./ตัน','number'],['% ความชื้น','number']].map(([l],i) => (
                  <div key={i}><label className="text-xs font-semibold text-gray-600 block mb-1">{l}</label>
                    <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"/></div>
                ))}
              </div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">ผู้รับซื้อ</label>
                <input placeholder="โรงงาน / สหกรณ์" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"/></div>
              <div className="flex gap-2">
                <button onClick={() => setShowSaleForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm">ยกเลิก</button>
                <button onClick={() => setShowSaleForm(false)} className="flex-1 bg-yellow-500 text-white py-2.5 rounded-xl text-sm font-semibold">✓ บันทึก</button>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {saleHistory.map(sale => (
              <div key={sale.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-400 to-amber-400 px-4 py-2.5 flex justify-between items-center">
                  <span className="font-bold text-yellow-900">{sale.saleDate}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${sale.grade==='A'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>เกรด {sale.grade}</span>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div><div className="font-bold text-gray-800 text-sm">{sale.buyer}</div><div className="text-xs text-gray-500">ความชื้น {sale.moisturePercent}%</div></div>
                    <div className="text-right"><div className="text-xl font-bold text-green-700">{sale.totalAmount.toLocaleString()}</div><div className="text-xs text-gray-400">บาท</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">ปริมาณ: </span><span className="font-bold">{sale.quantity} ตัน</span></div>
                    <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">ราคา: </span><span className="font-bold text-yellow-700">{sale.pricePerTon.toLocaleString()} บ./ตัน</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {tab === 'noburn' && (<>
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-3 mb-3"><span className="text-3xl">🚫🔥</span>
              <div><div className="font-bold">โครงการข้าวโพดสด ไม่เผา</div><div className="text-orange-100 text-xs">รับโบนัส <strong>+50 บาท/ตัน</strong></div></div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 space-y-1.5 text-xs text-orange-50">
              {['ลงทะเบียนเข้าร่วมโครงการ','ถ่ายภาพแปลงก่อน/หลังเก็บเกี่ยว (พร้อม GPS)','ส่งภาพให้เจ้าหน้าที่ตรวจสอบ','รอผลการตรวจสอบ → รับโบนัส'].map((t,i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{i+1}</span>{t}
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setShowNoBurnForm(!showNoBurnForm)} className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm">🌿 + ลงทะเบียนสิทธิ์ไม่เผา</button>

          {showNoBurnForm && (
            <div className="bg-white rounded-2xl shadow-md border border-orange-100 p-4 space-y-3">
              <h3 className="font-bold text-gray-700 text-sm border-b pb-2">📝 ลงทะเบียนไม่เผาตอซัง</h3>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">เลือกแปลง</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50">
                  {farms.map(f => <option key={f.id}>{f.name} ({f.area} ไร่)</option>)}
                </select>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <p className="text-xs text-orange-800 font-semibold mb-1">คำมั่นสัญญา</p>
                <p className="text-xs text-orange-700">ข้าพเจ้าขอให้คำมั่นสัญญาว่าจะไม่เผาตอซังข้าวโพด จะทำการไถกลบหรือสับกลบแทน</p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-orange-500"/>
                <span className="text-gray-700">ยอมรับเงื่อนไข</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => setShowNoBurnForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm">ยกเลิก</button>
                <button onClick={() => setShowNoBurnForm(false)} className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold">ลงทะเบียน</button>
              </div>
            </div>
          )}

          {noBurnRegs.map(reg => {
            const st = nbStatus[reg.status]; const isExp = expandedReg === reg.id
            return (
              <div key={reg.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button className="w-full p-4 text-left" onClick={() => setExpandedReg(isExp?null:reg.id)}>
                  <div className="flex items-start justify-between">
                    <div><div className="font-bold text-gray-800 text-sm">{reg.farmName}</div><div className="text-xs text-gray-400">{reg.season}</div></div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${st.c}`}>{st.icon} {st.l}</span>
                  </div>
                  {reg.status==='approved' && (
                    <div className="mt-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex justify-between">
                      <span className="text-xs text-green-600">โบนัสที่ได้รับ</span>
                      <span className="font-bold text-green-700">+{reg.bonusPerTon} บาท/ตัน</span>
                    </div>
                  )}
                  {reg.reviewNote && <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">{reg.reviewNote}</div>}
                  <div className="mt-1 text-right text-xs text-gray-400">{isExp?'▲ ซ่อน':'▼ ดู/ส่งภาพ'}</div>
                </button>
                {isExp && (
                  <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
                    {reg.photos.length > 0 && (
                      <div><h4 className="text-xs font-bold text-gray-600 mb-2">📷 ภาพที่ส่งแล้ว</h4><MapView photos={reg.photos}/></div>
                    )}
                    {reg.status !== 'approved' && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-600 mb-3">📤 ส่งภาพเพิ่มเติม</h4>
                        <div className="space-y-3">
                          {(['before_harvest','after_harvest','field_condition'] as const).map(type => {
                            if(reg.photos.some(p=>p.photoType===type)) return null
                            return (
                              <div key={type}>
                                <div className="text-xs text-gray-500 mb-1.5 font-medium">{ptLabels[type]}</div>
                                <PhotoCapture label={`ถ่าย: ${ptLabels[type]}`} onCapture={()=>{}}/>
                              </div>
                            )
                          })}
                        </div>
                        <button className="w-full mt-4 bg-orange-500 text-white py-3 rounded-xl text-sm font-semibold">📤 ส่งภาพให้เจ้าหน้าที่ตรวจสอบ</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </>)}
      </div>
    </div>
  )
}