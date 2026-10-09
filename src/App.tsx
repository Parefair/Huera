import { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AnalyzerPage from "./pages/AnalyzerPage";
import LipsMaster from "./pages/LipsMaster";
import CameraPage from "./pages/CameraPage";
import type { ScannedColor } from "./types/color";
import "./App.css";

export default function App() {
  // กำหนด Type ให้ State อย่างชัดเจนว่าเป็นอาเรย์ของสีที่ถูกบันทึก
  const [savedColors, setSavedColors] = useState<ScannedColor[]>([]);

  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* แถบนำทางในการสลับหน้า (Navbar) */}
        <nav className="nav-bar bg-red-950 text-white p-4 flex items-center justify-between">
          <div className="logo">HUERA</div>
          <div className="flex gap-4">
            <Link to="/">Lips Scanner</Link>
            <Link to="/lipsmaster">Lips Master Data</Link>
            <Link to="/tryon">Try-On</Link>
          </div>
        </nav>

        {/* ส่วนโหลดเนื้อหาของแต่ละหน้าตาม URL */}
        <main className="content-container">
          <Routes>
            <Route
              path="/"
              element={
                <AnalyzerPage
                  savedColors={savedColors}
                  setSavedColors={setSavedColors}
                />
              }
            />
            <Route path="/lipsmaster" element={<LipsMaster />} />
            <Route
              path="/tryon"
              element={<CameraPage savedColors={savedColors} />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
