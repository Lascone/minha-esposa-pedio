import type React from "react";
import { CompanionAnimationDef, CompanionSpritesheetDef } from "./types";

export function frameCount(anim: CompanionAnimationDef | undefined, fallbackFrames: number): number {
  const sheet = anim?.spritesheet;
  if (!sheet) return fallbackFrames;
  return sheet.cells?.length || sheet.totalFrames || 1;
}

/** [column, row] of a frame inside a sprite sheet. */
export function spriteCell(sheet: CompanionSpritesheetDef, index: number): [number, number] {
  if (sheet.cells && sheet.cells.length > 0) return sheet.cells[index % sheet.cells.length];
  const row = sheet.row || 0;
  if (sheet.columns && sheet.columns > 0) {
    return [index % sheet.columns, row + Math.floor(index / sheet.columns)];
  }
  return [index, row];
}

/** Inline style drawing one sprite-sheet frame scaled to fit a box, optionally mirrored. */
export function spriteStyle(
  sheet: CompanionSpritesheetDef,
  index: number,
  boxWidth: number,
  boxHeight: number,
  mirrored = false
): React.CSSProperties {
  const [col, row] = spriteCell(sheet, index);
  const fit = Math.min(boxWidth / sheet.frameWidth, boxHeight / sheet.frameHeight);
  return {
    width: `${sheet.frameWidth}px`,
    height: `${sheet.frameHeight}px`,
    backgroundImage: `url(${sheet.src})`,
    backgroundPosition: `-${col * sheet.frameWidth}px -${row * sheet.frameHeight}px`,
    backgroundRepeat: "no-repeat",
    imageRendering: "pixelated",
    transform: `${mirrored ? "scaleX(-1) " : ""}scale(${fit})`,
    transformOrigin: "center center",
    pointerEvents: "none",
    flexShrink: 0,
  };
}
