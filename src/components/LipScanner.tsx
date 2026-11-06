import React, { useRef, useState, useEffect } from "react";
import type { LabColor } from "../types/color";
import { imageProcessor } from "../utils/imageProcessor";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import cvModule from "@techstark/opencv-js";

interface LipScannerProps {
  onScanStart: () => void;
  onScanSuccess: (hex: string, lab: LabColor) => void;
}

export default function LipScanner({
  onScanStart,
  onScanSuccess,
}: LipScannerProps) {
  const [, setStatus] = useState<string>("⏳ กำลังเตรียมระบบวิเคราะห์...");
  const [openCvStatus, setOpenCvStatus] = useState<
    "loading" | "ready" | "missing"
  >("loading");
  const [, setMediaPipeStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [isReady, setIsReady] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingScan, setPendingScan] = useState<{
    hex: string;
    lab: LabColor;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarkerInstance | null>(null);

  const loadOpenCv = async () => {
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

  useEffect(() => {
    async function initAI() {
      try {
        // OpenCV ต้องมี runtime พร้อมก่อน ถึงจะใช้โหมดวิเคราะห์ริมฝีปากแบบละเอียดได้
        setOpenCvStatus("loading");
        const openCvReady = await loadOpenCv();
        setOpenCvStatus(openCvReady ? "ready" : "missing");

        // MediaPipe ถ้ามีสคริปต์พร้อมใช้ จะเปิดโหมด AI ให้
        setMediaPipeStatus("loading");
        let mediaPipeReady = false;

        try {
          const vision = await FilesetResolver.forVisionTasks(
            "/mediapipe/tasks-vision/wasm",
          );

          faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              },
              runningMode: "IMAGE",
              numFaces: 1,
              minFaceDetectionConfidence: 0.4,
            },
          );

          mediaPipeReady = true;
          setMediaPipeStatus("ready");
        } catch (error) {
          console.error("Failed to load MediaPipe:", error);
          setMediaPipeStatus("missing");
        }

        if (openCvReady && mediaPipeReady) {
          setStatus("✅ OpenCV + MediaPipe พร้อมสแกน");
        } else if (openCvReady) {
          setStatus("✅ OpenCV พร้อมสแกน / ใช้ fallback AI");
        } else if (mediaPipeReady) {
          setStatus("✅ MediaPipe พร้อมสแกน / ใช้ fallback OpenCV");
        } else {
          setStatus("⚠️ ใช้ fallback mode (OpenCV / MediaPipe ยังไม่พร้อม)");
        }

        setIsReady(true);
      } catch (error) {
        console.error("Failed to load AI Engine:", error);
        setOpenCvStatus(window.cv?.Mat ? "ready" : "missing");
        setMediaPipeStatus("missing");
        setStatus("⚠️ โหลดบาง library ไม่สำเร็จ แต่ยังใช้ fallback mode ได้");
        setIsReady(true);
      }
    }
    initAI();
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

    setStatus("⏳ กำลังวิเคราะห์โครงสร้างภาพ...");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // อัปเดตและรันตัววิเคราะห์พิกเซลสีจริงจากภาพ (นำโค้ดฟิกซ์สีตัวเก่าออกแล้ว)
        processImage(img);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const processImage = (img: HTMLImageElement) => {
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
    const landmarker = faceLandmarkerRef.current;
    const result = landmarker?.detect(img);

    if (result?.faceLandmarks && result.faceLandmarks.length > 0) {
      setStatus("⚡ สแกนสำเร็จด้วย AI Smart Mode");
      scanResult = imageProcessor.analyzeFace(
        result.faceLandmarks[0],
        canvas,
        ctx,
      );
    } else if (openCvStatus === "ready" || window.cv?.Mat) {
      setStatus("⚡ สแกนสำเร็จด้วย OpenCV Lip-Focus Mode");
      scanResult = imageProcessor.analyzeLipWithOpenCV(canvas);
    } else {
      setStatus("⚠️ OpenCV ยังไม่พร้อม ใช้ fallback ตรงกลางภาพ");
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

    if (!scanResult) {
      setImagePreview(null);
      setPendingScan(null);
      setStatus("Upload a new image to try again");
      return;
    }

    // Keep the result local until the user reviews and confirms it.
    setPendingScan(scanResult);
    setImagePreview(canvas.toDataURL());
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => isReady && fileInputRef.current?.click()}
        className={`relative flex min-h-90 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all md:h-[min(65vh,720px)] ${
          isReady
            ? "border-neutral-200 hover:border-[#b04f4f] bg-neutral-900 cursor-pointer"
            : "border-neutral-100 bg-neutral-50 cursor-not-allowed"
        }`}
      >
        {imagePreview ? (
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
        disabled={!isReady}
      />

      <canvas ref={canvasRef} className="hidden" />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={!isReady}
        className="w-full rounded-xl border border-[#d9aaa5] bg-white py-3 text-sm font-semibold text-[#b04f4f] transition-all hover:bg-rose-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
      >
        {imagePreview
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
