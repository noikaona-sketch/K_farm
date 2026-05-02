import React, { useEffect, useState } from 'react'
import { createSeedVariety, fetchSeedSuppliers, fetchSeedVarieties, type SeedSupplier, type SeedVariety, type SeedVarietyPayload, updateSeedVariety } from '../../lib/db'

const emptyForm: SeedVarietyPayload = { supplier_id: '', variety_name: '', brand: '', bag_weight_kg: null, price_per_bag: null, unit: 'bag', maturity_days: null, recommended_area: '', soil_requirement: '', water_requirement: '', disease_resistance: '', planting_spacing: '', fertilizer_recommendation: '', restrictions: '', planting_steps: '', expected_yield: '', active_status: true, show_to_farmer: true }

export default function AdminSeedVarieties() {
  const [suppliers, setSuppliers] = useState<SeedSupplier[]>([])
  const [rows, setRows] = useState<SeedVariety[]>([])
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [form, setForm] = useState<SeedVarietyPayload>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    const [s, v] = await Promise.all([fetchSeedSuppliers(), fetchSeedVarieties({ supplierId: supplierId || undefined, search: search || undefined })])
    setSuppliers(s.data ?? [])
    setRows(v.data ?? [])
    if (s.error || v.error) setErr(`โหลดข้อมูลไม่สำเร็จ: ${s.error ?? v.error}`)
  }
  useEffect(() => { load() }, [supplierId, search])

  const save = async () => {
    if (!form.supplier_id) return setErr('กรุณาเลือก Supplier')
    if (!suppliers.some(s => s.id === form.supplier_id)) return setErr('Supplier ไม่ถูกต้อง')
    if (!form.variety_name?.trim()) return setErr('กรุณากรอกชื่อพันธุ์')
    const res = editingId ? await updateSeedVariety(editingId, form) : await createSeedVariety(form)
    if (res.error) return setErr(`บันทึกไม่สำเร็จ: ${res.error}`)
    setMsg(editingId ? 'แก้ไขพันธุ์เมล็ดพันธุ์สำเร็จ' : 'เพิ่มพันธุ์เมล็ดพันธุ์สำเร็จ')
    setEditingId(null); setForm(emptyForm); setErr(null); await load()
  }

  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold">พันธุ์เมล็ดพันธุ์</h1><p className="text-sm text-gray-500">กำหนดชื่อพันธุ์ ขนาดถุง ราคา และข้อจำกัดการปลูก</p></div>
    {msg && <div className="bg-emerald-50 border border-emerald-300 p-2 rounded text-sm text-emerald-700">{msg}</div>}
    {err && <div className="bg-red-50 border border-red-300 p-2 rounded text-sm text-red-700">{err}</div>}
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="grid md:grid-cols-2 gap-2">
        <select className="border rounded px-3 py-2" value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">ทุก Supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select>
        <input className="border rounded px-3 py-2" placeholder="ค้นหา variety_name / brand" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="grid md:grid-cols-3 gap-2">
        <select className="border rounded px-3 py-2" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}><option value="">เลือก Supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select>
        <input className="border rounded px-3 py-2" placeholder="variety_name" value={form.variety_name} onChange={e => setForm(f => ({ ...f, variety_name: e.target.value }))} />
        <input className="border rounded px-3 py-2" placeholder="brand" value={form.brand ?? ''} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
        <input type="number" className="border rounded px-3 py-2" placeholder="bag_weight_kg" value={form.bag_weight_kg ?? ''} onChange={e => setForm(f => ({ ...f, bag_weight_kg: e.target.value ? Number(e.target.value) : null }))} />
        <input type="number" className="border rounded px-3 py-2" placeholder="price_per_bag" value={form.price_per_bag ?? ''} onChange={e => setForm(f => ({ ...f, price_per_bag: e.target.value ? Number(e.target.value) : null }))} />
        <input className="border rounded px-3 py-2" placeholder="unit" value={form.unit ?? 'bag'} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
        <input type="number" className="border rounded px-3 py-2" placeholder="maturity_days" value={form.maturity_days ?? ''} onChange={e => setForm(f => ({ ...f, maturity_days: e.target.value ? Number(e.target.value) : null }))} />
        {['recommended_area','soil_requirement','water_requirement','disease_resistance','planting_spacing','fertilizer_recommendation','restrictions','planting_steps','expected_yield'].map(k => <input key={k} className="border rounded px-3 py-2" placeholder={k} value={String(form[k as keyof SeedVarietyPayload] ?? '')} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />)}
        <label><input type="checkbox" checked={!!form.active_status} onChange={e => setForm(f => ({ ...f, active_status: e.target.checked }))} /> เปิดใช้งาน</label>
        <label><input type="checkbox" checked={!!form.show_to_farmer} onChange={e => setForm(f => ({ ...f, show_to_farmer: e.target.checked }))} /> แสดงให้เกษตรกร</label>
      </div>
      <button onClick={save} className="px-4 py-2 bg-emerald-600 text-white rounded">{editingId ? 'บันทึกการแก้ไข' : 'เพิ่มพันธุ์'}</button>
    </div>
    <div className="bg-white rounded-xl border overflow-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50"><th className="p-2 text-left">Supplier</th><th>ชื่อพันธุ์</th><th>Brand</th><th>kg/ถุง</th><th>ราคาต่อถุง</th><th>อายุเก็บเกี่ยว</th><th>เปิดใช้งาน</th><th>แสดงให้เกษตรกร</th><th>Actions</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t"><td className="p-2">{r.supplier_name}</td><td>{r.variety_name}</td><td>{r.brand}</td><td>{r.bag_weight_kg ?? '-'}</td><td>{r.price_per_bag ?? '-'}</td><td>{r.maturity_days ?? '-'}</td><td>{r.active_status ? 'เปิด' : 'ปิด'}</td><td>{r.show_to_farmer ? 'แสดง' : 'ซ่อน'}</td><td><button className="text-blue-600" onClick={() => { setEditingId(r.id); setForm({ ...r }) }}>แก้ไข</button></td></tr>)}</tbody></table></div>
  </div>
}
