export type UserRole = 'farmer' | 'leader' | 'inspector' | 'admin';

export interface Farmer {
  id: string; code: string; name: string; phone: string;
  village: string; district: string; province: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalArea: number; joinDate: string; status: 'active' | 'inactive' | 'pending';
}

export interface Farm {
  id: string; farmerId: string; name: string; area: number;
  province: string; district: string; village: string;
  lat: number; lng: number; soilType: string; waterSource: string;
  status: 'active' | 'pending' | 'rejected'; confirmed: boolean;
}

// ความคืบหน้าการปลูกข้าวโพด - timeline steps
export interface GrowthStep {
  id: string;
  stepKey: 'seed_received' | 'land_prep' | 'planting' | 'fertilize1' | 'fertilize2' | 'harvest' | 'sale_scheduled';
  label: string;
  date: string;
  note: string;
  photoUrl?: string;
  lat?: number;
  lng?: number;
  done: boolean;
}

export interface PlantingRecord {
  id: string; farmId: string; farmerId: string;
  season: string; year: number;
  variety: string;         // พันธุ์ข้าวโพด
  seedReceivedDate: string;  // วันรับเมล็ดพันธุ์
  plantDate: string;
  estimatedHarvestDate: string;
  actualHarvestDate?: string;
  estimatedYield: number;  // ตัน
  actualYield?: number;
  agedays?: number;        // อายุข้าวโพด (วัน)
  saleScheduledDate?: string; // นัดวันขาย
  status: 'seed_received' | 'land_prep' | 'growing' | 'ready' | 'harvested';
  steps: GrowthStep[];
  photos: PlantPhoto[];
}

export interface PlantPhoto {
  id: string; recordId: string;
  url: string; // base64 or mock url
  caption: string;
  takenAt: string;
  lat?: number; lng?: number;
  stepKey?: string;
}

// ประวัติการขาย
export interface SaleHistory {
  id: string; farmerId: string; recordId: string;
  saleDate: string;
  quantity: number;    // ตัน
  pricePerTon: number; // ราคา ณ วันขาย
  totalAmount: number;
  buyer: string;
  grade: 'A' | 'B' | 'C';
  moisturePercent: number; // % ความชื้น
  note?: string;
}

// สิทธิ์ไม่เผา
export interface NoBurnRegistration {
  id: string; farmerId: string; farmId: string;
  farmName: string;
  registeredDate: string;
  season: string; year: number;
  status: 'pending' | 'photo_submitted' | 'reviewing' | 'approved' | 'rejected';
  commitment: string;
  photos: NoBurnPhoto[];
  reviewNote?: string;
  bonusPerTon: number; // โบนัสบาท/ตัน
}

export interface NoBurnPhoto {
  id: string; regId: string;
  photoType: 'before_harvest' | 'after_harvest' | 'field_condition';
  label: string;
  url: string;
  submittedAt: string;
  lat?: number; lng?: number;
}

export interface Price {
  id: string; variety: string; grade: 'A' | 'B' | 'C';
  price: number; unit: string; effectiveDate: string; announcedBy: string;
}

// ─── Mock Data ───────────────────────────────────────────

export const MOCK_FARMERS: Farmer[] = [
  { id: 'f1', code: 'KF001', name: 'สมชาย ใจดี', phone: '0812345678', village: 'บ้านดง', district: 'เมือง', province: 'บุรีรัมย์', tier: 'gold', totalArea: 12.5, joinDate: '2022-03-15', status: 'active' },
  { id: 'f2', code: 'KF002', name: 'สมหญิง รักษ์ไทย', phone: '0898765432', village: 'บ้านโนน', district: 'ประโคนชัย', province: 'บุรีรัมย์', tier: 'silver', totalArea: 8.0, joinDate: '2022-06-20', status: 'active' },
  { id: 'f3', code: 'KF003', name: 'วิชัย มั่นคง', phone: '0856781234', village: 'บ้านสวน', district: 'นางรอง', province: 'บุรีรัมย์', tier: 'platinum', totalArea: 25.0, joinDate: '2021-12-01', status: 'active' },
  { id: 'f4', code: 'KF004', name: 'นภา ฟ้าใส', phone: '0823456789', village: 'บ้านทุ่ง', district: 'กระสัง', province: 'บุรีรัมย์', tier: 'bronze', totalArea: 4.5, joinDate: '2023-01-10', status: 'pending' },
];

