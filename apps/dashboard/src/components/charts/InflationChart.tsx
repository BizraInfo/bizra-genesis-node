/**
 * Inflation Chart Component
 * Visualizes the comparison between BIZRA stability and fiat currency decay
 */

import React, { useEffect, useRef } from 'react';
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

const InflationChart: React.FC = () => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const data = {
    labels: ['1971', '1980', '1990', '2000', '2010', '2020', '2025'],
    datasets: [
      {
        label: 'BIZRA Value Index',
        data: [100, 102, 105, 108, 112, 115, 120],
        borderColor: BRAND.colors.gold[500],
        backgroundColor: `rgba(201, 169, 98, 0.2)`,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: BRAND.colors.navy[900],
        pointBorderColor: BRAND.colors.gold[500],
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Fiat Purchasing Power',
        data: [100, 48, 26, 19, 15, 12, 8],
        borderColor: BRAND.colors.teal[500],
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
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
        display: true,
        position: 'top' as const,
        labels: {
          color: BRAND.colors.text.secondary,
          font: {
            family: BRAND.fonts.sans,
            size: 12,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: BRAND.colors.navy[800],
        titleColor: BRAND.colors.gold[500],
        bodyColor: BRAND.colors.text.primary,
        borderColor: BRAND.colors.gold[500],
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
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
          callback: (value: any) => `${value}%`,
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
            size: 11,
          },
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
      duration: 2000,
      easing: 'easeInOutQuart' as const,
    },
  };

  return (
    <div className="w-full h-full">
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
};

export default InflationChart;