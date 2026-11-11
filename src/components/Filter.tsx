import React, { useEffect, useRef, useState } from "react";
import { filterProcessor } from "../utils/filterProcessor";
import { getFaceLandmarker } from "../utils/faceLandmarker";
import type { ColorMatchResult } from "../types/color";
import type { LipFinish } from "../types/texture";
import ColorComparer from "./ColorComparer";

export interface Point2D {
  x: number;
  y: number;
}

interface FilterProps {
  scannedHex: string;
  suggestedMatches: ColorMatchResult[];
  onUploadNew?: () => void;
}

const FINISH_BLEND_MAP: Record<LipFinish, GlobalCompositeOperation> = {
  matte: "multiply",
  gloss: "screen",
  oil: "soft-light",
  blurred: "multiply",
};

export default function Filter({
  scannedHex,
  suggestedMatches,
  onUploadNew,
}: FilterProps) {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [opacity, setOpacity] = useState<number>(0.4);
  const [trialHex, setTrialHex] = useState<string>("#b04f4f");
  const currentFinish: LipFinish = "matte";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceLandmarkerRef = useRef<Awaited<
    ReturnType<typeof getFaceLandmarker>
  > | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(-1);
  const cameraSessionRef = useRef(0);
  const loadedDataHandlerRef = useRef<(() => void) | null>(null);

  // 🌟 1. สร้าง Refs เพื่อเก็บค่าสีและความเข้มชั่วคราว ไม่ให้ฟังก์ชัน predictFrame ต้องถูกสร้างใหม่
  const colorRef = useRef<string>("");

  const parseHexToRGB = (hexStr: string) => {
    const cleanHex = hexStr.replace("#", "");
    if (cleanHex.length !== 6) return { r: 176, g: 79, b: 79 };
    const num = parseInt(cleanHex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };

  // 🌟 2. อัปเดตค่าใน colorRef ทุกครั้งที่ trialHex หรือ opacity มีการเปลี่ยนแปลง
  useEffect(() => {
    const rgb = parseHexToRGB(trialHex);
    colorRef.current = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  }, [trialHex, opacity]);

  // คอยอัปเดตสีทดลองเริ่มต้นเมื่อผู้ใช้เปลี่ยนรูปสแกนใหม่
  useEffect(() => {
    if (scannedHex !== "#---") {
      setTrialHex(scannedHex);
    }
  }, [scannedHex]);

  const recommendedMatches = suggestedMatches.filter(
    (match) => match.matchStatus !== "not-recommended",
  );
  const selectedMatch = recommendedMatches.find(
    (match) => match.hex.toLowerCase() === trialHex.toLowerCase(),
  );
  const selectedColorName = selectedMatch
    ? `${selectedMatch.brand} - ${selectedMatch.colorName}`
    : trialHex.toLowerCase() === scannedHex.toLowerCase()
      ? "สีจากภาพอัปโหลด"
      : "เลือกสีที่ต้องการทดลอง";

  // 🌟 3. ปรับลด Dependency Array ให้เหลือแค่ว่างเปล่า [] เพื่อล็อกให้ฟังก์ชันนี้ทำงานยาวเป็นเส้นตรง
  const predictFrame = React.useCallback(
    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !faceLandmarkerRef.current) return;

      if (video.readyState < 2) {
        requestRef.current = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      let timestamp = Math.round(video.currentTime * 1000);
      if (timestamp <= lastTimestampRef.current) {
        timestamp = lastTimestampRef.current + 1;
      }
      lastTimestampRef.current = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        const results = faceLandmarkerRef.current.detectForVideo(
          video,
          timestamp,
        );

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          const outerLipIndices = [
            61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314,
            17, 84, 181, 91, 146,
          ];
          const innerLipIndices = [
            78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402,
            317, 14, 87, 178, 88, 95,
          ];

          // 💡 ดึงค่าสีจาก colorRef.current มาวาดลงเฟรมภาพสดได้ทันที
          const currentLipColor = colorRef.current;

          filterProcessor.drawLipstick(
            outerLipIndices.map((i) => landmarks[i]),
            ctx,
            currentLipColor,
            FINISH_BLEND_MAP[currentFinish],
            currentFinish,
          );
          filterProcessor.drawLipstick(
            innerLipIndices.map((i) => landmarks[i]),
            ctx,
            "rgba(0,0,0,1)",
            "destination-out",
          );
        }
      } catch (error) {
        console.warn("MediaPipe Frame Skip:", error);
      }

      requestRef.current = requestAnimationFrame(loop);
    },
    [], // 💡 ล้างออกจนว่างเปล่า! ฟังก์ชันจะไม่ผูกติดกับสีตัวไหนอีกเลย ทำให้ลูปวิ่งเรียบเนียนสนิท
  );

  const stopCamera = React.useCallback(() => {
    cameraSessionRef.current += 1;

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      if (loadedDataHandlerRef.current) {
        videoRef.current.removeEventListener(
          "loadeddata",
          loadedDataHandlerRef.current,
        );
        loadedDataHandlerRef.current = null;
      }
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const startCamera = React.useCallback(() => {
    stopCamera();
    const session = cameraSessionRef.current;

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        const video = videoRef.current;
        if (!video || session !== cameraSessionRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.srcObject = stream;
        const startPrediction = () => {
          if (
            session !== cameraSessionRef.current ||
            video.readyState < 2 ||
            requestRef.current !== null
          ) {
            return;
          }
          loadedDataHandlerRef.current = null;
          requestRef.current = requestAnimationFrame(predictFrame);
        };
        loadedDataHandlerRef.current = startPrediction;
        video.addEventListener("loadeddata", startPrediction, { once: true });
        void video
          .play()
          .then(startPrediction)
          .catch((err) => {
            console.error("Start webcam playback failed:", err);
          });
        startPrediction();
      })
      .catch((err) => console.error("Access webcam failed:", err));
  }, [predictFrame, stopCamera]);

  useEffect(() => {
    async function initAR() {
      try {
        faceLandmarkerRef.current = await getFaceLandmarker("VIDEO");

        // 💡 เช็คก่อนเปิดหน้ากล้อง
        if (isCameraActive) {
          startCamera();
        } else {
          stopCamera();
        }
      } catch (err) {
        console.error("Camera filter initial failed:", err);
      }
    }

    initAR();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera, isCameraActive]);

  return (
    <div className="flex flex-col gap-4 bg-white p-5 rounded-3xl border border-gray-100/50 h-full">
      <h2 className="text-2xl font-extrabold tracking-tight text-center text-[#473636] md:text-3xl">
        Try-On with HuERA
      </h2>

      {/* กล้องแนวตั้งแบบ Mirror */}
      <div className="relative h-[min(520px,70vh)] min-h-90 w-full overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950 shadow-inner transform -scale-x-100">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        <button
          type="button"
          aria-label={isCameraActive ? "Turn camera off" : "Turn camera on"}
          title={isCameraActive ? "Turn camera off" : "Turn camera on"}
          onClick={() => setIsCameraActive((prev) => !prev)}
          className={`absolute left-3 top-3 z-10 flex h-10 w-10 -scale-x-100 items-center justify-center rounded-full shadow-lg transition ${
            isCameraActive
              ? "bg-white/90 text-[#b04f4f] hover:bg-white"
              : "bg-[#b04f4f] text-white hover:bg-[#964141]"
          }`}
        >
          {isCameraActive ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
            >
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
            >
              <path d="m8 5 11 7-11 7V5Z" />
            </svg>
          )}
        </button>

        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center transform -scale-x-100 p-6">
            <span className="text-2xl mb-2">📷</span>
            <p className="text-xs font-bold text-neutral-400">กล้องปิดอยู่</p>
            <p className="text-[10px] text-neutral-500 mt-1">
              กดปุ่ม "เปิดกล้อง" ด้านบนเพื่อเริ่มทดลองสีลิปสติก
            </p>
          </div>
        )}
      </div>

      {/* สีที่เลือกและความเข้ม */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <span
            className="h-5 w-5 shrink-0 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: trialHex }}
          />
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              สีที่เลือก
            </div>
            <div className="truncate text-sm font-bold text-[#b04f4f]">
              {selectedColorName}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => scannedHex !== "#---" && setTrialHex(scannedHex)}
            disabled={scannedHex === "#---"}
            aria-label="สีจากภาพอัปโหลด"
            className={`h-7 w-7 rounded-full border-2 transition-all ${
              trialHex.toLowerCase() === scannedHex.toLowerCase()
                ? "border-[#b04f4f] ring-2 ring-[#b04f4f]/20"
                : "border-white shadow-sm"
            } disabled:cursor-not-allowed disabled:opacity-40`}
            style={{
              backgroundColor: scannedHex !== "#---" ? scannedHex : "#eee",
            }}
          />
          {recommendedMatches.map((match) => (
            <button
              key={match.SKU}
              type="button"
              onClick={() => setTrialHex(match.hex)}
              aria-label={`${match.brand} - ${match.colorName}`}
              className={`h-7 w-7 rounded-full border-2 transition-all ${
                trialHex.toLowerCase() === match.hex.toLowerCase()
                  ? "border-[#b04f4f] ring-2 ring-[#b04f4f]/20"
                  : "border-white shadow-sm"
              }`}
              style={{ backgroundColor: match.hex }}
            />
          ))}
          {onUploadNew && (
            <button
              type="button"
              onClick={onUploadNew}
              className="ml-auto flex min-h-10 items-center gap-2 rounded-xl border border-[#d9aaa5] bg-white px-4 py-2 text-xs font-bold text-[#b04f4f] shadow-sm transition hover:bg-rose-50"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2l1.2-2h4.6l1.2 2h2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" />
                <circle cx="12" cy="12.5" r="3.5" />
              </svg>
              Upload New Inspiration!
            </button>
          )}
        </div>
      </div>

      {/* Slider ความเข้ม */}
      <div className="flex items-center gap-4 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100/50">
        <label className="text-xs font-bold text-neutral-500 whitespace-nowrap">
          Intensity:{" "}
          <span className="text-[#b04f4f] font-mono">
            {Math.round(opacity * 100)}%
          </span>
        </label>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.05"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#b04f4f]"
        />
      </div>

      {recommendedMatches.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            สินค้าแนะนำ
          </span>
          <ColorComparer
            matches={recommendedMatches}
            selectedHex={trialHex}
            onSelectMatch={setTrialHex}
            compact
          />
        </div>
      )}
    </div>
  );
}
