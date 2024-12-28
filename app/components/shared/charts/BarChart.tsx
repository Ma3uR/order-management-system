'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Scale,
  CoreScaleOptions,
} from 'chart.js';
import { useTheme } from 'next-themes';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: number[];
  labels: string[];
  className?: string;
  colors?: {
    bar: string;
    background: string;
    text: string;
    grid: string;
  };
}

export function BarChart({ data, labels, className }: BarChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? '#374151' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#000000',
        bodyColor: isDark ? '#ffffff' : '#000000',
        borderColor: isDark ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: { parsed: { y: number } }) => `${context.parsed.y.toLocaleString()} ₴`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          font: {
            size: 12,
          },
          callback: function(this: Scale<CoreScaleOptions>, tickValue: string | number) {
            return typeof tickValue === 'number' ? tickValue.toLocaleString() : tickValue;
          },
        },
      },
      y: {
        border: {
          display: false,
        },
        grid: {
          color: isDark ? '#374151' : '#E5E7EB',
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          font: {
            size: 12,
          },
          callback: function(this: Scale<CoreScaleOptions>, tickValue: string | number) {
            return typeof tickValue === 'number' ? tickValue.toLocaleString() : tickValue;
          },
        },
      },
    },
  };

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: isDark ? '#4B6BFB' : '#3B82F6',
        hoverBackgroundColor: isDark ? '#6D8DFF' : '#60A5FA',
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 12,
      },
    ],
  };

  return (
    <div className={className}>
      <Bar options={options} data={chartData} />
    </div>
  );
} 