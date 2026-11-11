import openCvScriptUrl from "@techstark/opencv-js/dist/opencv.js?url";

let openCvLoadPromise: Promise<void> | null = null;

export const loadOpenCv = async () => {
  if (window.cv?.Mat) return;

  openCvLoadPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = openCvScriptUrl;
    script.onload = () => {
      const cvModule = window.cv;
      if (!cvModule) {
        reject(new Error("OpenCV script loaded without initializing cv"));
        return;
      }

      const onRuntimeInitialized = (cv: typeof window.cv) => {
        if (cv.Mat) {
          window.cv = cv;
          resolve();
        } else {
          cv.onRuntimeInitialized = () => {
            window.cv = cv;
            resolve();
          };
        }
      };

      if (cvModule instanceof Promise) {
        cvModule.then(onRuntimeInitialized, reject);
      } else {
        onRuntimeInitialized(cvModule);
      }
    };
    script.onerror = () => reject(new Error("Failed to load OpenCV script"));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    openCvLoadPromise = null;
    throw error;
  });

  await openCvLoadPromise;
};
