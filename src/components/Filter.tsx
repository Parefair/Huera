import React, { useEffect, useRef, useState } from "react";
import { filterProcessor } from "../utils/filterProcessor";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import type { ColorMatchResult } from "../types/color";
import type { LipFinish } from "../types/texture";
import { LipControls } from "./LipsControl";

export interface Point2D {
  x: number;
  y: number;
}

interface FilterProps {
  scannedHex: string;
  suggestedMatches: ColorMatchResult[];
}

export default function Filter({ scannedHex, suggestedMatches }: FilterProps) {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [opacity, setOpacity] = useState<number>(0.4);
  const [trialHex, setTrialHex] = useState<string>("#b04f4f");
  const [currentFinish, setCurrentFinish] = useState<LipFinish>("matte");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(-1);

  // 🌟 1. สร้าง Refs เพื่อเก็บค่าสีและความเข้มชั่วคราว ไม่ให้ฟังก์ชัน predictFrame ต้องถูกสร้างใหม่
  const colorRef = useRef<string>("");

  const parseHexToRGB = (hexStr: string) => {
    const cleanHex = hexStr.replace("#", "");
    if (cleanHex.length !== 6) return { r: 176, g: 79, b: 79 };
    const num = parseInt(cleanHex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };

  const finishBlendMap: Record<LipFinish, GlobalCompositeOperation> = {
    matte: "multiply",
    gloss: "screen",
    oil: "soft-light",
    blurred: "multiply",
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
            finishBlendMap[currentFinish],
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
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (videoRef.current?.srcObject) {
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

    // lastTimestampRef.current = -1;
    setIsCameraReady(false);
  }, []);

  const startCamera = React.useCallback(() => {
    stopCamera();

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", () => {
            setIsCameraReady(true);
            requestRef.current = requestAnimationFrame(predictFrame);
          });
        }
      })
      .catch((err) => console.error("Access webcam failed:", err));
  }, [predictFrame, stopCamera]);

  useEffect(() => {
    const currentVideo = videoRef.current;

    async function initAR() {
      try {
        if (!faceLandmarkerRef.current) {
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm",
          );
          const instance = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
          });
          faceLandmarkerRef.current = instance;
        }

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
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (currentVideo?.srcObject) {
        const stream = currentVideo.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera, stopCamera, isCameraActive]);

  return (
    <div className="flex flex-col gap-4 bg-white p-5 rounded-3xl border border-gray-100/50 h-full">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700">AR Try-On Studio</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCameraActive((prev) => !prev)}
            className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all border ${
              isCameraActive
                ? "bg-rose-50 border-rose-100 text-[#b04f4f] hover:bg-rose-100/60"
                : "bg-neutral-100 border-neutral-200 text-neutral-500 hover:bg-neutral-200/60"
            }`}
          >
            {isCameraActive ? "⏸️ ปิดกล้อง" : "▶️ เปิดกล้อง"}
          </button>

          <span
            className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
              isCameraReady && isCameraActive
                ? "bg-emerald-50 text-emerald-600"
                : "bg-neutral-50 text-neutral-400"
            }`}
          >
            {isCameraReady && isCameraActive ? "● LIVE" : "⏳ OFF"}
          </span>
        </div>
      </div>

      {/* กล้องแนวตั้งแบบ Mirror */}
      <div className="w-full aspect-3/4 max-w-sm mx-auto bg-neutral-950 rounded-2xl relative overflow-hidden shadow-inner border border-neutral-900 transform -scale-x-100">
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

      {/* เมนูเลือกสีสลับสับเปลี่ยน */}
      <div className="flex flex-col gap-2 mt-1">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          เลือกสีทดลองบนใบหน้า
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => scannedHex !== "#---" && setTrialHex(scannedHex)}
            disabled={scannedHex === "#---"}
            className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all text-xs ${
              trialHex === scannedHex && scannedHex !== "#---"
                ? "border-[#b04f4f] bg-rose-50/40 font-bold text-gray-800 shadow-xs"
                : "border-gray-100 hover:border-gray-200 bg-white text-gray-500 disabled:opacity-40"
            }`}
          >
            <div
              className="w-4 h-4 rounded-md border shrink-0"
              style={{
                backgroundColor: scannedHex !== "#---" ? scannedHex : "#eee",
              }}
            />
            <span className="truncate">สีภาพอัปโหลด</span>
          </button>

          {suggestedMatches.map((match, idx) => (
            <button
              key={match.SKU} // 💡 แก้ไข: ดึง SKU จากรากตรง ๆ
              onClick={() => setTrialHex(match.hex)} // 💡 แก้ไข: ดึง hex จากรากตรง ๆ
              className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all text-xs ${
                trialHex === match.hex
                  ? "border-[#b04f4f] bg-rose-50/40 font-bold text-gray-800 shadow-xs"
                  : "border-gray-100 hover:border-gray-200 bg-white text-gray-500"
              }`}
            >
              <div
                className="w-4 h-4 rounded-md border shrink-0"
                style={{ backgroundColor: match.hex }}
              />
              <span className="truncate">แนะนำ #{idx + 1}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          Finish
        </span>
        <LipControls
          currentFinish={currentFinish}
          onSelectFinish={setCurrentFinish}
        />
      </div>
    </div>
  );
}
