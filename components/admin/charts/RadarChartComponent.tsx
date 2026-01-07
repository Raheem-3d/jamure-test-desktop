"use client"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts'

export type RadarDatum = { category: string; value: number; fullMark: number }

export default function RadarChartComponent({ data }: { data: RadarDatum[] }) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid gridType="polygon" stroke="#e5e7eb" strokeDasharray="3 3" />
          <PolarAngleAxis 
            dataKey="category" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <Radar 
            name="Performance" 
            dataKey="value" 
            stroke="#4f46e5" 
            fill="#4f46e5" 
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
