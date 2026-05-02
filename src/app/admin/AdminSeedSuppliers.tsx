import React, { useEffect, useMemo, useState } from 'react'
import { createSeedSupplier, fetchSeedSuppliers, type SeedSupplier, type SeedSupplierPayload, updateSeedSupplier } from '../../lib/db'

const emptyForm: SeedSupplierPayload = { supplier_name: '', seed_brand: '', contact_name: '', phone: '', address: '', contract_terms: '', active_status: true, show_to_farmer: true }

export default function AdminSeedSuppliers() {
  const [items, setItems] = useState<SeedSupplier[]>([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<SeedSupplierPayload>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    const res = await fetchSeedSuppliers()
    if (res.error) setErr(`โหลดข้อมูลไม่สำเร็จ: ${res.error}`)
    setItems(res.data ?? [])
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter(s => [s.supplier_name, s.seed_brand, s.contact_name, s.phone].join(' ').toLowerCase().includes(search.toLowerCase())), [items, search])

  const onSave = async () => {
    if (!form.supplier_name?.trim()) return setErr('กรุณากรอกชื่อ Supplier')
    setErr(null)
    const res = editingId ? await updateSeedSupplier(editingId, form) : await createSeedSupplier(form)
    if (res.error) return setErr(`บันทึกไม่สำเร็จ: ${res.error}`)
    setMsg(editingId ? 'แก้ไข Supplier สำเร็จ' : 'เพิ่ม Supplier สำเร็จ')
    setEditingId(null)
    setForm(emptyForm)
    await load()
  }

  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold">Supplier เมล็ดพันธุ์</h1><p className="text-sm text-gray-500">จัดการข้อมูล Supplier เมล็ดพันธุ์ ผู้ติดต่อ และเบอร์โทรสำหรับเกษตรกร</p></div>
    <div className="grid grid-cols-3 gap-3">
      <Card title="Supplier ทั้งหมด" value={items.length} />
      <Card title="ใช้งานอยู่" value={items.filter(i => i.active_status).length} />
      <Card title="แสดงให้เกษตรกรเห็น" value={items.filter(i => i.show_to_farmer).length} />
    </div>
    {msg && <div className="bg-emerald-50 border border-emerald-300 p-2 rounded text-emerald-700 text-sm">{msg}</div>}
    {err && <div className="bg-red-50 border border-red-300 p-2 rounded text-red-700 text-sm">{err}</div>}
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <input className="w-full border rounded px-3 py-2" placeholder="ค้นหา supplier_name, seed_brand, contact_name, phone" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="grid md:grid-cols-2 gap-2">
        {['supplier_name','seed_brand','contact_name','phone','address','contract_terms'].map((f) => (
          <input key={f} className="border rounded px-3 py-2" placeholder={f} value={String(form[f as keyof SeedSupplierPayload] ?? '')} onChange={e => setForm(prev => ({ ...prev, [f]: e.target.value }))} />
        ))}
        <label><input type="checkbox" checked={!!form.active_status} onChange={e => setForm(prev => ({ ...prev, active_status: e.target.checked }))} /> สถานะใช้งาน</label>
        <label><input type="checkbox" checked={!!form.show_to_farmer} onChange={e => setForm(prev => ({ ...prev, show_to_farmer: e.target.checked }))} /> แสดงให้เกษตรกร</label>
      </div>
      <div className="flex gap-2">
        <button onClick={() => { setEditingId(null); setForm(emptyForm) }} className="px-4 py-2 border rounded">ล้างฟอร์ม</button>
        <button onClick={onSave} className="px-4 py-2 bg-emerald-600 text-white rounded">{editingId ? 'บันทึกการแก้ไข' : 'เพิ่ม Supplier'}</button>
      </div>
    </div>
    <div className="bg-white rounded-xl border overflow-auto">
      <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left"><th className="p-2">Supplier</th><th>Brand</th><th>ผู้ติดต่อ</th><th>เบอร์โทร</th><th>สถานะใช้งาน</th><th>แสดงให้เกษตรกร</th><th>Actions</th></tr></thead>
      <tbody>{filtered.map(i => <tr key={i.id} className="border-t"><td className="p-2">{i.supplier_name}</td><td>{i.seed_brand}</td><td>{i.contact_name}</td><td>{i.phone}</td><td>{i.active_status ? 'เปิด' : 'ปิด'}</td><td>{i.show_to_farmer ? 'แสดง' : 'ซ่อน'}</td><td><button className="text-blue-600" onClick={() => { setEditingId(i.id); setForm(i) }}>แก้ไข</button></td></tr>)}</tbody></table>
    </div>
  </div>
}

function Card({ title, value }: { title: string, value: number }) { return <div className="bg-white border rounded-xl p-3"><div className="text-gray-500 text-sm">{title}</div><div className="font-bold text-2xl">{value}</div></div> }
