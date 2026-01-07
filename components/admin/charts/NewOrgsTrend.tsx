"use client"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type TrendDatum = { date: string; value: number }

export default function NewOrgsTrend({ data }: { data: TrendDatum[] }) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={8} minTickGap={24} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip labelClassName="text-xs" formatter={(v: any) => [v, 'New orgs']} />
          <Area type="monotone" dataKey="value" stroke="#06b6d4" fillOpacity={1} fill="url(#trend)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
