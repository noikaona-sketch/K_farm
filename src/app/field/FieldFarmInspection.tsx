import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Camera, CheckCircle, MapPin, RefreshCw, Search, Sprout } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type FieldFarmer = { id: string; name: string; phone: string; idCard?: string; district?: string; village?: string }
const today = () => new Date().toISOString().slice(0, 10)

export default function FieldFarmInspection() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [farmers, setFarmers] = useState<FieldFarmer[]>([])
  const [farmerSearch, setFarmerSearch] = useState('')
  const [selectedFarmerId, setSelectedFarmerId] = useState('')
  const [inspectionDate, setInspectionDate] = useState(today())
  const [areaRai, setAreaRai] = useState('')
  const [cropType, setCropType] = useState('ข้าวโพด')
  const [plantStatus, setPlantStatus] = useState('planted')
  const [riskLevel, setRiskLevel] = useState('normal')
  const [note, setNote] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId)
  const filteredFarmers = useMemo(() => {
    const kw = farmerSearch.trim().toLowerCase()
    if (!kw) return farmers.slice(0, 20)
    return farmers.filter((f) => `${f.name} ${f.phone} ${f.idCard ?? ''} ${f.district ?? ''} ${f.village ?? ''}`.toLowerCase().includes(kw)).slice(0, 30)
  }, [farmers, farmerSearch])

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) return
      const [farmerRes, profileRes] = await Promise.all([
        supabase.from('farmers').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id,full_name,phone,id_card,role'),
      ])
      if (farmerRes.error) throw new Error(farmerRes.error.message)
      if (profileRes.error) throw new Error(profileRes.error.message)
      const profileMap = new Map((profileRes.data ?? []).map((p: any) => [String(p.id), p]))
      setFarmers((farmerRes.data ?? []).filter((f: any) => ['approved', 'active', 'farmer', 'member'].includes(String(f.status ?? 'approved'))).map((f: any) => { const p = profileMap.get(String(f.profile_id ?? '')); return { id: String(f.id), name: String(f.full_name ?? p?.full_name ?? f.name ?? '-'), phone: String(f.phone ?? p?.phone ?? ''), idCard: String(f.id_card ?? p?.id_card ?? ''), district: String(f.district ?? ''), village: String(f.village ?? '') } }))
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const getGps = () => {
    setError('')
    if (!navigator.geolocation) { setError('เครื่องนี้ไม่รองรับ GPS'); return }
    navigator.geolocation.getCurrentPosition((pos) => { setLat(String(pos.coords.latitude)); setLng(String(pos.coords.longitude)) }, () => setError('ไม่สามารถอ่านพิกัดได้'))
  }

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    Array.from(files).slice(0, 5).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => setPhotos((prev) => [...prev, String(e.target?.result ?? '')].slice(0, 5))
      reader.readAsDataURL(file)
    })
  }

  const submit = async () => {
    setSaving(true); setError(''); setOk('')
    try {
      if (!supabase) throw new Error('ยังไม่เชื่อมฐานข้อมูล')
      if (!selectedFarmer) throw new Error('กรุณาเลือกสมาชิก')
      if (!lat || !lng) throw new Error('กรุณากดบันทึกพิกัด GPS')
      const payload = { farmer_id: selectedFarmer.id, farmer_name: selectedFarmer.name, farmer_phone: selectedFarmer.phone, inspection_date: inspectionDate, area_rai: Number(areaRai || 0), crop_type: cropType, plant_status: plantStatus, risk_level: riskLevel, gps_lat: Number(lat), gps_lng: Number(lng), images: photos, note, status: 'submitted', created_by: user?.id ?? '', created_by_name: user?.name ?? 'ทีมภาคสนาม' }
      const { error: insertErr } = await supabase.from('field_farm_inspections').insert(payload)
      if (insertErr) throw new Error(insertErr.message)
      setOk('บันทึกตรวจแปลงสำเร็จ')
      setAreaRai(''); setNote(''); setPhotos([])
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ') } finally { setSaving(false) }
  }

  return <div className="min-h-screen bg-gray-50 p-4 space-y-4"><div className="flex items-center justify-between"><button onClick={() => nav('/farmer')} className="bg-white border rounded-xl p-2"><ArrowLeft className="w-5 h-5" /></button><button onClick={() => void load()} className="bg-white border rounded-xl p-2"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button></div><div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-lg"><div className="flex items-center gap-3"><Sprout className="w-8 h-8" /><div><h1 className="text-xl font-bold">ตรวจแปลง</h1><p className="text-sm text-emerald-100">สำหรับทีมภาคสนาม</p></div></div></div>{ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{ok}</div>}{error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}<div className="bg-white rounded-2xl border p-4 space-y-3"><div className="font-bold flex gap-2"><Search className="w-5 h-5" />เลือกสมาชิก</div><input value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)} placeholder="ค้นหาชื่อ / เบอร์ / เลขบัตร" className="w-full border rounded-xl p-3" />{farmerSearch && <div className="max-h-52 overflow-y-auto border rounded-xl divide-y">{filteredFarmers.map((f) => <button key={f.id} onClick={() => { setSelectedFarmerId(f.id); setFarmerSearch(f.name) }} className={`w-full text-left p-3 ${selectedFarmerId === f.id ? 'bg-emerald-50' : 'bg-white'}`}><div className="font-semibold">{f.name}</div><div className="text-xs text-gray-500">{f.phone} | {f.idCard || '-'} | {f.district || '-'}</div></button>)}</div>}{selectedFarmer && <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">ตรวจให้: <b>{selectedFarmer.name}</b> {selectedFarmer.phone}</div>}</div><div className="bg-white rounded-2xl border p-4 space-y-3"><input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="w-full border rounded-xl p-3" /><input type="number" value={areaRai} onChange={(e) => setAreaRai(e.target.value)} placeholder="พื้นที่ประมาณ (ไร่)" className="w-full border rounded-xl p-3" /><select value={cropType} onChange={(e) => setCropType(e.target.value)} className="w-full border rounded-xl p-3 bg-white"><option value="ข้าวโพด">ข้าวโพด</option><option value="มันสำปะหลัง">มันสำปะหลัง</option><option value="อ้อย">อ้อย</option><option value="อื่นๆ">อื่นๆ</option></select><select value={plantStatus} onChange={(e) => setPlantStatus(e.target.value)} className="w-full border rounded-xl p-3 bg-white"><option value="prepared">เตรียมแปลง</option><option value="planted">ปลูกแล้ว</option><option value="growing">กำลังเจริญเติบโต</option><option value="harvested">เก็บเกี่ยวแล้ว</option></select><select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className="w-full border rounded-xl p-3 bg-white"><option value="normal">ปกติ</option><option value="watch">เฝ้าระวัง</option><option value="risk">เสี่ยง</option></select><button onClick={getGps} className="w-full border rounded-xl py-3 font-bold flex items-center justify-center gap-2"><MapPin className="w-5 h-5" />บันทึกพิกัด GPS</button>{lat && lng && <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">GPS: {lat}, {lng}</div>}<label className="w-full border rounded-xl py-3 font-bold flex items-center justify-center gap-2 cursor-pointer"><Camera className="w-5 h-5" />ถ่ายรูปแปลง<input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} /></label>{photos.length > 0 && <div className="grid grid-cols-3 gap-2">{photos.map((p, i) => <img key={i} src={p} className="w-full h-24 object-cover rounded-xl border" />)}</div>}<textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ" className="w-full border rounded-xl p-3" /><button disabled={saving} onClick={submit} className="w-full rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex justify-center gap-2"><CheckCircle className="w-5 h-5" />{saving ? 'กำลังบันทึก...' : 'บันทึกตรวจแปลง'}</button></div></div>
}
