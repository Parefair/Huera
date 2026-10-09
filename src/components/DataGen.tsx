import { useState } from "react";
import cvModule from "@techstark/opencv-js";
import rawData from "../utils/lipsticks-meta.json";
import { imageProcessor } from "../utils/imageProcessor";
import { SWATCH_FOLDER } from "../utils/lipsstickDb";

interface LipstickMetaItem {
  id: number;
  imageFile: string;
  productName: string;
  brand: string;
  finish: string;
  colorName: string;
  hex?: string;
  lab?: { l: number; a: number; b: number };
}

const loadOpenCv = async () => {
  if (window.cv?.Mat) {
    return true;
  }

  if (cvModule instanceof Promise) {
    const cv = await cvModule;
    window.cv = cv;
    return true;
  }

  if (cvModule.Mat) {
    window.cv = cvModule;
    return true;
  }

  await new Promise<void>((resolve) => {
    cvModule.onRuntimeInitialized = () => {
      window.cv = cvModule;
      resolve();
    };
  });

  return true;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

export const generateLipstickDatabaseFromSwatches = async () => {
  await loadOpenCv();

  const generated = [] as Array<{
    SKU: number;
    productName: string;
    brand: string;
    finish: string;
    colorName: string;
    imageFile: string;
    imageUrl: string;
    hex: string;
    lab: { l: number; a: number; b: number };
  }>;

  for (const item of rawData as LipstickMetaItem[]) {
    const swatchUrl = `${SWATCH_FOLDER}/${item.imageFile}`;

    try {
      const img = await loadImage(swatchUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(`No canvas context for ${item.imageFile}`);
      ctx.drawImage(img, 0, 0);

      const colorResult = imageProcessor.analyzeLipWithOpenCV(canvas);

      generated.push({
        SKU: item.id,
        productName: item.productName,
        brand: item.brand,
        finish: item.finish,
        colorName: item.colorName,
        imageFile: item.imageFile,
        imageUrl: swatchUrl,
        hex: colorResult.hex,
        lab: colorResult.lab,
      });
    } catch {
      generated.push({
        SKU: item.id,
        productName: item.productName,
        brand: item.brand,
        finish: item.finish,
        colorName: item.colorName,
        imageFile: item.imageFile,
        imageUrl: swatchUrl,
        hex: item.hex ?? "#C9755C",
        lab: item.lab ?? { l: 58.4, a: 32, b: 28.7 },
      });
    }
  }

  return generated;
};

export const LipstickDataGenerator = () => {
  const [outputCode, setOutputCode] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleGenerate = async () => {
    setIsProcessing(true);
    const generated = await generateLipstickDatabaseFromSwatches();
    const generatedString = `import type { LipstickProduct } from "../types/color";\n\nexport const initialLipstickDatabase: LipstickProduct[] = ${JSON.stringify(
      generated,
      null,
      2,
    )}; \n\nexport default initialLipstickDatabase;`;
    setOutputCode(generatedString);
    setIsProcessing(false);
  };

  return (
    <div className="p-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800">
            Update product data from config file
          </h3>
          <p className="text-[11px] text-gray-500 mt-1">
            Generate product data from the current config file and refresh the
            in-app catalog.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isProcessing}
          className="bg-[#b04f4f] text-white text-xs font-bold px-3 py-2 rounded-full hover:bg-[#9d4444] disabled:opacity-60"
        >
          {isProcessing
            ? "Updating..."
            : "Update product data from config file"}
        </button>
      </div>

      {outputCode && (
        <textarea
          readOnly
          rows={10}
          value={outputCode}
          className="w-full mt-4 font-mono text-[10px] p-3 border rounded-lg bg-white"
        />
      )}
    </div>
  );
};
