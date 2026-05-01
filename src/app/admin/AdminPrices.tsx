import React, { useEffect, useState } from 'react'
import { RefreshCw, Check, AlertCircle, Wifi, WifiOff, Plus } from 'lucide-react'
import { fetchPrices, upsertPrice } from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import type { Price } from '../../data/mockData'

interface EditRow { id?: string; variety: string; grade: 'A'|'B'|'C'; price: string; unit: string; effectiveDate: string; announcedBy: string }

const EMPTY_ROW: EditRow = { variety: 'ข้าวโพดอาหารสัตว์', grade: 'A', price: '', unit: 'ตัน', effectiveDate: new Date().toISOString().split('T')[0], announcedBy: '' }

export default function AdminPrices() {
  const [prices, setPrices] = useState<Price[]>([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'supabase'|'mock'>('mock')
  const [err, setErr] = useState<string|null>(null)
  const [successMsg, setSuccessMsg] = useState<string|null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [saving, setSaving] = useState(false)

  // New row
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRow, setNewRow] = useState<EditRow>({ ...EMPTY_ROW })
  const [savingNew, setSavingNew] = useState(false)
  const [newErr, setNewErr] = useState<string|null>(null)

  const load = async () => {
    setLoading(true); setErr(null)
    const res = await fetchPrices()
    if (res.data) { setPrices(res.data); setSource(res.source) }
    if (res.error && isSupabaseReady) setErr(`โหลดราคาไม่สำเร็จ: ${res.error}`)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const flash = (msg: string) => {
    setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleEditSave = async (p: Price) => {
    if (!editPrice.trim() || isNaN(parseFloat(editPrice))) { setErr('กรุณากรอกราคาเป็นตัวเลข'); return }
    setSaving(true); setErr(null)
    const res = await upsertPrice({
      id: p.id,
      variety: p.variety,
      grade: p.grade,
      price: parseFloat(editPrice),
      unit: p.unit,
      effective_date: p.effectiveDate,
      announced_by: p.announcedBy,
    })
    setSaving(false)
    if (isSupabaseReady && res.error) {
      setErr(`บันทึกราคาไม่สำเร็จ: ${res.error}`)
      return
    }
    setEditingId(null)
    await load()
    flash(isSupabaseReady ? '🟢 บันทึกลง Supabase: price_announcements' : '🟡 Mock — ราคาอัปเดต UI เท่านั้น')
  }

  const handleAddSave = async () => {
    if (!newRow.variety.trim()) { setNewErr('กรุณากรอกชนิดข้าวโพด'); return }
    if (!newRow.price.trim() || isNaN(parseFloat(newRow.price))) { setNewErr('กรุณากรอกราคาเป็นตัวเลข'); return }
    setSavingNew(true); setNewErr(null)
    const res = await upsertPrice({
      variety: newRow.variety,
      grade: newRow.grade,
      price: parseFloat(newRow.price),
      unit: newRow.unit,
      effective_date: newRow.effectiveDate,
      announced_by: newRow.announcedBy,
    })
    setSavingNew(false)
    if (isSupabaseReady && res.error) {
      setNewErr(`เพิ่มราคาไม่สำเร็จ: ${res.error}`)
      return
    }
    setShowAddForm(false)
    setNewRow({ ...EMPTY_ROW })
    await load()
    flash(isSupabaseReady ? `🟢 เพิ่มราคาลง Supabase สำเร็จ (ID: ${res.data?.id ?? '-'})` : '🟡 Mock — เพิ่มแล้ว')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">จัดการราคา</h2>
          <div className="flex items-center gap-1.5 mt-1">
            {source === 'supabase'
              ? <><Wifi className="w-3 h-3 text-emerald-600" /><span className="text-sm text-emerald-600 font-medium">Supabase: price_announcements</span></>
              : <><WifiOff className="w-3 h-3 text-amber-500" /><span className="text-sm text-amber-600 font-medium">Mock data — ตั้ง VITE_SUPABASE_URL เพื่อบันทึกจริง</span></>
            }
          </div>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl px-4 py-3 flex items-center gap-2 text-emerald-700 font-semibold text-sm">
          <Check className="w-4 h-4" />{successMsg}
        </div>
      )}

      {err && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">ไม่สำเร็จ</p>
            <p className="text-sm text-red-600">{err}</p>
          </div>
        </div>
      )}

      {/* Price banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-4xl">💰</span>
          <div>
            <div className="font-bold text-xl">ประกาศราคาข้าวโพด</div>
            <div className="text-amber-100 text-sm">อัปเดต {new Date().toLocaleDateString('th-TH')}</div>
          </div>
        </div>
        {prices[0] && (
          <div className="bg-white/20 rounded-xl p-3 flex items-center justify-between">
            <span className="font-medium">ราคากลาง (เกรด A)</span>
            <span className="text-2xl font-bold">{prices.find(p => p.grade === 'A')?.price.toLocaleString() ?? '-'} บาท/ตัน</span>
          </div>
        )}
      </div>

      {/* Price table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">ตารางราคา ({prices.length} รายการ)</h3>
          <button onClick={() => { setShowAddForm(true); setNewErr(null) }}
            className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" />เพิ่มราคา
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="p-5 border-b border-gray-100 bg-emerald-50 space-y-3">
            <h4 className="font-bold text-gray-700 text-sm">➕ เพิ่มราคาใหม่</h4>
            {newErr && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{newErr}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1">ชนิดข้าวโพด *</label>
                <input value={newRow.variety} onChange={e => setNewRow(r => ({ ...r, variety: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">เกรด</label>
                <select value={newRow.grade} onChange={e => setNewRow(r => ({ ...r, grade: e.target.value as 'A'|'B'|'C' }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">ราคา (บาท/ตัน) *</label>
                <input type="number" value={newRow.price} onChange={e => setNewRow(r => ({ ...r, price: e.target.value }))}
                  placeholder="8200"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">วันที่มีผล</label>
                <input type="date" value={newRow.effectiveDate} onChange={e => setNewRow(r => ({ ...r, effectiveDate: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">ประกาศโดย</label>
                <input value={newRow.announcedBy} onChange={e => setNewRow(r => ({ ...r, announcedBy: e.target.value }))}
                  placeholder="สมาคมส่งเสริมการค้า..."
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowAddForm(false); setNewErr(null) }}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold">ยกเลิก</button>
              <button onClick={handleAddSave} disabled={savingNew}
                className={`flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1 ${savingNew ? 'opacity-70' : 'hover:bg-emerald-700'}`}>
                {savingNew ? <><RefreshCw className="w-3 h-3 animate-spin" />กำลังบันทึก...</> : <><Check className="w-4 h-4" />บันทึก</>}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" /></div>
        ) : (
          prices.map((p, i) => (
            <div key={p.id} className={`px-5 py-4 flex items-center gap-4 ${i < prices.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${p.grade === 'A' ? 'bg-amber-100 text-amber-700' : p.grade === 'B' ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'}`}>{p.grade}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{p.variety}</div>
                <div className="text-sm text-gray-400">เกรด {p.grade} • {p.effectiveDate}</div>
              </div>
              {editingId === p.id ? (
                <div className="flex items-center gap-2">
                  <input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number"
                    className="w-28 border-2 border-emerald-400 rounded-xl px-3 py-2 text-sm font-bold text-center focus:outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleEditSave(p)} />
                  <button onClick={() => handleEditSave(p)} disabled={saving}
                    className={`bg-emerald-600 text-white text-sm px-3 py-2 rounded-xl font-semibold flex items-center gap-1 ${saving ? 'opacity-70' : 'hover:bg-emerald-700'}`}>
                    {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}บันทึก
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 px-1">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-700">{p.price.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">บาท/{p.unit}</div>
                  </div>
                  <button onClick={() => { setEditingId(p.id); setEditPrice(String(p.price)); setErr(null) }}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg">✏️</button>
                </div>
              )}
            </div>
          ))
        )}

        {!loading && prices.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            ยังไม่มีราคา — กดปุ่ม + เพิ่มราคา เพื่อเพิ่มข้อมูล
          </div>
        )}
      </div>

      {/* Announce button */}
      <button onClick={load}
        className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold text-base shadow-md hover:bg-amber-600 transition-colors active:scale-[.98]">
        📢 รีโหลดราคาล่าสุดจาก Supabase
      </button>
    </div>
  )
}
