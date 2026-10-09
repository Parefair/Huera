export type LipFinish = "matte" | "gloss" | "oil" | "blurred";

export interface RenderLipOptions {
  ctx: CanvasRenderingContext2D;
  lipPath: Path2D; // รูปทรงหรือ Path ขอบปาก
  hexColor: string;
  finish: LipFinish;
  lipCenter?: { x: number; y: number };
}

export const applyLipFilter = ({
  ctx,
  lipPath,
  hexColor,
  finish,
  lipCenter,
}: RenderLipOptions) => {
  ctx.save();

  // ล็อกขอบเขตการวาดให้อยู่เฉพาะในริมฝีปาก
  ctx.clip(lipPath);

  switch (finish) {
    case "matte":
      // ฟินิชแมทท์: สีแน่น เน้นเก็บรอยหยักปากเดิมแต่ลดความมันวาว
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = hexColor;
      ctx.globalAlpha = 0.65;
      ctx.fill(lipPath);

      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha = 0.5;
      ctx.fill(lipPath);
      break;

    case "gloss":
      // ฟินิชกลอส: สีโปร่งแสง + สร้างประกายแวววาว
      ctx.globalCompositeOperation = "color";
      ctx.fillStyle = hexColor;
      ctx.globalAlpha = 0.6;
      ctx.fill(lipPath);

      // ดึงแสงสะท้อนสีขาวประกายเงา (Gloss Overlay)
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.globalAlpha = 0.35;
      ctx.fill(lipPath);
      break;

    case "oil":
      // ฟินิชออยล์: สีระเรื่อ ใส แต่เงาวาวสะท้อนแสงสูง
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = hexColor;
      ctx.globalAlpha = 0.75;
      ctx.fill(lipPath);

      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.globalAlpha = 0.25;
      ctx.fill(lipPath);
      break;

    case "blurred":
      // ฟินิชเบลอขอบ / ออมเบร: สีเข้มตรงกลางแล้วฟุ้งไล่ระดับออกขอบ
      if (lipCenter) {
        const gradient = ctx.createRadialGradient(
          lipCenter.x,
          lipCenter.y,
          5,
          lipCenter.x,
          lipCenter.y,
          45,
        );
        gradient.addColorStop(0, hexColor);
        gradient.addColorStop(0.6, hexColor);
        gradient.addColorStop(1, "transparent");

        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.7;
        ctx.filter = "blur(4px)"; // เบลอให้ฟุ้งละมุน
        ctx.fill(lipPath);
      }
      break;
  }

  ctx.restore();
};
