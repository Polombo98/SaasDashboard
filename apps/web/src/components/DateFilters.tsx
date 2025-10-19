'use client';
import { Stack, TextField, MenuItem } from '@mui/material';
import { useState } from 'react';
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
  const [selectedPreset, setSelectedPreset] = useState('');
  return (
    <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
      <TextField
        label="From"
        type="date"
        size="small"
        value={from}
        onChange={(e)=>{
          setFrom(e.target.value);
          setSelectedPreset('');
        }}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { max: to }
        }}
      />
      <TextField
        label="To"
        type="date"
        size="small"
        value={to}
        onChange={(e)=>{
          setTo(e.target.value);
          setSelectedPreset('');
        }}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { min: from }
        }}
      />
      <TextField
        select
        label="Interval"
        size="small"
        value={interval}
        onChange={(e)=>setInterval(e.target.value as "week" | "day" | "month")}
        slotProps={{
          select: {
            MenuProps: {
              disablePortal: true,
              sx: { zIndex: 1400 }
            }
          }
        }}
      >
        <MenuItem value="day">Day</MenuItem>
        <MenuItem value="week">Week</MenuItem>
        <MenuItem value="month">Month</MenuItem>
      </TextField>
      <TextField
        select
        label="Preset"
        size="small"
        value={selectedPreset}
        sx={{ minWidth: 150 }}
        onChange={(e)=> {
          const sel = presets.find(p=>p.label===e.target.value);
          if (!sel) return;
          setSelectedPreset(e.target.value);
          const end = new Date(); const start = new Date(); start.setDate(end.getDate()-sel.days+1);
          setFrom(toISODate(start)); setTo(toISODate(end));
        }}
        slotProps={{
          select: {
            MenuProps: {
              disablePortal: true,
              sx: { zIndex: 1400 }
            }
          }
        }}
      >
        {presets.map(p => <MenuItem key={p.label} value={p.label}>{p.label}</MenuItem>)}
      </TextField>
    </Stack>
  );
}