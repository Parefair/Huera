import React, { useState } from "react";
import type {
  ScannedColor,
  ColorMatchResult,
  LabColor,
  LipstickProduct,
} from "../types/color";
import LipScanner from "../components/LipScanner";
import Filter from "../components/Filter";
import LipInspirationCatalog from "../components/LipInspirationCatalog";
import { colorMatcher } from "../utils/colorMatchers";

interface GuidedAnalyzerPageProps {
  savedColors: ScannedColor[];
  setSavedColors: React.Dispatch<React.SetStateAction<ScannedColor[]>>;
}

export default function GuidedAnalyzerPage({
  savedColors,
  setSavedColors,
}: GuidedAnalyzerPageProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [topMatches, setTopMatches] = useState<ColorMatchResult[]>([]);
  const [selectedLipColor, setSelectedLipColor] = useState("#---");

  const handleScanStart = () => {
    setStep(1);
    setTopMatches([]);
    setSelectedLipColor("#---");
  };

  const handleScanSuccess = (hex: string, lab: LabColor) => {
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
    setStep(2);
  };

  const handleHistorySelect = (hex: string, lab: LabColor) => {
    setSelectedLipColor(hex);
    setTopMatches(colorMatcher.queryLipstickMatches(lab, 5, 0.7));
    setStep(2);
  };

  const handleCatalogSelect = (product: LipstickProduct) => {
    setSelectedLipColor(product.hex);

    const matches = colorMatcher.queryLipstickMatches(product.lab, 5, 0.7);
    const selectedProduct: ColorMatchResult = {
      ...product,
      deltaE: 0,
      isMatch: true,
      matchStatus: "excellent",
    };
    const otherMatches = matches.filter(
      (match) => String(match.SKU) !== String(product.SKU),
    );

    setTopMatches([selectedProduct, ...otherMatches].slice(0, 5));
    setStep(2);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4">
      <div className="flex items-center justify-center gap-3 text-xs font-bold">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`rounded-full px-4 py-2 ${
            step === 1 ? "bg-[#b04f4f] text-white" : "bg-[#473636] text-white"
          }`}
        >
          1. Upload
        </button>
        <div className="h-px w-10 bg-gray-200" />
        <div
          className={`rounded-full px-4 py-2 ${
            step === 2
              ? "bg-[#b04f4f] text-white"
              : "bg-[#f9dfe0] text-[#9b6262]"
          }`}
        >
          2. Try on and suggestion
        </div>
      </div>

      {step === 1 ? (
        <div className="w-full max-w-none rounded-3xl border border-gray-100/50 bg-white p-6 shadow-xs">
          <h2 className="mb-1 text-2xl text-center font-bold text-[#473636]">
            Upload yours lip Inspiration!
          </h2>
          <p className="mb-5 text-sm text-gray-500">
            Start with one image. We will find the closest lipstick shades next.
          </p>
          <LipScanner
            onScanStart={handleScanStart}
            onScanSuccess={handleScanSuccess}
          />
          <LipInspirationCatalog onSelectProduct={handleCatalogSelect} />
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold text-gray-700">
              Latest Scan History
            </h3>
            {savedColors.length > 0 ? (
              <div className="flex flex-col gap-2">
                {savedColors.slice(0, 10).map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleHistorySelect(color.hex, color.lab)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-[#b04f4f] hover:bg-rose-50/30"
                  >
                    <div
                      className="h-10 w-10 shrink-0 rounded-lg border-2 border-white shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-gray-800">
                        {color.customName}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11px] tracking-tight text-gray-500">
                        {color.hex} - L:{color.lab.l} a:{color.lab.a} b:
                        {color.lab.b}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-gray-400">
                      {color.timestamp}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-6 text-center text-sm text-gray-400">
                No scan history yet
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <Filter
            scannedHex={selectedLipColor}
            suggestedMatches={topMatches}
            onUploadNew={() => setStep(1)}
          />
        </>
      )}
    </div>
  );
}
