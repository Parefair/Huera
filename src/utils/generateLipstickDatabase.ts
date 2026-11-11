import rawData from "./lipsticks-meta.json";
import { imageProcessor } from "./imageProcessor";
import { SWATCH_FOLDER } from "./lipsstickDb";
import { loadOpenCv } from "./openCv";

interface LipstickMetaItem {
  id: number;
  imageFile: string;
  productName: string;
  brand: string;
  finish: string;
  colorName: string;
  hex?: string;
  lab?: { l: number; a: number; b: number };
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

export const generateLipstickDatabaseFromSwatches = async () => {
  await loadOpenCv();

  const generated = [] as Array<{
    SKU: number;
    productName: string;
    brand: string;
    finish: string;
    colorName: string;
    imageFile: string;
    imageUrl: string;
    hex: string;
    lab: { l: number; a: number; b: number };
  }>;

  for (const item of rawData as LipstickMetaItem[]) {
    const swatchUrl = `${SWATCH_FOLDER}/${item.imageFile}`;

    try {
      const img = await loadImage(swatchUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(`No canvas context for ${item.imageFile}`);
      ctx.drawImage(img, 0, 0);

      const colorResult = imageProcessor.analyzeLipWithOpenCV(canvas);
      if (!colorResult)
        throw new Error(`Could not detect lips in ${item.imageFile}`);

      generated.push({
        SKU: item.id,
        productName: item.productName,
        brand: item.brand,
        finish: item.finish,
        colorName: item.colorName,
        imageFile: item.imageFile,
        imageUrl: swatchUrl,
        hex: colorResult.hex,
        lab: colorResult.lab,
      });
    } catch {
      generated.push({
        SKU: item.id,
        productName: item.productName,
        brand: item.brand,
        finish: item.finish,
        colorName: item.colorName,
        imageFile: item.imageFile,
        imageUrl: swatchUrl,
        hex: item.hex ?? "#C9755C",
        lab: item.lab ?? { l: 58.4, a: 32, b: 28.7 },
      });
    }
  }

  return generated;
};
