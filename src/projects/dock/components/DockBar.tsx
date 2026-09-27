import React, { useEffect, useMemo, useRef, useState } from "react";
import { DockAppearance, DockGroup, DockLaunchItem, DockShellButton, DockWindowInfo } from "../types";
import { DockSlot, isPinnedSlot, magnifyScale } from "../logic";
import { contrastText, hexToRgba } from "../themes";
import { DockIcon } from "./DockIcon";

export type DockContextTarget =
  | { kind: "item"; item: DockLaunchItem; windows: DockWindowInfo[]; groupId?: string }
  | { kind: "group"; group: DockGroup; windows: DockWindowInfo[] }
  | { kind: "separator"; id: string }
  | { kind: "running"; exe: string; windows: DockWindowInfo[] }
  | { kind: "start" }
  | { kind: "shell"; action: DockShellButton }
  | { kind: "tray" }
  | { kind: "bar" };

export const SHELL_BUTTON_LABELS: Record<DockShellButton, string> = {
  search: "Pesquisar",
  taskview: "Visão de tarefas",
  widgets: "Widgets do Windows",
  explorer: "Explorador de Arquivos",
  desktop: "Mostrar área de trabalho",
  settings: "Configurações",
};

export interface ActivateInfo {
  middle: boolean;
  shift: boolean;
  element: HTMLElement;
}

interface DockBarProps {
  slots: DockSlot[];
  appearance: DockAppearance;
  /** The window already draws a real Windows backdrop. */
  nativeGlass?: boolean;
  hidden?: boolean;
  /** Item ids currently bouncing (just launched). */
  bouncing?: Set<string>;
  activeGroupId?: string | null;
  onActivate?: (slot: DockSlot, info: ActivateInfo) => void;
  onContext?: (target: DockContextTarget, e: React.MouseEvent) => void;
  onMove?: (id: string, toIndex: number) => void;
  onGroup?: (sourceId: string, targetId: string) => void;
  onBusyChange?: (busy: boolean) => void;
  barRef?: React.Ref<HTMLDivElement>;
}

const SEPARATOR = 2;

export function dockBarBackground(a: DockAppearance, nativeGlass = false): React.CSSProperties {
  const border = a.borderWidth > 0 ? `${a.borderWidth}px solid ${hexToRgba(a.borderColor, a.borderOpacity)}` : "none";
  const shadow = a.shadow > 0 ? `0 ${Math.round(6 + a.shadow * 10)}px ${Math.round(14 + a.shadow * 26)}px ${hexToRgba("#000000", a.shadow)}` : "none";
  if (nativeGlass || a.background === "acrylic") {
    return { background: "transparent", border, borderRadius: a.radius };
  }
  const base: React.CSSProperties = { border, borderRadius: a.radius, boxShadow: shadow };
  if (a.background === "solid") return { ...base, background: hexToRgba(a.bgColor, Math.max(a.bgOpacity, 0.05)) };
  if (a.background === "translucent") {
    return { ...base, background: hexToRgba(a.bgColor, a.bgOpacity), backdropFilter: `blur(${Math.round(a.blur / 2)}px)` };
  }
  return {
    ...base,
    background: `linear-gradient(180deg, ${hexToRgba("#ffffff", 0.18)} 0%, ${hexToRgba("#ffffff", 0.04)} 45%, transparent 100%), ${hexToRgba(a.bgColor, a.bgOpacity)}`,
    backdropFilter: `blur(${a.blur}px) saturate(1.6)`,
    boxShadow: `${shadow === "none" ? "" : shadow + ", "}inset 0 1px 0 ${hexToRgba("#ffffff", 0.35)}`,
  };
}

