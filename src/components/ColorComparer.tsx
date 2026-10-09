import type { ColorMatchResult } from "../types/color";

interface ColorComparerProps {
  matches: ColorMatchResult[];
  selectedHex?: string;
  onSelectMatch?: (hex: string) => void;
}

export default function ColorComparer({
  matches,
  selectedHex,
  onSelectMatch,
}: ColorComparerProps) {
  return (
    <div className="flex flex-col gap-3">
      {matches.map((product) => {
        const isSelected =
          !!selectedHex &&
          product.hex.toLowerCase() === selectedHex.toLowerCase();

        return (
          <button
            key={String(product.SKU)}
            type="button"
            onClick={() => onSelectMatch?.(product.hex)}
            className={`w-full p-4 rounded-2xl border text-left transition-all ${
              isSelected
                ? "border-[#b04f4f] bg-rose-50/40 shadow-sm"
                : "border-gray-100 bg-white hover:shadow-md hover:border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-lg border-2 border-white shadow-sm shrink-0"
                style={{ backgroundColor: product.hex }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2">
                  <strong className="text-sm font-bold text-gray-800 truncate">
                    {product.brand} - {product.colorName}
                  </strong>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-sm shrink-0">
                    {product.finish}
                  </span>
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {product.productName}
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-100 my-3" />

            <div className="flex justify-between items-center text-[11px] font-medium">
              <div className="text-gray-400">
                SKU:{" "}
                <span className="font-mono text-gray-600">{product.SKU}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-gray-500">
                  Delta E:{" "}
                  <strong className="text-gray-700 font-bold">
                    {product.deltaE}
                  </strong>
                </span>

                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    product.matchStatus === "excellent"
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                      : product.matchStatus === "close"
                        ? "text-amber-700 bg-amber-50 border border-amber-100"
                        : "text-rose-700 bg-rose-50 border border-rose-100"
                  }`}
                >
                  {product.matchStatus === "excellent"
                    ? "● ใกล้เคียงมาก"
                    : product.matchStatus === "close"
                      ? "● ใกล้เคียง"
                      : "● ไม่แนะนำ"}
                </span>
              </div>
            </div>

            {isSelected && (
              <div className="mt-3 text-[10px] font-bold text-[#b04f4f]">
                ใช้สีนี้สำหรับ AR Try-On
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
