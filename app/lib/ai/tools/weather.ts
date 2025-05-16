import { z } from 'zod';
import { ToolDefinition, WeatherResponse } from './types';

export const displayWeather: ToolDefinition<{ city: string }, WeatherResponse> = {
  description: 'Display current weather conditions for a specific city. Use this tool EVERY TIME a user asks about weather for any location. This is required for showing visual weather information.',
  parameters: z.object({ 
    city: z.string().describe('The name of the city to get weather for, e.g., "London", "New York", "Tokyo"')
  }),
  execute: async ({ city }: { city: string }): Promise<WeatherResponse> => {
    console.log(`Getting weather for city: ${city}`);
    const weatherOptions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
    const weather = weatherOptions[
      Math.floor(Math.random() * weatherOptions.length)
    ];
    
    // Return a structured object for the Weather component
    const response: WeatherResponse = {
      city,
      temperature: Math.floor(15 + Math.random() * 15), // Random temp between 15-30
      condition: weather,
      humidity: Math.floor(40 + Math.random() * 40), // Random humidity between 40-80%
      windSpeed: Math.floor(5 + Math.random() * 15), // Random wind speed between 5-20 km/h
    };
    
    console.log("Weather tool response:", JSON.stringify(response));
    return response;
  },
}; 