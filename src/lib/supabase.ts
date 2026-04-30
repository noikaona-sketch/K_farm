const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey)

type Query = { table: string; action: 'insert' | 'select'; payload?: any; orderBy?: string }

async function runQuery(q: Query) {
  if (!hasSupabaseEnv) throw new Error('missing env')
  const url = new URL(`${supabaseUrl}/rest/v1/${q.table}`)
  if (q.action === 'select' && q.orderBy) url.searchParams.set('order', q.orderBy)
  const res = await fetch(url.toString(), {
    method: q.action === 'insert' ? 'POST' : 'GET',
    headers: { apikey: supabaseAnonKey as string, Authorization: `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: q.action === 'insert' ? JSON.stringify(q.payload) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || 'Supabase error')
  return data
}

export const supabase = hasSupabaseEnv ? {
  from: (table: string) => ({
    insert: async (payload: any) => ({ data: await runQuery({ table, action: 'insert', payload }), error: null as any }),
    select: async () => ({ data: await runQuery({ table, action: 'select' }), error: null as any }),
  }),
} : null
