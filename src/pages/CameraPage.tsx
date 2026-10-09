import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { ScannedColor } from "../types/color";

interface CameraPageProps {
  savedColors: ScannedColor[];
}

export default function CameraPage({ savedColors }: CameraPageProps) {
  const [searchParams] = useSearchParams();

  console.log("CameraPage: searchParams =", searchParams);

  const selectedColorFromUrl = useMemo(() => {
    const rawHex = searchParams.get("hex") || searchParams.get("color");
    if (!rawHex) return null;

    const normalized = rawHex.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

    return `#${normalized.toUpperCase()}`;
  }, [searchParams]);

  const overlayColors = useMemo(() => {
    const urlColor = selectedColorFromUrl
      ? {
          id: `url_${selectedColorFromUrl}`,
          customName: `URL Color ${selectedColorFromUrl}`,
          hex: selectedColorFromUrl,
          lab: { l: 0, a: 0, b: 0 },
          timestamp: "URL",
        }
      : null;

    return urlColor ? [urlColor, ...savedColors] : savedColors;
  }, [savedColors, selectedColorFromUrl]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-gray-100/50 text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          AR Try-On Lipstick Filter
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          ทดลองเฉดสีลิปสติกผ่านกล้องสดแบบเรียลไทม์
        </p>

        {/* ส่วนจำลองหน้าจอกล้อง */}
        <div className="w-full h-100 bg-neutral-900 rounded-2xl my-6 flex items-center justify-center text-sm text-neutral-500 relative overflow-hidden border border-neutral-800 shadow-inner">
          <span className="px-4">
            [ กล้องสำหรับฟิลเตอร์ AR Try-On กำลังรออัปโหลดโค้ดลоจิก ]
          </span>

          {/* แถบตัวเลือกสีลิปด้านล่างจอ (Overlay) */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3 rounded-xl flex gap-3 overflow-x-auto items-center shadow-lg border border-gray-100">
            <div className="text-xs font-bold text-gray-700 pr-3 border-r border-gray-200 whitespace-nowrap">
              สีที่เลือก:
            </div>
            {overlayColors.length === 0 ? (
              <span className="text-xs text-gray-400 w-full text-left pl-1">
                ไม่มีสีที่บันทึกไว้สำหรับสวมเป็นฟิลเตอร์
              </span>
            ) : (
              overlayColors.map((color) => (
                <button
                  key={color.id}
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 active:scale-95 transition-all shrink-0 cursor-pointer"
                  style={{ backgroundColor: color.hex }}
                  title={color.customName}
                  onClick={() =>
                    alert(`สลับเอฟเฟกต์หน้ากากกล้องเป็นเฉดสี: ${color.hex}`)
                  }
                />
              ))
            )}
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-100 text-amber-800 p-4 rounded-xl text-xs text-left leading-relaxed">
          💡 <strong>คำแนะนำระบบ:</strong> หน้าจอนี้เชื่อมต่อกับ Global State
          เรียบร้อยแล้ว เมื่อทำการเชื่อมชุดคำสั่งเปิดกล้องเสร็จสิ้น
          คุณจะสามารถกดยกแถบสีลิปสติก หรือสีอื่น ๆ
          จากหน้าบันทึกประวัติมาสวมทับบนหน้ากากวิดีโอตัวกรองได้ทันที
        </div>
      </div>
    </div>
  );
}