export const MOCK_FARMS: Farm[] = [
  { id: 'fm1', farmerId: 'f1', name: 'แปลงที่ 1 หนองบัว', area: 6.5, province: 'บุรีรัมย์', district: 'เมือง', village: 'บ้านดง', lat: 14.993, lng: 103.102, soilType: 'ดินร่วน', waterSource: 'บ่อน้ำ', status: 'active', confirmed: true },
  { id: 'fm2', farmerId: 'f1', name: 'แปลงที่ 2 โนนสูง', area: 6.0, province: 'บุรีรัมย์', district: 'เมือง', village: 'บ้านดง', lat: 14.985, lng: 103.115, soilType: 'ดินเหนียว', waterSource: 'ชลประทาน', status: 'active', confirmed: true },
  { id: 'fm3', farmerId: 'f2', name: 'แปลงหลัก', area: 8.0, province: 'บุรีรัมย์', district: 'ประโคนชัย', village: 'บ้านโนน', lat: 14.611, lng: 103.187, soilType: 'ดินร่วนปนทราย', waterSource: 'น้ำฝน', status: 'active', confirmed: false },
];

const MOCK_STEPS_FM1: GrowthStep[] = [
  { id: 's1', stepKey: 'seed_received', label: 'รับเมล็ดพันธุ์', date: '2024-11-01', note: 'รับพันธุ์ PAC339 จากศูนย์', lat: 14.993, lng: 103.102, done: true },
  { id: 's2', stepKey: 'land_prep', label: 'เตรียมดิน', date: '2024-11-05', note: 'ไถดินและปรับพื้น', lat: 14.993, lng: 103.102, done: true },
  { id: 's3', stepKey: 'planting', label: 'ลงเมล็ด', date: '2024-11-10', note: 'ระยะห่าง 75x25 ซม.', lat: 14.993, lng: 103.102, done: true },
  { id: 's4', stepKey: 'fertilize1', label: 'ใส่ปุ๋ยครั้งที่ 1', date: '2024-11-25', note: 'ปุ๋ย 15-15-15 อัตรา 25 กก./ไร่', lat: 14.993, lng: 103.102, done: true },
  { id: 's5', stepKey: 'fertilize2', label: 'ใส่ปุ๋ยครั้งที่ 2', date: '2024-12-15', note: 'ปุ๋ยยูเรียเสริม', lat: 14.993, lng: 103.102, done: true },
  { id: 's6', stepKey: 'harvest', label: 'เก็บเกี่ยว', date: '2025-02-20', note: 'ข้าวโพดแห้งพร้อมเก็บ', lat: 14.993, lng: 103.102, done: true },
  { id: 's7', stepKey: 'sale_scheduled', label: 'นัดวันขาย', date: '2025-02-25', note: 'นัดขายที่โรงงาน CPFM', lat: 14.993, lng: 103.102, done: true },
];

const MOCK_STEPS_FM2: GrowthStep[] = [
  { id: 's8', stepKey: 'seed_received', label: 'รับเมล็ดพันธุ์', date: '2025-01-10', note: 'รับพันธุ์ NK7328', lat: 14.985, lng: 103.115, done: true },
  { id: 's9', stepKey: 'land_prep', label: 'เตรียมดิน', date: '2025-01-15', note: 'ไถและพรวนดิน', done: true },
  { id: 's10', stepKey: 'planting', label: 'ลงเมล็ด', date: '2025-01-20', note: '', lat: 14.985, lng: 103.115, done: true },
  { id: 's11', stepKey: 'fertilize1', label: 'ใส่ปุ๋ยครั้งที่ 1', date: '2025-02-05', note: '', done: true },
  { id: 's12', stepKey: 'fertilize2', label: 'ใส่ปุ๋ยครั้งที่ 2', date: '', note: '', done: false },
  { id: 's13', stepKey: 'harvest', label: 'เก็บเกี่ยว', date: '2025-04-20', note: 'คาดการณ์', done: false },
  { id: 's14', stepKey: 'sale_scheduled', label: 'นัดวันขาย', date: '', note: '', done: false },
];

