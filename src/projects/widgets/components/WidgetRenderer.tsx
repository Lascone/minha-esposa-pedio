import React from "react";
import { WidgetInstance } from "../types";
import { WidgetContainer } from "./WidgetContainer";
import { AnalogClockWidget } from "./AnalogClockWidget";
import { DigitalClockWidget } from "./DigitalClockWidget";
import { CalendarWidget } from "./CalendarWidget";
import { WeatherWidget } from "./WeatherWidget";
import { StickyNotesWidget } from "./StickyNotesWidget";
import { ShortcutsWidget } from "./ShortcutsWidget";
import { CpuMeterWidget } from "./CpuMeterWidget";
import { RamMeterWidget } from "./RamMeterWidget";
import { StorageMeterWidget } from "./StorageMeterWidget";
import { BatteryMeterWidget } from "./BatteryMeterWidget";
import { PomodoroWidget } from "./PomodoroWidget";
import { CountdownWidget } from "./CountdownWidget";
import { LoveQuotesWidget } from "./LoveQuotesWidget";
import { PhotoFrameWidget } from "./PhotoFrameWidget";
import { WorldClockWidget } from "./WorldClockWidget";
import { VolumeMeterWidget } from "./VolumeMeterWidget";
import { useCustomWidgetsStore } from "../custom/customWidgetsStore";
import { WidgetSandbox } from "../custom/WidgetSandbox";
import { useWidgetsStore } from "../store/widgetsStore";

interface WidgetRendererProps {
  widget: WidgetInstance;
  onOpenSettings?: () => void;
  isDesktopPreview?: boolean;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  onOpenSettings,
  isDesktopPreview = false,
}) => {
  const { packages } = useCustomWidgetsStore();
  const { updateWidgetSettings, updateWidgetSize } = useWidgetsStore();

  const customPkg = packages.find((p) => p.manifest.id === widget.type);

  const renderInner = () => {
    if (customPkg) {
      return (
        <WidgetSandbox
          pkg={customPkg}
          theme={widget.theme}
          initialConfig={widget.settings}
          onConfigChange={(key, value) => {
            updateWidgetSettings(widget.id, {
              [key]: value,
            });
          }}
          onRequestResize={(w, h) => {
            updateWidgetSize(widget.id, w, h);
          }}
        />
      );
    }

    switch (widget.type) {
      case "analog-clock":
        return <AnalogClockWidget widget={widget} />;
      case "digital-clock":
        return <DigitalClockWidget widget={widget} />;
      case "calendar":
        return <CalendarWidget widget={widget} />;
      case "weather":
        return <WeatherWidget widget={widget} />;
      case "sticky-notes":
        return <StickyNotesWidget widget={widget} />;
      case "shortcuts":
        return <ShortcutsWidget widget={widget} />;
      case "cpu-meter":
        return <CpuMeterWidget widget={widget} />;
      case "ram-meter":
        return <RamMeterWidget widget={widget} />;
      case "storage-meter":
        return <StorageMeterWidget widget={widget} />;
      case "battery-meter":
        return <BatteryMeterWidget widget={widget} />;
      case "pomodoro":
        return <PomodoroWidget widget={widget} />;
      case "countdown":
        return <CountdownWidget widget={widget} />;
      case "love-quotes":
        return <LoveQuotesWidget widget={widget} />;
      case "photo-frame":
        return <PhotoFrameWidget widget={widget} />;
      case "world-clock":
        return <WorldClockWidget widget={widget} />;
      case "volume-meter":
        return <VolumeMeterWidget widget={widget} />;
      default:
        return (
          <div className="text-xs text-slate-400 p-4 text-center">
            Widget Personalizado ou não reconhecido ({widget.type})
          </div>
        );
    }
  };

  return (
    <WidgetContainer
      widget={widget}
      onOpenSettings={onOpenSettings}
      isDesktopPreview={isDesktopPreview}
    >
      {renderInner()}
    </WidgetContainer>
  );
};
