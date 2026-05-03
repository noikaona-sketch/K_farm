import React from 'react'
import { Construction } from 'lucide-react'

type Props = {
  title: string
  icon?: string
  description?: string
  items?: string[]
}

export default function AdminPlaceholderPage({ title, icon = '📌', description, items = [] }: Props) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {description ?? 'เตรียมหน้าจอสำหรับพัฒนาฟังก์ชันจริงใน Phase ถัดไป'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Construction className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">โครงหน้าเมนูพร้อมใช้งาน</h2>
            <p className="text-sm text-gray-500 mt-1">
              เมนูนี้ถูกเชื่อม route แล้ว สามารถเปิดจาก Sidebar ได้ และรอเติมตาราง / ฟอร์ม / รายงานจริง
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((item) => (
              <div key={item} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