export const MOCK_PLANTING_RECORDS: PlantingRecord[] = [
  {
    id: 'pr1', farmId: 'fm1', farmerId: 'f1',
    season: '2567/68', year: 2025,
    variety: 'PAC339', seedReceivedDate: '2024-11-01',
    plantDate: '2024-11-10', estimatedHarvestDate: '2025-02-20',
    actualHarvestDate: '2025-02-20',
    estimatedYield: 78, actualYield: 75,
    agedays: 102,
    saleScheduledDate: '2025-02-25',
    status: 'harvested',
    steps: MOCK_STEPS_FM1,
    photos: [
      { id: 'ph1', recordId: 'pr1', url: '', caption: 'วันรับเมล็ดพันธุ์', takenAt: '2024-11-01', lat: 14.993, lng: 103.102, stepKey: 'seed_received' },
      { id: 'ph2', recordId: 'pr1', url: '', caption: 'แปลงหลังลงเมล็ด', takenAt: '2024-11-10', lat: 14.993, lng: 103.102, stepKey: 'planting' },
      { id: 'ph3', recordId: 'pr1', url: '', caption: 'ข้าวโพดอายุ 60 วัน', takenAt: '2025-01-09', lat: 14.993, lng: 103.102, stepKey: 'fertilize2' },
    ],
  },
  {
    id: 'pr2', farmId: 'fm2', farmerId: 'f1',
    season: '2567/68', year: 2025,
    variety: 'NK7328', seedReceivedDate: '2025-01-10',
    plantDate: '2025-01-20', estimatedHarvestDate: '2025-04-20',
    estimatedYield: 90,
    agedays: 100,
    status: 'growing',
    steps: MOCK_STEPS_FM2,
    photos: [],
  },
];

export const MOCK_SALE_HISTORY: SaleHistory[] = [
  { id: 'sh1', farmerId: 'f1', recordId: 'pr1', saleDate: '2025-02-25', quantity: 75, pricePerTon: 8200, totalAmount: 615000, buyer: 'โรงงาน CPFM บุรีรัมย์', grade: 'A', moisturePercent: 14.5, note: 'ข้าวโพดแห้งดี ความชื้นต่ำ' },
  { id: 'sh2', farmerId: 'f1', recordId: 'pr1', saleDate: '2024-07-15', quantity: 60, pricePerTon: 7800, totalAmount: 468000, buyer: 'โรงงาน CPFM บุรีรัมย์', grade: 'B', moisturePercent: 17.2, note: '' },
  { id: 'sh3', farmerId: 'f2', recordId: 'pr1', saleDate: '2024-08-10', quantity: 80, pricePerTon: 8000, totalAmount: 640000, buyer: 'สหกรณ์การเกษตรประโคนชัย', grade: 'A', moisturePercent: 15.0 },
];

export const MOCK_NO_BURN: NoBurnRegistration[] = [
  {
    id: 'nb1', farmerId: 'f1', farmId: 'fm1', farmName: 'แปลงที่ 1 หนองบัว',
    registeredDate: '2025-01-15', season: 'ปี 2567/68', year: 2025,
    status: 'approved',
    commitment: 'ข้าพเจ้าขอให้คำมั่นสัญญาว่าจะไม่เผาตอซัง และเตรียมใช้รถสับกลบ',
    photos: [
      { id: 'nbp1', regId: 'nb1', photoType: 'before_harvest', label: 'แปลงก่อนเก็บเกี่ยว', url: '', submittedAt: '2025-02-18', lat: 14.993, lng: 103.102 },
      { id: 'nbp2', regId: 'nb1', photoType: 'after_harvest', label: 'แปลงหลังเก็บเกี่ยว ไม่มีร่องรอยเผา', url: '', submittedAt: '2025-02-22', lat: 14.993, lng: 103.102 },
    ],
    reviewNote: 'ผ่านการตรวจสอบ ไม่พบร่องรอยการเผา',
    bonusPerTon: 50,
  },
  {
    id: 'nb2', farmerId: 'f1', farmId: 'fm2', farmName: 'แปลงที่ 2 โนนสูง',
    registeredDate: '2025-01-20', season: 'ปี 2567/68', year: 2025,
    status: 'photo_submitted',
    commitment: 'ไม่เผาตอซัง ใช้รถสับกลบ',
    photos: [
      { id: 'nbp3', regId: 'nb2', photoType: 'before_harvest', label: 'แปลงก่อนเก็บเกี่ยว', url: '', submittedAt: '2025-04-10', lat: 14.985, lng: 103.115 },
    ],
    bonusPerTon: 50,
  },
];

