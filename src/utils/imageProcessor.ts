import Color from "colorjs.io";
import type { LabColor } from "../types/color";

type LandmarkPoint = {
  x: number;
  y: number;
};

export const imageProcessor = {
  // โหมด A: ดึงตำแหน่งจุดเฉลี่ยด้วย MediaPipe (สำหรับรูปหน้าเต็ม)
  analyzeFace: (
    landmarks: LandmarkPoint[],
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ): { hex: string; lab: LabColor } => {
    const lipIdx = [72, 302, 12, 74, 304, 180, 16, 404];

    let r = 0,
      g = 0,
      b = 0;
    lipIdx.forEach((idx) => {
      const x = Math.min(
        Math.max(landmarks[idx].x * canvas.width, 0),
        canvas.width - 1,
      );
      const y = Math.min(
        Math.max(landmarks[idx].y * canvas.height, 0),
        canvas.height - 1,
      );
      const data = ctx.getImageData(x, y, 1, 1).data;
      r += data[0];
      g += data[1];
      b += data[2];
    });

    const finalRGB = {
      r: r / lipIdx.length,
      g: g / lipIdx.length,
      b: b / lipIdx.length,
    };

    // วาดจุด Debug พิกัดริมฝีปากสีขาว
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    lipIdx.forEach((idx) => {
      ctx.beginPath();
      ctx.arc(
        landmarks[idx].x * canvas.width,
        landmarks[idx].y * canvas.height,
        3,
        0,
        6.28,
      );
      ctx.fill();
    });

    return imageProcessor.convertRGBToLabAndHex(finalRGB);
  },

  // โหมด B: วิเคราะห์เจาะจงเฉพาะปากด้วย OpenCV.js (Centroid + Inner Circular Lock สำหรับรูปซูมปาก)
  // analyzeLipWithOpenCV: (
  //   canvas: HTMLCanvasElement
  // ): { hex: string; lab: LabColor } => {
  //   const cv = window.cv;
  //   const src = cv.imread(canvas);
  //   const hsv = new cv.Mat();
  //   const mask = new cv.Mat();

  //   cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
  //   cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

  //   // บีบช่วงสีเพื่อหาพิกัดใจกลางมวลสีลิปสติก (ตัด Noise สีผิวรอบนอกออก)
  //   const lowRed1 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 60, 50, 0]);
  //   const highRed1 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [15, 255, 255, 0]);
  //   const lowRed2 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [165, 60, 50, 0]);
  //   const highRed2 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [180, 255, 255, 0]);

  //   const mask1 = new cv.Mat();
  //   const mask2 = new cv.Mat();
  //   cv.inRange(hsv, lowRed1, highRed1, mask1);
  //   cv.inRange(hsv, lowRed2, highRed2, mask2);
  //   cv.add(mask1, mask2, mask);

  //   // หาจุดโฟกัสใจกลางของก้อนปาก (Moments) จากพื้นที่สีแดงที่เจอ
  //   const M = cv.moments(mask, false);
  //   let cX = canvas.width / 2;
  //   let cY = canvas.height / 2;

  //   if (M.m00 !== 0) {
  //     cX = Math.round(M.m10 / M.m00);
  //     cY = Math.round(M.m01 / M.m00);
  //   }

  //   // ตีกรอบวงกลมรัศมีแคบ (5% ของภาพ) เพื่อต้อนพิกเซลให้อยู่เฉพาะบริเวณเนื้อลิปสติกด้านใน
  //   const lipMask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
  //   const center = new cv.Point(cX, cY);
  //   const radius = Math.min(canvas.width, canvas.height) * 0.05;
  //   cv.circle(lipMask, center, radius, new cv.Scalar(255), -1);

  //   // ดึงค่าเฉลี่ยสีก่อนที่ OpenCV จะพ่นภาพผลลัพธ์ทับลงบนตัว Canvas ต้นทาง
  //   const mean = cv.mean(src, lipMask);
  //   const finalRGB = { r: mean[0], g: mean[1], b: mean[2] };
  //   const outputData = imageProcessor.convertRGBToLabAndHex(finalRGB);

  //   // วาดเป้าเล็งวงกลมสีฟ้าครอบจุดที่ดึงข้อมูลไปแสดงผลจริงบนจอภาพ
  //   cv.circle(src, center, radius, new cv.Scalar(0, 255, 255, 255), 2);
  //   cv.imshow(canvas, src);

  //   // ล้างหน่วยความจำเพื่อป้องกัน Memory Leak บน Mac
  //   src.delete(); hsv.delete(); mask.delete(); mask1.delete(); mask2.delete();
  //   lowRed1.delete(); highRed1.delete(); lowRed2.delete(); highRed2.delete();
  //   lipMask.delete();

  //   return outputData;
  // },
  analyzeLipWithOpenCV: (
    canvas: HTMLCanvasElement,
  ): { hex: string; lab: LabColor } => {
    const cv = window.cv;
    const src = cv.imread(canvas);
    const rgb = new cv.Mat();
    const ycrcb = new cv.Mat();
    const planes = new cv.MatVector();

    // แปลงสีเป็น RGB และ YCrCb
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, ycrcb, cv.COLOR_RGB2YCrCb);
    cv.split(ycrcb, planes);

    const Y = planes.get(0);
    const Cr = planes.get(1);
    const Cb = planes.get(2);

    // 1. แยกปากออกจากผิวโดยความต่าง Cr - Cb
    const diff = new cv.Mat();
    cv.subtract(Cr, Cb, diff);

    const lipMask = new cv.Mat();
    cv.threshold(diff, lipMask, 20, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

    const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
    cv.morphologyEx(lipMask, lipMask, cv.MORPH_CLOSE, kernel);

    // 2. หา Contour ของปาก
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(
      lipMask,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
    );

    let bestContourIdx = -1;
    let maxArea = 0;
    for (let i = 0; i < contours.size(); ++i) {
      const area = cv.contourArea(contours.get(i));
      if (area > maxArea) {
        maxArea = area;
        bestContourIdx = i;
      }
    }

    // 3. กรอง Highlight และ Shadow
    const validLipPixelsMask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    let center = new cv.Point(canvas.width / 2, canvas.height / 2);

    if (bestContourIdx !== -1 && maxArea > src.rows * src.cols * 0.01) {
      cv.drawContours(
        validLipPixelsMask,
        contours,
        bestContourIdx,
        new cv.Scalar(255),
        -1,
      );

      const notTooBright = new cv.Mat();
      const notTooDark = new cv.Mat();
      cv.threshold(Y, notTooBright, 230, 255, cv.THRESH_BINARY_INV);
      cv.threshold(Y, notTooDark, 40, 255, cv.THRESH_BINARY);

      cv.bitwise_and(validLipPixelsMask, notTooBright, validLipPixelsMask);
      cv.bitwise_and(validLipPixelsMask, notTooDark, validLipPixelsMask);

      const M = cv.moments(contours.get(bestContourIdx), false);
      if (M.m00 !== 0) {
        center = new cv.Point(
          Math.round(M.m10 / M.m00),
          Math.round(M.m01 / M.m00),
        );
      }

      notTooBright.delete();
      notTooDark.delete();
    } else {
      alert("ไม่สามารถจับสีริมฝีปากได้");

      // Fallback เดิม: วงกลมตรงกลาง
      // const radius = Math.min(canvas.width, canvas.height) * 0.08;
      // cv.circle(validLipPixelsMask, center, radius, new cv.Scalar(255), -1);
    }

    // 4. คำนวณค่าเฉลี่ยสี
    const mean = cv.mean(rgb, validLipPixelsMask);
    const finalRGB = { r: mean[0], g: mean[1], b: mean[2] };
    const outputData = imageProcessor.convertRGBToLabAndHex(finalRGB);

    // ==========================================
    // ส่วนแสดงผล Visual Feedback (เฉพาะเส้น ไม่บังเนื้อสี)
    // ==========================================

    if (bestContourIdx !== -1) {
      // วาดเฉพาะเส้นขอบนอกของพื้นที่ปากที่ตรวจจับได้ (เส้นสีเขียวนีออน หนา 2px)
      cv.drawContours(
        src,
        contours,
        bestContourIdx,
        new cv.Scalar(0, 255, 120, 255),
        2,
      );
    } else {
      // กรณี Fallback: วงกลมสีส้มเตือนว่าหาขอบปากไม่เจอ
      const fallbackRadius = Math.min(canvas.width, canvas.height) * 0.08;
      cv.circle(
        src,
        center,
        fallbackRadius,
        new cv.Scalar(255, 140, 0, 255),
        2,
      );
    }

    // วาดเป้าเล็งวงกลมเล็ก ๆ ที่จุดกึ่งกลาง (เส้นวงกลมโปร่งใน ไม่ถมทึบ)
    cv.circle(src, center, 6, new cv.Scalar(0, 255, 255, 255), 2);

    // แสดงผลขึ้น Canvas
    cv.imshow(canvas, src);

    // คืนหน่วยความจำ
    src.delete();
    rgb.delete();
    ycrcb.delete();
    planes.delete();
    Y.delete();
    Cr.delete();
    Cb.delete();
    diff.delete();
    lipMask.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
    validLipPixelsMask.delete();

    return outputData;
  },

  // แปลงค่าระบบสีจาก RGB เป็น Lab และ Hex ผ่าน ColorJS
  convertRGBToLabAndHex: (rgb: {
    r: number;
    g: number;
    b: number;
  }): { hex: string; lab: LabColor } => {
    const rgbStr = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
    const colorObj = new Color(rgbStr);

    const labData = colorObj.to("lab") as {
      l: number | null;
      a: number | null;
      b: number | null;
    };
    const hexData = colorObj
      .to("srgb")
      .toString({ format: "hex" })
      .toUpperCase();

    return {
      hex: hexData,
      lab: {
        l: parseFloat((labData.l ?? 0).toFixed(1)),
        a: parseFloat((labData.a ?? 0).toFixed(1)),
        b: parseFloat((labData.b ?? 0).toFixed(1)),
      },
    };
  },
};
