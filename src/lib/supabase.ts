import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  console.error(
    '[K-Farm] ⚠️ Supabase env vars missing!\n' +
    '  VITE_SUPABASE_URL  :', url  ? '✓ set' : '✗ MISSING',
    '\n  VITE_SUPABASE_ANON_KEY:', key  ? '✓ set' : '✗ MISSING',
    '\n  Set these in Vercel → Project → Settings → Environment Variables',
    '\n  Then redeploy. The app will NOT save real data until then.'
  )
}

export const supabase = (url && key) ? createClient(url, key) : null
export const isSupabaseReady = Boolean(supabase)

/** เรียกก่อน submit ทุกฟอร์ม — throw ถ้า env ไม่ครบ */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'ไม่พบ Supabase credentials\n' +
      'กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY\n' +
      'ใน Vercel → Project Settings → Environment Variables แล้ว Redeploy'
    )
  }
  return supabase
}