export const MOCK_PRICES: Price[] = [
  { id: 'p1', variety: 'ข้าวโพดอาหารสัตว์', grade: 'A', price: 8200, unit: 'ตัน', effectiveDate: '2025-04-01', announcedBy: 'สมาคมส่งเสริมการค้าข้าวโพด' },
  { id: 'p2', variety: 'ข้าวโพดอาหารสัตว์', grade: 'B', price: 7800, unit: 'ตัน', effectiveDate: '2025-04-01', announcedBy: 'สมาคมส่งเสริมการค้าข้าวโพด' },
  { id: 'p3', variety: 'ข้าวโพดอาหารสัตว์', grade: 'C', price: 7200, unit: 'ตัน', effectiveDate: '2025-04-01', announcedBy: 'สมาคมส่งเสริมการค้าข้าวโพด' },
  { id: 'p4', variety: 'ข้าวโพดหวาน', grade: 'A', price: 12000, unit: 'ตัน', effectiveDate: '2025-04-01', announcedBy: 'สมาคมส่งเสริมการค้าข้าวโพด' },
];

export const TIER_CONFIG = {
  bronze: { label: 'บรอนซ์', color: '#CD7F32', min: 0, max: 499, benefits: ['ราคาพื้นฐาน', 'สิทธิ์ขายข้าวโพด'] },
  silver: { label: 'ซิลเวอร์', color: '#C0C0C0', min: 500, max: 999, benefits: ['ราคา +2%', 'ลำดับขายก่อน', 'เมล็ดพันธุ์ราคาพิเศษ'] },
  gold: { label: 'โกลด์', color: '#FFD700', min: 1000, max: 2499, benefits: ['ราคา +5%', 'ลำดับขายก่อน', 'ปุ๋ยฟรี 1 กระสอบ', 'ประกันราคา'] },
  platinum: { label: 'แพลทินัม', color: '#E5E4E2', min: 2500, max: 99999, benefits: ['ราคา +8%', 'ขายได้ตลอด', 'ปุ๋ยฟรี 3 กระสอบ', 'ประกันราคา', 'ที่ปรึกษาเกษตร'] },
};

export const CURRENT_USER = { id: 'f1', name: 'สมชาย ใจดี', role: 'farmer' as UserRole, tier: 'gold' as const, points: 1240 };

// Aliases for backward compat
export const MOCK_SALE_REQUESTS = MOCK_SALE_HISTORY;
export const MOCK_NO_BURNING = MOCK_NO_BURN;
export const MOCK_INSPECTIONS = [
  { id: 'ins1', farmId: 'fm1', farmerId: 'f1', farmerName: 'สมชาย ใจดี', inspectorId: 'ins001', scheduledDate: '2025-02-10', status: 'completed', score: 92, noBurning: true, pesticide: true, soilTest: true, waterQuality: true, notes: 'ผ่านมาตรฐาน ไม่เผาตอซัง' },
  { id: 'ins2', farmId: 'fm3', farmerId: 'f2', farmerName: 'สมหญิง รักษ์ไทย', inspectorId: 'ins001', scheduledDate: '2025-02-15', status: 'pending', noBurning: false, pesticide: false, soilTest: false, waterQuality: false },
  { id: 'ins3', farmId: 'fm2', farmerId: 'f3', farmerName: 'วิชัย มั่นคง', inspectorId: 'ins001', scheduledDate: '2025-02-20', status: 'in_progress', noBurning: true, pesticide: true, soilTest: false, waterQuality: false },
  { id: 'ins4', farmId: 'fm1', farmerId: 'f4', farmerName: 'นภา ฟ้าใส', inspectorId: 'ins001', scheduledDate: '2025-03-01', status: 'pending', noBurning: false, pesticide: false, soilTest: false, waterQuality: false },
];

// Extended sale requests for admin/dashboard compatibility
export interface SaleRequest {
  id: string; farmerId: string; farmerName: string;
  quantity: number; variety: string; grade: string;
  requestDate: string; status: 'pending'|'approved'|'rejected'|'completed';
  price?: number;
}
export const MOCK_SALE_REQUESTS_EXTENDED: SaleRequest[] = [
  { id: 'sr1', farmerId: 'f1', farmerName: 'สมชาย ใจดี', quantity: 75, variety: 'ข้าวโพดอาหารสัตว์', grade: 'A', requestDate: '2025-02-25', status: 'completed', price: 8200 },
  { id: 'sr2', farmerId: 'f2', farmerName: 'สมหญิง รักษ์ไทย', quantity: 30, variety: 'ข้าวโพดอาหารสัตว์', grade: 'B', requestDate: '2025-04-20', status: 'pending' },
  { id: 'sr3', farmerId: 'f3', farmerName: 'วิชัย มั่นคง', quantity: 120, variety: 'ข้าวโพดหวาน', grade: 'A', requestDate: '2025-03-01', status: 'approved', price: 12000 },
];
