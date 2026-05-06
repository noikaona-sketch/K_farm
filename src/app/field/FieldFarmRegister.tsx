import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, LocateFixed, MapPin, RefreshCw, Sprout } from 'lucide-react'
import { createFarm } from '../../lib/farms'
import { useAuth } from '../../routes/AuthContext'

const PROVINCES = ['บุรีรัมย์', 'สุรินทร์', 'ศรีสะเกษ', 'นครราชสีมา', 'ร้อยเอ็ด', 'อุบลราชธานี', 'ยโสธร', 'มุกดาหาร']
const CROP_TYPES = ['ข้าวโพด', 'มันสำปะหลัง', 'อ้อย', 'ข้าว', 'อื่น ๆ']
const OWNERSHIP_TYPES = ['เจ้าของเอง', 'เช่า', 'ทำร่วมกับครอบครัว', 'อื่น ๆ']

function parseNumber(value: string) {
  if (!value.trim()) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default function FieldFarmRegister() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()

  const [profileId, setProfileId] = useState(params.get('profileId') || '')
  const [farmName, setFarmName] = useState('')
  const [province, setProvince] = useState('บุรีรัมย์')
  const [district, setDistrict] = useState('')
  const [subdistrict, setSubdistrict] = useState('')
  const [village, setVillage] = useState('')
  const [areaRai, setAreaRai] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [cropType, setCropType] = useState('ข้าวโพด')
  const [ownershipType, setOwnershipType] = useState('เจ้าของเอง')
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const mapsUrl = useMemo(() => {
    const la = parseNumber(lat)
    const ln = parseNumber(lng)
    return la !== null && ln !== null ? `https://www.google.com/maps?q=${la},${ln}` : ''
  }, [lat, lng])

  const getGps = () => {
    setError('')
    setOk('')
    if (!navigator.geolocation) {
      setError('เครื่องนี้ไม่รองรับ GPS กรุณากรอกพิกัดเอง')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setOk('อ่านพิกัดแล้ว กรุณาตรวจสอบตำแหน่งก่อนบันทึก')
        setLocating(false)
      },
      () => {
        setError('อ่าน GPS ไม่สำเร็จ กรุณาเปิดสิทธิ์ตำแหน่ง หรือกรอกพิกัดเอง')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const validate = () => {
    if (!profileId.trim()) throw new Error('กรุณาระบุ Profile ID ของสมาชิก')
    if (!farmName.trim()) throw new Error('กรุณากรอกชื่อแปลง')
    if (!district.trim()) throw new Error('กรุณากรอกอำเภอ')
    if (!subdistrict.trim()) throw new Error('กรุณากรอกตำบล')

    const area = parseNumber(areaRai)
    const centerLat = parseNumber(lat)
    const centerLng = parseNumber(lng)
    if (area === null || area <= 0) throw new Error('กรุณากรอกพื้นที่ไร่ให้ถูกต้อง')
    if (centerLat === null || centerLng === null) throw new Error('กรุณากดอ่าน GPS หรือกรอกพิกัด')
    if (centerLat < -90 || centerLat > 90 || centerLng < -180 || centerLng > 180) {
      throw new Error('พิกัด GPS ไม่ถูกต้อง')
    }

    return { area, centerLat, centerLng }
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setOk('')
    try {
      const valid = validate()
      await createFarm({
        profileId: profileId.trim(),
        farmName,
        province,
        district,
        subdistrict,
        village,
        areaRai: valid.area,
        centerLat: valid.centerLat,
        centerLng: valid.centerLng,
        cropType,
        ownershipType,
        source: 'field_staff',
        actorId: user?.profileId ?? user?.id ?? null,
      })
      setOk('บันทึกแปลงสำเร็จ สถานะรอยืนยัน')
      setFarmName('')
      setVillage('')
      setAreaRai('')
      setLat('')
      setLng('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกแปลงไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => nav('/field')} className="bg-white border rounded-xl p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Sprout className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold">บันทึกแปลงเกษตร</h1>
            <p className="text-sm text-emerald-100">เกษตรกร 1 คนมีหลายแปลงได้</p>
          </div>
        </div>
      </div>

      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold flex items-center gap-2"><Sprout className="w-5 h-5" />ข้อมูลแปลง</div>
        <input value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="Profile ID สมาชิก *" className="w-full border rounded-xl p-3" />
        <input value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="ชื่อแปลง เช่น แปลงหลังบ้าน / แปลงโนนสูง *" className="w-full border rounded-xl p-3" />
        <input value={areaRai} onChange={(e) => setAreaRai(e.target.value)} placeholder="พื้นที่ (ไร่) *" inputMode="decimal" className="w-full border rounded-xl p-3" />
        <select value={cropType} onChange={(e) => setCropType(e.target.value)} className="w-full border rounded-xl p-3 bg-white">
          {CROP_TYPES.map(v => <option key={v}>{v}</option>)}
        </select>
        <select value={ownershipType} onChange={(e) => setOwnershipType(e.target.value)} className="w-full border rounded-xl p-3 bg-white">
          {OWNERSHIP_TYPES.map(v => <option key={v}>{v}</option>)}
        </select>
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold flex items-center gap-2"><MapPin className="w-5 h-5" />พื้นที่ปกครอง</div>
        <select value={province} onChange={(e) => setProvince(e.target.value)} className="w-full border rounded-xl p-3 bg-white">
          {PROVINCES.map(v => <option key={v}>{v}</option>)}
        </select>
        <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="อำเภอ *" className="w-full border rounded-xl p-3" />
        <input value={subdistrict} onChange={(e) => setSubdistrict(e.target.value)} placeholder="ตำบล *" className="w-full border rounded-xl p-3" />
        <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="หมู่บ้าน / รายละเอียดพื้นที่" className="w-full border rounded-xl p-3" />
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold flex items-center gap-2"><LocateFixed className="w-5 h-5" />GPS สำหรับ Map</div>
        <button type="button" onClick={getGps} disabled={locating} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 py-3 font-bold flex justify-center gap-2">
          {locating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
          {locating ? 'กำลังอ่าน GPS...' : 'ใช้ตำแหน่งปัจจุบัน'}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude *" inputMode="decimal" className="w-full border rounded-xl p-3" />
          <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude *" inputMode="decimal" className="w-full border rounded-xl p-3" />
        </div>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="block rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-center py-3 font-bold">
            เปิดตำแหน่งใน Google Maps
          </a>
        )}
      </section>

      <button disabled={saving || locating} onClick={save} className="w-full rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex justify-center gap-2">
        {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
        {saving ? 'กำลังบันทึก...' : 'บันทึกแปลง'}
      </button>
    </div>
  )
}
