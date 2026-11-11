import React, { lazy, Suspense, useState } from "react";
import type { ColorMatchResult, LabColor, ScannedColor } from "../types/color";
import ColorComparer from "../components/ColorComparer";
import LipScanner from "../components/LipScanner";
import { colorMatcher } from "../utils/colorMatchers";

const Filter = lazy(() => import("../components/Filter"));

interface AnalyzerPageProps {
  savedColors: ScannedColor[];
  setSavedColors: React.Dispatch<React.SetStateAction<ScannedColor[]>>;
}

export default function AnalyzerPage({
  savedColors,
  setSavedColors,
}: AnalyzerPageProps) {
  const [currentLipHex, setCurrentLipHex] = useState("#---");
  const [currentLipLab, setCurrentLipLab] = useState<LabColor | null>(null);
  const [topMatches, setTopMatches] = useState<ColorMatchResult[]>([]);
  const [selectedLipColor, setSelectedLipColor] = useState("#---");

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
    setTopMatches(colorMatcher.queryLipstickMatches(lab, 5, 0.7));

    const newRecord: ScannedColor = {
      id: `color_${Date.now()}`,
      customName: `Result #${savedColors.length + 1}`,
      hex,
      lab,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setSavedColors([newRecord, ...savedColors]);
  };

  return (
    <div className="grid w-full grid-cols-1 gap-6 p-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
      <section className="flex min-w-0 flex-col gap-4 rounded-3xl border border-gray-100/50 bg-white p-6 shadow-xs">
        <h2 className="text-xl font-bold text-gray-800">HUERA Extractor</h2>
        <LipScanner
          onScanStart={handleScanStart}
          onScanSuccess={handleScanSuccess}
        />
      </section>

      <div className="flex min-w-0 flex-col gap-6">
        <section className="rounded-3xl border border-gray-100/50 bg-white p-6 shadow-xs">
          <h3 className="mb-4 text-lg font-bold text-gray-800">Color Result</h3>
          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div
              className="h-14 w-14 rounded-xl shadow-inner"
              style={{ backgroundColor: currentLipHex }}
            />
            <div>
              <div className="text-xs font-medium text-gray-500">
                Latest Scan Color
              </div>
              <strong className="text-xl font-extrabold text-[#b04f4f]">
                {currentLipHex}
              </strong>
              {currentLipLab && (
                <div className="text-sm font-bold text-[#b04f4f]">
                  L:{currentLipLab.l}, a:{currentLipLab.a}, b:{currentLipLab.b}
                </div>
              )}
            </div>
          </div>

          <h4 className="mb-3 mt-6 text-sm font-bold text-gray-700">
            Top 5 Lipstick Matches
          </h4>
          {topMatches.length > 0 ? (
            <ColorComparer
              matches={topMatches}
              selectedHex={selectedLipColor}
              onSelectMatch={setSelectedLipColor}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-8 py-4 text-center text-sm text-gray-400">
              Start scanning a lip color to see the closest lipstick matches
              here.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-gray-100/50 bg-white p-5 shadow-xs">
          <h4 className="mb-3 text-sm font-bold text-gray-700">
            Latest Scan History
          </h4>
          {savedColors.length > 0 ? (
            <div className="flex flex-col gap-2">
              {savedColors.slice(0, 10).map((color) => (
                <div
                  key={color.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                  <div
                    className="h-10 w-10 shrink-0 rounded-lg border-2 border-white shadow-sm"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-gray-800">
                      {color.customName}
                    </div>
                    <div className="truncate font-mono text-[11px] text-gray-500">
                      {color.hex} - L:{color.lab.l} a:{color.lab.a} b:
                      {color.lab.b}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {color.timestamp}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center text-sm text-gray-400">
              No scan history yet
            </p>
          )}
        </section>
      </div>

      <section className="min-w-0 rounded-3xl border border-gray-100/50 bg-white p-6 shadow-xs">
        <div className="mb-4 text-lg font-bold text-gray-800">Camera Area</div>
        <Suspense
          fallback={
            <div className="p-5 text-sm text-gray-500">
              Loading camera tools...
            </div>
          }
        >
          <Filter scannedHex={selectedLipColor} suggestedMatches={topMatches} />
        </Suspense>
      </section>
    </div>
  );
}
