import type { LipstickProduct } from "../types/color";
import { LIPSTICK_DATABASE } from "../utils/lipsstickDb";

// มั่นใจได้ว่าข้อมูลจากฐานข้อมูลจะตรงตามรูปแบบโครงสร้างที่กำหนด
const products = LIPSTICK_DATABASE as LipstickProduct[];

interface MasterComponentProps {
  onSelectProduct?: (product: LipstickProduct) => void;
}

export default function LipsMasterComponent({
  onSelectProduct,
}: MasterComponentProps) {
  if (products.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        ไม่มีข้อมูลผลิตภัณฑ์ลิปสติกในระบบ
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {products.map((product) => (
        <div
          key={String(product.SKU)}
          onClick={() => onSelectProduct && onSelectProduct(product)}
          className={`flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all ${
            onSelectProduct
              ? "cursor-pointer hover:bg-gray-50 hover:border-gray-200"
              : "cursor-default"
          }`}
        >
          {/* แสดงกล่องสีจริงของลิปสติกแต่ละรุ่น */}
          <div
            className="w-12 h-12 rounded-xl border-2 border-white shadow-md shrink-0 transition-transform duration-200 hover:scale-105"
            style={{ backgroundColor: product.hex }}
          />

          {/* ข้อมูลเนื้อหาแบรนด์ รุ่น และชื่อสี */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-800 truncate">
              {product.brand} - {product.colorName}
            </div>
            <div className="text-xs text-gray-500 truncate mt-0.5">
              {product.productName}
            </div>
            <div className="text-[10px] text-gray-400 font-mono tracking-tighter mt-1 bg-gray-200/50 inline-block px-1.5 py-0.5 rounded-sm">
              L:{product.lab.l} a:{product.lab.a} b:{product.lab.b}
            </div>
          </div>

          {/* ป้ายบอกประเภทเนื้อ Finish ของลิปสติกด้านท้าย */}
          <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-3 py-1 rounded-md shrink-0">
            {product.finish}
          </span>
        </div>
      ))}
    </div>
  );
}
