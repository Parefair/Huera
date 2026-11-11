import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

type RunningMode = "IMAGE" | "VIDEO";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;
let currentRunningMode: RunningMode = "IMAGE";

const createFaceLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "/mediapipe/tasks-vision/wasm",
  );

  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    },
    runningMode: "IMAGE",
    numFaces: 1,
    minFaceDetectionConfidence: 0.4,
  });
};

export const getFaceLandmarker = async (runningMode: RunningMode) => {
  landmarkerPromise ??= createFaceLandmarker();
  const landmarker = await landmarkerPromise;

  if (currentRunningMode !== runningMode) {
    await landmarker.setOptions({ runningMode });
    currentRunningMode = runningMode;
  }

  return landmarker;
};
