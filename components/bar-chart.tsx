'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip
);

interface BarChartProps {
  data: number[];
  labels: string[];
  className?: string;
}

export function BarChart({ data, labels, className }: BarChartProps) {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: '#4B6BFB',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className={className}>
      <Bar options={options} data={chartData} />
    </div>
  );
} 