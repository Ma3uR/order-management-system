"use client"

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler
);

interface LineChartProps {
  data: number[];
  className?: string;
  strokeColor?: string;
  filled?: boolean;
}

export function LineChart({ data, className, strokeColor = '#4B6BFB', filled = false }: LineChartProps) {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 0,
      },
    },
  };

  const chartData = {
    labels: data.map((_, i) => i.toString()),
    datasets: [
      {
        data: data,
        borderColor: strokeColor,
        backgroundColor: filled ? `${strokeColor}20` : 'transparent',
        fill: filled,
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className={className}>
      <Line options={options} data={chartData} />
    </div>
  );
}

