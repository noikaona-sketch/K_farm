import { useState } from 'react'
import { Plus, RefreshCw, X } from 'lucide-react'
import {
  createAdminMember,
  createAdminStaff,
  createAdminVehicle,
} from '../../lib/adminCreate'
import { DEPT_PERMISSIONS, type Department } from '../../lib/permissions'
import type { Capability, Grade, VehicleType } from '../../lib/roles'

type Mode = 'member' | 'vehicle' | 'staff'

const PROVINCES = ['บุรีรัมย์', 'สุรินทร์', 'ศรีสะเกษ', 'นครราชสีมา', 'ร้อยเอ็ด', 'อุบลราชธานี', 'ยโสธร', 'มุกดาหาร']
const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'truck', label: 'รถบรรทุก' },
  { value: 'tractor', label: 'รถไถ / แทรกเตอร์' },
  { value: 'harvester', label: 'รถเกี่ยว / เก็บเกี่ยว' },
]
const VEHICLE_SIZES = ['เล็ก', 'กลาง', 'ใหญ่', '6 ล้อ', '10 ล้อ', 'รถพ่วง', 'รถเทรลเลอร์', 'อื่นๆ']
const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: 'agri', label: 'ฝ่ายเกษตร' },
  { value: 'sales', label: 'ฝ่ายขาย' },
  { value: 'stock', label: 'ฝ่ายสต็อก' },
  { value: 'accounting', label: 'ฝ่ายบัญชี' },
  { value: 'inspection', label: 'ฝ่ายตรวจแปลง' },
  { value: 'service', label: 'ฝ่ายรถ/บริการ' },
  { value: 'it', label: 'ฝ่าย IT' },
]
const GRADES: Grade[] = ['C', 'B', 'A']

function titleOf(mode: Mode) {
  if (mode === 'member') return 'เพิ่มสมาชิก'
  if (mode === 'vehicle') return 'เพิ่มรถ / ผู้ให้บริการ'
  return 'เพิ่มพนักงาน'
}

function defaultCapability(mode: Mode): Capability[] {
  if (mode === 'staff') return []
  return []
}

