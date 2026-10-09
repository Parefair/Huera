import type { LipstickProduct } from "../types/color";
import { initialLipstickDatabase } from "./seedLipstickDb";

export const SWATCH_FOLDER = "/lip-swatches";

export const createSwatchUrl = (imageFile: string) =>
  `${SWATCH_FOLDER}/${imageFile}`;

export const LIPSTICK_DATABASE: LipstickProduct[] = initialLipstickDatabase.map(
  (item) => ({
    ...item,
    imageUrl: item.imageUrl ?? createSwatchUrl(item.imageFile ?? ""),
  }),
);

export default LIPSTICK_DATABASE;
