/// <reference types="vite/client" />

export {};

declare global {
  interface FaceLandmarkPoint {
    x: number;
    y: number;
    z?: number; // ใส่ตัวเลือก z ไว้เผื่อโมเดลบางตัวเรียกใช้ความลึก
  }

  interface FaceLandmarkerResult {
    faceLandmarks?: FaceLandmarkPoint[][];
  }

  // 🌟 ปรับปรุงตรงนี้: เพิ่มฟังก์ชันรองรับทั้งโหมด IMAGE และ VIDEO โดยไม่กระทบของเดิม
  interface FaceLandmarkerInstance {
    // โหมดสแกนรูปภาพ (ใช้ใน LipScanner.tsx - ทำงานได้เหมือนเดิม 100%)
    detect(
      image: TexImageSource,
      imageProcessingOptions?: unknown,
    ): FaceLandmarkerResult;

    // โหมดสแกนวิดีโอกล้องสดReal-time (ใช้ใน Filter.tsx สำหรับฟีเจอร์ Try-On)
    detectForVideo(
      videoFrame: TexImageSource,
      timestamp: number,
      imageProcessingOptions?: unknown,
    ): FaceLandmarkerResult;
  }

  interface FilesetResolverAPI {
    forVisionTasks(wasmPath: string): Promise<unknown>;
  }

  interface FaceLandmarkerAPI {
    createFromOptions(
      vision: unknown,
      options: {
        baseOptions: {
          modelAssetPath: string;
          delegate?: "CPU" | "GPU"; // เพิ่มตัวเลือกช่วยประมวลผลให้กล้องฟิลเตอร์ลื่นขึ้น
        };
        runningMode: "IMAGE" | "VIDEO";
        numFaces: number;
        minFaceDetectionConfidence?: number;
      },
    ): Promise<FaceLandmarkerInstance>;
  }

  interface OpenCvMat {
    rows: number;
    cols: number;
    type: () => unknown;
    delete: () => void;
  }

  interface OpenCvPoint {
    x: number;
    y: number;
  }

  interface OpenCvScalar {
    v: number[];
  }

  // กำหนด Type โครงสร้าง OpenCV แบบเบื้องต้นไว้ด้วย เพื่อไม่ให้ Linter บ่นเรื่อง OpenCvApi
  import type cv from "@techstark/opencv-js";
  declare global {
    interface Window {
      cv: typeof cv;
    }
  }

  interface ColorInstance {
    to: (space: string) => {
      l: number;
      a: number;
      b: number;
      toString: (options?: { format: string }) => string;
    };
  }

  interface Window {
    cv: OpenCvApi;
    FaceLandmarker: FaceLandmarkerAPI;
    FilesetResolver: FilesetResolverAPI;
    Color: new (colorString: string) => ColorInstance; // รองรับ Color.js ในอนาคต
  }

  interface ImportMetaEnv {
    readonly VITE_APP_TITLE: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
