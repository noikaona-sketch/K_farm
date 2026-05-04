import { Construction } from 'lucide-react'
export default function AdminAdminSeedDebt() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">💳</span>
        <h1 className="text-2xl font-bold text-gray-900">ลูกหนี้เมล็ดพันธุ์</h1>
      </div>
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
        <Construction className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-400 mb-2">กำลังพัฒนา</h2>
        <p className="text-gray-400 text-sm">ลูกหนี้เมล็ดพันธุ์ — อยู่ระหว่างการพัฒนา</p>
      </div>
    </div>
  )
}