export default function AdminQuickCreate({ mode, onDone }: { mode: Mode; onDone?: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idCard, setIdCard] = useState('')
  const [address, setAddress] = useState('')
  const [province, setProvince] = useState('บุรีรัมย์')
  const [district, setDistrict] = useState('')
  const [subdistrict, setSubdistrict] = useState('')
  const [village, setVillage] = useState('')
  const [grade, setGrade] = useState<Grade>('C')
  const [capabilities, setCapabilities] = useState<Capability[]>(defaultCapability(mode))

  const [vehicleType, setVehicleType] = useState<VehicleType>('truck')
  const [vehicleSize, setVehicleSize] = useState('6 ล้อ')
  const [licensePlate, setLicensePlate] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')

  const [department, setDepartment] = useState<Department>('agri')
  const [canFieldwork, setCanFieldwork] = useState(false)

  const reset = () => {
    setFullName(''); setPhone(''); setIdCard(''); setAddress('')
    setProvince('บุรีรัมย์'); setDistrict(''); setSubdistrict(''); setVillage('')
    setGrade('C'); setCapabilities(defaultCapability(mode))
    setVehicleType('truck'); setVehicleSize('6 ล้อ'); setLicensePlate(''); setDriverName(''); setDriverPhone('')
    setDepartment('agri'); setCanFieldwork(false)
    setMessage(''); setError('')
  }

  const toggleCapability = (cap: Capability) => {
    setCapabilities(prev => prev.includes(cap) ? prev.filter(v => v !== cap) : [...prev, cap])
  }

  const validate = () => {
    if (!fullName.trim()) throw new Error('กรุณากรอกชื่อ-นามสกุล')
    if (!phone.trim() && !idCard.trim()) throw new Error('กรุณากรอกเบอร์โทรหรือเลขบัตรอย่างน้อย 1 อย่าง')
    if (mode === 'vehicle' && !licensePlate.trim()) throw new Error('กรุณากรอกทะเบียนรถ')
  }

  const save = async () => {
    setSaving(true); setError(''); setMessage('')
    try {
      validate()
      if (mode === 'member') {
        await createAdminMember({
          fullName,
          phone,
          idCard,
          address,
          province,
          district,
          subdistrict,
          village,
          grade,
          capabilities,
          role: 'member',
          status: 'pending_leader',
          farmerStatus: 'pending',
        })
      } else if (mode === 'vehicle') {
        await createAdminVehicle({
          fullName,
          phone,
          idCard,
          address,
          province,
          district,
          subdistrict,
          village,
          grade,
          capabilities,
          vehicleType,
          vehicleSize,
          licensePlate,
          driverName,
          driverPhone,
          role: 'service',
          status: 'pending',
          serviceStatus: 'pending',
        })
      } else {
        await createAdminStaff({
          fullName,
          phone,
          idCard,
          address,
          province,
          district,
          subdistrict,
          village,
          grade,
          capabilities,
          department,
          permissions: DEPT_PERMISSIONS[department] ?? [],
          canFieldwork,
          role: canFieldwork ? 'field' : 'member',
          status: 'approved',
        })
      }
      setMessage('บันทึกสำเร็จ')
      await onDone?.()
      reset()
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button onClick={() => { reset(); setOpen(true) }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm">
        <Plus className="w-4 h-4" />{titleOf(mode)}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="font-bold text-lg text-gray-900">{titleOf(mode)}</h2>
                <p className="text-xs text-gray-500">ถ้าพบเลขบัตรหรือเบอร์ซ้ำ ระบบจะ update ข้อมูลเดิม</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {message && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{message}</div>}
              {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

              <section className="grid md:grid-cols-2 gap-3">
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="ชื่อ-นามสกุล *" className="border rounded-xl p-3" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="เบอร์โทร" className="border rounded-xl p-3" />
                <input value={idCard} onChange={e => setIdCard(e.target.value)} placeholder="เลขบัตร / รหัส" className="border rounded-xl p-3" />
                <select value={grade} onChange={e => setGrade(e.target.value as Grade)} className="border rounded-xl p-3 bg-white">
                  {GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </section>

              <section className="grid md:grid-cols-2 gap-3">
                <select value={province} onChange={e => setProvince(e.target.value)} className="border rounded-xl p-3 bg-white">
                  {PROVINCES.map(p => <option key={p}>{p}</option>)}
                </select>
                <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="อำเภอ" className="border rounded-xl p-3" />
                <input value={subdistrict} onChange={e => setSubdistrict(e.target.value)} placeholder="ตำบล" className="border rounded-xl p-3" />
                <input value={village} onChange={e => setVillage(e.target.value)} placeholder="หมู่บ้าน" className="border rounded-xl p-3" />
                <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="ที่อยู่เพิ่มเติม" className="border rounded-xl p-3 md:col-span-2" />
              </section>

              {mode === 'vehicle' && (
                <section className="grid md:grid-cols-2 gap-3 bg-orange-50 border border-orange-100 rounded-2xl p-4">
                  <select value={vehicleType} onChange={e => setVehicleType(e.target.value as VehicleType)} className="border rounded-xl p-3 bg-white">
                    {VEHICLE_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                  <select value={vehicleSize} onChange={e => setVehicleSize(e.target.value)} className="border rounded-xl p-3 bg-white">
                    {VEHICLE_SIZES.map(v => <option key={v}>{v}</option>)}
                  </select>
                  <input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="ทะเบียนรถ *" className="border rounded-xl p-3" />
                  <input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="ชื่อคนขับ" className="border rounded-xl p-3" />
                  <input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="เบอร์คนขับ" className="border rounded-xl p-3" />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={capabilities.includes('can_inspect_no_burn')} onChange={() => toggleCapability('can_inspect_no_burn')} /> ให้สิทธิ์ตรวจไม่เผา
                  </label>
                </section>
              )}

              {mode === 'staff' && (
                <section className="grid md:grid-cols-2 gap-3 bg-purple-50 border border-purple-100 rounded-2xl p-4">
                  <select value={department} onChange={e => setDepartment(e.target.value as Department)} className="border rounded-xl p-3 bg-white">
                    {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={canFieldwork} onChange={e => setCanFieldwork(e.currentTarget.checked)} /> เปิดงานภาคสนาม
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={capabilities.includes('can_inspect')} onChange={() => toggleCapability('can_inspect')} /> ผู้ตรวจทั่วไป
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={capabilities.includes('manage_all')} onChange={() => toggleCapability('manage_all')} /> Admin เต็มระบบ
                  </label>
                </section>
              )}

              {mode === 'member' && (
                <section className="grid md:grid-cols-2 gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={capabilities.includes('is_leader')} onChange={() => toggleCapability('is_leader')} /> ตั้งเป็นหัวหน้ากลุ่ม
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={capabilities.includes('can_inspect')} onChange={() => toggleCapability('can_inspect')} /> ตั้งเป็นผู้ตรวจทั่วไป
                  </label>
                </section>
              )}

              <button disabled={saving} onClick={save} className="w-full rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex items-center justify-center gap-2">
                {saving && <RefreshCw className="w-5 h-5 animate-spin" />}
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
