/**
 * Adoption Chart Component
 * Line chart showing projected global adoption using Fibonacci/golden ratio modeling
 */

import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScriptableContext,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { BRAND } from '../../constants/brand';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdoptionChart: React.FC = () => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Generate Fibonacci-like growth data (golden ratio based)
  const generateFibonacciGrowth = (years: number) => {
    const data = [];
    for (let i = 0; i < years; i++) {
      // Using golden ratio (φ ≈ 1.618) for exponential growth
      const value = Math.pow(1.618, i) * 100000;
      data.push(Math.round(value));
    }
    return data;
  };

  const years = Array.from({ length: 20 }, (_, i) => (2024 + i).toString());
  const userData = generateFibonacciGrowth(20);

  const data = {
    labels: years,
    datasets: [
      {
        label: 'Projected Users',
        data: userData,
        borderColor: BRAND.colors.gold[500],
        backgroundColor: (context: ScriptableContext<'line'>) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, `rgba(201, 169, 98, 0.3)`);
          gradient.addColorStop(1, `rgba(201, 169, 98, 0.05)`);
          return gradient;
        },
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: BRAND.colors.gold[500],
        pointBorderColor: BRAND.colors.navy[900],
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: false, // Hide legend for cleaner look
      },
      tooltip: {
        backgroundColor: BRAND.colors.navy[800],
        titleColor: BRAND.colors.gold[500],
        bodyColor: BRAND.colors.text.primary,
        borderColor: BRAND.colors.gold[500],
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: TooltipItem<'line'>[]) => `Year: ${context[0].label}`,
          label: (context: TooltipItem<'line'>) => {
            const value = context.parsed.y;
            return `Projected Users: ${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: BRAND.colors.text.muted,
          font: {
            family: BRAND.fonts.mono,
            size: 11,
          },
          callback: (value: string | number) => {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (numValue >= 1000000) {
              return `${(numValue / 1000000).toFixed(1)}M`;
            } else if (numValue >= 1000) {
              return `${(numValue / 1000).toFixed(0)}K`;
            }
            return numValue.toString();
          },
        },
        border: {
          display: false,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: BRAND.colors.text.muted,
          font: {
            family: BRAND.fonts.mono,
            size: 10,
          },
          maxTicksLimit: 10,
        },
        border: {
          display: false,
        },
      },
    },
    elements: {
      point: {
        hoverBorderWidth: 3,
      },
    },
    animation: {
      duration: 3000,
      easing: 'easeInOutQuart' as const,
      delay: (context: ScriptableContext<'line'>) => context.dataIndex * 50, // Stagger animation
    },
  };

  return (
    <div className="w-full h-full">
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
};

export default AdoptionChart;