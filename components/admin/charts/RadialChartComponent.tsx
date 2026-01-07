"use client"
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Legend } from 'recharts'

export type RadialDatum = { name: string; value: number; fill: string }

export default function RadialChartComponent({ data }: { data: RadialDatum[] }) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="10%" 
          outerRadius="80%" 
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis 
            type="number" 
            domain={[0, 100]} 
            angleAxisId={0} 
            tick={false}
          />
          <RadialBar
            background
            dataKey="value"
            cornerRadius={10}
            label={{ 
              position: 'insideStart', 
              fill: '#fff',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          />
          <Legend 
            iconSize={10}
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: '12px' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  )
}
