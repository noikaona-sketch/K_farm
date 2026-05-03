import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Plus, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type Supplier = {
  id: string
  supplier_name: string
  contact_name: string
  phone: string
  address: string
  credit_terms: string
  status: string
}

const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'mock-s1', supplier_name: 'Supplier A', contact_name: 'คุณเอ', phone: '0811111111', address: 'อุบลราชธานี', credit_terms: 'เงินสด/เครดิต 15 วัน', status: 'active' },
  { id: 'mock-s2', supplier_name: 'Supplier B', contact_name: 'คุณบี', phone: '0822222222', address: 'ศรีสะเกษ', credit_terms: 'เครดิต 30 วัน', status: 'active' },
]

export default function AdminSeedSuppliers() {
  const [rows, setRows] = useState<Supplier[]>(MOCK_SUPPLIERS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ supplier_name: '', contact_name: '', phone: '', address: '', credit_terms: '', status: 'active' })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (!isSupabaseReady || !supabase) {
        setRows(MOCK_SUPPLIERS)
        return
      }
      const { data, error: dbError } = await supabase.from('seed_suppliers').select('*').order('supplier_name')
      if (dbError) throw new Error(dbError.message)
      setRows((data ?? []).map((r: any) => ({
        id: String(r.id),
        supplier_name: String(r.supplier_name ?? ''),
        contact_name: String(r.contact_name ?? ''),
        phone: String(r.phone ?? ''),
        address: String(r.address ?? ''),
        credit_terms: String(r.credit_terms ?? ''),
        status: String(r.status ?? 'active'),
      })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const displayed = useMemo(() => {
    const kw = search.trim().toLowerCase()
    if (!kw) return rows
    return rows.filter((r) => `${r.supplier_name} ${r.contact_name} ${r.phone} ${r.address}`.toLowerCase().includes(kw))
  }, [rows, search])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setOk('')
    setError('')
    try {
      if (!form.supplier_name.trim()) throw new Error('กรุณากรอกชื่อ Supplier')
      const payload = {
        supplier_name: form.supplier_name.trim(),
        contact_name: form.contact_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        credit_terms: form.credit_terms.trim(),
        status: form.status,
      }
      if (!isSupabaseReady || !supabase) {
        setRows((prev) => [{ id: `mock-s-${Date.now()}`, ...payload }, ...prev])
      } else {
        const { error: dbError } = await supabase.from('seed_suppliers').insert(payload)
        if (dbError) throw new Error(dbError.message)
        await load()
      }
      setOk('บันทึก Supplier สำเร็จ')
      setForm({ supplier_name: '', contact_name: '', phone: '', address: '', credit_terms: '', status: 'active' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Supplier เมล็ดพันธุ์</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase: seed_suppliers</span></> : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock data</span></>}
          </div>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
          <RefreshCw className="w-4 h-4"/>รีโหลด
        </button>
      </div>

      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex gap-2"><Check className="w-4 h-4"/>{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-gray-600">ชื่อ Supplier *</label>
          <input value={form.supplier_name} onChange={(e) => setForm((p) => ({ ...p, supplier_name: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600">ผู้ติดต่อ</label>
          <input value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600">เบอร์โทร</label>
          <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-gray-600">ที่อยู่</label>
          <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600">เครดิต/เงื่อนไข</label>
          <input value={form.credit_terms} onChange={(e) => setForm((p) => ({ ...p, credit_terms: e.target.value }))} placeholder="เช่น เครดิต 30 วัน" className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600">สถานะ</label>
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white">
            <option value="active">ใช้งาน</option>
            <option value="inactive">ปิดใช้งาน</option>
          </select>
        </div>
        <button disabled={saving} className="md:col-span-4 bg-emerald-600 disabled:bg-gray-300 text-white rounded-xl py-3 font-bold flex justify-center gap-2">
          <Plus className="w-5 h-5" />{saving ? 'กำลังบันทึก...' : 'เพิ่ม Supplier'}
        </button>
      </form>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา Supplier / ผู้ติดต่อ / เบอร์ / ที่อยู่" className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b text-xs text-gray-500"><th className="text-left p-3">Supplier</th><th className="text-left p-3">ผู้ติดต่อ</th><th className="text-left p-3">เบอร์โทร</th><th className="text-left p-3">ที่อยู่</th><th className="text-left p-3">เครดิต</th><th className="text-center p-3">สถานะ</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="p-6 text-center text-gray-400">กำลังโหลด...</td></tr> : displayed.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-400">ยังไม่มีข้อมูล</td></tr> : displayed.map((r) => <tr key={r.id} className="border-t hover:bg-gray-50/60"><td className="p-3 font-semibold">{r.supplier_name}</td><td className="p-3">{r.contact_name || '-'}</td><td className="p-3">{r.phone || '-'}</td><td className="p-3">{r.address || '-'}</td><td className="p-3">{r.credit_terms || '-'}</td><td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{r.status === 'active' ? 'ใช้งาน' : 'ปิด'}</span></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}
