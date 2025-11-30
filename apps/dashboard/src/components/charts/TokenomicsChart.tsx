/**
 * Tokenomics Chart Component
 * Polar area chart showing BIZRA token distribution (Flower of Allocation)
 */

import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { PolarArea } from 'react-chartjs-2';
import { BRAND } from '../../constants/brand';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const TokenomicsChart: React.FC = () => {
  const chartRef = useRef<ChartJS<'polarArea'>>(null);

  const data = {
    labels: ['Treasury', 'Community', 'Liquidity', 'Dev Fund', 'Reserve'],
    datasets: [
      {
        data: [40, 35, 25, 15, 10],
        backgroundColor: [
          `rgba(201, 169, 98, 0.8)`,    // Gold - Treasury
          `rgba(42, 157, 143, 0.8)`,    // Teal - Community
          `rgba(255, 255, 255, 0.8)`,   // White - Liquidity
          `rgba(10, 22, 40, 0.8)`,      // Navy - Dev Fund
          `rgba(255, 255, 255, 0.1)`,   // Transparent - Reserve
        ],
        borderColor: BRAND.colors.navy[900],
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverBorderColor: BRAND.colors.gold[500],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend for cleaner flower look
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
            const label = context.label || '';
            const value = context.parsed.r;
            return `${label}: ${value}%`;
          },
        },
      },
    },
    scales: {
      r: {
        display: false, // Hide radial scale for flower appearance
        beginAtZero: true,
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
        angleLines: {
          display: false,
        },
        pointLabels: {
          display: false,
        },
      },
    },
    elements: {
      arc: {
        hoverBorderWidth: 4,
      },
    },
    animation: {
      duration: 2500,
      easing: 'easeInOutQuart' as const,
      animateRotate: true,
      animateScale: true,
    },
    onHover: (event: any, elements: any) => {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
  };

  return (
    <div className="w-full h-full relative">
      <PolarArea ref={chartRef} data={data} options={options} />

      {/* Center decorative element */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-16 h-16 rounded-full border-2 border-gold-500/30 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-gold-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenomicsChart;