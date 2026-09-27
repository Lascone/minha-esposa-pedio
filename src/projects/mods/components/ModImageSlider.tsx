import React, { useState, useEffect, useRef } from "react";
import { WindhawkMod } from "../types";
import { KNOWN_MOD_SCREENSHOTS, extractScreenshotsFromSource } from "../services/modScreenshotsData";
import { ChevronLeft, ChevronRight, Maximize2, Layers } from "lucide-react";

interface ModImageSliderProps {
  mod: WindhawkMod;
  fallbackMockup?: React.ReactNode;
  aspectRatio?: "card" | "modal";
}

export const ModImageSlider: React.FC<ModImageSliderProps> = ({
  mod,
  fallbackMockup,
  aspectRatio = "card",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const [fetchedScreenshots, setFetchedScreenshots] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Determine screenshots list
  const known = KNOWN_MOD_SCREENSHOTS[mod.id] || [];
  const provided = mod.screenshots || [];
  const rawList = [...provided, ...known, ...fetchedScreenshots];
  // Deduplicate and filter out failed URLs or 503-byte imgur placeholders
  const validScreenshots = Array.from(new Set(rawList)).filter(
    (url) => !failedUrls.has(url) && !url.includes("w8qP4xJ")
  );

  // 2. If no known screenshots, fetch from GitHub raw source on demand
  useEffect(() => {
    if (validScreenshots.length === 0 && mod.id) {
      const url = `https://raw.githubusercontent.com/ramensoftware/windhawk-mods/main/mods/${mod.id}.wh.cpp`;
      fetch(url)
        .then((res) => (res.ok ? res.text() : ""))
        .then((code) => {
          if (code) {
            const extracted = extractScreenshotsFromSource(code);
            if (extracted.length > 0) {
              setFetchedScreenshots(extracted);
            }
          }
        })
        .catch(() => {});
    }
  }, [mod.id, validScreenshots.length]);

  // 3. Auto-play carousel when multiple images and not hovered
  useEffect(() => {
    if (validScreenshots.length <= 1 || isHovered || isFullscreen) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validScreenshots.length);
    }, 3800);

    return () => clearInterval(timer);
  }, [validScreenshots.length, isHovered, isFullscreen]);

  // Handlers
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) =>
      prev === 0 ? validScreenshots.length - 1 : prev - 1
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validScreenshots.length);
  };

  const handleImageError = (badUrl: string) => {
    setFailedUrls((prev) => new Set(prev).add(badUrl));
  };

  // If no valid screenshots found, render category mockup
  if (validScreenshots.length === 0) {
    return <>{fallbackMockup}</>;
  }

  const currentImage = validScreenshots[currentIndex % validScreenshots.length];
  const isModal = aspectRatio === "modal";

  return (
    <>
      <div
        className={`relative w-full ${
          isModal ? "h-64 sm:h-80" : "h-36"
        } rounded-xl overflow-hidden bg-black/30 border border-theme-border/50 group/slider select-none`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Current Screenshot */}
        <img
          key={currentImage}
          src={currentImage}
          alt={`${mod.name} slide ${currentIndex + 1}`}
          loading="lazy"
          onError={() => handleImageError(currentImage)}
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover/slider:scale-[1.02] cursor-pointer"
          onClick={() => setIsFullscreen(true)}
        />

        {/* Multi-image Navigation Controls */}
        {validScreenshots.length > 1 && (
          <>
            {/* Prev Button */}
            <button
              onClick={handlePrev}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-theme-primary text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 backdrop-blur-sm transition-all duration-200 z-10 shadow-md active:scale-95"
              title="Slide anterior"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-theme-primary text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 backdrop-blur-sm transition-all duration-200 z-10 shadow-md active:scale-95"
              title="Próximo slide"
            >
              <ChevronRight size={16} />
            </button>

            {/* Slide Index Badge (e.g. 1/25) */}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono text-white/90 font-bold border border-white/20 shadow-sm flex items-center gap-1">
              <Layers size={10} className="text-theme-primary" />
              <span>
                {currentIndex + 1} / {validScreenshots.length}
              </span>
            </div>

            {/* Bottom Dots Indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm z-10">
              {validScreenshots.slice(0, 8).map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-4 bg-theme-primary shadow-xs"
                      : "w-1.5 bg-white/40 hover:bg-white/80"
                  }`}
                  title={`Ir para imagem ${idx + 1}`}
                />
              ))}
              {validScreenshots.length > 8 && (
                <span className="text-[8px] text-white/60 font-mono ml-0.5">
                  +{validScreenshots.length - 8}
                </span>
              )}
            </div>
          </>
        )}

        {/* Zoom Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFullscreen(true);
          }}
          className="absolute top-2 left-2 p-1 rounded-md bg-black/60 hover:bg-black/80 text-white/80 hover:text-white opacity-0 group-hover/slider:opacity-100 transition-opacity z-10"
          title="Ver imagem ampliada"
        >
          <Maximize2 size={12} />
        </button>
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage}
              alt={mod.name}
              className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-white/20 object-contain"
            />
            <div className="flex items-center justify-between w-full mt-3 px-2 text-white">
              <span className="text-sm font-bold truncate">{mod.name}</span>
              <span className="font-mono text-xs opacity-75">
                {currentIndex + 1} de {validScreenshots.length} temas disponíveis
              </span>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors"
              >
                Fechar (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
