/**
 * useWindowWidth.js — Reactive window width hook for responsive inline-style breakpoints.
 *
 * Usage:
 *   const width = useWindowWidth();
 *   const showSidebar = width >= 1280;
 */
import { useState, useEffect } from "react";

export default function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );

  useEffect(() => {
    let raf;
    const handleResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return width;
}
