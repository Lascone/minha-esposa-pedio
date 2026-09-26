import React, { useEffect, useState } from "react";
import { CompanionManifest } from "../types";
import { frameCount, spriteStyle } from "../sprite";

interface CompanionPreviewProps {
  companion: CompanionManifest;
  size?: number;
  className?: string;
}

/** Plays the companion's real idle animation (frames or sprite sheet) at a fixed box size. */
export const CompanionPreview: React.FC<CompanionPreviewProps> = ({ companion, size = 96, className = "" }) => {
  const anim = companion.animations.idle;
  const frames = anim?.frames && anim.frames.length > 0 ? anim.frames : [companion.preview];
  const total = anim?.spritesheet ? frameCount(anim, 1) : frames.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (total <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % total), anim?.frameDuration || 300);
    return () => clearInterval(timer);
  }, [total, anim?.frameDuration, companion.id]);

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {anim?.spritesheet ? (
        <div style={spriteStyle(anim.spritesheet, index, size, size)} />
      ) : (
        <img src={frames[index] || companion.preview} alt={companion.name} draggable={false} className="w-full h-full object-contain" />
      )}
    </div>
  );
};
