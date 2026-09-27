import { dockService, isTauriRuntime } from "./dockService";
import { useDockStore } from "./store/dockStore";

/** A centered horizontal dock keeps the Windows Start menu centered (it follows the taskbar alignment). */
export function startCentered(): boolean {
  const a = useDockStore.getState().appearance;
  return a.align === "center" && (a.edge === "bottom" || a.edge === "top");
}

/** Called once by the main window after start-up. */
export async function startDockOnLaunch(): Promise<void> {
  if (!isTauriRuntime()) return;
  const s = useDockStore.getState();
  if (s.enabled && s.behavior.startWithApp) {
    await dockService.openWindow().catch(() => {});
  }
  // The native taskbar is always restored when the app closes; re-apply the user's choice.
  if (s.taskbarMode.enabled) {
    await dockService.taskbarApply(s.taskbarMode.autohide, s.taskbarMode.hide, startCentered()).catch(() => {});
  }
}

export async function setDockEnabled(enabled: boolean): Promise<void> {
  useDockStore.getState().setEnabled(enabled);
  if (enabled) await dockService.openWindow();
  else await dockService.closeWindow();
}
