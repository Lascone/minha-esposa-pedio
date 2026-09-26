import React, { useEffect, useState } from "react";
import { WidgetInstance } from "../types";
import { Cloud, CloudRain, Sun, CloudLightning, Snowflake, Wind, Droplets, RefreshCw, MapPin } from "lucide-react";
import { useWidgetsStore } from "../store/widgetsStore";

interface WeatherWidgetProps {
  widget: WidgetInstance;
}

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  cityName: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ widget }) => {
  const { updateWidgetSettings } = useWidgetsStore();
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState(widget.settings.city || "São Paulo");

  const city = widget.settings.city || "São Paulo";
  const latitude = widget.settings.latitude ?? -23.5505;
  const longitude = widget.settings.longitude ?? -46.6333;

  const fetchWeather = async (lat: number, lon: number, cityName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
      );
      if (!res.ok) throw new Error("Falha na consulta meteorológica");
      const json = await res.json();
      const current = json.current;

      setData({
        temperature: Math.round(current.temperature_2m),
        apparentTemperature: Math.round(current.apparent_temperature),
        weatherCode: current.weather_code,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        cityName,
      });
    } catch {
      setError("Sem conexão no momento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(latitude, longitude, city);
  }, [latitude, longitude, city]);

  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;

    setLoading(true);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          cityInput.trim()
        )}&count=1&language=pt&format=json`
      );
      const geoData = await geoRes.json();
      if (geoData.results && geoData.results.length > 0) {
        const place = geoData.results[0];
        updateWidgetSettings(widget.id, {
          city: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
        });
        setIsEditingCity(false);
      } else {
        setError("Cidade não encontrada");
      }
    } catch {
      setError("Erro ao buscar localidade");
    } finally {
      setLoading(false);
    }
  };

  // Weather description and icon from WMO weather code
  const getWeatherInfo = (code: number) => {
    if (code === 0) return { label: "Céu Limpo", icon: <Sun size={32} className="text-amber-400" /> };
    if ([1, 2, 3].includes(code)) return { label: "Parcialmente Nublado", icon: <Cloud size={32} className="text-sky-300" /> };
    if ([45, 48].includes(code)) return { label: "Nevoeiro", icon: <Cloud size={32} className="text-slate-400" /> };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
      return { label: "Chuva", icon: <CloudRain size={32} className="text-blue-400" /> };
    if ([71, 73, 75, 77, 85, 86].includes(code))
      return { label: "Neve", icon: <Snowflake size={32} className="text-indigo-200" /> };
    if ([95, 96, 99].includes(code))
      return { label: "Tempestade", icon: <CloudLightning size={32} className="text-purple-400" /> };
    return { label: "Nublado", icon: <Cloud size={32} className="text-sky-300" /> };
  };

  const weatherInfo = data ? getWeatherInfo(data.weatherCode) : null;

  return (
    <div className="flex flex-col justify-between w-full h-full select-none py-1">
      {/* City Header */}
      <div className="flex items-center justify-between">
        {isEditingCity ? (
          <form onSubmit={handleSearchCity} className="flex items-center gap-1 w-full">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Digite a cidade..."
              className="text-xs px-2 py-0.5 rounded bg-white/70 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-pink-400 flex-1 outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="text-[10px] px-2 py-0.5 rounded bg-pink-500 text-white font-bold"
            >
              OK
            </button>
          </form>
        ) : (
          <div
            onClick={() => setIsEditingCity(true)}
            className="flex items-center gap-1 cursor-pointer group"
            title="Clique para alterar cidade"
          >
            <MapPin size={12} className="text-rose-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-pink-500 transition-colors">
              {city}
            </span>
          </div>
        )}

        <button
          onClick={() => fetchWeather(latitude, longitude, city)}
          disabled={loading}
          className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
          title="Atualizar clima agora"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Weather Main Info */}
      {data && !error ? (
        <div className="flex items-center justify-between my-2 px-2">
          <div className="flex flex-col">
            <div className="flex items-start">
              <span className="text-4xl font-extrabold text-slate-800 dark:text-white tracking-tighter">
                {data.temperature}
              </span>
              <span className="text-base font-bold text-pink-500 ml-0.5">°C</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {weatherInfo?.label}
            </span>
          </div>

          <div className="flex flex-col items-center">
            {weatherInfo?.icon}
            <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">
              Sensação: {data.apparentTemperature}°C
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <Cloud size={24} className="text-slate-400 mb-1" />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{error}</span>
          <button
            onClick={() => fetchWeather(latitude, longitude, city)}
            className="text-[10px] text-pink-500 hover:underline mt-1 font-bold"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-6 text-xs text-slate-400">
          Carregando previsão...
        </div>
      )}

      {/* Bottom Telemetry: Umidade e Vento */}
      {data && (
        <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/10 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Droplets size={10} className="text-blue-400" />
            <span>Umidade: {data.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind size={10} className="text-teal-400" />
            <span>Vento: {data.windSpeed} km/h</span>
          </div>
        </div>
      )}
    </div>
  );
};
