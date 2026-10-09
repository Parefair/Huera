import type { LipstickProduct } from "../types/color";
import LipsMasterComponent from "../components/Master";
import { LipstickDataGenerator } from "../components/DataGen";

export default function HistoryPage() {
  const handleSelectProduct = (product: LipstickProduct) => {
    console.log("Selected Product SKU:", String(product.SKU));
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-gray-100/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              คลังข้อมูลผลิตภัณฑ์ลิปสติก
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              รายชื่อเฉดสีและคุณสมบัติสินค้าทั้งหมดที่พร้อมใช้งานร่วมกับระบบทดสอบฟิลเตอร์อัจฉริยะ
            </p>
          </div>
        </div>

        <div className="mt-6">
          <LipsMasterComponent onSelectProduct={handleSelectProduct} />
        </div>
      </div>

      <LipstickDataGenerator />
    </div>
  );
}
