/** Pointer travel (px) before a press becomes a drag; below it a press stays a normal click. */
export const DRAG_THRESHOLD_PX = 4;

/** Controls that keep their own mouse behaviour instead of moving the widget. */
export const DRAG_EXEMPT_SELECTOR =
  "button, input, textarea, select, a, label, [contenteditable], [contenteditable=''], [contenteditable='true'], [role='slider'], [data-no-drag]";

export function isDragExempt(target: EventTarget | null): boolean {
  const el = target as Element | null;
  if (!el || typeof el.closest !== "function") return false;
  return el.closest(DRAG_EXEMPT_SELECTOR) !== null;
}

export interface MonitorArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Box {
  width: number;
  height: number;
}

/** Keeps a box of `box` size fully inside `area` (logical px). */
export function clampToArea(x: number, y: number, box: Box, area: MonitorArea): { x: number; y: number } {
  const maxX = area.x + Math.max(0, area.width - box.width);
  const maxY = area.y + Math.max(0, area.height - box.height);
  return {
    x: Math.round(Math.min(maxX, Math.max(area.x, x))),
    y: Math.round(Math.min(maxY, Math.max(area.y, y))),
  };
}

/**
 * Lays boxes left-to-right in rows inside the area, wrapping at its right edge.
 * Anything that no longer fits vertically restarts at the top with a small offset,
 * so every widget always stays on screen.
 */
export function arrangeInArea(boxes: Box[], area: MonitorArea, margin = 40, gap = 20): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  let x = area.x + margin;
  let y = area.y + margin;
  let rowH = 0;
  let wraps = 0;
  const right = area.x + area.width - margin;
  const bottom = area.y + area.height - margin;
  for (const box of boxes) {
    if (x > area.x + margin && x + box.width > right) {
      x = area.x + margin;
      y += rowH + gap;
      rowH = 0;
    }
    if (y > area.y + margin && y + box.height > bottom) {
      wraps += 1;
      x = area.x + margin + wraps * 30;
      y = area.y + margin + wraps * 30;
      rowH = 0;
    }
    out.push(clampToArea(x, y, box, area));
    x += box.width + gap;
    rowH = Math.max(rowH, box.height);
  }
  return out;
}

/** Scale that fits the monitor inside the simulator width without distorting it. */
export function simulatorScale(containerWidth: number, monitor: Box, maxHeight = Infinity): number {
  if (monitor.width <= 0 || monitor.height <= 0 || containerWidth <= 0) return 1;
  return Math.min(containerWidth / monitor.width, maxHeight / monitor.height);
}
