export type UserRole = 'farmer' | 'leader' | 'inspector' | 'admin';

export interface Farmer {
  id: string;
  code: string;
  name: string;
  phone: string;
  village: string;
  district: string;
  province: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalArea: number;
  joinDate: string;
  status: 'active' | 'inactive' | 'pending';
  avatar?: string;
}

export interface Farm {
  id: string;
  farmerId: string;
  name: string;
  area: number;
  province: string;
  district: string;
  village: string;
  lat: number;
  lng: number;
  soilType: string;
  waterSource: string;
  status: 'active' | 'pending' | 'rejected';
  confirmed: boolean;
}

export interface PlantingRecord {
  id: string;
  farmId: string;
  farmerId: string;
  season: string;
  year: number;
  variety: string;
  plantDate: string;
  harvestDate: string;
  estimatedYield: number;
  actualYield?: number;
  status: 'planned' | 'growing' | 'harvested';
}

export interface Price {
  id: string;
  variety: string;
  grade: 'A' | 'B' | 'C';
  price: number;
  unit: string;
  effectiveDate: string;
  announcedBy: string;
}

export interface Inspection {
  id: string;
  farmId: string;
  farmerId: string;
  farmerName: string;
  inspectorId: string;
  scheduledDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  score?: number;
  notes?: string;
  noBurning: boolean;
  pesticide: boolean;
  soilTest: boolean;
  waterQuality: boolean;
}

export interface SaleRequest {
  id: string;
  farmerId: string;
  farmerName: string;
  quantity: number;
  variety: string;
  grade: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  price?: number;
}

export interface NoBurningApplication {
  id: string;
  farmerId: string;
  farmId: string;
  applicationDate: string;
  status: 'pending' | 'approved' | 'rejected';
  season: string;
  year: number;
  commitment: string;
}

export const MOCK_FARMERS: Farmer[] = [
  { id: 'f1', code: 'KF001', name: 'สมชาย ใจดี', phone: '0812345678', village: 'บ้านดง', district: 'เมือง', province: 'บุรีรัมย์', tier: 'gold', totalArea: 12.5, joinDate: '2022-03-15', status: 'active' },
  { id: 'f2', code: 'KF002', name: 'สมหญิง รักษ์ไทย', phone: '0898765432', village: 'บ้านโนน', district: 'ประโคนชัย', province: 'บุรีรัมย์', tier: 'silver', totalArea: 8.0, joinDate: '2022-06-20', status: 'active' },
  { id: 'f3', code: 'KF003', name: 'วิชัย มั่นคง', phone: '0856781234', village: 'บ้านสวน', district: 'นางรอง', province: 'บุรีรัมย์', tier: 'platinum', totalArea: 25.0, joinDate: '2021-12-01', status: 'active' },
  { id: 'f4', code: 'KF004', name: 'นภา ฟ้าใส', phone: '0823456789', village: 'บ้านทุ่ง', district: 'กระสัง', province: 'บุรีรัมย์', tier: 'bronze', totalArea: 4.5, joinDate: '2023-01-10', status: 'pending' },
  { id: 'f5', code: 'KF005', name: 'ประสิทธิ์ เกษตรดี', phone: '0867891234', village: 'บ้านป่า', district: 'ลำปลายมาศ', province: 'บุรีรัมย์', tier: 'silver', totalArea: 10.0, joinDate: '2022-09-05', status: 'active' },
];

export const MOCK_FARMS: Farm[] = [
  { id: 'fm1', farmerId: 'f1', name: 'แปลงที่ 1 หนองบัว', area: 6.5, province: 'บุรีรัมย์', district: 'เมือง', village: 'บ้านดง', lat: 14.993, lng: 103.102, soilType: 'ดินร่วน', waterSource: 'บ่อน้ำ', status: 'active', confirmed: true },
  { id: 'fm2', farmerId: 'f1', name: 'แปลงที่ 2 โนนสูง', area: 6.0, province: 'บุรีรัมย์', district: 'เมือง', village: 'บ้านดง', lat: 14.985, lng: 103.115, soilType: 'ดินเหนียว', waterSource: 'ชลประทาน', status: 'active', confirmed: true },
  { id: 'fm3', farmerId: 'f2', name: 'แปลงหลัก', area: 8.0, province: 'บุรีรัมย์', district: 'ประโคนชัย', village: 'บ้านโนน', lat: 14.611, lng: 103.187, soilType: 'ดินร่วนปนทราย', waterSource: 'น้ำฝน', status: 'active', confirmed: false },
  { id: 'fm4', farmerId: 'f3', name: 'ไร่ใหญ่', area: 15.0, province: 'บุรีรัมย์', district: 'นางรอง', village: 'บ้านสวน', lat: 14.652, lng: 102.796, soilType: 'ดินร่วน', waterSource: 'อ่างเก็บน้ำ', status: 'active', confirmed: true },
  { id: 'fm5', farmerId: 'f4', name: 'แปลงใหม่', area: 4.5, province: 'บุรีรัมย์', district: 'กระสัง', village: 'บ้านทุ่ง', lat: 14.771, lng: 103.219, soilType: 'ดินเหนียว', waterSource: 'น้ำฝน', status: 'pending', confirmed: false },
];