function prettyExe(exe: string): string {
  const file = exe.split("\\").pop() || exe;
  const stem = file.replace(/\.exe$/i, "");
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

export function slotLabel(slot: DockSlot): string {
  if (slot.kind === "item") return slot.item.name;
  if (slot.kind === "group") return `${slot.group.name} (${slot.group.items.length})`;
  if (slot.kind === "running") return slot.windows[0]?.title || prettyExe(slot.exe);
  if (slot.kind === "start") return "Iniciar";
  if (slot.kind === "shell") return SHELL_BUTTON_LABELS[slot.action];
  if (slot.kind === "tray") return "Bandeja, relógio e notificações";
  return "";
}

interface DragState {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  active: boolean;
  insertIndex: number | null;
  groupTarget: string | null;
}

export const DockBar: React.FC<DockBarProps> = ({
  slots,
  appearance: a,
  nativeGlass = false,
  hidden = false,
  bouncing,
  activeGroupId,
  onActivate,
  onContext,
  onMove,
  onGroup,
  onBusyChange,
  barRef,
}) => {
  const vertical = a.edge === "left" || a.edge === "right";
  const magnify = nativeGlass || !a.animations ? 1 : a.magnify;
  const speed = Math.max(0.25, a.animSpeed || 1);
  const ms = (base: number) => (a.animations ? Math.round(base / speed) : 0);

  const localBar = useRef<HTMLDivElement | null>(null);
  const setBarRef = (el: HTMLDivElement | null) => {
    localBar.current = el;
    if (typeof barRef === "function") barRef(el);
    else if (barRef) (barRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };
  const [pointer, setPointer] = useState<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const pinnedCount = slots.filter(isPinnedSlot).length;
  const firstPinned = slots.findIndex(isPinnedSlot);

  // Unmagnified slot centers, relative to the content anchor (start, middle or end of the icons).
  const { centers, contentLen } = useMemo(() => {
    let pos = 0;
    const list: number[] = [];
    slots.forEach((s, i) => {
      const size = s.kind === "separator" ? SEPARATOR : a.iconSize;
      list.push(pos + size / 2);
      pos += size + (i < slots.length - 1 ? a.spacing : 0);
    });
    return { centers: list, contentLen: pos };
  }, [slots, a.iconSize, a.spacing]);

  const scales = useMemo(() => {
    if (pointer === null || magnify <= 1 || drag?.active) return slots.map(() => 1);
    const pitch = a.iconSize + a.spacing;
    return slots.map((s, i) => (s.kind === "separator" ? 1 : magnifyScale(pointer - centers[i], pitch, magnify)));
  }, [pointer, magnify, slots, centers, a.iconSize, a.spacing, drag?.active]);

  const toBaseCoord = (clientX: number, clientY: number): number | null => {
    const el = localBar.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const p = vertical ? clientY : clientX;
    const start = (vertical ? r.top : r.left) + a.padding + a.borderWidth;
    const end = (vertical ? r.bottom : r.right) - a.padding - a.borderWidth;
    // The bar grows around an anchor that stays still (start edge, center or end edge), so the
    // pointer is mapped against the unmagnified layout and magnification never feeds back on itself.
    if (a.align === "start") return p - start;
    if (a.align === "end") return p - (end - contentLen);
    return p - ((start + end) / 2 - contentLen / 2);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      updateDrag(e);
      return;
    }
    if (magnify > 1) setPointer(toBaseCoord(e.clientX, e.clientY));
  };

  const setDragState = (next: DragState | null) => {
    const wasActive = !!dragRef.current?.active;
    dragRef.current = next;
    setDrag(next);
    const isActive = !!next?.active;
    if (wasActive !== isActive) onBusyChange?.(isActive);
  };

  const computeDropTarget = (clientX: number, clientY: number, id: string): Pick<DragState, "insertIndex" | "groupTarget"> => {
    const el = localBar.current;
    if (!el) return { insertIndex: null, groupTarget: null };
    const draggedIsItem = slots.some((s) => s.key === id && s.kind === "item");
    const p = vertical ? clientY : clientX;
    let insertIndex = 0;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-pinned-index]"));
    for (const node of nodes) {
      const key = node.dataset.key!;
      const kind = node.dataset.kind;
      const r = node.getBoundingClientRect();
      const s0 = vertical ? r.top : r.left;
      const len = vertical ? r.height : r.width;
      if (key === id) continue;
      if (draggedIsItem && onGroup && (kind === "item" || kind === "group") && p > s0 + len * 0.3 && p < s0 + len * 0.7) {
        return { insertIndex: null, groupTarget: key };
      }
      if (p > s0 + len / 2) insertIndex++;
    }
    return { insertIndex, groupTarget: null };
  };

  const updateDrag = (e: React.PointerEvent) => {
    const d = dragRef.current!;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const active = d.active || Math.hypot(dx, dy) > 6;
    const target = active ? computeDropTarget(e.clientX, e.clientY, d.id) : { insertIndex: null, groupTarget: null };
    setDragState({ ...d, dx, dy, active, ...target });
  };

  const handlePointerDown = (slot: DockSlot, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (!isPinnedSlot(slot) || !onMove) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({ id: slot.key, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, active: false, insertIndex: null, groupTarget: null });
  };

  const handlePointerUp = (slot: DockSlot, e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d && d.pointerId === e.pointerId) {
      setDragState(null);
      if (d.active) {
        if (d.groupTarget) onGroup?.(d.id, d.groupTarget);
        else if (d.insertIndex !== null) onMove?.(d.id, d.insertIndex);
        return;
      }
    }
    if (e.button === 0 || e.button === 1) {
      if (slot.kind === "separator") return;
      onActivate?.(slot, { middle: e.button === 1, shift: e.shiftKey, element: e.currentTarget as HTMLElement });
    }
  };

  const edgeShift = a.offset + a.iconSize + a.padding * 2 + 16;
  const hideTransform = hidden
    ? a.edge === "bottom"
      ? `translateY(${edgeShift}px)`
      : a.edge === "top"
      ? `translateY(-${edgeShift}px)`
      : a.edge === "left"
      ? `translateX(-${edgeShift}px)`
      : `translateX(${edgeShift}px)`
    : "none";

  const outerSide = a.edge; // icons grow away from this side
  const hoverTint = contrastText(a.bgColor, a.bgOpacity);
  const indicatorGap = Math.max(2, (a.padding + 4) / 2 - 1);

  const style: React.CSSProperties = {
    ...dockBarBackground(a, nativeGlass),
    display: "flex",
    flexDirection: vertical ? "column" : "row",
    alignItems: "center",
    justifyContent: a.length === "full" ? (a.align === "start" ? "flex-start" : a.align === "end" ? "flex-end" : "center") : "center",
    gap: a.spacing,
    padding: vertical ? `${a.padding}px ${a.padding + (a.indicator === "none" ? 0 : 2)}px` : `${a.padding + (a.indicator === "none" ? 0 : 2)}px ${a.padding}px`,
    transform: hideTransform,
    opacity: hidden ? 0 : 1,
    transition: `transform ${ms(260)}ms cubic-bezier(.2,.8,.2,1), opacity ${ms(200)}ms ease`,
    boxSizing: "border-box",
    ...(a.length === "full" ? (vertical ? { height: "100%" } : { width: "100%" }) : {}),
    [vertical ? "width" : "height"]: a.iconSize + a.padding * 2 + (a.indicator === "none" ? 0 : 4),
    position: "relative",
    touchAction: "none",
  };

  let pinnedIndex = -1;

  return (
    <div
      ref={setBarRef}
      style={style}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        if (!dragRef.current?.active) {
          setPointer(null);
          setHovered(null);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onContext?.({ kind: "bar" }, e);
      }}
    >
      {slots.map((slot, i) => {
        const scale = scales[i];
        const isPinned = isPinnedSlot(slot);
        if (isPinned) pinnedIndex++;
        const dragging = drag?.active && drag.id === slot.key;
        const groupHover = drag?.active && drag.groupTarget === slot.key;
        const showInsertBefore = drag?.active && drag.insertIndex !== null && isPinned && insertionBefore(slots, drag, slot.key);
        const insertAtEnd = drag?.active && drag.insertIndex !== null && i === firstPinned + pinnedCount - 1 && drag.insertIndex >= pinnedCount - 1 && drag.id !== slot.key;

        if (slot.kind === "separator") {
          return (
            <div
              key={slot.key}
              data-pinned-index={isPinned ? pinnedIndex : undefined}
              data-key={slot.key}
              data-kind="separator"
              onPointerDown={(e) => handlePointerDown(slot, e)}
              onPointerUp={(e) => handlePointerUp(slot, e)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (isPinned) onContext?.({ kind: "separator", id: slot.key }, e);
              }}
              style={{
                flex: "none",
                [vertical ? "height" : "width"]: SEPARATOR,
                [vertical ? "width" : "height"]: a.iconSize * 0.7,
                borderRadius: 2,
                background: hexToRgba(a.borderColor, Math.max(0.25, a.borderOpacity)),
                opacity: dragging ? 0.4 : 1,
                cursor: isPinned ? "grab" : "default",
                position: "relative",
                transform: dragging ? `translate(${drag!.dx}px, ${drag!.dy}px)` : undefined,
              }}
            >
              {showInsertBefore && <InsertMarker vertical={vertical} color={a.indicatorColor} spacing={a.spacing} />}
            </div>
          );
        }

        const size = a.iconSize * scale;
        const slotWindows = slot.kind === "start" || slot.kind === "tray" || slot.kind === "shell" ? [] : slot.windows;
        const running = slotWindows.length > 0;
        const focused = slotWindows.some((w) => w.focused && !w.minimized);
        const bounce = slot.kind === "item" && bouncing?.has(slot.item.id);
        const label = slotLabel(slot);
        const isHovered = hovered === slot.key && !drag?.active;

        return (
          <div
            key={slot.key}
            data-pinned-index={isPinned ? pinnedIndex : undefined}
            data-key={slot.key}
            data-kind={slot.kind}
            onPointerEnter={() => setHovered(slot.key)}
            onPointerDown={(e) => handlePointerDown(slot, e)}
            onPointerUp={(e) => handlePointerUp(slot, e)}
            onAuxClick={(e) => e.preventDefault()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (slot.kind === "item") onContext?.({ kind: "item", item: slot.item, windows: slot.windows }, e);
              else if (slot.kind === "group") onContext?.({ kind: "group", group: slot.group, windows: slot.windows }, e);
              else if (slot.kind === "start") onContext?.({ kind: "start" }, e);
              else if (slot.kind === "tray") onContext?.({ kind: "tray" }, e);
              else if (slot.kind === "shell") onContext?.({ kind: "shell", action: slot.action }, e);
              else onContext?.({ kind: "running", exe: slot.exe, windows: slot.windows }, e);
            }}
            style={{
              flex: "none",
              position: "relative",
              [vertical ? "height" : "width"]: size,
              [vertical ? "width" : "height"]: a.iconSize,
              transition: pointer === null ? `width ${ms(180)}ms ease, height ${ms(180)}ms ease` : `width ${ms(60)}ms linear, height ${ms(60)}ms linear`,
              cursor: "pointer",
              zIndex: dragging ? 5 : isHovered ? 3 : 1,
              transform: dragging ? `translate(${drag!.dx}px, ${drag!.dy}px)` : undefined,
            }}
          >
            {showInsertBefore && <InsertMarker vertical={vertical} color={a.indicatorColor} spacing={a.spacing} />}
            {insertAtEnd && <InsertMarker vertical={vertical} color={a.indicatorColor} spacing={a.spacing} end />}

            {magnify <= 1 && (isHovered || focused) && (
              <div
                className="pointer-events-none absolute"
                style={{ inset: -Math.max(2, Math.round(a.padding * 0.5)), borderRadius: Math.min(a.radius, 8), background: hexToRgba(hoverTint, focused ? 0.14 : 0.1) }}
              />
            )}

            <div
              className={bounce ? (vertical ? "dock-bounce-x" : "dock-bounce-y") : ""}
              style={{
                position: "absolute",
                [outerSide]: 0,
                ...(vertical ? { top: "50%", marginTop: -size / 2 } : { left: "50%", marginLeft: -size / 2 }),
                width: size,
                height: size,
                transition: pointer === null ? `all ${ms(180)}ms ease` : `all ${ms(60)}ms linear`,
                filter: groupHover ? `drop-shadow(0 0 10px ${a.indicatorColor})` : isHovered && magnify <= 1 ? "brightness(1.12)" : undefined,
                opacity: slot.kind === "item" && slot.item.kind === "missing" ? 0.45 : dragging ? 0.85 : 1,
                ["--dock-bounce-dir" as any]: a.edge === "bottom" || a.edge === "right" ? "-1" : "1",
                animationDuration: `${ms(900) || 1}ms`,
              }}
            >
              {slot.kind === "group" ? (
                <GroupIcon group={slot.group} size={size} radius={a.radius} active={activeGroupId === slot.group.id} ring={a.indicatorColor} />
              ) : slot.kind === "item" ? (
                <DockIcon path={slot.item.path} customIcon={slot.item.customIcon} kind={slot.item.kind} size={size} />
              ) : slot.kind === "start" ? (
                a.startIcon === "launchpad" ? (
                  <LaunchpadIcon size={size} />
                ) : a.startIcon === "win11" ? (
                  <Win11Logo size={size} />
                ) : (
                  <StartIcon size={size} radius={a.radius} accent={a.indicatorColor} />
                )
              ) : slot.kind === "shell" ? (
                <ShellButtonIcon action={slot.action} size={size} color={hoverTint} mac={a.startIcon === "launchpad"} />
              ) : slot.kind === "tray" ? (
                <TrayClockIcon size={size} mac={a.startIcon === "launchpad"} accent={a.indicatorColor} />
              ) : (
                <DockIcon path={slot.exe.startsWith("pid:") ? null : slot.exe} size={size} />
              )}
            </div>

            {running && a.indicator !== "none" && (
              <Indicator a={a} vertical={vertical} focused={focused} count={slotWindows.length} gap={indicatorGap} ms={ms(200)} />
            )}

            {a.showLabels && isHovered && label && (
              <div
                className="pointer-events-none absolute whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-semibold text-white shadow-lg"
                style={{
                  background: "rgba(20,18,32,0.88)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  maxWidth: 260,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  ...(a.edge === "bottom"
                    ? { bottom: size + 10, left: "50%", transform: "translateX(-50%)" }
                    : a.edge === "top"
                    ? { top: size + 10, left: "50%", transform: "translateX(-50%)" }
                    : a.edge === "left"
                    ? { left: size + 10, top: "50%", transform: "translateY(-50%)" }
                    : { right: size + 10, top: "50%", transform: "translateY(-50%)" }),
                }}
              >
                {label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** True when the insertion point (index among pinned entries, excluding the dragged one) sits right before `key`. */
function insertionBefore(slots: DockSlot[], drag: DragState, key: string): boolean {
  if (key === drag.id) return false;
  const pinned = slots.filter((s) => isPinnedSlot(s) && s.key !== drag.id);
  return pinned[drag.insertIndex!]?.key === key;
}

const InsertMarker: React.FC<{ vertical: boolean; color: string; spacing: number; end?: boolean }> = ({ vertical, color, spacing, end }) => (
  <div
    className="pointer-events-none absolute rounded-full"
    style={{
      background: color,
      boxShadow: `0 0 8px ${color}`,
      ...(vertical
        ? { left: "10%", right: "10%", height: 3, [end ? "bottom" : "top"]: -(spacing / 2) - 1.5 }
        : { top: "10%", bottom: "10%", width: 3, [end ? "right" : "left"]: -(spacing / 2) - 1.5 }),
    }}
  />
);

const Indicator: React.FC<{ a: DockAppearance; vertical: boolean; focused: boolean; count: number; gap: number; ms: number }> = ({
  a,
  vertical,
  focused,
  count,
  gap,
  ms,
}) => {
  const color = a.indicatorColor;
  const along = a.indicator === "bar" ? (focused ? 22 : 12) : a.indicator === "glow" ? (focused ? 26 : 16) : 5;
  const across = a.indicator === "dot" ? 5 : 3;
  const base: React.CSSProperties = {
    position: "absolute",
    borderRadius: 999,
    background: color,
    opacity: focused ? 1 : 0.7,
    boxShadow: a.indicator === "glow" ? `0 0 8px 2px ${color}` : focused ? `0 0 6px ${color}` : undefined,
    transition: `all ${ms}ms ease`,
    [a.edge]: -gap - across / 2,
    ...(vertical
      ? { width: across, height: along, top: "50%", marginTop: -along / 2 }
      : { height: across, width: along, left: "50%", marginLeft: -along / 2 }),
  };
  if (a.indicator === "dot" && count > 1) {
    return (
      <>
        <div style={{ ...base, ...(vertical ? { marginTop: -along / 2 - 4 } : { marginLeft: -along / 2 - 4 }) }} />
        <div style={{ ...base, ...(vertical ? { marginTop: -along / 2 + 4 } : { marginLeft: -along / 2 + 4 }) }} />
      </>
    );
  }
  return <div style={base} />;
};

/** Windows-logo tile for the Start button, tinted with the dock's accent color. */
const StartIcon: React.FC<{ size: number; radius: number; accent: string }> = ({ size, radius, accent }) => {
  const pane = size * 0.2;
  const gap = size * 0.05;
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: Math.min(radius, size * 0.28),
        background: `linear-gradient(145deg, ${hexToRgba(accent, 0.95)}, ${hexToRgba(accent, 0.55)})`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 8px ${hexToRgba(accent, 0.35)}`,
      }}
    >
      <div className="grid grid-cols-2" style={{ gap }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ width: pane, height: pane, borderRadius: pane * 0.18, background: "rgba(255,255,255,0.95)" }} />
        ))}
      </div>
    </div>
  );
};

/** Plain Windows 11 Start logo (four blue panes, no tile), like the native taskbar. */
const Win11Logo: React.FC<{ size: number }> = ({ size }) => {
  const pane = size * 0.3;
  const gap = size * 0.04;
  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="grid grid-cols-2" style={{ gap }}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              width: pane,
              height: pane,
              borderRadius: pane * 0.08,
              background: i < 2 ? "linear-gradient(160deg, #3ccbff, #1e90ff)" : "linear-gradient(160deg, #1e9bff, #0a64e0)",
            }}
          />
        ))}
      </div>
    </div>
  );
};

const SHELL_PATHS: Record<DockShellButton, React.ReactNode> = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </>
  ),
  taskview: (
    <>
      <rect x="3" y="5" width="12" height="10" rx="2" />
      <path d="M8 19h11a2 2 0 002-2V9" />
    </>
  ),
  widgets: (
    <>
      <rect x="3.5" y="3.5" width="7" height="9" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="2" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="2" />
    </>
  ),
  explorer: (
    <>
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M3 10h18" />
    </>
  ),
  desktop: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </>
  ),
};

/** Line icon for a system button, drawn in the theme's text color (plain like Windows 11, on a tile for macOS). */
export const ShellButtonIcon: React.FC<{ action: DockShellButton; size: number; color: string; mac?: boolean }> = ({ action, size, color, mac }) => (
  <div
    className="flex items-center justify-center"
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.225,
      ...(mac
        ? { background: "linear-gradient(180deg, #5a5a60 0%, #2c2c30 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.3)" }
        : {}),
    }}
  >
    <svg
      width={size * (mac ? 0.55 : 0.62)}
      height={size * (mac ? 0.55 : 0.62)}
      viewBox="0 0 24 24"
      fill="none"
      stroke={mac ? "#ffffff" : color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SHELL_PATHS[action]}
    </svg>
  </div>
);

const LAUNCHPAD_COLORS = ["#ff453a", "#ff9f0a", "#ffd60a", "#32d74b", "#64d2ff", "#0a84ff", "#5e5ce6", "#bf5af2", "#ff375f"];

/** macOS Launchpad-style tile (grid of colorful squares on a squircle) for the Start button. */
const LaunchpadIcon: React.FC<{ size: number }> = ({ size }) => {
  const cell = size * 0.15;
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.225,
        background: "linear-gradient(180deg, #5a5a60 0%, #2c2c30 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.35)",
      }}
    >
      <div className="grid grid-cols-3" style={{ gap: size * 0.06 }}>
        {LAUNCHPAD_COLORS.map((c) => (
          <span
            key={c}
            style={{ width: cell, height: cell, borderRadius: cell * 0.3, background: `linear-gradient(180deg, ${c}, ${hexToRgba(c, 0.75)})`, boxShadow: "0 0.5px 1px rgba(0,0,0,0.4)" }}
          />
        ))}
      </div>
    </div>
  );
};

function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: number;
    const tick = () => {
      setNow(new Date());
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/** Tile with the real local time; clicking it shows the native taskbar tray. */
const TrayClockIcon: React.FC<{ size: number; mac: boolean; accent: string }> = ({ size, mac, accent }) => {
  const now = useClock();
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const day = now.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return (
    <div
      className="flex flex-col items-center justify-center leading-none text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.225,
        background: mac ? "linear-gradient(180deg, #4a4a50 0%, #1f1f23 100%)" : `linear-gradient(145deg, ${hexToRgba(accent, 0.9)}, ${hexToRgba(accent, 0.5)})`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.3)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ fontSize: size * 0.16, opacity: 0.75, textTransform: "uppercase", letterSpacing: 0.5 }}>{day}</span>
      <span style={{ fontSize: size * 0.27, fontWeight: 700, marginTop: size * 0.04 }}>{time}</span>
      <span className="flex gap-[2px]" style={{ marginTop: size * 0.07 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: size * 0.06, height: size * 0.06, borderRadius: 999, background: "rgba(255,255,255,0.7)" }} />
        ))}
      </span>
    </div>
  );
};

const GroupIcon: React.FC<{ group: DockGroup; size: number; radius: number; active: boolean; ring: string }> = ({ group, size, radius, active, ring }) => {
  const mini = size * 0.36;
  return (
    <div
      className="grid grid-cols-2 place-items-center"
      style={{
        width: size,
        height: size,
        padding: size * 0.1,
        gap: size * 0.04,
        borderRadius: Math.min(radius, size * 0.3),
        background: "rgba(255,255,255,0.16)",
        border: `1px solid ${active ? ring : "rgba(255,255,255,0.25)"}`,
        boxShadow: active ? `0 0 10px ${ring}` : "inset 0 1px 0 rgba(255,255,255,0.3)",
        boxSizing: "border-box",
      }}
    >
      {group.items.slice(0, 4).map((it) => (
        <DockIcon key={it.id} path={it.path} customIcon={it.customIcon} kind={it.kind} size={mini} />
      ))}
    </div>
  );
};
