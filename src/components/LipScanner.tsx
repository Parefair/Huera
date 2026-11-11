import React, { useRef, useState, useEffect } from "react";
import type { LabColor } from "../types/color";
import { imageProcessor } from "../utils/imageProcessor";
import { getFaceLandmarker } from "../utils/faceLandmarker";
import { loadOpenCv } from "../utils/openCv";

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
  const [scanAlert, setScanAlert] = useState<string | null>(null);
  const [pendingScan, setPendingScan] = useState<{
    hex: string;
    lab: LabColor;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarkerInstance | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!scanAlert) return;

    const timeoutId = window.setTimeout(() => setScanAlert(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [scanAlert]);

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
    setScanAlert(null);
    isProcessingRef.current = true;
    setIsProcessing(true);
    setStatus("กำลังอ่านไฟล์รูปภาพ...");

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result !== "string") {
        setStatus("อ่านไฟล์รูปภาพไม่สำเร็จ กรุณาลองอีกครั้ง");
        setScanAlert("อ่านรูปภาพไม่สำเร็จ กรุณาลองเลือกไฟล์ใหม่");
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
            setScanAlert(
              "วิเคราะห์รูปภาพไม่สำเร็จ กรุณาเลือกรูปที่เห็นใบหน้าหรือริมฝีปากชัดเจน",
            );
          })
          .finally(() => {
            isProcessingRef.current = false;
            setIsProcessing(false);
          });
      };
      img.onerror = () => {
        setStatus("เปิดรูปภาพไม่สำเร็จ กรุณาเลือกไฟล์รูปอื่น");
        setScanAlert("เปิดรูปภาพไม่สำเร็จ กรุณาลองเลือกไฟล์ใหม่");
        isProcessingRef.current = false;
        setIsProcessing(false);
      };
      img.src = ev.target.result;
    };
    reader.onerror = () => {
      setStatus("อ่านไฟล์รูปภาพไม่สำเร็จ กรุณาลองอีกครั้ง");
      setScanAlert("อ่านรูปภาพไม่สำเร็จ กรุณาลองเลือกไฟล์ใหม่");
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
        setStatus("OpenCV ไม่พร้อมและไม่สามารถตรวจจับริมฝีปากได้");
        scanResult = null;
      }
    }

    if (!scanResult) {
      setImagePreview(null);
      setPendingScan(null);
      setStatus("สแกนสีไม่สำเร็จ กรุณาอัปโหลดรูปใหม่");
      setScanAlert("ไม่พบใบหน้าหรือริมฝีปากในภาพนี้ กรุณาลองอัปโหลดรูปใหม่");
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
        role={!imagePreview && !isProcessing ? "button" : undefined}
        aria-label={
          !imagePreview && !isProcessing
            ? "Click to upload an image"
            : undefined
        }
        tabIndex={!imagePreview && !isProcessing ? 0 : undefined}
        onClick={() =>
          !isProcessing && !imagePreview && fileInputRef.current?.click()
        }
        onKeyDown={(event) => {
          if (
            !imagePreview &&
            !isProcessing &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative flex min-h-90 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-200 transition-all md:h-[min(65vh,720px)] ${isProcessing ? "cursor-wait bg-[#473636]" : imagePreview ? "bg-neutral-900" : "cursor-pointer bg-[#f9dfe0] hover:border-[#b04f4f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b04f4f]"}`}
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
          <div className="flex flex-col items-center gap-3 p-6 text-center text-sm font-medium leading-relaxed text-[#473636]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#473636]/25 bg-[#473636]/5">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </span>
            <span className="font-semibold">Upload your lip inspiration</span>
            <span className="text-xs font-medium text-[#b04f4f]">
              Click to upload
            </span>
          </div>
        )}
        {imagePreview && !isProcessing && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute right-3 top-3 z-10 rounded-full border border-[#f9dfe0]/40 bg-[#473636]/90 px-3 py-2 text-xs font-semibold text-[#f9dfe0] shadow-sm transition hover:bg-[#5b4141]"
          >
            Re-upload
          </button>
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

      {scanAlert && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-start gap-3 rounded-2xl border border-[#d9aaa5] bg-[#fff4f5] p-4 text-[#473636] shadow-xl"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f9dfe0] text-sm font-bold text-[#b04f4f]">
            !
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">ตรวจจับไม่สำเร็จ</p>
            <p className="mt-1 text-xs leading-relaxed text-[#6b5555]">
              {scanAlert}
            </p>
            <button
              type="button"
              onClick={() => {
                setScanAlert(null);
                fileInputRef.current?.click();
              }}
              className="mt-3 rounded-lg bg-[#473636] px-3 py-2 text-xs font-semibold text-[#f9dfe0] transition hover:bg-[#5b4141]"
            >
              ลองอัปโหลดรูปใหม่
            </button>
          </div>
          <button
            type="button"
            aria-label="ปิดข้อความแจ้งเตือน"
            onClick={() => setScanAlert(null)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6b5555] transition hover:bg-[#f9dfe0]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}

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
