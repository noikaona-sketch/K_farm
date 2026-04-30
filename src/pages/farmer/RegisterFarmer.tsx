import React, { useState } from 'react';
import type { AppPage } from '../../App';

interface Props { navigate: (p: AppPage) => void; }

export default function RegisterFarmer({ navigate }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '', lastName: '', idCard: '', phone: '', birthDate: '',
    village: '', subdistrict: '', district: '', province: 'บุรีรัมย์',
    houseNo: '', email: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const Field = ({ label, field, placeholder, type = 'text' }: { label: string; field: keyof typeof form; placeholder: string; type?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={e => update(field, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
      />
    </div>
  );

  if (submitted) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-80 text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl">✅</div>
      <h2 className="text-xl font-bold text-green-700">ลงทะเบียนสำเร็จ!</h2>
      <p className="text-gray-500 text-sm">รหัสเกษตรกรของท่านคือ <span className="font-bold text-green-600">KF006</span></p>
      <p className="text-gray-400 text-xs">เจ้าหน้าที่จะตรวจสอบและยืนยันภายใน 3-5 วันทำการ</p>
      <button onClick={() => navigate('dashboard')} className="mt-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm">กลับหน้าหลัก</button>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl hover:bg-gray-100">←</button>
        <div>
          <h1 className="font-bold text-gray-800">ลงทะเบียนเกษตรกร</h1>
          <p className="text-xs text-gray-500">กรอกข้อมูลให้ครบถ้วน</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex gap-1">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-green-500' : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500 text-center">ขั้นตอนที่ {step} จาก 3</p>

      {step === 1 && (
        <div className="space-y-3 bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 text-sm border-b pb-2">👤 ข้อมูลส่วนตัว</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ชื่อ *" field="firstName" placeholder="สมชาย" />
            <Field label="นามสกุล *" field="lastName" placeholder="ใจดี" />
          </div>
          <Field label="เลขบัตรประชาชน *" field="idCard" placeholder="1-xxxx-xxxxx-xx-x" />
          <Field label="วันเกิด *" field="birthDate" placeholder="วว/ดด/ปปปป" type="date" />
          <Field label="เบอร์โทรศัพท์ *" field="phone" placeholder="08xxxxxxxx" type="tel" />
          <Field label="อีเมล" field="email" placeholder="example@email.com" type="email" />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3 bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 text-sm border-b pb-2">📍 ที่อยู่</h2>
          <Field label="บ้านเลขที่" field="houseNo" placeholder="123/4" />
          <Field label="หมู่บ้าน/ชุมชน *" field="village" placeholder="บ้านโนนสูง" />
          <Field label="ตำบล *" field="subdistrict" placeholder="ตำบล" />
          <Field label="อำเภอ *" field="district" placeholder="อำเภอ" />
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">จังหวัด *</label>
            <select
              value={form.province}
              onChange={e => update('province', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
            >
              {['บุรีรัมย์','สุรินทร์','ศรีสะเกษ','นครราชสีมา','ร้อยเอ็ด'].map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3 bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 text-sm border-b pb-2">📋 สรุปข้อมูล</h2>
          {[
            { l: 'ชื่อ-นามสกุล', v: `${form.firstName} ${form.lastName}` },
            { l: 'เลขบัตรประชาชน', v: form.idCard },
            { l: 'เบอร์โทร', v: form.phone },
            { l: 'ที่อยู่', v: `${form.village}, ${form.district}, ${form.province}` },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between text-sm py-1 border-b border-gray-50">
              <span className="text-gray-500">{l}</span>
              <span className="font-medium text-gray-800">{v || '-'}</span>
            </div>
          ))}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-2">
            <p className="text-xs text-yellow-700">⚠️ กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยัน</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold text-sm">
            ← ย้อนกลับ
          </button>
        )}
        <button
          onClick={() => step < 3 ? setStep(s => s + 1) : setSubmitted(true)}
          className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm shadow-md active:scale-95 transition-transform"
        >
          {step < 3 ? 'ถัดไป →' : '✓ ยืนยันการลงทะเบียน'}
        </button>
      </div>
    </div>
  );
}
