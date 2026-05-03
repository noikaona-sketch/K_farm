import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CreditCard, PackageCheck, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type DebtRow = {
  id: string
  saleDate: string
  farmerName: string
  farmerPhone: string
  varietyName: string
  quantity: number
  totalAmount: number
  paidAmount: number
  debtAmount: number
  deliveryStatus: string
  paymentStatus: string
  dueDate: string
}

const MOCK_DEBTS: DebtRow[] = [
  {
    id: 'mock-1', saleDate: '2026-05-01', farmerName: 'สมชาย ใจดี', farmerPhone: '0812345678',
    varietyName: 'ข้าวโพดพันธุ์ A', quantity: 10, totalAmount: 8500, paidAmount: 3000, debtAmount: 5500,
    deliveryStatus: 'partial', paymentStatus: 'partial', dueDate: '2026-05-15',
  },
  {
    id: 'mock-2', saleDate: '2026-05-02', farmerName: 'นภา ฟ้าใส', farmerPhone: '0898765432',
    varietyName: 'ข้าวโพดพันธุ์ B', quantity: 5, totalAmount: 4500, paidAmount: 0, debtAmount: 4500,
    deliveryStatus: 'pending', paymentStatus: 'unpaid', dueDate: '2026-05-20',
  },
]

function fmtMoney(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function statusText(status: string, type: 'payment' | 'delivery') {
  const payment: Record<string, string> = { unpaid: 'ยังไม่ชำระ', partial: 'ชำระบางส่วน', paid: 'ชำระครบ' }
  const delivery: Record<string, string> = { pending: 'ค้างส่ง', partial: 'ส่งบางส่วน', delivered: 'ส่งครบ', received: 'รับแล้ว' }
  return type === 'payment' ? payment[status] ?? status : delivery[status] ?? status
}

export default function AdminSeedDebt() {
  const [rows, setRows] = useState<DebtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'debt' | 'delivery'>('all')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (!isSupabaseReady || !supabase) {
        setRows(MOCK_DEBTS)
        return
      }

      const { data, error: dbError } = await supabase
        .from('seed_sales')
        .select('*')
        .order('sale_date', { ascending: false })

      if (dbError) throw new Error(dbError.message)

      const mapped: DebtRow[] = (data ?? []).map((r: Record<string, unknown>) => {
        const total = Number(r.total_amount ?? 0)
        const paid = Number(r.paid_amount ?? 0)
        return {
          id: String(r.id),
          saleDate: String(r.sale_date ?? ''),
          farmerName: String(r.farmer_name ?? r.member_name ?? r.farmer_id ?? '-'),
          farmerPhone: String(r.farmer_phone ?? ''),
          varietyName: String(r.variety_name ?? r.variety_id ?? '-'),
          quantity: Number(r.quantity ?? 0),
          totalAmount: total,
          paidAmount: paid,
          debtAmount: Math.max(total - paid, 0),
          deliveryStatus: String(r.delivery_status ?? 'pending'),
          paymentStatus: String(r.payment_status ?? (total > paid ? 'unpaid' : 'paid')),
          dueDate: String(r.due_date ?? ''),
        }
      })
      setRows(mapped)
    } catch (e) {
      setRows(MOCK_DEBTS)
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลลูกหนี้ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const displayed = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (filter === 'debt') return r.debtAmount > 0
        if (filter === 'delivery') return ['pending', 'partial'].includes(r.deliveryStatus)
        return true
      })
      .filter((r) => !kw || `${r.farmerName} ${r.farmerPhone} ${r.varietyName}`.toLowerCase().includes(kw))
  }, [rows, search, filter])

  const totalDebt = displayed.reduce((sum, r) => sum + r.debtAmount, 0)
  const totalPendingDelivery = displayed.filter((r) => ['pending', 'partial'].includes(r.deliveryStatus)).length
  const overdue = displayed.filter((r) => r.dueDate && r.debtAmount > 0 && new Date(r.dueDate) < new Date()).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ลูกหนี้เมล็ดพันธุ์ / ค้างส่ง</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase: seed_sales</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock data</span></>}
          </div>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm">
          <RefreshCw className="w-4 h-4"/>รีโหลด
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ใช้ข้อมูลตัวอย่างชั่วคราว เพราะอ่าน Supabase ไม่สำเร็จ: {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><CreditCard className="w-4 h-4"/>ยอดหนี้ค้าง</div>
          <div className="text-2xl font-bold text-red-600 mt-2">{fmtMoney(totalDebt)} บาท</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><PackageCheck className="w-4 h-4"/>รายการค้างส่ง</div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{totalPendingDelivery}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><AlertTriangle className="w-4 h-4"/>เกินกำหนด</div>
          <div className="text-2xl font-bold text-orange-600 mt-2">{overdue}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'ทั้งหมด' },
          { key: 'debt', label: 'เฉพาะมีหนี้' },
          { key: 'delivery', label: 'เฉพาะค้างส่ง' },
        ].map((x) => (
          <button key={x.key} onClick={() => setFilter(x.key as typeof filter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filter === x.key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-gray-200 text-gray-600'}`}>
            {x.label}
          </button>
        ))}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาสมาชิก / เบอร์ / พันธุ์"
            className="w-full pl-8 pr-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide font-semibold">
                <th className="text-left px-4 py-3">วันที่ขาย</th>
                <th className="text-left px-3 py-3">สมาชิก</th>
                <th className="text-left px-3 py-3">พันธุ์</th>
                <th className="text-right px-3 py-3">ยอดขาย</th>
                <th className="text-right px-3 py-3">ชำระแล้ว</th>
                <th className="text-right px-3 py-3">ค้างชำระ</th>
                <th className="text-center px-3 py-3">ส่งมอบ</th>
                <th className="text-center px-3 py-3">ครบกำหนด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">กำลังโหลด...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">ไม่มีข้อมูล</td></tr>
              ) : displayed.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 whitespace-nowrap">{r.saleDate || '-'}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-gray-900 whitespace-nowrap">{r.farmerName}</div>
                    <div className="text-xs text-gray-400">{r.farmerPhone}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{r.varietyName}</td>
                  <td className="px-3 py-3 text-right font-medium">{fmtMoney(r.totalAmount)}</td>
                  <td className="px-3 py-3 text-right text-emerald-700">{fmtMoney(r.paidAmount)}</td>
                  <td className="px-3 py-3 text-right font-bold text-red-600">{fmtMoney(r.debtAmount)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                      {statusText(r.deliveryStatus, 'delivery')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">{r.dueDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
