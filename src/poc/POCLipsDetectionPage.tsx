import React, { useState } from "react";
import { runLipDetectionPOC } from "./lipsDetection";

// รายชื่อรูปภาพที่คุณนำไปวางไว้ใน /public/test-detection/
const TEST_IMAGES = [
  "lip1.jpg",
  "lip2.jpg",
  "lip3.jpg",
  // เพิ่มรายชื่อรูปที่คุณต้องการทดสอบตรงนี้
];

export const PocDetectionPage: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartPOC = async () => {
    setIsProcessing(true);
    await runLipDetectionPOC(TEST_IMAGES);
    setIsProcessing(false);
  };

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Huera Lip Detection POC Runner</h1>
      <p>จำนวนรูปภาพที่จะทดสอบ: {TEST_IMAGES.length} รูป</p>
      
      <button
        onClick={handleStartPOC}
        disabled={isProcessing}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: isProcessing ? "#ccc" : "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: isProcessing ? "not-allowed" : "pointer",
        }}
      >
        {isProcessing ? "กำลังประมวลผล..." : "▶️ รันการทดสอบ Detect ปาก (Automate)"}
      </button>
    </div>
  );
};