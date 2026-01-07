"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Label,
} from "recharts";
import { TrendingUp, PieChartIcon, Activity } from "lucide-react";

interface TaskTrendDataPoint {
  date: string;
  completed: number;
  created: number;
}

interface TaskStatusDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface PerformanceDataPoint {
  metric: string;
  value: number;
}

interface DashboardChartsProps {
  taskTrendData: TaskTrendDataPoint[];
  taskStatusData: TaskStatusDataPoint[];
  performanceData: PerformanceDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-white dark:bg-gray-800 p-3 shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-white dark:bg-gray-800 p-3 shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">
          {payload[0].name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show label if too small

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="font-semibold text-sm"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function DashboardCharts({
  taskTrendData,
  taskStatusData,
  performanceData,
}: DashboardChartsProps) {
  return (
    <>
      {/* Area Chart - Task Trends - Compact */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base text-gray-900 dark:text-white">Task Trends</CardTitle>
              <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                Last 7 days activity
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={taskTrendData}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={{ stroke: "#e5e7eb" }}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompleted)"
                name="Completed"
              />
              <Area
                type="monotone"
                dataKey="created"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCreated)"
                name="Created"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart - Task Status Distribution - Compact */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-800 dark:to-purple-900/10 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <PieChartIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base text-gray-900 dark:text-white">Task Status</CardTitle>
              <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                Distribution overview
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={taskStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={70}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
              >
                {taskStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={24}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value, entry: any) => (
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {value} ({entry.payload.value})
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Radar Chart - Performance Metrics - Compact - Full Width */}
      <Card className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-800 dark:to-emerald-900/10 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base text-gray-900 dark:text-white">Performance Overview</CardTitle>
              <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                Multi-dimensional analysis
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={performanceData}>
              <PolarGrid stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#9ca3af", fontSize: 10 }}
              />
              <Radar
                name="Performance"
                dataKey="value"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                strokeWidth={2}
                dot={{
                  r: 4,
                  fill: "#10b981",
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
                activeDot={{
                  r: 6,
                  fill: "#059669",
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-white dark:bg-gray-800 p-2 shadow-lg">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {payload[0].payload.metric}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Score: {payload[0].value.toFixed(1)}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
                iconType="circle"
                iconSize={8}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}

