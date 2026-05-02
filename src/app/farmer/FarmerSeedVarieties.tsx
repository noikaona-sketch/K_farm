import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SEED_VARIETIES } from '../../data/mockData'

type SeedSupplier = {
  id: string
  name: string
  contact_name: string
  phone: string
  active_status: boolean
  show_to_farmer: boolean
}

type SeedVariety = {
  id: string
  name: string
  kg_per_bag: number
  price_per_bag: number
  constraints: string
  planting_method: string
  supplier_id: string
  active_status: boolean
  show_to_farmer: boolean
}

type VarietyWithSupplier = SeedVariety & { supplier: SeedSupplier }

async function fetchSeedSuppliers(): Promise<SeedSupplier[]> {
  if (!supabase) {
    return [
      { id: 'sup-1', name: 'บริษัท Pacific Seeds (Thailand) จำกัด', contact_name: 'คุณวิชัย สุขสม', phone: '0812345678', active_status: true, show_to_farmer: true },
      { id: 'sup-2', name: 'บริษัท Syngenta (Thailand) จำกัด', contact_name: 'คุณสมศรี พาณิชย์', phone: '0898765432', active_status: true, show_to_farmer: true },
      { id: 'sup-3', name: 'บริษัท เจริญโภคภัณฑ์เมล็ดพันธุ์ จำกัด', contact_name: 'คุณประเสริฐ ธัญญา', phone: '0851234567', active_status: true, show_to_farmer: true },
    ]
  }

  const { data, error } = await supabase
    .from('seed_suppliers')
    .select('id,name,contact_name,phone,active_status,show_to_farmer')

  if (error) {
    console.error('[SeedSuppliers] fetch failed:', error.message)
    return []
  }

  return (data ?? []) as SeedSupplier[]
}

async function fetchSeedVarieties(): Promise<SeedVariety[]> {
  if (!supabase) {
    return SEED_VARIETIES.map((v, i) => ({
      id: v.id,
      name: v.name,
      kg_per_bag: Number(v.seedPerRai.toFixed(1)),
      price_per_bag: 950 + i * 40,
      constraints: v.notes,
      planting_method: v.steps.map(step => `${step.day}: ${step.title}`).slice(0, 2).join(' | '),
      supplier_id: `sup-${i + 1}`,
      active_status: true,
      show_to_farmer: true,
    }))
  }

  const { data, error } = await supabase
    .from('seed_varieties')
    .select('id,name,kg_per_bag,price_per_bag,constraints,planting_method,supplier_id,active_status,show_to_farmer')

  if (error) {
    console.error('[SeedVarieties] fetch failed:', error.message)
    return []
  }

  return (data ?? []) as SeedVariety[]
}

export default function FarmerSeedVarieties() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<SeedSupplier[]>([])
  const [varieties, setVarieties] = useState<SeedVariety[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [supplierRows, varietyRows] = await Promise.all([
        fetchSeedSuppliers(),
        fetchSeedVarieties(),
      ])
      setSuppliers(supplierRows)
      setVarieties(varietyRows)
      setLoading(false)
    })()
  }, [])

  const merged = useMemo<VarietyWithSupplier[]>(() => {
    const supplierMap = new Map(suppliers.map(s => [s.id, s]))

    return varieties
      .map((variety) => ({
        ...variety,
        supplier: supplierMap.get(variety.supplier_id),
      }))
      .filter((item): item is VarietyWithSupplier => Boolean(item.supplier))
      .filter(item =>
        item.supplier.active_status === true &&
        item.supplier.show_to_farmer === true &&
        item.active_status === true &&
        item.show_to_farmer === true,
      )
  }, [suppliers, varieties])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <div className="font-bold text-lg">เมล็ดพันธุ์สำหรับเกษตรกร</div>
          <div className="text-xs text-emerald-200">เลือกพันธุ์และโทรหาผู้ขายได้ทันที</div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading && <div className="text-sm text-gray-500">กำลังโหลดข้อมูลเมล็ดพันธุ์...</div>}
        {!loading && merged.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
            ยังไม่มีเมล็ดพันธุ์ที่เปิดให้เกษตรกรดูในตอนนี้
          </div>
        )}

        {merged.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <div className="font-bold text-lg text-gray-900">{item.name}</div>
            <div className="text-sm text-gray-700">{item.kg_per_bag} kg/ถุง</div>
            <div className="text-sm text-gray-700">ราคา {item.price_per_bag.toLocaleString()} บาท/ถุง</div>
            <hr className="my-2" />
            <div className="text-sm"><span className="font-semibold">Supplier:</span> {item.supplier.name}</div>
            <div className="text-sm"><span className="font-semibold">ผู้ติดต่อ:</span> {item.supplier.contact_name}</div>
            <div className="text-sm"><span className="font-semibold">เบอร์โทร:</span> {item.supplier.phone}</div>
            <div className="text-sm"><span className="font-semibold">ข้อจำกัด:</span> {item.constraints || '-'}</div>
            <div className="text-sm"><span className="font-semibold">วิธีปลูก:</span> {item.planting_method || '-'}</div>

            <a
              href={`tel:${item.supplier.phone}`}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white font-semibold"
            >
              <Phone className="w-4 h-4" /> โทร
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
