import React, { useEffect, useRef, useState } from "react";
import { filterProcessor } from "../utils/filterProcessor";
import { getFaceLandmarker } from "../utils/faceLandmarker";
import type { ColorMatchResult } from "../types/color";
import { LIP_FINISH_PRESETS } from "../types/texture";
import type { LipFinish, LipFinishPreset } from "../types/texture";
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
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(true);
  const [opacity, setOpacity] = useState<number>(LIP_FINISH_PRESETS.matte.def);
  const [trialHex, setTrialHex] = useState<string>("#b04f4f");
  const currentPreset = LIP_FINISH_PRESETS.matte;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceLandmarkerRef = useRef<Awaited<
    ReturnType<typeof getFaceLandmarker>
  > | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(-1);
  const cameraSessionRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const loadedDataHandlerRef = useRef<(() => void) | null>(null);
  const currentFinishRef = useRef<LipFinish>("matte");
  const currentPresetRef = useRef<LipFinishPreset>(LIP_FINISH_PRESETS.matte);

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
          const frameFinish = currentFinishRef.current;

          filterProcessor.drawLipstick(
            outerLipIndices.map((i) => landmarks[i]),
            ctx,
            currentLipColor,
            FINISH_BLEND_MAP[frameFinish],
            frameFinish,
            currentPresetRef.current,
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
    const video = videoRef.current;
    const stream =
      streamRef.current ?? (video?.srcObject as MediaStream | null);
    if (loadedDataHandlerRef.current) {
      video?.removeEventListener("loadeddata", loadedDataHandlerRef.current);
      loadedDataHandlerRef.current = null;
    }
    stream?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (video) {
      video.pause();
      if (video.srcObject === stream) video.srcObject = null;
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
    setIsCameraLoading(true);
    const session = cameraSessionRef.current;

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        const video = videoRef.current;
        if (!video || session !== cameraSessionRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        const startPrediction = () => {
          if (session !== cameraSessionRef.current || video.readyState < 2)
            return;
          setIsCameraLoading(false);
          if (requestRef.current !== null) return;
          loadedDataHandlerRef.current = null;
          requestRef.current = requestAnimationFrame(predictFrame);
        };
        loadedDataHandlerRef.current = startPrediction;
        video.addEventListener("loadeddata", startPrediction, { once: true });
        void video
          .play()
          .then(startPrediction)
          .catch((err) => {
            if (session === cameraSessionRef.current) setIsCameraLoading(false);
            console.error("Start webcam playback failed:", err);
          });
        startPrediction();
      })
      .catch((err) => {
        if (session === cameraSessionRef.current) setIsCameraLoading(false);
        console.error("Access webcam failed:", err);
      });
  }, [predictFrame, stopCamera]);

  useEffect(() => {
    let cancelled = false;

    async function initAR() {
      if (!isCameraActive) {
        setIsCameraLoading(false);
        stopCamera();
        return;
      }

      setIsCameraLoading(true);
      try {
        faceLandmarkerRef.current = await getFaceLandmarker("VIDEO");
        if (!cancelled) startCamera();
      } catch (err) {
        if (!cancelled) setIsCameraLoading(false);
        console.error("Camera filter initial failed:", err);
      }
    }

    initAR();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [startCamera, stopCamera, isCameraActive]);

  return (
    <div className="flex h-full flex-col gap-2.5 border border-gray-100/50 bg-white p-3 md:gap-4 md:rounded-3xl md:p-5">
      {/* <h2 className="text-2xl font-extrabold tracking-tight text-center text-[#473636] md:text-3xl">
        Try-On with HuERA
      </h2> */}

      {/* กล้องแนวตั้งแบบ Mirror */}
      <div className="relative h-[min(400px,45vh)] min-h-56 w-full -scale-x-100 overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950 shadow-inner md:h-[min(520px,70vh)] md:min-h-90">
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

        {isCameraActive && isCameraLoading && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute inset-0 z-[5] flex -scale-x-100 flex-col items-center justify-center gap-4 bg-[#473636] text-sm font-semibold text-[#f9dfe0]"
          >
            <span
              aria-hidden="true"
              className="h-10 w-10 animate-spin rounded-full border-4 border-[#f9dfe0]/30 border-t-[#f9dfe0]"
            />
            <span>Loading camera...</span>
          </div>
        )}

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
          <div className="absolute inset-0 flex -scale-x-100 flex-col items-center justify-center gap-3 bg-[#473636] p-6 text-center text-[#f9dfe0]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#f9dfe0]/35 bg-[#f9dfe0]/10">
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
                <path d="M14 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
                <path d="m17 5 4 3v2M10 9.5a2.5 2.5 0 0 0 3.5 3.5M7 7l10 10" />
              </svg>
            </span>
            <p className="text-sm font-bold">กล้องปิดอยู่</p>
            <p className="text-[11px] text-[#f9dfe0]/75">
              กดปุ่ม "เปิดกล้อง" ด้านบนเพื่อเริ่มทดลองสีลิปสติก
            </p>
          </div>
        )}
      </div>

      {/* สีที่เลือกและความเข้ม */}
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 md:gap-3 md:p-4">
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

      <div className="rounded-xl border border-neutral-100/50 bg-neutral-50 p-2.5 md:p-3">
        <div className="mb-1 flex items-center justify-between md:mb-2">
          <label
            htmlFor="lip-intensity"
            className="whitespace-nowrap text-xs font-bold text-neutral-500"
          >
            Intensity
          </label>
          <span className="font-mono text-xs font-bold text-[#b04f4f]">
            {Math.round(opacity * 100)}%
          </span>
        </div>
        <input
          id="lip-intensity"
          type="range"
          min={currentPreset.min}
          max={currentPreset.max}
          step="0.05"
          value={opacity}
          list="opacity-marks-matte"
          onChange={(event) => setOpacity(parseFloat(event.target.value))}
          className="lip-intensity-range w-full cursor-pointer accent-[#b04f4f]"
        />
        <datalist id="opacity-marks-matte">
          {currentPreset.marks.map((mark) => (
            <option key={mark} value={mark} />
          ))}
        </datalist>
        <div className="relative mx-2 mt-2 h-7" aria-hidden="true">
          {currentPreset.marks.map((mark, index) => {
            const left =
              ((mark - currentPreset.min) /
                (currentPreset.max - currentPreset.min)) *
              100;
            const isFirst = index === 0;
            const isLast = index === currentPreset.marks.length - 1;
            const label = isFirst ? "Light" : isLast ? "Full" : "Medium";

            return (
              <span
                key={mark}
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${left}%` }}
              >
                <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-[#b04f4f]" />
                {label && (
                  <span
                    className={`absolute top-2 whitespace-nowrap text-[10px] text-neutral-500 ${
                      isFirst
                        ? "left-0"
                        : isLast
                          ? "right-0"
                          : "left-1/2 -translate-x-1/2"
                    }`}
                  >
                    {label}
                  </span>
                )}
              </span>
            );
          })}
        </div>
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
