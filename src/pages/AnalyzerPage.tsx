import React, { useState } from "react";
import type { ScannedColor, ColorMatchResult, LabColor } from "../types/color";
import LipScanner from "../components/LipScanner";
import ColorComparer from "../components/ColorComparer";
import Filter from "../components/Filter";
import { colorMatcher } from "../utils/colorMatchers";

interface AnalyzerPageProps {
  savedColors: ScannedColor[];
  setSavedColors: React.Dispatch<React.SetStateAction<ScannedColor[]>>;
}

export default function AnalyzerPage({
  savedColors,
  setSavedColors,
}: AnalyzerPageProps) {
  const [currentLipHex, setCurrentLipHex] = useState<string>("#---");
  const [currentLipLab, setCurrentLipLab] = useState<LabColor | null>(null);
  const [topMatches, setTopMatches] = useState<ColorMatchResult[]>([]);
  const [selectedLipColor, setSelectedLipColor] = useState<string>("#---");

  const handleScanStart = () => {
    setCurrentLipHex("#---");
    setCurrentLipLab(null);
    setTopMatches([]);
    setSelectedLipColor("#---");
  };

  const handleScanSuccess = (hex: string, lab: LabColor) => {
    setCurrentLipHex(hex);
    setCurrentLipLab(lab);
    setSelectedLipColor(hex);

    // 1. คำนวณหา 5 สีที่ใกล้เคียงด้วยเดลต้าอีทันที
    const matches = colorMatcher.queryLipstickMatches(lab, 5, 0.7);
    setTopMatches(matches);

    // 2. บันทึกลงคลังประวัติ Global State
    const newRecord: ScannedColor = {
      id: `color_${Date.now()}`,
      customName: `Result #${savedColors.length + 1}`,
      hex: hex,
      lab: lab,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setSavedColors([newRecord, ...savedColors]);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4">
      {/* ฝั่งซ้าย: กล่องประมวลผลกล้องภาพอินสไปร์ */}
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100/50 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-800">HUERA Extractor</h2>
        <LipScanner
          onScanStart={handleScanStart}
          onScanSuccess={handleScanSuccess}
        />
      </div>

      {/* ฝั่งขวา: ผลลัพธ์และแนะนำสีลิปสติก */}
      <div className="flex flex-col gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100/50">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Color Result</h3>
          <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl shadow-inner transition-all duration-300"
                style={{ backgroundColor: currentLipHex }}
              />
              <div>
                <div className="text-xs text-gray-500 font-medium">
                  Lastest Scan Color
                </div>
                <div className="flex flex-col mt-1">
                  <strong className="text-xl font-extrabold text-[#b04f4f] tracking-tight">
                    {currentLipHex}
                  </strong>
                  <div className="text-sm font-bold text-[#b04f4f] tracking-tight">
                    {currentLipLab && (
                      <span>
                        l:{currentLipLab.l}, a:{currentLipLab.a}, b:
                        {currentLipLab.b}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (currentLipLab && currentLipLab.l !== null) {
                          navigator.clipboard.writeText(
                            currentLipLab
                              ? `${currentLipLab.l}, ${currentLipLab.a}, ${currentLipLab.b}`
                              : "",
                          );
                          alert(
                            `Copied ${currentLipLab.l}, ${currentLipLab.a}, ${currentLipLab.b} to clipboard!`,
                          );
                        }
                      }}
                      className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-all"
                    >
                      Copy Lab
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* <div className="flex justify-center">
              <button
                onClick={() =>
                  open(`/tryon?lipColor=${currentLipHex}`, "_blank")
                }
                className="text-xs font-bold text-white bg-[#b04f4f] px-3 py-1.5 rounded-full hover:bg-[#a03f3f] transition-all"
              >
                Try on with AR Camera
              </button>
            </div> */}
          </div>

          <h4 className="text-sm font-bold text-gray-700 mt-6 mb-3">
            Top 5 Lipstick Matches
          </h4>
          {topMatches.length === 0 ? (
            <div className="text-sm text-gray-400 text-center px-8 py-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              Start scanning a lip color to see the closest lipstick matches
              here.
            </div>
          ) : (
            <ColorComparer
              matches={topMatches}
              selectedHex={selectedLipColor}
              onSelectMatch={setSelectedLipColor}
            />
          )}
        </div>

        {/* แถบ Log ประวัติสีแบบย่อย */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-gray-100/50">
          <h4 className="text-sm font-bold text-gray-700 mb-3">
            Latest Scan History
          </h4>
          {savedColors.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              No scan history yet
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {savedColors.slice(0, 10).map((color) => (
                <div
                  key={color.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div
                    className="w-10 h-10 rounded-lg border-2 border-white shadow-sm shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800 truncate">
                      {color.customName}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono tracking-tight mt-0.5">
                      {color.hex} • L:{color.lab.l} a:{color.lab.a} b:
                      {color.lab.b}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium shrink-0">
                    {color.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100/50">
        <div className="text-lg font-bold text-gray-800">Camera Area</div>
        <Filter scannedHex={selectedLipColor} suggestedMatches={topMatches} />
      </div>
    </div>
  );
}
