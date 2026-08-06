/* ===== charts.js · 轻量 SVG 图表（无需联网） ===== */
window.Charts = (function(){
  const NS='http://www.w3.org/2000/svg';
  function el(t,a){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;}

  // 横向条形排行：data=[{label,value}] max 可选
  function hbar(id, data, color){
    const box=document.getElementById(id); if(!box) return;
    box.innerHTML='';
    const max=Math.max(...data.map(d=>d.value),1);
    data.forEach(d=>{
      const row=document.createElement('div'); row.className='bar-row';
      const lab=document.createElement('div'); lab.className='bl'; lab.textContent=d.label;
      const track=document.createElement('div'); track.className='bar-track';
      const fill=document.createElement('div'); fill.className='bar-fill';
      fill.style.width=(d.value/max*100)+'%';
      fill.textContent=d.value;
      fill.style.background = color || 'linear-gradient(90deg,#c084fc,#7c3aed)';
      track.appendChild(fill); row.appendChild(lab); row.appendChild(track);
      box.appendChild(row);
    });
  }

  // 折线趋势（多系列）：series=[{name,color,points:[v,...]}], labels=[...]
  function line(id, labels, series){
    const box=document.getElementById(id); if(!box) return;
    const w=560,h=220,pad=34; box.innerHTML='';
    const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,width:'100%'});
    const all=series.flatMap(s=>s.points);
    const max=Math.max(...all,100), min=Math.min(...all,0);
    const X=i=> pad + i*(w-2*pad)/(labels.length-1||1);
    const Y=v=> h-pad - (v-min)/(max-min||1)*(h-2*pad);
    // 网格
    for(let g=0;g<=4;g++){const y=pad+g*(h-2*pad)/4;
      svg.appendChild(el('line',{x1:pad,y1:y,x2:w-pad,y2:y,stroke:'rgba(255,255,255,.18)','stroke-width':1}));}
    labels.forEach((lb,i)=>{const t=el('text',{x:X(i),y:h-10,fill:'rgba(245,243,255,.8)','font-size':11,'text-anchor':'middle'});t.textContent=lb;svg.appendChild(t);});
    series.forEach(s=>{
      let d=''; s.points.forEach((v,i)=>{ d+=(i?'L':'M')+X(i)+' '+Y(v)+' '; });
      svg.appendChild(el('path',{d,fill:'none',stroke:s.color,'stroke-width':2.5,'stroke-linejoin':'round'}));
      s.points.forEach((v,i)=>{svg.appendChild(el('circle',{cx:X(i),cy:Y(v),r:3.5,fill:s.color}));});
    });
    box.appendChild(svg);
    // 图例
    const lg=document.createElement('div'); lg.style.cssText='display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12px';
    series.forEach(s=>{const s2=document.createElement('span');s2.innerHTML=`<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${s.color};margin-right:5px"></span>${s.name}`;lg.appendChild(s2);});
    box.appendChild(lg);
  }

  // 分数段分布（直方图）：bins=[{label,count}]
  function hist(id, bins){
    const box=document.getElementById(id); if(!box) return; box.innerHTML='';
    const max=Math.max(...bins.map(b=>b.count),1);
    bins.forEach(b=>{
      const row=document.createElement('div'); row.className='bar-row';
      const lab=document.createElement('div'); lab.className='bl'; lab.textContent=b.label;
      const track=document.createElement('div'); track.className='bar-track';
      const fill=document.createElement('div'); fill.className='bar-fill';
      fill.style.width=(b.count/max*100)+'%'; fill.textContent=b.count;
      track.appendChild(fill); row.appendChild(lab); row.appendChild(track); box.appendChild(row);
    });
  }

  return { hbar, line, hist };
})();
