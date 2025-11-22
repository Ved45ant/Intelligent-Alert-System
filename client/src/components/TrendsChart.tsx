import React, { useEffect, useRef } from 'react';

interface TrendsChartProps {
  data: Record<string, { created: number; escalated: number; autoClosed: number; resolved: number; info: number }>;
  height?: number;
}

// Very lightweight canvas line chart (no external deps)
export default function TrendsChart({ data, height = 160 }: TrendsChartProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const keys = Object.keys(data).sort();
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = canvas.width; const H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const seriesKeys: Array<keyof typeof data[string]> = ['created','escalated','autoClosed'];
    const colors: Record<string,string> = { created:'#1f77b4', escalated:'#d62728', autoClosed:'#2ca02c' };
    // compute max
    let max = 0; keys.forEach(k => { seriesKeys.forEach(sk => { max = Math.max(max, data[k][sk]); }); });
    if (max === 0) max = 1;
    const leftPad = 34; const topPad = 10; const bottomPad = 20;
    const chartW = W - leftPad - 10; const chartH = H - topPad - bottomPad;
    // y axis labels
    ctx.strokeStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(leftPad, topPad); ctx.lineTo(leftPad, topPad+chartH); ctx.stroke();
    ctx.font = '10px sans-serif'; ctx.fillStyle = '#555';
    for (let i=0;i<=4;i++){ const v = Math.round((max*i)/4); const y = topPad + chartH - (chartH*(i/4)); ctx.fillText(String(v), 2, y+3); ctx.strokeStyle='#eee'; ctx.beginPath(); ctx.moveTo(leftPad, y); ctx.lineTo(leftPad+chartW, y); ctx.stroke(); }
    // x axis labels & lines
    keys.forEach((k,i)=>{ const x = leftPad + (chartW*i)/(keys.length-1||1); if (i%Math.ceil(keys.length/6)===0){ ctx.fillStyle='#555'; ctx.fillText(k.slice(5), x-10, topPad+chartH+12); } });
    // draw series
    seriesKeys.forEach(sk => {
      ctx.strokeStyle = colors[sk]; ctx.beginPath();
      keys.forEach((k,i)=>{ const v = data[k][sk]; const x = leftPad + (chartW*i)/(keys.length-1||1); const y = topPad + chartH - (v/max)*chartH; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
      ctx.stroke();
    });
    // legend
    let lx = leftPad; seriesKeys.forEach(sk=>{ ctx.fillStyle=colors[sk]; ctx.fillRect(lx,4,10,10); ctx.fillStyle='#222'; ctx.fillText(sk,lx+14,13); lx += 70; });
  }, [data, keys]);
  return <canvas ref={ref} width={420} height={height} style={{ width:'100%', maxWidth:420, height }} />;
}
