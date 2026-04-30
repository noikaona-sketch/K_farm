import React, { useState } from 'react'
import { MOCK_PRICES } from '../../data/mockData'
import { db, isSupabaseEnabled } from '../../lib/supabase'

export default function AdminPrices() {
  const [prices, setPrices] = useState(MOCK_PRICES)
  const [msg, setMsg] = useState('')
  const save = async () => {
    await db.insert('price_announcements', prices)
    setMsg(isSupabaseEnabled ? 'บันทึกสำเร็จ' : 'บันทึก mock สำเร็จ (ยังไม่มี env)')
  }
  return <div className='space-y-3'><h2>จัดการราคา</h2><button onClick={save}>บันทึก</button>{msg && <p>{msg}</p>}</div>
}
