import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { Image, Upload, Edit2, Check } from "lucide-react";
import { useWidgetsStore } from "../store/widgetsStore";

interface PhotoFrameWidgetProps {
  widget: WidgetInstance;
}

const DEFAULT_SAMPLE_PHOTO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 240' width='300' height='240'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23f472b6'/><stop offset='50%' stop-color='%23fb7185'/><stop offset='100%' stop-color='%23c084fc'/></linearGradient></defs><rect width='300' height='240' fill='url(%23g)'/><circle cx='150' cy='100' r='45' fill='rgba(255,255,255,0.3)'/><path d='M150 70 C140 50, 110 50, 110 80 C110 110, 150 135, 150 140 C150 135, 190 110, 190 80 C190 50, 160 50, 150 70 Z' fill='white'/><text x='150' y='180' text-anchor='middle' fill='white' font-family='sans-serif' font-size='16' font-weight='bold'>Nosso Momento Especial</text></svg>";

export const PhotoFrameWidget: React.FC<PhotoFrameWidgetProps> = ({ widget }) => {
  const { updateWidgetSettings } = useWidgetsStore();

  const photoUrl = widget.settings?.photoUrl || DEFAULT_SAMPLE_PHOTO;
  const caption = widget.settings?.caption || "Você é perfeita ❤️";

  const [isEditing, setIsEditing] = useState(false);
  const [tempCaption, setTempCaption] = useState(caption);
  const [tempUrl, setTempUrl] = useState(widget.settings?.photoUrl || "");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 3MB for base64 localStorage storage
    if (file.size > 3 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateWidgetSettings(widget.id, {
        photoUrl: base64,
      });
      setTempUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveConfig = () => {
    updateWidgetSettings(widget.id, {
      caption: tempCaption,
      photoUrl: tempUrl.trim() || photoUrl,
    });
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center justify-between h-full w-full p-2 select-none relative group">
      {/* Decorative Washi Tape on top */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-pink-300/60 dark:bg-pink-500/50 backdrop-blur-sm -rotate-2 rounded-sm shadow-sm border border-pink-200/40 pointer-events-none z-10" />

      {/* Main Polaroid Card */}
      <div className="w-full flex-1 flex flex-col bg-white dark:bg-slate-900/90 rounded-2xl p-2 pb-3 shadow-lg border border-white/40 dark:border-white/10 mt-1 overflow-hidden">
        {/* Photo Container */}
        <div className="w-full flex-1 min-h-[120px] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden relative flex items-center justify-center">
          <img
            src={photoUrl}
            alt={caption}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_SAMPLE_PHOTO;
            }}
          />

          {/* Quick upload overlay */}
          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-semibold cursor-pointer transition-opacity backdrop-blur-[2px]">
            <Upload size={18} className="mb-1 text-pink-300" />
            <span>Trocar foto</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Caption */}
        {isEditing ? (
          <div className="mt-2 flex items-center gap-1">
            <input
              type="text"
              value={tempCaption}
              onChange={(e) => setTempCaption(e.target.value)}
              className="flex-1 text-[11px] bg-black/10 dark:bg-black/40 border border-pink-400/40 rounded px-1.5 py-0.5 text-slate-800 dark:text-white"
              autoFocus
            />
            <button
              onClick={handleSaveConfig}
              className="p-1 rounded bg-pink-500 text-white"
            >
              <Check size={12} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="mt-2 flex items-center justify-center gap-1 text-center cursor-pointer group/caption"
          >
            <span className="text-xs font-bold text-slate-700 dark:text-pink-200 truncate font-serif italic">
              {caption}
            </span>
            <Edit2
              size={10}
              className="opacity-0 group-hover/caption:opacity-100 text-pink-400 transition-opacity"
            />
          </div>
        )}
      </div>
    </div>
  );
};
