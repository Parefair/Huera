import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AnalyzerPage from "./pages/AnalyzerPage";
import GuidedAnalyzerPage from "./pages/GuidedAnalyzerPage";
import LipsMaster from "./pages/LipsMaster";
import type { ScannedColor } from "./types/color";
import "./App.css";

export default function App() {
  // กำหนด Type ให้ State อย่างชัดเจนว่าเป็นอาเรย์ของสีที่ถูกบันทึก
  const [savedColors, setSavedColors] = useState<ScannedColor[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* แถบนำทางในการสลับหน้า (Navbar) */}
        <nav
          ref={navRef}
          className="nav-bar relative flex items-center justify-between bg-[#473636] p-4 text-white"
        >
          {/* logo */}
          <Link to="/" onClick={closeMenu} className="nav-logo">
            <img src="/HueraLogo.svg" alt="HUERA" className="h-10" />
          </Link>
          <div className="nav-links flex gap-4">
            <Link to="/">Guided Scan</Link>
            <Link to="/analyzer">Lips Scanner</Link>
            <Link to="/lipsmaster">Lips Master Data</Link>
          </div>
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="nav-menu-button"
          >
            <span />
            <span />
            <span />
          </button>
          {isMenuOpen && (
            <div className="nav-mobile-menu">
              <Link to="/" onClick={closeMenu}>
                Guided Scan
              </Link>
              <Link to="/analyzer" onClick={closeMenu}>
                Lips Scanner
              </Link>
              <Link to="/lipsmaster" onClick={closeMenu}>
                Lips Master Data
              </Link>
            </div>
          )}
        </nav>

        {/* ส่วนโหลดเนื้อหาของแต่ละหน้าตาม URL */}
        <main className="content-container">
          <Routes>
            <Route
              path="/"
              element={
                <GuidedAnalyzerPage
                  savedColors={savedColors}
                  setSavedColors={setSavedColors}
                />
              }
            />
            <Route
              path="/analyzer"
              element={
                <AnalyzerPage
                  savedColors={savedColors}
                  setSavedColors={setSavedColors}
                />
              }
            />
            <Route path="/lipsmaster" element={<LipsMaster />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