export const MOCK_PRICES: Price[] = [
  { id: 'p1', variety: 'อ้อยโรงงาน', grade: 'A', price: 1050, unit: 'ตัน', effectiveDate: '2025-01-01', announcedBy: 'สำนักงานอ้อยและน้ำตาลทราย' },
  { id: 'p2', variety: 'อ้อยโรงงาน', grade: 'B', price: 950, unit: 'ตัน', effectiveDate: '2025-01-01', announcedBy: 'สำนักงานอ้อยและน้ำตาลทราย' },
  { id: 'p3', variety: 'อ้อยโรงงาน', grade: 'C', price: 850, unit: 'ตัน', effectiveDate: '2025-01-01', announcedBy: 'สำนักงานอ้อยและน้ำตาลทราย' },
  { id: 'p4', variety: 'อ้อยตอ', grade: 'A', price: 980, unit: 'ตัน', effectiveDate: '2025-01-01', announcedBy: 'สำนักงานอ้อยและน้ำตาลทราย' },
  { id: 'p5', variety: 'อ้อยพันธุ์ดี', grade: 'A', price: 1120, unit: 'ตัน', effectiveDate: '2025-01-01', announcedBy: 'สำนักงานอ้อยและน้ำตาลทราย' },
];

export const MOCK_INSPECTIONS: Inspection[] = [
  { id: 'ins1', farmId: 'fm1', farmerId: 'f1', farmerName: 'สมชาย ใจดี', inspectorId: 'ins001', scheduledDate: '2025-02-10', status: 'completed', score: 92, noBurning: true, pesticide: true, soilTest: true, waterQuality: true, notes: 'ผ่านมาตรฐาน ไม่เผาตอซัง' },
  { id: 'ins2', farmId: 'fm3', farmerId: 'f2', farmerName: 'สมหญิง รักษ์ไทย', inspectorId: 'ins001', scheduledDate: '2025-02-15', status: 'pending', noBurning: false, pesticide: false, soilTest: false, waterQuality: false },
  { id: 'ins3', farmId: 'fm4', farmerId: 'f3', farmerName: 'วิชัย มั่นคง', inspectorId: 'ins001', scheduledDate: '2025-02-20', status: 'in_progress', noBurning: true, pesticide: true, soilTest: false, waterQuality: false },
  { id: 'ins4', farmId: 'fm5', farmerId: 'f4', farmerName: 'นภา ฟ้าใส', inspectorId: 'ins001', scheduledDate: '2025-03-01', status: 'pending', noBurning: false, pesticide: false, soilTest: false, waterQuality: false },
];

export const MOCK_SALE_REQUESTS: SaleRequest[] = [
  { id: 'sr1', farmerId: 'f1', farmerName: 'สมชาย ใจดี', quantity: 50, variety: 'อ้อยโรงงาน', grade: 'A', requestDate: '2025-02-01', status: 'approved', price: 1050 },
  { id: 'sr2', farmerId: 'f2', farmerName: 'สมหญิง รักษ์ไทย', quantity: 30, variety: 'อ้อยโรงงาน', grade: 'B', requestDate: '2025-02-05', status: 'pending' },
  { id: 'sr3', farmerId: 'f3', farmerName: 'วิชัย มั่นคง', quantity: 120, variety: 'อ้อยพันธุ์ดี', grade: 'A', requestDate: '2025-01-28', status: 'completed', price: 1120 },
];

export const MOCK_NO_BURNING: NoBurningApplication[] = [
  { id: 'nb1', farmerId: 'f1', farmId: 'fm1', applicationDate: '2025-01-15', status: 'approved', season: 'ฤดูกาลผลิต', year: 2025, commitment: 'ไม่เผาตอซัง ใช้รถตัดอ้อยสด' },
  { id: 'nb2', farmerId: 'f2', farmId: 'fm3', applicationDate: '2025-01-20', status: 'pending', season: 'ฤดูกาลผลิต', year: 2025, commitment: 'ไม่เผาตอซัง' },
];

export const TIER_CONFIG = {
  bronze: { label: 'บรอนซ์', color: '#CD7F32', min: 0, max: 499, benefits: ['ราคาพื้นฐาน', 'สิทธิ์ขายอ้อย'] },
  silver: { label: 'ซิลเวอร์', color: '#C0C0C0', min: 500, max: 999, benefits: ['ราคา +2%', 'ลำดับขายก่อน', 'ปุ๋ยราคาพิเศษ'] },
  gold: { label: 'โกลด์', color: '#FFD700', min: 1000, max: 2499, benefits: ['ราคา +5%', 'ลำดับขายก่อน', 'ปุ๋ยฟรี 1 กระสอบ', 'ประกันราคา'] },
  platinum: { label: 'แพลทินัม', color: '#E5E4E2', min: 2500, max: 99999, benefits: ['ราคา +8%', 'ขายได้ตลอด', 'ปุ๋ยฟรี 3 กระสอบ', 'ประกันราคา', 'ที่ปรึกษาเกษตร'] },
};

export const CURRENT_USER = {
  id: 'f1',
  name: 'สมชาย ใจดี',
  role: 'farmer' as UserRole,
  tier: 'gold' as const,
  points: 1240,
};
