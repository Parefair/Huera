import { useState } from "react";
import { generateLipstickDatabaseFromSwatches } from "../utils/generateLipstickDatabase";

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
