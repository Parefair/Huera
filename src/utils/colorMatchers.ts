import Color from "colorjs.io";
import type { LabColor, ColorMatchResult } from "../types/color";
import { LIPSTICK_DATABASE } from "./lipsstickDb";

export const colorMatcher = {
  // คำนวณหาค่าความต่างของสีสองสีด้วยสูตรมาตรฐาน Delta E 2000
  getDeltaE: (lab1: LabColor, lab2: LabColor): number => {
    const c1 = new Color("lab", [lab1.l, lab1.a, lab1.b]);
    const c2 = new Color("lab", [lab2.l, lab2.a, lab2.b]);
    return parseFloat(c1.deltaE(c2, "2000").toFixed(2));
  },

  // ฟังก์ชันปรับลดความเข้มของสีแสกนโดยจำลองการเบลนด์ผสมกับสีปากธรรมชาติก่อนนำไปหาคู่แมตช์
  dimLabOpacity: (targetLab: LabColor, opacity: number): LabColor => {
    const scanColor = new Color("lab", [targetLab.l, targetLab.a, targetLab.b]);
    const rgb = scanColor.to("srgb") as {
      r: number | null;
      g: number | null;
      b: number | null;
    };

    // จำลองสีพื้นหลังของริมฝีปากธรรมชาติคร่าว ๆ
    const bgRGB = { r: 217 / 255, g: 160 / 255, b: 160 / 255 };
    const safeRGB = {
      r: typeof rgb.r === "number" ? rgb.r : 1,
      g: typeof rgb.g === "number" ? rgb.g : 1,
      b: typeof rgb.b === "number" ? rgb.b : 1,
    };

    const blendedR = safeRGB.r * opacity + bgRGB.r * (1 - opacity);
    const blendedG = safeRGB.g * opacity + bgRGB.g * (1 - opacity);
    const blendedB = safeRGB.b * opacity + bgRGB.b * (1 - opacity);

    const blendedColor = new Color("srgb", [blendedR, blendedG, blendedB]);
    const newLab = blendedColor.to("lab") as {
      l: number | null;
      a: number | null;
      b: number | null;
    };

    return {
      l: parseFloat((newLab.l ?? 0).toFixed(1)),
      a: parseFloat((newLab.a ?? 0).toFixed(1)),
      b: parseFloat((newLab.b ?? 0).toFixed(1)),
    };
  },

  // ย้ายและอัปเกรดฟังก์ชันวิเคราะห์หาลิปสติกที่ใกล้เคียงที่สุดจากคลังสีตรงนี้
  queryLipstickMatches: (
    targetLab: LabColor,
    limit = 5,
    opacity = 0.65, // เพิ่มตัวเลือกรับค่ามาดิมความหนาแน่นลิปสติก
  ): ColorMatchResult[] => {
    // นำค่า LAB ที่ผ่านการเกลี่ยความหนาแน่นแล้วไปจับคู่
    const adjustedLab = colorMatcher.dimLabOpacity(targetLab, opacity);

    return LIPSTICK_DATABASE.map((product) => {
      const deltaE = colorMatcher.getDeltaE(adjustedLab, product.lab);
      const matchStatus: ColorMatchResult["matchStatus"] =
        deltaE < 5 ? "excellent" : deltaE <= 10 ? "close" : "not-recommended";

      return {
        ...product,
        deltaE,
        isMatch: matchStatus !== "not-recommended",
        matchStatus,
      };
    })
      .sort((a, b) => a.deltaE - b.deltaE)
      .slice(0, limit);
  },
};
