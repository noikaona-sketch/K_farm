import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Edit, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type Variety = { id: string; variety_name: string; crop_type: string; supplier_id?: string; supplier_name?: string; price: number; growing_days: number; highlight: string; status: string }
type Supplier = { id: string; supplier_name: string }
const EMPTY = { variety_name: '', crop_type: 'ข้าวโพดอาหารสัตว์', supplier_id: '', price: '', growing_days: '', highlight: '', status: 'active' }
const MOCK_SUPPLIERS: Supplier[] = [{ id: 'mock-s1', supplier_name: 'Supplier A' }, { id: 'mock-s2', supplier_name: 'Supplier B' }]
const MOCK_VARIETIES: Variety[] = [{ id: 'mock-v1', variety_name: 'ข้าวโพดพันธุ์ A', crop_type: 'ข้าวโพดอาหารสัตว์', supplier_id: 'mock-s1', supplier_name: 'Supplier A', price: 850, growing_days: 110, highlight: 'ทนแล้ง ให้ผลผลิตดี', status: 'active' }]
function fmt(n: number) { return n.toLocaleString('th-TH', { maximumFractionDigits: 0 }) }

export default function AdminSeedVarieties() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS)
  const [rows, setRows] = useState<Variety[]>(MOCK_VARIETIES)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) { setSuppliers(MOCK_SUPPLIERS); setRows(MOCK_VARIETIES); return }
      const [supplierRes, varietyRes] = await Promise.all([
        supabase.from('seed_suppliers').select('id,supplier_name').order('supplier_name'),
        supabase.from('seed_varieties').select('*').order('variety_name'),
      ])
      if (supplierRes.error) throw new Error(supplierRes.error.message)
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      const supplierRows = (supplierRes.data ?? []).map((r: any) => ({ id: String(r.id), supplier_name: String(r.supplier_name ?? '-') }))
      const supplierMap = new Map(supplierRows.map((s) => [s.id, s.supplier_name]))
      setSuppliers(supplierRows)
      setRows((varietyRes.data ?? []).map((r: any) => ({ id: String(r.id), variety_name: String(r.variety_name ?? ''), crop_type: String(r.crop_type ?? r.type ?? 'ข้าวโพดอาหารสัตว์'), supplier_id: r.supplier_id ? String(r.supplier_id) : undefined, supplier_name: r.supplier_id ? supplierMap.get(String(r.supplier_id)) ?? '-' : '-', price: Number(r.price ?? r.sell_price ?? 0), growing_days: Number(r.growing_days ?? r.planting_days ?? 0), highlight: String(r.highlight ?? r.description ?? ''), status: String(r.status ?? 'active') })))
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const displayed = useMemo(() => { const kw = search.trim().toLowerCase(); return !kw ? rows : rows.filter((r) => `${r.variety_name} ${r.crop_type} ${r.supplier_name} ${r.highlight}`.toLowerCase().includes(kw)) }, [rows, search])
  const reset = () => { setEditingId(null); setForm(EMPTY) }
  const edit = (r: Variety) => { setEditingId(r.id); setForm({ variety_name: r.variety_name, crop_type: r.crop_type, supplier_id: r.supplier_id ?? '', price: String(r.price), growing_days: String(r.growing_days || ''), highlight: r.highlight, status: r.status }) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setOk('')
    try {
      if (!form.variety_name.trim()) throw new Error('กรุณากรอกชื่อพันธุ์')
      if (Number(form.price || 0) < 0) throw new Error('ราคาต้องไม่ติดลบ')
      const supplierName = suppliers.find((s) => s.id === form.supplier_id)?.supplier_name ?? '-'
      const payload = { variety_name: form.variety_name.trim(), crop_type: form.crop_type.trim(), supplier_id: form.supplier_id || null, price: Number(form.price || 0), growing_days: Number(form.growing_days || 0), highlight: form.highlight.trim(), status: form.status }
      if (!isSupabaseReady || !supabase) setRows((prev) => editingId ? prev.map(r => r.id === editingId ? { ...r, ...payload, supplier_name: supplierName, supplier_id: payload.supplier_id ?? undefined } : r) : [{ id: `mock-v-${Date.now()}`, supplier_name: supplierName, ...payload, supplier_id: payload.supplier_id ?? undefined }, ...prev])
      else if (editingId) { const { error: dbError } = await supabase.from('seed_varieties').update(payload).eq('id', editingId); if (dbError) throw new Error(dbError.message); await load() }
      else { const { error: dbError } = await supabase.from('seed_varieties').insert(payload); if (dbError) throw new Error(dbError.message); await load() }
      setOk(editingId ? 'แก้ไขพันธุ์สำเร็จ' : 'เพิ่มพันธุ์สำเร็จ'); reset()
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  const setStatus = async (id: string, status: string) => {
    if (!isSupabaseReady || !supabase || id.startsWith('mock-')) setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    else { const { error: dbError } = await supabase.from('seed_varieties').update({ status }).eq('id', id); if (dbError) setError(dbError.message); else await load() }
    setOk(status === 'inactive' ? 'ปิดขายแล้ว' : 'เปิดขายแล้ว')
  }
  const remove = async (id: string) => {
    if (!confirm('ยืนยันลบพันธุ์นี้? ถ้ามี stock/ขายแล้วควรใช้ปิดขายแทน')) return
    try {
      if (!isSupabaseReady || !supabase || id.startsWith('mock-')) setRows(prev => prev.filter(r => r.id !== id))
      else { const { error: dbError } = await supabase.from('seed_varieties').delete().eq('id', id); if (dbError) throw new Error(dbError.message); await load() }
      setOk('ลบพันธุ์แล้ว')
    } catch (e) { setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ อาจมี stock อ้างอิงอยู่ ให้ใช้ปิดขายแทน') }
  }

  return <div className="space-y-5"><div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-xl font-bold text-gray-900">พันธุ์เมล็ดพันธุ์</h1><div className="text-sm text-emerald-600">Supabase: seed_varieties</div></div><button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50"><RefreshCw className="w-4 h-4"/>รีโหลด</button></div>{ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex gap-2"><Check className="w-4 h-4"/>{ok}</div>}{error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-4 gap-4"><div className="md:col-span-2"><label className="text-xs font-bold text-gray-600">ชื่อพันธุ์ *</label><input value={form.variety_name} onChange={(e) => setForm((p) => ({ ...p, variety_name: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div><div><label className="text-xs font-bold text-gray-600">ชนิดพืช</label><select value={form.crop_type} onChange={(e) => setForm((p) => ({ ...p, crop_type: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"><option>ข้าวโพดอาหารสัตว์</option><option>ข้าว</option><option>มันสำปะหลัง</option><option>อื่นๆ</option></select></div><div><label className="text-xs font-bold text-gray-600">Supplier</label><select value={form.supplier_id} onChange={(e) => setForm((p) => ({ ...p, supplier_id: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"><option value="">ไม่ระบุ</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select></div><div><label className="text-xs font-bold text-gray-600">ราคา/ถุง</label><input type="number" min="0" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div><div><label className="text-xs font-bold text-gray-600">ระยะปลูก (วัน)</label><input type="number" min="0" value={form.growing_days} onChange={(e) => setForm((p) => ({ ...p, growing_days: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div><div><label className="text-xs font-bold text-gray-600">สถานะ</label><select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"><option value="active">เปิดขาย</option><option value="inactive">ปิดขาย</option></select></div><div className="md:col-span-4"><label className="text-xs font-bold text-gray-600">จุดเด่น / หมายเหตุ</label><textarea value={form.highlight} onChange={(e) => setForm((p) => ({ ...p, highlight: e.target.value }))} rows={2} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div><button disabled={saving} className="md:col-span-3 bg-emerald-600 disabled:bg-gray-300 text-white rounded-xl py-3 font-bold flex justify-center gap-2"><Plus className="w-5 h-5" />{saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกแก้ไข' : 'เพิ่มพันธุ์เมล็ดพันธุ์'}</button>{editingId && <button type="button" onClick={reset} className="rounded-xl border py-3 font-semibold flex justify-center gap-2"><X className="w-5 h-5"/>ยกเลิกแก้ไข</button>}</form>
    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อพันธุ์ / supplier / จุดเด่น" className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm" /></div>
    <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b text-xs text-gray-500"><th className="text-left p-3">ชื่อพันธุ์</th><th className="text-left p-3">พืช</th><th className="text-left p-3">Supplier</th><th className="text-right p-3">ราคา/ถุง</th><th className="text-right p-3">วันปลูก</th><th className="text-left p-3">จุดเด่น</th><th className="text-center p-3">สถานะ</th><th className="text-center p-3">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="p-6 text-center text-gray-400">กำลังโหลด...</td></tr> : displayed.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-gray-400">ยังไม่มีข้อมูล</td></tr> : displayed.map((r) => <tr key={r.id} className="border-t hover:bg-gray-50/60"><td className="p-3 font-semibold text-gray-900">{r.variety_name}</td><td className="p-3">{r.crop_type}</td><td className="p-3">{r.supplier_name || '-'}</td><td className="p-3 text-right">{fmt(r.price)}</td><td className="p-3 text-right">{r.growing_days || '-'}</td><td className="p-3 max-w-xs truncate">{r.highlight || '-'}</td><td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{r.status === 'active' ? 'เปิดขาย' : 'ปิดขาย'}</span></td><td className="p-3"><div className="flex justify-center gap-2 whitespace-nowrap"><button onClick={()=>edit(r)} className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs"><Edit className="w-3 h-3 inline"/> แก้ไข</button><button onClick={()=>void setStatus(r.id, r.status === 'active' ? 'inactive' : 'active')} className="px-2 py-1 rounded-lg bg-amber-600 text-white text-xs">{r.status === 'active' ? 'ปิดขาย' : 'เปิดขาย'}</button><button onClick={()=>void remove(r.id)} className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs"><Trash2 className="w-3 h-3 inline"/> ลบ</button></div></td></tr>)}</tbody></table></div>
  </div>
}
