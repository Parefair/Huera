import { imageProcessor } from "../utils/imageProcessor";

// ฟังก์ชันโหลดรูปภาพเป็น HTMLImageElement
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

// ฟังก์ชันแปลง Canvas เป็น Data URL แล้วสั่งดาวน์โหลดไฟล์กลับลงเครื่อง
const downloadCanvasImage = (canvas: HTMLCanvasElement, filename: string) => {
  const link = document.createElement("a");
  link.download = `detected_${filename}`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

export const runLipDetectionPOC = async (imageFileNames: string[]) => {
  console.log("🚀 Starting Lip Detection POC Batch Test...");

  // สร้าง Hidden Canvas สำหรับประมวลผล
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Cannot get Canvas 2D context");
    return;
  }

  for (const fileName of imageFileNames) {
    try {
      const imagePath = `/test-detection/${fileName}`;
      const img = await loadImage(imagePath);

      // ปรับขนาด Canvas ให้เท่ากับรูปภาพ
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      console.log(`Processing: ${fileName} (${img.width}x${img.height})`);

      // 🔥 เรียกใช้ฟังก์ชันวิเคราะห์ด้วย OpenCV.js ของโค้ดปัจจุบัน
      // ฟังก์ชันนี้จะวาดเป้าเล็งวงกลมสีฟ้าครอบจุดที่ดึงข้อมูลบน Canvas
      const result = imageProcessor.analyzeLipWithOpenCV(canvas);

      console.log(`✅ Result for ${fileName}:`, result);

      // ดาวน์โหลดรูปภาพที่วาดเป้าเล็งแล้วออกมาดูผล
      downloadCanvasImage(canvas, fileName);

      // หน่วงเวลาเล็กน้อย 300ms เพื่อป้องกัน Browser บล็อกการดาวน์โหลดหลายไฟล์
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`❌ Error processing ${fileName}:`, error);
    }
  }

  console.log("🎉 POC Lip Detection Completed!");
};