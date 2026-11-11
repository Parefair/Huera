import React, { useRef, useState, useEffect } from "react";
import type { LabColor } from "../types/color";
import { imageProcessor } from "../utils/imageProcessor";
import { getFaceLandmarker } from "../utils/faceLandmarker";

let openCvLoadPromise: Promise<void> | null = null;

const loadOpenCv = async () => {
  openCvLoadPromise ??= (async () => {
    const cvModule = (await import("@techstark/opencv-js")).default;
    const cv = cvModule instanceof Promise ? await cvModule : cvModule;

    if (!cv.Mat) {
      await new Promise<void>((resolve) => {
        cv.onRuntimeInitialized = resolve;
      });
    }

    window.cv = cv;
  })();

  await openCvLoadPromise;
};

interface LipScannerProps {
  onScanStart: () => void;
  onScanSuccess: (hex: string, lab: LabColor) => void;
}

export default function LipScanner({
  onScanStart,
  onScanSuccess,
}: LipScannerProps) {
  const [status, setStatus] = useState<string>("กำลังเตรียมระบบวิเคราะห์...");
  const [isProcessing, setIsProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingScan, setPendingScan] = useState<{
    hex: string;
    lab: LabColor;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarkerInstance | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    getFaceLandmarker("IMAGE")
      .then((landmarker) => {
        faceLandmarkerRef.current = landmarker;
        if (!isProcessingRef.current) setStatus("MediaPipe พร้อมสแกน");
      })
      .catch((error: unknown) => {
        console.error("Failed to load MediaPipe:", error);
        if (!isProcessingRef.current)
          setStatus("MediaPipe ไม่พร้อม จะใช้โหมดสำรองเมื่อวิเคราะห์");
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // Allow selecting the same file again on the next scan.
    input.value = "";

    onScanStart();
    setImagePreview(null);
    setPendingScan(null);
    isProcessingRef.current = true;
    setIsProcessing(true);
    setStatus("กำลังอ่านไฟล์รูปภาพ...");

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result !== "string") {
        setStatus("อ่านไฟล์รูปภาพไม่สำเร็จ กรุณาลองอีกครั้ง");
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        setStatus(
          faceLandmarkerRef.current
            ? "กำลังตรวจจับใบหน้าและวิเคราะห์สีริมฝีปาก..."
            : "กำลังโหลดโมเดลตรวจจับใบหน้า...",
        );
        void processImage(img)
          .catch((error: unknown) => {
            console.error("Image analysis failed:", error);
            setPendingScan(null);
            setImagePreview(null);
            setStatus("วิเคราะห์รูปไม่สำเร็จ กรุณาลองอีกครั้ง");
          })
          .finally(() => {
            isProcessingRef.current = false;
            setIsProcessing(false);
          });
      };
      img.onerror = () => {
        setStatus("เปิดรูปภาพไม่สำเร็จ กรุณาเลือกไฟล์รูปอื่น");
        isProcessingRef.current = false;
        setIsProcessing(false);
      };
      img.src = ev.target.result;
    };
    reader.onerror = () => {
      setStatus("อ่านไฟล์รูปภาพไม่สำเร็จ กรุณาลองอีกครั้ง");
      isProcessingRef.current = false;
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // ล็อกสเกลความกว้างความยาวตามรูปภาพต้นฉบับจริงที่ผู้ใช้อัปโหลดมา
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    let scanResult: { hex: string; lab: LabColor } | null;

    // รันการตรวจสอบแบบไฮบริด (Hybrid Strategy) ตามโค้ดต้นฉบับเดิมของคุณ
    let faceLandmarks: Array<{ x: number; y: number }> | undefined;
    try {
      const landmarker =
        faceLandmarkerRef.current ?? (await getFaceLandmarker("IMAGE"));
      faceLandmarkerRef.current = landmarker;
      faceLandmarks = landmarker.detect(img).faceLandmarks?.[0];
    } catch (error) {
      console.error("MediaPipe image detection failed:", error);
    }

    if (faceLandmarks) {
      setStatus("ตรวจพบใบหน้า กำลังวิเคราะห์สีริมฝีปาก...");
      scanResult = imageProcessor.analyzeFace(faceLandmarks, canvas, ctx);
    } else {
      try {
        setStatus("ไม่พบใบหน้า กำลังเตรียม OpenCV...");
        await loadOpenCv();
        setStatus("กำลังวิเคราะห์บริเวณริมฝีปากด้วย OpenCV...");
        scanResult = imageProcessor.analyzeLipWithOpenCV(canvas);
      } catch (error) {
        console.error("Failed to load OpenCV fallback:", error);
        setStatus("OpenCV ไม่พร้อม กำลังใช้สีจากบริเวณกลางภาพ...");
        const sampleSize = Math.max(
          1,
          Math.round(Math.min(canvas.width, canvas.height) * 0.05),
        );
        const centerX = Math.max(
          0,
          Math.floor(canvas.width / 2 - sampleSize / 2),
        );
        const centerY = Math.max(
          0,
          Math.floor(canvas.height / 2 - sampleSize / 2),
        );
        const imageData = ctx.getImageData(
          centerX,
          centerY,
          sampleSize,
          sampleSize,
        ).data;
        let r = 0;
        let g = 0;
        let b = 0;

        for (let i = 0; i < imageData.length; i += 4) {
          r += imageData[i];
          g += imageData[i + 1];
          b += imageData[i + 2];
        }

        const pixelCount = Math.max(1, imageData.length / 4);
        scanResult = imageProcessor.convertRGBToLabAndHex({
          r: r / pixelCount,
          g: g / pixelCount,
          b: b / pixelCount,
        });
      }
    }

    if (!scanResult) {
      setImagePreview(null);
      setPendingScan(null);
      setStatus("สแกนสีไม่สำเร็จ กรุณาอัปโหลดรูปใหม่");
      return;
    }

    // Keep the result local until the user reviews and confirms it.
    setPendingScan(scanResult);
    setImagePreview(canvas.toDataURL());
    setStatus("วิเคราะห์เสร็จแล้ว ตรวจสอบสีที่ได้ด้านล่าง");
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative flex min-h-90 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-200 transition-all md:h-[min(65vh,720px)] ${isProcessing ? "cursor-wait bg-[#473636]" : "cursor-pointer bg-neutral-900 hover:border-[#b04f4f]"}`}
      >
        {isProcessing ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4 text-sm font-semibold text-[#f9dfe0]"
          >
            <span
              aria-hidden="true"
              className="h-10 w-10 animate-spin rounded-full border-4 border-[#f9dfe0]/30 border-t-[#f9dfe0]"
            />
            <span>On Processing...</span>
            <span className="sr-only">{status}</span>
          </div>
        ) : imagePreview ? (
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-xs text-neutral-400 text-center p-6 font-medium leading-relaxed">
            📸 Upload your inspiration!
            <br />
            <span className="text-[10px] text-neutral-500 font-normal mt-1 block">
              Automatically detect lips and extract the color for analysis.
            </span>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={isProcessing}
      />

      <canvas ref={canvasRef} className="hidden" />

      <button
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        disabled={isProcessing}
        className="w-full rounded-xl border border-[#d9aaa5] bg-white py-3 text-sm font-semibold text-[#b04f4f] transition-all hover:bg-rose-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
      >
        {isProcessing
          ? "Processing..."
          : imagePreview
            ? "Change upload image"
            : "Upload Image (Full Face / Lip Zoom)"}
      </button>

      {pendingScan && (
        <div className="rounded-2xl border border-[#e8caca] bg-[#fff8f8] p-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 shrink-0 rounded-lg border border-white shadow-inner"
              style={{ backgroundColor: pendingScan.hex }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-gray-700">
                Review captured result
              </div>
              <div className="font-mono text-sm font-bold text-[#b04f4f]">
                {pendingScan.hex}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onScanSuccess(pendingScan.hex, pendingScan.lab);
              setPendingScan(null);
            }}
            className="mt-5 w-full rounded-xl bg-[#b04f4f] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#964141] active:scale-[0.99]"
          >
            Let's Try On! →
          </button>
        </div>
      )}
    </div>
  );
}
