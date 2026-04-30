import React, { useState } from 'react'
import { MOCK_FARMS } from '../../data/mockData'
import { db, isSupabaseEnabled } from '../../lib/supabase'

export default function FarmConfirmation() {
  const [msg, setMsg] = useState('')
  return <div className='p-4 space-y-2'>{MOCK_FARMS.slice(0,3).map(f => <div key={f.id} className='border p-2'><p>{f.name}</p><button onClick={async()=>{await db.update('farms','id',f.id,{confirmed:true,status:'confirmed'});setMsg(isSupabaseEnabled?'ยืนยันสำเร็จ':'ยืนยัน mock สำเร็จ')}}>ยืนยัน</button></div>)}{msg && <p>{msg}</p>}</div>
}
