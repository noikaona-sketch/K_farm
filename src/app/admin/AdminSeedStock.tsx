import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Plus, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type Lot = {
  id: string
  variety_name: string
  lot_no: string
  quantity: number
  quantity_balance: number
}

export default function AdminSeedStock() {
  const [rows, setRows] = useState<Lot[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ variety_name: '', lot_no: '', quantity: '' })

  const load = async () => {
    setLoading(true)
    try {
      if (!isSupabaseReady || !supabase) {
        setRows([])
        return
      }
      const { data } = await supabase.from('seed_stock_lots').select('*').order('created_at', { ascending: false })
      setRows((data ?? []).map((r: any) => ({ id: r.id, variety_name: r.variety_name, lot_no: r.lot_no, quantity: r.quantity, quantity_balance: r.quantity_balance })))
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { variety_name: form.variety_name, lot_no: form.lot_no, quantity: Number(form.quantity), quantity_balance: Number(form.quantity) }
      if (supabase) await supabase.from('seed_stock_lots').insert(payload)
      setOk('เพิ่ม stock สำเร็จ')
      setForm({ variety_name: '', lot_no: '', quantity: '' })
      load()
    } catch (e) { setError('บันทึกไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  return <div className="space-y-5">
    <h1 className="text-xl font-bold">รับเข้า Stock</h1>

    <form onSubmit={submit} className="grid grid-cols-3 gap-3">
      <input placeholder="พันธุ์" value={form.variety_name} onChange={(e)=>setForm(p=>({...p,variety_name:e.target.value}))} />
      <input placeholder="LOT" value={form.lot_no} onChange={(e)=>setForm(p=>({...p,lot_no:e.target.value}))} />
      <input placeholder="จำนวน" value={form.quantity} onChange={(e)=>setForm(p=>({...p,quantity:e.target.value}))} />
      <button className="bg-green-500 text-white">เพิ่ม</button>
    </form>

    <table className="w-full">
      <thead><tr><th>พันธุ์</th><th>LOT</th><th>คงเหลือ</th></tr></thead>
      <tbody>
        {rows.map(r=><tr key={r.id}><td>{r.variety_name}</td><td>{r.lot_no}</td><td>{r.quantity_balance}</td></tr>)}
      </tbody>
    </table>
  </div>
}
