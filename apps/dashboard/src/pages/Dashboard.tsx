// BIZRA Genesis Node - Main Dashboard
// Elite-grade AI Model Integration Dashboard

import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
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
import {
  Activity,
  Zap,
  DollarSign,
  TrendingUp,
  Bot,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import api, { ModelMetrics, ThompsonSamplingStats, CostMetrics } from '../services/api';

// Register Chart.js components
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

export default function Dashboard() {
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics[]>([]);
  const [thompsonStats, setThompsonStats] = useState<ThompsonSamplingStats[]>([]);
  const [costMetrics, setCostMetrics] = useState<CostMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [metrics, thompson, costs] = await Promise.all([
        api.getModelMetrics(),
        api.getThompsonSamplingStats(),
        api.getCostMetrics(),
      ]);

      setModelMetrics(metrics);
      setThompsonStats(thompson);
      setCostMetrics(costs);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate summary stats
  const totalRequests = modelMetrics.reduce((sum, m) => sum + m.total_requests, 0);
  const avgSuccessRate = modelMetrics.length > 0
    ? modelMetrics.reduce((sum, m) => sum + m.success_rate, 0) / modelMetrics.length
    : 0;
  const avgLatency = modelMetrics.length > 0
    ? modelMetrics.reduce((sum, m) => sum + m.avg_latency_ms, 0) / modelMetrics.length
    : 0;

  // Thompson Sampling chart data
  const thompsonChartData = {
    labels: thompsonStats.map(s => s.model_id),
    datasets: [
      {
        label: 'Success Rate',
        data: thompsonStats.map(s => s.success_rate * 100),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      },
      {
        label: 'Confidence Interval (Lower)',
        data: thompsonStats.map(s => s.confidence_interval[0] * 100),
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderDash: [5, 5],
        fill: false,
      },
      {
        label: 'Confidence Interval (Upper)',
        data: thompsonStats.map(s => s.confidence_interval[1] * 100),
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderDash: [5, 5],
        fill: false,
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Model Dashboard</h1>
        <p className="text-gray-600 mt-1">Real-time performance and cost tracking</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={loadDashboardData}
              className="text-sm text-red-600 hover:text-red-700 underline mt-1"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalRequests.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{(avgSuccessRate * 100).toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Latency</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{Math.round(avgLatency)}ms</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${costMetrics?.total_cost_usd.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Thompson Sampling Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Thompson Sampling - Model Success Rates
        </h2>
        {thompsonStats.length > 0 ? (
          <Line
            data={thompsonChartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' as const },
                title: { display: false },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  ticks: {
                    callback: (value) => `${value}%`,
                  },
                },
              },
            }}
          />
        ) : (
          <p className="text-gray-500 text-center py-8">No Thompson Sampling data available</p>
        )}
      </div>

      {/* Model Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Model Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Latency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelMetrics.map((model) => (
                <tr key={model.model_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Bot className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{model.model_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {model.provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {model.total_requests.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      model.success_rate >= 0.9
                        ? 'bg-green-100 text-green-800'
                        : model.success_rate >= 0.7
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(model.success_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.round(model.avg_latency_ms)}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${model.avg_cost_usd.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(model.avg_quality * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {modelMetrics.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No model data available yet</p>
              <p className="text-sm text-gray-400 mt-1">Start making requests to see metrics</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
