import * as XLSX from 'xlsx'
import { useState, useRef } from 'react'
import { upsertMember, type ImportRow } from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { Upload, RefreshCw, Check, AlertCircle, FileSpreadsheet, Wifi, WifiOff, X } from 'lucide-react'

interface ImportResult { inserted: number; updated: number; error: number }
interface RowStatus { status: 'pending' | 'ok' | 'updated' | 'error'; msg?: string }

const EXPECTED_COLS = ['id_card','full_name','phone','province','district','village','bank_name','bank_account_no','bank_account_name','role','grade','status']

const COL_LABEL: Record<string, string> = {
  id_card:'บัตรประชาชน', full_name:'ชื่อ-สกุล', phone:'เบอร์โทร',
  province:'จังหวัด', district:'อำเภอ', village:'หมู่บ้าน',
  bank_name:'ธนาคาร', bank_account_no:'เลขบัญชี', bank_account_name:'ชื่อบัญชี',
  role:'Role', grade:'Grade', status:'Status',
}

export default function AdminMemberImport() {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [rows, setRows]         = useState<ImportRow[]>([])
  const [rowStatus, setRowStatus] = useState<Record<number, RowStatus>>({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [result, setResult]       = useState<ImportResult | null>(null)
  const [parseErr, setParseErr]   = useState<string | null>(null)

  // ── parse Excel / CSV ──────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseErr(null); setRows([]); setResult(null); setRowStatus({})

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(evt.target!.result, { type: 'binary' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const data  = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '' })
        if (data.length === 0) { setParseErr('ไฟล์ไม่มีข้อมูล'); return }
        setRows(data)
        // seed row statuses
        const init: Record<number, RowStatus> = {}
        data.forEach((_, i) => { init[i] = { status: 'pending' } })
        setRowStatus(init)
      } catch {
        setParseErr('อ่านไฟล์ไม่สำเร็จ — ตรวจสอบว่าเป็น .xlsx หรือ .csv')
      }
    }
    reader.readAsBinaryString(file)
  }

  // ── import ─────────────────────────────────────────────────────────────────
  async function handleImport() {
    setImporting(true); setProgress(0)
    let inserted = 0; let updated = 0; let error = 0

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      setProgress(Math.round(((i + 1) / rows.length) * 100))

      if (!r.id_card) {
        error++
        setRowStatus(prev => ({ ...prev, [i]: { status: 'error', msg: 'ไม่มีเลขบัตร' } }))
        continue
      }

      try {
        const res = await upsertMember(r)
        if (res === 'inserted') { inserted++; setRowStatus(prev => ({ ...prev, [i]: { status: 'ok' } })) }
        else                    { updated++;  setRowStatus(prev => ({ ...prev, [i]: { status: 'updated' } })) }
      } catch (ex) {
        error++
        setRowStatus(prev => ({ ...prev, [i]: { status: 'error', msg: ex instanceof Error ? ex.message : 'error' } }))
      }
    }

    setResult({ inserted, updated, error })
    setImporting(false); setProgress(0)
  }

  const reset = () => {
    setRows([]); setResult(null); setRowStatus({}); setParseErr(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── download template ──────────────────────────────────────────────────────
  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      EXPECTED_COLS,
      ['1234567890123','สมชาย ใจดี','0812345678','บุรีรัมย์','เมือง','บ้านดง','ธ.ก.ส.','02012345678','สมชาย ใจดี','farmer','A','pending_line_verify'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Members')
    XLSX.writeFile(wb, 'kfarm_member_template.xlsx')
  }

  const missingCols = rows.length > 0
    ? ['id_card','full_name','phone'].filter(c => !(c in rows[0]))
    : []

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import สมาชิกเก่า Excel</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase พร้อม</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock mode — ข้อมูลไม่บันทึกจริง</span></>}
          </div>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors">
          <FileSpreadsheet className="w-4 h-4"/>ดาวน์โหลด Template
        </button>
      </div>

      {/* Column guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-blue-800 mb-2">📋 Column ที่รองรับ</p>
        <div className="flex flex-wrap gap-1.5">
          {EXPECTED_COLS.map(c => (
            <span key={c} className="bg-white border border-blue-200 text-blue-700 text-xs px-2 py-1 rounded-lg font-mono">
              {c}
            </span>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-2">* <strong>id_card</strong> จำเป็น — ใช้ตรวจซ้ำ (ถ้ามีอยู่แล้วจะ update)</p>
      </div>

      {/* Upload zone */}
      {rows.length === 0 && !parseErr && (
        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-2xl py-14 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
          <Upload className="w-10 h-10 text-gray-300"/>
          <div className="text-center">
            <p className="font-semibold text-gray-600">คลิกเพื่อเลือกไฟล์ .xlsx หรือ .csv</p>
            <p className="text-gray-400 text-sm mt-0.5">หรือลากวางไฟล์ที่นี่</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile}/>
        </label>
      )}

      {/* Parse error */}
      {parseErr && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0"/>
          <div className="flex-1">
            <p className="font-bold text-red-700">อ่านไฟล์ไม่สำเร็จ</p>
            <p className="text-red-600 text-sm">{parseErr}</p>
          </div>
          <button onClick={reset} className="text-red-400 hover:text-red-600"><X className="w-5 h-5"/></button>
        </div>
      )}

      {/* Missing columns warning */}
      {missingCols.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
          <p className="font-bold text-amber-800 text-sm">⚠️ Column สำคัญขาดหาย</p>
          <p className="text-amber-700 text-sm mt-1">
            ไม่พบ: <strong>{missingCols.join(', ')}</strong> — ตรวจสอบหัว column ใน Excel
          </p>
        </div>
      )}

      {/* Preview + progress */}
      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-700">
              Preview <span className="text-emerald-600">{rows.length}</span> rows
              {result && <span className="ml-2 text-gray-400 text-sm">— import เสร็จแล้ว</span>}
            </p>
            <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <X className="w-4 h-4"/>เคลียร์
            </button>
          </div>

          {/* Progress bar */}
          {importing && (
            <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}/>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-500 uppercase tracking-wide font-semibold">
                    <th className="text-center px-3 py-2.5 w-8">#</th>
                    <th className="text-center px-3 py-2.5 w-16">สถานะ</th>
                    {['id_card','full_name','phone','province','district','role','grade'].map(c => (
                      <th key={c} className="text-left px-3 py-2.5">{COL_LABEL[c] ?? c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r, i) => {
                    const rs = rowStatus[i]
                    const rowBg =
                      rs?.status === 'ok'      ? 'bg-emerald-50' :
                      rs?.status === 'updated' ? 'bg-blue-50' :
                      rs?.status === 'error'   ? 'bg-red-50' : ''
                    return (
                      <tr key={i} className={`${rowBg} transition-colors`}>
                        <td className="px-3 py-2 text-center text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 text-center">
                          {rs?.status === 'ok'      && <Check className="w-4 h-4 text-emerald-600 mx-auto"/>}
                          {rs?.status === 'updated' && <span className="text-blue-600 font-bold">↻</span>}
                          {rs?.status === 'error'   && (
                            <span title={rs.msg} className="cursor-help">
                              <AlertCircle className="w-4 h-4 text-red-500 mx-auto"/>
                            </span>
                          )}
                          {rs?.status === 'pending' && importing &&
                            <RefreshCw className="w-3 h-3 text-gray-400 animate-spin mx-auto"/>}
                        </td>
                        {['id_card','full_name','phone','province','district','role','grade'].map(c => (
                          <td key={c} className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {String((r as Record<string,unknown>)[c] ?? '')}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-400">
              แสดง {rows.length} rows — scroll เพื่อดูทั้งหมด
            </div>
          </div>

          {/* Import button */}
          {!result && (
            <button onClick={handleImport} disabled={importing || missingCols.length > 0}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 shadow-md transition-all
                ${importing || missingCols.length > 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[.98]'}`}>
              {importing
                ? <><RefreshCw className="w-5 h-5 animate-spin"/>กำลัง import... ({progress}%)</>
                : <><Upload className="w-5 h-5"/>ยืนยันนำเข้า {rows.length} รายการ</>}
            </button>
          )}
        </>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">📊 ผลการนำเข้า</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-700">{result.inserted}</div>
              <div className="text-sm text-emerald-600 mt-1 font-semibold">เพิ่มใหม่</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-700">{result.updated}</div>
              <div className="text-sm text-blue-600 mt-1 font-semibold">อัปเดต</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-700">{result.error}</div>
              <div className="text-sm text-red-600 mt-1 font-semibold">ผิดพลาด</div>
            </div>
          </div>
          {result.error > 0 && (
            <p className="text-xs text-red-500 mt-3 text-center">
              hover ที่ icon ❌ ในตารางเพื่อดูรายละเอียด error
            </p>
          )}
          <button onClick={reset}
            className="w-full mt-4 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            Import ไฟล์ใหม่
          </button>
        </div>
      )}
    </div>
  )
}
