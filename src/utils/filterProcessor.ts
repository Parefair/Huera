import type { Point2D } from "../components/Filter";
import type { LipFinish } from "../types/texture";

export const filterProcessor = {
  // แปลง RGB เป็น HEX สไตล์ตัวพิมพ์ใหญ่
  rgbToHex: (r: number, g: number, b: number): string => {
    return (
      "#" +
      [r, g, b]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  },

  // แปลง RGB เป็น HSL สตริงสำหรับแสดงผล
  rgbToHsl: (r: number, g: number, b: number): string => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return `H:${Math.round(h * 360)}° S:${Math.round(s * 100)}% L:${Math.round(l * 100)}%`;
  },

  // แปลง RGB เป็นค่า Lab ที่แม่นยำสูง
  rgbToLab: (r: number, g: number, b: number): string => {
    let _r = r / 255;
    let _g = g / 255;
    let _b = b / 255;
    _r = _r > 0.04045 ? Math.pow((_r + 0.055) / 1.055, 2.4) : _r / 12.92;
    _g = _g > 0.04045 ? Math.pow((_g + 0.055) / 1.055, 2.4) : _g / 12.92;
    _b = _b > 0.04045 ? Math.pow((_b + 0.055) / 1.055, 2.4) : _b / 12.92;

    let x = (_r * 0.4124 + _g * 0.3576 + _b * 0.1805) * 100;
    let y = (_r * 0.2126 + _g * 0.7152 + _b * 0.0722) * 100;
    let z = (_r * 0.0193 + _g * 0.1192 + _b * 0.9505) * 100;

    x /= 95.047;
    y /= 100.0;
    z /= 108.883;
    x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

    return `L:${(116 * y - 16).toFixed(1)} a:${(500 * (x - y)).toFixed(1)} b:${(200 * (y - z)).toFixed(1)}`;
  },

  // วาดเลเยอร์ลิปสติกลงบนเนื้อวิดีโอ (Multiply & Blend Mode)
  drawLipstick: (
    landmarks: Point2D[],
    ctx: CanvasRenderingContext2D,
    color: string,
    blendMode: GlobalCompositeOperation,
    finish: LipFinish = "matte",
  ): void => {
    if (!landmarks || landmarks.length === 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(
      landmarks[0].x * ctx.canvas.width,
      landmarks[0].y * ctx.canvas.height,
    );

    for (let i = 1; i < landmarks.length; i++) {
      ctx.lineTo(
        landmarks[i].x * ctx.canvas.width,
        landmarks[i].y * ctx.canvas.height,
      );
    }
    ctx.closePath();

    if (blendMode !== "destination-out") {
      ctx.globalCompositeOperation = blendMode;
      ctx.shadowBlur = finish === "gloss" ? 20 : finish === "oil" ? 12 : 18;
      ctx.shadowColor = color;

      if (finish === "matte") {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = color;
        ctx.fill();
      } else if (finish === "gloss") {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = color;
        ctx.fill();

        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fill();
      } else if (finish === "oil") {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = color;
        ctx.fill();

        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
      } else {
        ctx.filter = "blur(5px)";
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = color;
        ctx.fill();

        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fill();
      }
    } else {
      ctx.globalCompositeOperation = "destination-out";
      ctx.filter = "blur(4px)";
      ctx.fillStyle = "black";
      ctx.fill();
    }
    ctx.restore();
  },
};
