export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey)

type Row = any
const mockStore: Record<string, Row[]> = {}

function table(name: string) {
  if (!mockStore[name]) mockStore[name] = []
  return mockStore[name]
}

export const db = {
  async insert(name: string, payload: Row | Row[]) {
    const rows = Array.isArray(payload) ? payload : [payload]
    table(name).push(...rows)
    return { data: rows, error: null }
  },
  async update(name: string, matchKey: string, matchValue: unknown, patch: Row) {
    const rows = table(name)
    rows.forEach((r) => { if (r[matchKey] === matchValue) Object.assign(r, patch) })
    return { data: rows, error: null }
  },
  async select(name: string) {
    return { data: table(name), error: null }
  },
}
