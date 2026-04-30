import React, { useState } from 'react'
import { db, isSupabaseEnabled } from '../../lib/supabase'

export default function InspectionForm() {
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState('')
  const submit = async () => {
    await db.insert('inspection_tasks', { notes, updated_at: new Date().toISOString() })
    setMsg(isSupabaseEnabled ? 'บันทึกผลตรวจสำเร็จ' : 'บันทึก mock สำเร็จ (ยังไม่มี env)')
  }
  return <div className='p-4 space-y-3'><h1>แบบฟอร์มตรวจสอบ</h1><textarea value={notes} onChange={e=>setNotes(e.target.value)} className='border w-full'/><button onClick={submit}>บันทึกผลการตรวจ</button>{msg && <p>{msg}</p>}</div>
}
