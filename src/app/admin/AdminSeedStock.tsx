import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Edit, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type Variety = { id: string; variety_name: string; supplier_id?: string; supplier_name?: string; price: number }
type Lot = { id: string; variety_id?: string; variety_name: string; supplier_id?: string; supplier_name?: string; lot_no: string; quantity: number; quantity_balance: number; sell_price_per_bag: number; status: string }

const MOCK_VARIETIES: Variety[] = [{ id: 'mock-v1', variety_name: 'ข้าวโพดพันธุ์ A', supplier_id: 'mock-s1', supplier_name: 'Supplier A', price: 850 }]
const EMPTY = { variety_id: '', lot_no: '', quantity: '', sell_price_per_bag: '', status: 'available' }

export default function AdminSeedStock() {
  const [varieties, setVarieties] = useState<Variety[]>(MOCK_VARIETIES)
  const [rows, setRows] = useState<Lot[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) { setVarieties(MOCK_VARIETIES); setRows([]); return }
      const [varietyRes, supplierRes, lotRes] = await Promise.all([
        supabase.from('seed_varieties').select('id,variety_name,supplier_id,sell_price_per_bag,price,status').order('variety_name'),
        supabase.from('seed_suppliers').select('id,supplier_name'),
        supabase.from('seed_stock_lots').select('*').order('created_at', { ascending: false }),
      ])
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (lotRes.error) throw new Error(lotRes.error.message)
      const supplierMap = new Map((supplierRes.data ?? []).map((s: any) => [String(s.id), String(s.supplier_name ?? '-')]))
      const varietyRows = (varietyRes.data ?? []).filter((v: any) => String(v.status ?? 'active') !== 'inactive').map((v: any) => ({ id: String(v.id), variety_name: String(v.variety_name ?? '-'), supplier_id: v.supplier_id ? String(v.supplier_id) : undefined, supplier_name: v.supplier_id ? supplierMap.get(String(v.supplier_id)) ?? '-' : '-', price: Number(v.sell_price_per_bag ?? v.price ?? 0) }))
      const varietyMap = new Map(varietyRows.map((v: Variety) => [v.id, v]))
      setVarieties(varietyRows)
      setRows((lotRes.data ?? []).map((r: any) => { const v = varietyMap.get(String(r.variety_id)); return { id: String(r.id), variety_id: String(r.variety_id ?? ''), variety_name: String(r.variety_name ?? v?.variety_name ?? '-'), supplier_id: String(r.supplier_id ?? v?.supplier_id ?? ''), supplier_name: String(r.supplier_name ?? v?.supplier_name ?? '-'), lot_no: String(r.lot_no ?? '-'), quantity: Number(r.quantity ?? r.quantity_in ?? 0), quantity_balance: Number(r.quantity_balance ?? 0), sell_price_per_bag: Number(r.sell_price_per_bag ?? v?.price ?? 0), status: String(r.status ?? 'available') } }))
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const displayed = useMemo(() => { const kw = search.toLowerCase(); return rows.filter(r => !kw || `${r.variety_name} ${r.supplier_name} ${r.lot_no}`.toLowerCase().includes(kw)) }, [rows, search])
  const selectedVariety = varieties.find(v => v.id === form.variety_id)
  const reset = () => { setEditingId(null); setForm(EMPTY) }
  const onVariety = (id: string) => { const v = varieties.find(x => x.id === id); setForm(p => ({ ...p, variety_id: id, sell_price_per_bag: v?.price ? String(v.price) : p.sell_price_per_bag })) }
  const edit = (r: Lot) => { setEditingId(r.id); setForm({ variety_id: r.variety_id ?? '', lot_no: r.lot_no, quantity: String(r.quantity), sell_price_per_bag: String(r.sell_price_per_bag), status: r.status }) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setOk(''); setError('')
    try {
      if (!selectedVariety) throw new Error('กรุณาเลือกพันธุ์')
      if (!form.lot_no.trim()) throw new Error('กรุณากรอก LOT')
      const qty = Number(form.quantity || 0); if (qty <= 0) throw new Error('จำนวนต้องมากกว่า 0')
      const payload = { variety_id: selectedVariety.id, variety_name: selectedVariety.variety_name, supplier_id: selectedVariety.supplier_id ?? null, supplier_name: selectedVariety.supplier_name ?? null, lot_no: form.lot_no.trim(), quantity: qty, quantity_in: qty, quantity_balance: editingId ? undefined : qty, sell_price_per_bag: Number(form.sell_price_per_bag || selectedVariety.price || 0), status: form.status }
      const cleanPayload: any = { ...payload }; if (editingId) delete cleanPayload.quantity_balance
      if (!isSupabaseReady || !supabase) {
        setRows(prev => editingId ? prev.map(r => r.id === editingId ? { ...r, ...cleanPayload } : r) : [{ id: `mock-l-${Date.now()}`, quantity_balance: qty, ...cleanPayload }, ...prev])
      } else if (editingId) {
        const { error: dbError } = await supabase.from('seed_stock_lots').update(cleanPayload).eq('id', editingId); if (dbError) throw new Error(dbError.message); await load()
      } else {
        const { error: dbError } = await supabase.from('seed_stock_lots').insert(cleanPayload); if (dbError) throw new Error(dbError.message); await load()
      }
      setOk(editingId ? 'แก้ไข LOT สำเร็จ' : 'รับเข้า Stock สำเร็จ'); reset()
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  const setStatus = async (id: string, status: string) => {
    if (!isSupabaseReady || !supabase || id.startsWith('mock-')) setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    else { const { error: dbError } = await supabase.from('seed_stock_lots').update({ status }).eq('id', id); if (dbError) setError(dbError.message); else await load() }
    setOk(status === 'inactive' ? 'ยกเลิก LOT แล้ว' : 'เปิดใช้ LOT แล้ว')
  }
  const remove = async (r: Lot) => {
    if (r.quantity_balance !== r.quantity) { setError('ลบไม่ได้ เพราะ LOT นี้มีการขาย/ตัด stock แล้ว ให้ยกเลิกใช้งานแทน'); return }
    if (!confirm('ยืนยันลบ LOT นี้?')) return
    if (!isSupabaseReady || !supabase || r.id.startsWith('mock-')) setRows(prev => prev.filter(x => x.id !== r.id))
    else { const { error: dbError } = await supabase.from('seed_stock_lots').delete().eq('id', r.id); if (dbError) setError(dbError.message); else await load() }
    setOk('ลบ LOT แล้ว')
  }

  return <div className="space-y-5"><div className="flex justify-between gap-3"><h1 className="text-xl font-bold">รับเข้า Stock เมล็ดพันธุ์</h1><button onClick={() => void load()} className="px-4 py-2 bg-white border rounded-xl flex gap-2"><RefreshCw className="w-4 h-4"/>รีโหลด</button></div>{ok && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl flex gap-2"><Check className="w-4 h-4"/>{ok}</div>}{error && <div className="bg-red-50 text-red-700 p-3 rounded-xl flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
    <form onSubmit={submit} className="bg-white rounded-2xl border p-5 grid grid-cols-1 md:grid-cols-5 gap-3"><select value={form.variety_id} onChange={e=>onVariety(e.target.value)} className="border rounded-xl p-2 md:col-span-2"><option value="">เลือกพันธุ์</option>{varieties.map(v => <option key={v.id} value={v.id}>{v.variety_name} | {v.supplier_name}</option>)}</select><input placeholder="LOT" value={form.lot_no} onChange={e=>setForm(p=>({...p,lot_no:e.target.value}))} className="border rounded-xl p-2"/><input type="number" placeholder="จำนวน" value={form.quantity} onChange={e=>setForm(p=>({...p,quantity:e.target.value}))} className="border rounded-xl p-2"/><input type="number" placeholder="ราคา/ถุง" value={form.sell_price_per_bag} onChange={e=>setForm(p=>({...p,sell_price_per_bag:e.target.value}))} className="border rounded-xl p-2"/><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="border rounded-xl p-2"><option value="available">ใช้งาน</option><option value="inactive">ยกเลิก</option></select><button disabled={saving} className="md:col-span-4 bg-emerald-600 text-white rounded-xl py-2 font-bold flex justify-center gap-2"><Plus className="w-4 h-4"/>{editingId ? 'บันทึกแก้ไข' : 'รับเข้า Stock'}</button>{editingId && <button type="button" onClick={reset} className="border rounded-xl py-2 flex justify-center gap-2"><X className="w-4 h-4"/>ยกเลิกแก้ไข</button>}</form>
    <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา stock" className="w-full border rounded-xl p-2 pl-9"/></div>
    <div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50"><th className="text-left p-3">พันธุ์</th><th className="text-left p-3">Supplier</th><th className="text-left p-3">LOT</th><th className="text-right p-3">รับเข้า</th><th className="text-right p-3">คงเหลือ</th><th className="text-right p-3">ราคา</th><th className="text-center p-3">สถานะ</th><th className="text-center p-3">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="p-6 text-center text-gray-400">กำลังโหลด...</td></tr> : displayed.map(r => <tr key={r.id} className="border-t"><td className="p-3 font-semibold">{r.variety_name}</td><td className="p-3">{r.supplier_name}</td><td className="p-3">{r.lot_no}</td><td className="p-3 text-right">{r.quantity}</td><td className="p-3 text-right">{r.quantity_balance}</td><td className="p-3 text-right">{r.sell_price_per_bag}</td><td className="p-3 text-center">{r.status === 'inactive' ? 'ยกเลิก' : 'ใช้งาน'}</td><td className="p-3"><div className="flex justify-center gap-2"><button onClick={()=>edit(r)} className="bg-blue-600 text-white px-2 py-1 rounded text-xs"><Edit className="w-3 h-3 inline"/> แก้ไข</button><button onClick={()=>void setStatus(r.id, r.status === 'inactive' ? 'available' : 'inactive')} className="bg-amber-600 text-white px-2 py-1 rounded text-xs">{r.status === 'inactive' ? 'เปิดใช้' : 'ยกเลิก'}</button><button onClick={()=>void remove(r)} className="bg-red-600 text-white px-2 py-1 rounded text-xs"><Trash2 className="w-3 h-3 inline"/> ลบ</button></div></td></tr>)}</tbody></table></div>
  </div>
}
