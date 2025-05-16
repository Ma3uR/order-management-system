import { CloudRain } from "lucide-react";

type WeatherProps = {
    temperature: number;
    weather: string;
    location: string;
  };
  
  export const Weather = ({ temperature, weather, location }: WeatherProps) => {
    return (
      <div className="bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg p-4 text-white">
        <div className="flex items-center gap-3">
          <CloudRain className="h-8 w-8" />
          <div>
            <h3 className="font-semibold">{location}</h3>
            <div className="text-2xl font-bold">{temperature}°C</div>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-sm">{weather}</div>
        </div>
      </div>
    );
  };