'use client';
import { Paper, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function ChartCard({ title, data }:{ title:string; data?:{labels:string[];series:number[]} }) {
  return (
    <Paper sx={{ p:2, height: 360 }}>
      <Typography variant="subtitle1" sx={{ mb:1 }}>{title}</Typography>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={(data?.labels||[]).map((x,i)=>({ x, y: data?.series[i] ?? 0 }))}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" />
          <YAxis allowDecimals />
          <Tooltip />
          <Line type="monotone" dataKey="y" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}