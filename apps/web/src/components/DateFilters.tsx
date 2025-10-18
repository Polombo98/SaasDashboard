'use client';
import { Stack, TextField, MenuItem } from '@mui/material';
import { toISODate } from '../lib/date';

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export default function DateFilters({
  from, to, interval, setFrom, setTo, setInterval
}:{
  from: string; to: string; interval: 'day'|'week'|'month';
  setFrom: (v:string)=>void; setTo: (v:string)=>void; setInterval:(v:'day'|'week'|'month')=>void;
}) {
  return (
    <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
      <TextField
        label="From" type="date" size="small" value={from}
        onChange={(e)=>setFrom(e.target.value)} InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="To" type="date" size="small" value={to}
        onChange={(e)=>setTo(e.target.value)} InputLabelProps={{ shrink: true }}
      />
      <TextField select label="Interval" size="small" value={interval} onChange={(e)=>setInterval(e.target.value as "week" | "day" | "month")}>
        <MenuItem value="day">Day</MenuItem>
        <MenuItem value="week">Week</MenuItem>
        <MenuItem value="month">Month</MenuItem>
      </TextField>
      <TextField select label="Preset" size="small" value="" onChange={(e)=> {
        const sel = presets.find(p=>p.label===e.target.value);
        if (!sel) return;
        const end = new Date(); const start = new Date(); start.setDate(end.getDate()-sel.days+1);
        setFrom(toISODate(start)); setTo(toISODate(end));
      }}>
        {presets.map(p => <MenuItem key={p.label} value={p.label}>{p.label}</MenuItem>)}
      </TextField>
    </Stack>
  );
}