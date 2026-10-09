// โครงสร้างของข้อมูลสีระบบ LAB (คงเดิมเพื่อใช้คำนวณเดลต้าอี)
export interface LabColor {
  l: number;
  a: number;
  b: number;
}

// 🌟 ปรับปรุง: โครงสร้างข้อมูลผลิตภัณฑ์ลิปสติกจริงในระบบ (ตรงตาม Spec ใหม่ของคุณ)
export interface LipstickProduct {
  parentSKU?: string; // legacy field, optional for the new metadata-driven schema
  SKU: string | number; // example: 1 or "CDS25192124"
  productName: string;
  brand: string;
  finish: string;
  colorName: string;
  hex: string;
  lab: LabColor;
  imageFile?: string;
  imageUrl?: string;
}

// โครงสร้างของสีที่ผู้ใช้งานสแกนและบันทึกเก็บไว้ (สำหรับหน้าประวัติ)
export interface ScannedColor {
  id: string;
  customName: string;
  hex: string;
  lab: LabColor;
  timestamp: string;
}

// 🌟 ปรับปรุง: ผลลัพธ์การสแกนจับคู่เฉดสีที่จะได้ Property ของผลิตภัณฑ์ลิปสติกตัวใหม่ติดไปด้วยครบชุด
export interface ColorMatchResult extends LipstickProduct {
  deltaE: number;
  isMatch: boolean; // true ถ้าเป็นสีที่ยังแนะนำได้ (Delta E <= 10)
  matchStatus: "excellent" | "close" | "not-recommended";
}
