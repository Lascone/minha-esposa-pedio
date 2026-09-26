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
  const renderInner = () => {
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
      default:
        return (
          <div className="text-xs text-slate-400">
            Widget não reconhecido
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
