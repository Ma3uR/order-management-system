'use client';

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  className?: string;
}

export function DonutChart({ data, className }: DonutChartProps) {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
    cutout: '70%',
  };

  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        data: data.map(item => item.value),
        backgroundColor: data.map(item => item.color),
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className={className}>
      <Doughnut options={options} data={chartData} />
    </div>
  );
} 