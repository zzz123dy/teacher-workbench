/* ===== modules2.js · 班级事务/学情/成绩/家校/资源/消息/个人/导入 ===== */
(function(){
const M = window.Modules;

/* ---------------- 座次表 ---------------- */
let seatVer = '当前座位';
M.seating = function(){
  const se = Store.get().seating||{};
  const vers = Object.keys(se);
  if(!vers.includes(seatVer)) seatVer = vers[0]||'当前座位';
  const grid = se[seatVer]||[];
  const cols = grid[0]? grid[0].length:4;
  const html = `
  <div class="crumbs">班级事务 / 座次表</div>
  <div class="flex between center wrap gap8">
    <div class="section-title" style="margin:0">座次表<div class="line"></div></div>
    <div class="flex gap8">
      <button class="btn sm" onclick="M_seatAddVer()">+ 新版本</button>
      <button class="btn sm" onclick="M_seatSave()">💾 保存</button>
    </div>
  </div>
  <div class="tabs mt16" id="seatTabs">
    ${vers.map(v=>`<div class="tab ${v===seatVer?'active':''}" data-v="${v}" onclick="M_seatSwitch('${v}')">${esc(v)}</div>`).join('')}
  </div>
  <div class="card"><div class="seat-grid" id="seatGrid" style="grid-template-columns:repeat(${cols},1fr)">
    ${grid.map((row,r)=>row.map((nm,c)=>`<div class="seat ${nm?'':'empty'}" draggable="true" data-r="${r}" data-c="${c}">${esc(nm)||'空'}</div>`).join('')).join('')}
  </div></div>
  <div class="muted mt8">提示：拖动姓名卡片可互换座位；切换版本或修改后点“保存”。</div>`;
  return { html, bind:bindSeat };
};
window.M_seatSwitch = function(v){ seatVer=v; App.refresh(); };
window.M_seatSave = function(){ UI.toast('座位已保存到「'+seatVer+'」'); };
window.M_seatAddVer = function(){
  UI.form({ title:'新建座位版本', fields:[{key:'name',label:'版本名称',value:'新座位'}],
    onSubmit:v=>{ Store.update(d=>{ d.seating=d.seating||{}; d.seating[v.name]= (d.seating['当前座位']||[['']]).map(r=>r.slice()); }); seatVer=v.name; UI.closeModal(); UI.toast('已创建'); App.refresh(); }});
};
function bindSeat(root){
  const grid = root.querySelector('#seatGrid'); if(!grid) return;
  let dragEl=null;
  grid.querySelectorAll('.seat').forEach(el=>{
    el.addEventListener('dragstart',e=>{ dragEl=el; });
    el.addEventListener('dragover',e=>{ e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{
      e.preventDefault(); el.classList.remove('drag-over');
      if(!dragEl||dragEl===el) return;
      const r1=+dragEl.dataset.r,c1=+dragEl.dataset.c,r2=+el.dataset.r,c2=+el.dataset.c;
      const data = Store.get().seating[seatVer];
      const tmp = data[r1][c1]; data[r1][c1]=data[r2][c2]; data[r2][c2]=tmp;
      Store.update(()=>{});
      const t1=dragEl.textContent; dragEl.textContent=el.textContent==='空'?'':el.textContent; el.textContent=t1==='空'?'':t1;
      dragEl.classList.toggle('empty', !dragEl.textContent); el.classList.toggle('empty', !el.textContent);
      if(el.textContent==='') el.textContent='空'; if(dragEl.textContent==='') dragEl.textContent='空';
    });
  });
}

/* ---------------- 值日表 ---------------- */
M.duty = function(){
  const list = Store.list('duty');
  const html = `
  <div class="crumbs">班级事务 / 值日表</div>
  <div class="flex between center"><div class="section-title" style="margin:0">值日安排<div class="line"></div></div>
    <div class="flex gap8"><button class="btn sm" onclick="window.print()">🖨️ 打印</button>
    <button class="btn primary sm" onclick="M_dutyForm()">+ 添加</button></div></div>
  <div class="table-wrap mt16"><table><thead><tr><th>值日组</th><th>成员</th><th>任务</th><th>周次</th><th>操作</th></tr></thead>
  <tbody>${list.map(d=>`<tr><td>${esc(d.group)}</td><td>${esc(d.members)}</td><td>${esc(d.task)}</td><td>${esc(d.week)}</td>
    <td class="flex gap8"><button class="btn sm" onclick="M_dutyForm('${d.id}')">改</button><button class="btn sm danger" onclick="M_delDuty('${d.id}')">删</button></td></tr>`).join('')}</tbody></table></div>`;
  return { html, bind:()=>{} };
};
M.dutyForm = function(id){ const d=id?Store.find('duty',id):{};
  UI.form({ title:id?'编辑值日':'添加值日', fields:[
    {key:'group',label:'值日组',value:d.group},{key:'members',label:'成员',value:d.members},
    {key:'task',label:'任务',value:d.task},{key:'week',label:'周次',value:d.week}],
    onSubmit:v=>{ id?Store.replace('duty',id,v):Store.add('duty',v); UI.toast('已保存'); UI.closeModal(); App.refresh(); },
    onDelete:id?()=>M_delDuty(id):null }); };
M.delDuty = function(id){ UI.confirm('确定删除？',()=>{ Store.remove('duty',id); App.refresh(); }); };

/* ---------------- 课表 ---------------- */
M.timetable = function(){
  const db = Store.get();
  const tt = db.timetable; const days=Object.keys(tt);
  const canEdit = db.meta.role !== '任课教师';
  const maxP = Math.max(...days.map(d=>tt[d].length),1);
  let head=`<th style="width:64px">节次</th>`+days.map(d=>`<th>${esc(d)}</th>`).join('');
  let rows='';
  for(let p=1;p<=maxP;p++){
    rows+=`<tr><td class="tt-p">${p}</td>`+days.map(d=>{
      const c=(tt[d]||[]).find(x=>x.节次===p);
      if(c){
        const click = canEdit? `onclick="M_editCourse('${d}',${p})"`:'';
        return `<td class="tt-cell ${canEdit?'tt-edit':''}" ${click}>
          <b>${esc(c.科目)}</b><br><span class="muted" style="font-size:12px">${esc(c.教师)}</span>
          ${canEdit?'<span class="tt-hint">✎ 修改</span>':''}</td>`;
      }
      const click = canEdit? `onclick="M_addCourse('${d}',${p})"`:'';
      return `<td class="tt-cell ${canEdit?'tt-edit tt-add':''}" ${click}>${canEdit?'＋ 添加':'—'}</td>`;
    }).join('')+`</tr>`;
  }
  const tip = canEdit
    ? '直接点击任意单元格即可<b>修改 / 添加</b>课程，点击已有课程还能<b>删除</b>。'
    : '当前为「任课教师」只读模式，如需调整请联系班主任。';
  const html=`
  <div class="crumbs">班级事务 / 课表</div>
  <div class="flex between center wrap gap8">
    <div class="section-title" style="margin:0">周课程表<div class="line"></div></div>
    <div class="flex gap8">
      ${canEdit?'<button class="btn sm" onclick="M_addRow()">➕ 增加节次</button>':''}
      <button class="btn sm" onclick="window.print()">🖨️ 打印</button>
    </div>
  </div>
  <div class="card mt16"><div class="table-wrap"><table class="tt"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>
  <div class="tt-tip mt8">${tip}</div></div>`;
  return { html, bind:()=>{} };
};
window.M_editCourse=function(day,p){ const c=Store.get().timetable[day].find(x=>x.节次===p);
  M_courseForm(day,p,c); };
window.M_addCourse=function(day,p){ M_courseForm(day,p,null); };
window.M_addRow=function(){
  const tt = Store.get().timetable; const days=Object.keys(tt);
  const maxP = Math.max(1, ...days.flatMap(d=>tt[d].map(x=>x.节次)));
  const np = maxP+1;
  // 找到第一个该节次为空的单元格并打开添加
  for(const day of days){ if(!tt[day].some(x=>x.节次===np)){ M_addCourse(day,np); return; } }
  M_addCourse(days[0],np);
};
function M_courseForm(day,p,c){
  UI.form({ title:(c?'修改':'添加')+'课程 · '+day+' 第'+p+'节', fields:[
    {key:'科目',label:'科目',value:c?c.科目:''},{key:'教师',label:'教师',value:c?c.教师:''}],
    onDelete: c? ()=>{ Store.update(d=>{ d.timetable[day]=(d.timetable[day]||[]).filter(x=>x.节次!==p); }); UI.toast('已删除该课'); App.refresh(); } : null,
    onSubmit:v=>{ Store.update(d=>{ d.timetable[day]=d.timetable[day]||[]; let i=d.timetable[day].findIndex(x=>x.节次===p);
      if(i<0){ d.timetable[day].push({节次:p,科目:v.科目,教师:v.教师}); } else { d.timetable[day][i]={节次:p,科目:v.科目,教师:v.教师}; }
      d.timetable[day].sort((a,b)=>a.节次-b.节次); }); UI.closeModal(); UI.toast('已保存'); App.refresh(); }});
}

/* ---------------- 学情分析 ---------------- */
M.analytics = function(){
  const db=Store.get(); const exams=Store.list('exams');
  if(!exams.length) return { html:'<div class="card muted">请先在“成绩管理”中录入考试与成绩。</div>', bind:()=>{} };
  const last=exams[exams.length-1]; const sc=db.scores[last.id]||{};
  const students=Store.list('students');
  const subs=Object.keys(sc[students[0]&&students[0].id]||{});
  // 班级均值
  const subAvg={}; subs.forEach(s=>{ let sum=0,n=0; students.forEach(st=>{ const v=sc[st.id]&&sc[st.id][s]; if(!isNaN(v)){sum+=v;n++;} }); subAvg[s]= n?sum/n:0; });
  const classAvg=Object.values(subAvg).reduce((a,b)=>a+b,0)/(subs.length||1);
  let pass=0,good=0,total=0;
  students.forEach(st=>{ subs.forEach(s=>{ const v=sc[st.id]&&sc[st.id][s]; if(!isNaN(v)){ total++; if(v>=60)pass++; if(v>=85)good++; } }); });
  const passRate=(pass/total*100).toFixed(0); const goodRate=(good/total*100).toFixed(0);
  const weakSub=subs.slice().sort((a,b)=>subAvg[a]-subAvg[b])[0];

  // 排名变化（与上一场考试比）
  let rankHtml='—';
  if(exams.length>=2){ const prev=exams[exams.length-2]; const pc=db.scores[prev.id]||{};
    const rankNow=rankOf(sc,students,subs), rankPrev=rankOf(pc,students,subs);
    const up=students.filter(st=>rankPrev[st.id]&&rankNow[st.id]<rankPrev[st.id]).slice(0,3).map(st=>st.name+'↑').join('、');
    rankHtml= up||'无明显变化';
  }
  const html=`
  <div class="crumbs">学情分析 / 班级分析（${esc(last.name)}）</div>
  <div class="grid cols-4">${kpiBox('班级平均',classAvg.toFixed(1))}${kpiBox('合格率',passRate+'%','g')}${kpiBox('优秀率',goodRate+'%','w')}${kpiBox('最弱学科',weakSub,'r')}</div>
  <div class="grid cols-2 mt16">
    <div class="card"><div class="section-title">各学科平均分<div class="line"></div></div><div id="subAvgChart" class="bar"></div></div>
    <div class="card"><div class="section-title">班级概览<div class="line"></div></div>
      <div class="muted" style="line-height:2">排名进步：${esc(rankHtml)}</div>
      <div class="muted" style="line-height:2">学科短板建议：加强 <b>${esc(weakSub)}</b> 教学与练习。</div>
      <div class="section-title mt16">个体学情<div class="line"></div></div>
      <div class="list">${students.slice(0,6).map(st=>`<div class="list-item"><div style="font-weight:700">${esc(st.name)}</div><button class="btn sm" onclick="App.go('archive','${st.id}')">查看</button></div>`).join('')}</div>
    </div>
  </div>
  <div class="card mt16"><div class="flex between center"><div class="section-title" style="margin:0">学科分析<div class="line"></div></div>
    <select class="btn sm" id="subSel" onchange="M_subAnalyze(this.value)">${subs.map(s=>`<option ${s==='体育'?'selected':''} value="${s}">${s}</option>`).join('')}</select></div>
    <div id="subAnalyzeBox" class="mt16"></div></div>`;
  return { html, bind:()=>{ Charts.hbar('subAvgChart', subs.map(s=>({label:s,value:Math.round(subAvg[s])})));
    M_subAnalyze(document.getElementById('subSel').value); } };
};
function rankOf(sc,students,subs){ const tot={}; students.forEach(st=>{ let s=0,n=0; subs.forEach(x=>{const v=sc[st.id]&&sc[st.id][x]; if(!isNaN(v)){s+=v;n++;}}); tot[st.id]=n?s/n:0; });
  const sorted=students.slice().sort((a,b)=>tot[b.id]-tot[a.id]); const r={}; sorted.forEach((st,i)=>r[st.id]=i+1); return r; }
window.M_subAnalyze=function(sub){
  const db=Store.get(); const exams=Store.list('exams'); const students=Store.list('students');
  const last=exams[exams.length-1]; const sc=db.scores[last.id]||{};
  const vals=students.map(st=>sc[st.id]&&sc[st.id][sub]).filter(v=>!isNaN(v));
  const avg=(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1);
  const max=Math.max(...vals), min=Math.min(...vals);
  const bins=[{label:'<60',count:0},{label:'60-69',count:0},{label:'70-79',count:0},{label:'80-89',count:0},{label:'90+',count:0}];
  vals.forEach(v=>{ if(v<60)bins[0].count++; else if(v<70)bins[1].count++; else if(v<80)bins[2].count++; else if(v<90)bins[3].count++; else bins[4].count++; });
  // 进退步：与上一场比
  let upDown='—';
  if(exams.length>=2){ const prev=exams[exams.length-2]; const pc=db.scores[prev.id]||{};
    const diffs=students.map(st=>{ const a=pc[st.id]&&pc[st.id][sub], b=sc[st.id]&&sc[st.id][sub]; return {n:st.name, d:(!isNaN(b)&&!isNaN(a))?b-a:0}; }).sort((a,b)=>b.d-a.d);
    upDown='进步：'+diffs.slice(0,2).map(x=>x.n+'('+(x.d>0?'+':'')+x.d+')').join('、')+'；退步：'+diffs.slice(-2).reverse().map(x=>x.n+'('+x.d+')').join('、');
  }
  document.getElementById('subAnalyzeBox').innerHTML=`
    <div class="stat-row"><div class="kpi"><div class="k-lab">平均分</div><div class="k-num">${avg}</div></div>
      <div class="kpi"><div class="k-lab">最高分</div><div class="k-num" style="color:var(--good)">${max}</div></div>
      <div class="kpi"><div class="k-lab">最低分</div><div class="k-num" style="color:var(--bad)">${min}</div></div></div>
    <div class="section-title mt16">分数段分布<div class="line"></div></div>
    <div id="histBox" class="bar"></div>
    <div class="section-title mt16">进退步学生<div class="line"></div></div>
    <div class="muted">${esc(upDown)}</div>`;
  Charts.hist('histBox', bins);
};

/* ---------------- 成绩管理 ---------------- */
M.grades = function(){
  const db=Store.get(); const exams=Store.list('exams'); const students=Store.list('students');
  const html=`
  <div class="crumbs">成绩管理</div>
  <div class="flex between center wrap gap8"><div class="section-title" style="margin:0">考试与成绩<div class="line"></div></div>
    <div class="flex gap8">
      <button class="btn sm" onclick="M_exportExcel()">⬇ Excel</button>
      <button class="btn sm" onclick="M_exportPDF()">⬇ PDF</button>
      <button class="btn primary sm" onclick="M_examForm()">+ 新增考试</button>
    </div></div>
  <div class="tabs mt16" id="examTabs">${exams.map(e=>`<div class="tab ${e===exams[exams.length-1]?'active':''}" onclick="M_selExam('${e.id}')">${esc(e.name)}</div>`).join('')}</div>
  <div id="gradeBody"></div>`;
  return { html, bind:()=>{ if(exams.length) M_selExam(exams[exams.length-1].id); } };
};
window.M_selExam=function(eid){
  const db=Store.get(); const exam=Store.find('exams',eid); const students=Store.list('students');
  const sc=db.scores[eid]||{}; const subs=Object.keys(sc[students[0]&&students[0].id]||{});
  // 班级排名
  const tot={}; students.forEach(st=>{ let s=0,n=0; subs.forEach(x=>{const v=sc[st.id]&&sc[st.id][x]; if(!isNaN(v)){s+=v;n++;}}); tot[st.id]=n?s/n:0; });
  const ranked=students.slice().sort((a,b)=>tot[b.id]-tot[a.id]);
  document.getElementById('examTabs').querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  const tab=[...document.getElementById('examTabs').children].find(t=>t.textContent===exam.name); if(tab)tab.classList.add('active');
  document.getElementById('gradeBody').innerHTML=`
    <div class="card"><div class="flex between center">
      <div class="section-title" style="margin:0">${esc(exam.name)} 成绩<div class="line"></div></div>
      <div class="flex gap8"><button class="btn sm" onclick="M_scoreForm('${eid}')">✏️ 录入/编辑</button>
      <button class="btn sm danger" onclick="M_delExam('${eid}')">删除考试</button></div></div>
    <div class="table-wrap mt16"><table><thead><tr><th>排名</th><th>姓名</th>${subs.map(s=>`<th>${s}</th>`).join('')}<th>总分均值</th></tr></thead>
    <tbody>${ranked.map((st,i)=>`<tr><td><b>${i+1}</b></td><td>${esc(st.name)}</td>${subs.map(s=>`<td>${esc(sc[st.id]&&sc[st.id][s])}</td>`).join('')}<td><b>${tot[st.id].toFixed(1)}</b></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.M_examForm=function(){ UI.form({ title:'新增考试', fields:[
  {key:'name',label:'考试名称',placeholder:'如 第二次月考'},{key:'type',label:'类型',type:'select',options:[{v:'月考',t:'月考'},{v:'期中',t:'期中'},{v:'期末',t:'期末'},{v:'模拟',t:'模拟考试'}]},
  {key:'date',label:'日期',value:new Date().toISOString().slice(0,10)}],
  onSubmit:v=>{ const e=Store.add('exams',v); UI.toast('已添加考试'); UI.closeModal(); App.refresh(); }}); };
window.M_delExam=function(id){ UI.confirm('删除考试将同时删除其全部成绩，确定？',()=>{ Store.remove('exams',id); Store.update(d=>delete d.scores[id]); App.refresh(); }); };
window.M_scoreForm=function(eid){
  const students=Store.list('students'); const sc=Store.get().scores[eid]||{};
  const subs=Object.keys(sc[students[0]&&students[0].id]||['语文','数学','英语','体育']);
  const rows=students.map(st=>`<tr><td>${esc(st.name)}</td>${subs.map(s=>`<td><input class="cell" data-id="${st.id}" data-sub="${s}" value="${esc(sc[st.id]&&sc[st.id][s]||'')}" style="width:62px;padding:6px;border-radius:8px;border:1px solid var(--glass-line);background:var(--glass);color:var(--text)"></td>`).join('')}</tr>`).join('');
  UI.modal(`<div class="modal-head"><h3>录入成绩</h3><button class="close" onclick="UI.closeModal()">×</button></div>
    <div class="muted" style="font-size:12px;margin-bottom:10px">直接填写分数，留空不覆盖。保存后进入数据库并支持学情分析。</div>
    <div class="table-wrap"><table><thead><tr><th>姓名</th>${subs.map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="modal-actions"><button class="btn" onclick="UI.closeModal()">取消</button><button class="btn primary" onclick="M_saveScores('${eid}')">保存</button></div>`);
};
window.M_saveScores=function(eid){
  const inputs=document.querySelectorAll('#modalRoot .cell');
  Store.update(d=>{ d.scores[eid]=d.scores[eid]||{}; inputs.forEach(inp=>{ const id=inp.dataset.id,sub=inp.dataset.sub,v=inp.value.trim(); if(v==='')return; d.scores[eid][id]=d.scores[eid][id]||{}; d.scores[eid][id][sub]=Number(v); }); });
  UI.toast('成绩已保存'); UI.closeModal(); App.refresh();
};
window.M_exportExcel=function(){
  const db=Store.get(); const exams=Store.list('exams'); if(!exams.length){UI.toast('暂无成绩');return;}
  const eid=exams[exams.length-1].id; const students=Store.list('students'); const sc=db.scores[eid]||{};
  const subs=Object.keys(sc[students[0]&&students[0].id]||[]);
  const rows=students.map(st=>{ const o={姓名:st.name}; subs.forEach(s=>o[s]=sc[st.id]&&sc[st.id][s]||''); return o; });
  const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'成绩');
  XLSX.writeFile(wb, exams[exams.length-1].name+'_成绩.xlsx'); UI.toast('已导出 Excel');
};
window.M_exportPDF=function(){
  const db=Store.get(); const exams=Store.list('exams'); if(!exams.length){UI.toast('暂无成绩');return;}
  const eid=exams[exams.length-1].id; const students=Store.list('students'); const sc=db.scores[eid]||{};
  const subs=Object.keys(sc[students[0]&&students[0].id]||[]);
  let html='<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:6px}body{font-family:sans-serif}</style>';
  html+='<h2>'+exams[exams.length-1].name+' 成绩单</h2><table><tr><th>姓名</th>'+subs.map(s=>'<th>'+s+'</th>').join('')+'</tr>';
  students.forEach(st=>{ html+='<tr><td>'+st.name+'</td>'+subs.map(s=>'<td>'+(sc[st.id]&&sc[st.id][s]||'')+'</td>').join('')+'</tr>'; });
  html+='</table>';
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); w.print();
};

/* ---------------- 家校沟通 ---------------- */
M.comm = function(){
  const notices=Store.list('notices'); const comms=Store.list('comms'); const students=Store.list('students');
  const html=`
  <div class="crumbs">家校沟通</div>
  <div class="grid cols-2">
    <div class="card"><div class="flex between center"><div class="section-title" style="margin:0">家长通知<div class="line"></div></div>
      <button class="btn primary sm" onclick="M_noticeForm()">+ 发布</button></div>
      <div class="list mt16">${notices.map(n=>`<div class="list-item"><div style="flex:1"><div style="font-weight:700">${esc(n.title)}</div><div class="muted" style="font-size:12px">${esc(n.type)} · ${esc(n.time)} · 已读 ${esc((n.read||[]).length)}/${students.length}</div></div>
        <button class="btn sm danger" onclick="M_delNotice('${n.id}')">删</button></div>`).join('')||'<div class="muted">暂无通知</div>'}</div></div>
    <div class="card"><div class="section-title">私信 / 群发<div class="line"></div></div>
      <div class="field mt16"><label>发给</label><select id="commTarget" class="btn sm" style="width:100%"><option value="all">全班家长（群发）</option>${students.map(s=>`<option value="${s.name}">${esc(s.name)}家长</option>`).join('')}</select></div>
      <div class="field"><label>内容</label><textarea id="commText" placeholder="输入沟通内容…"></textarea></div>
      <button class="btn primary sm" onclick="M_sendComm()">发送</button></div>
  </div>
  <div class="card mt16"><div class="section-title">家校记录<div class="line"></div></div>
    <div class="table-wrap mt8"><table><thead><tr><th>学生</th><th>家长</th><th>时间</th><th>方式</th><th>内容</th><th>反馈</th></tr></thead>
    <tbody>${comms.map(c=>`<tr><td>${esc(c.student)}</td><td>${esc(c.parent)}</td><td>${esc(c.time)}</td><td>${esc(c.way)}</td><td class="muted">${esc(c.content)}</td><td class="muted">${esc(c.feedback)}</td></tr>`).join('')}</tbody></table></div>
    <button class="btn sm mt16" onclick="M_commForm()">+ 添加沟通记录</button></div>`;
  return { html, bind:()=>{} };
};
window.M_noticeForm=function(){ UI.form({ title:'发布家长通知', fields:[
  {key:'title',label:'标题'},{key:'type',label:'类型',value:'家校通知'},
  {key:'content',label:'内容',type:'textarea'},{key:'time',label:'时间',value:new Date().toISOString().slice(0,10)}],
  onSubmit:v=>{ Store.add('notices',Object.assign({read:[]},v)); Store.add('messages',{cat:'家长消息',text:'您有一条新通知：'+v.title,time:v.time,unread:true}); UI.toast('已发布'); UI.closeModal(); App.refresh(); }}); };
window.M_delNotice=function(id){ UI.confirm('删除通知？',()=>{ Store.remove('notices',id); App.refresh(); }); };
window.M_sendComm=function(){ const t=document.getElementById('commTarget').value; const c=document.getElementById('commText').value.trim();
  if(!c){UI.toast('请输入内容');return;} Store.add('comms',{student:t==='all'?'全班':t,parent:t==='all'?'全体家长':'家长',time:new Date().toISOString().slice(0,10),way:'平台',content:c,feedback:''});
  UI.toast('已发送'+(t==='all'?'（群发）':'')); App.refresh(); };
window.M_commForm=function(){ const students=Store.list('students');
  UI.form({ title:'添加沟通记录', fields:[
    {key:'student',label:'学生',type:'select',options:students.map(s=>({v:s.name,t:s.name}))},
    {key:'parent',label:'家长',value:''},{key:'way',label:'方式',value:'电话'},
    {key:'content',label:'内容',type:'textarea'},{key:'feedback',label:'家长反馈',value:''},
    {key:'time',label:'时间',value:new Date().toISOString().slice(0,10)}],
    onSubmit:v=>{ Store.add('comms',v); UI.toast('已记录'); UI.closeModal(); App.refresh(); }}); };

/* ---------------- 资源与工具 ---------------- */
M.resources = function(){
  const res=Store.list('resources'); const re=Store.list('research');
  const html=`
  <div class="crumbs">资源与工具</div>
  <div class="grid cols-2">
    <div class="card"><div class="flex between center"><div class="section-title" style="margin:0">我的资源<div class="line"></div></div>
      <button class="btn primary sm" onclick="M_resForm()">+ 上传</button></div>
      <div class="list mt16">${res.map(r=>`<div class="list-item"><span style="font-size:20px">📄</span><div style="flex:1"><div style="font-weight:700">${esc(r.name)}</div><div class="muted" style="font-size:12px">${esc(r.type)} · ${esc(r.size)} · ${esc(r.time)}</div></div>
        <button class="btn sm danger" onclick="M_delRes('${r.id}')">删</button></div>`).join('')||'<div class="muted">暂无资源</div>'}</div></div>
    <div class="card"><div class="section-title">教研工具<div class="line"></div></div>
      <div class="list mt16">${re.map(r=>`<div class="list-item"><div style="flex:1"><div style="font-weight:700">${esc(r.title)}</div><div class="muted" style="font-size:12px">${esc(r.type)} · ${esc(r.time)}</div><div class="muted">${esc(r.content)}</div></div>
        <button class="btn sm" onclick="M_reForm('${r.id}')">改</button><button class="btn sm danger" onclick="M_delRe('${r.id}')">删</button></div>`).join('')}</div>
      <button class="btn sm mt16" onclick="M_reForm()">+ 教研/听课/活动记录</button></div>
  </div>`;
  return { html, bind:()=>{} };
};
window.M_resForm=function(){ UI.form({ title:'添加资源', fields:[
  {key:'name',label:'文件名'},{key:'type',label:'类型',type:'select',options:[{v:'文档',t:'文档'},{v:'PPT',t:'PPT'},{v:'图片',t:'图片'},{v:'视频',t:'视频'},{v:'文件',t:'文件'}]},
  {key:'size',label:'大小',value:'—'},{key:'time',label:'时间',value:new Date().toISOString().slice(0,10)}],
  onSubmit:v=>{ Store.add('resources',v); UI.toast('已添加'); UI.closeModal(); App.refresh(); }}); };
window.M_delRes=function(id){ UI.confirm('删除？',()=>{ Store.remove('resources',id); App.refresh(); }); };
window.M_reForm=function(id){ const r=id?Store.find('research',id):{};
  UI.form({ title:id?'编辑记录':'新增记录', fields:[
    {key:'type',label:'类型',type:'select',options:[{v:'教研记录',t:'教研记录'},{v:'听课记录',t:'听课记录'},{v:'活动记录',t:'活动记录'}],value:r.type},
    {key:'title',label:'标题',value:r.title},{key:'content',label:'内容',type:'textarea',value:r.content},
    {key:'time',label:'时间',value:r.time||new Date().toISOString().slice(0,10)}],
    onSubmit:v=>{ id?Store.replace('research',id,v):Store.add('research',v); UI.toast('已保存'); UI.closeModal(); App.refresh(); }, onDelete:id?()=>M_delRe(id):null }); };
window.M_delRe=function(id){ UI.confirm('删除？',()=>{ Store.remove('research',id); App.refresh(); }); };

/* ---------------- 消息中心 ---------------- */
M.messages = function(){
  const msgs=Store.list('messages');
  const cats=['系统通知','学校公告','家长消息','教研消息'];
  const html=`
  <div class="crumbs">消息中心</div>
  <div class="grid cols-2">
    ${cats.map(cat=>{ const arr=msgs.filter(m=>m.cat===cat);
      return `<div class="card"><div class="section-title">${cat}（${arr.filter(m=>m.unread).length}）<div class="line"></div></div>
        <div class="list">${arr.map(m=>`<div class="list-item"><span style="font-size:18px">${m.unread?'🔴':'⚪'}</span><div style="flex:1"><div>${esc(m.text)}</div><div class="muted" style="font-size:12px">${esc(m.time)}</div></div>
          ${m.unread?`<button class="btn sm" onclick="M_readMsg('${m.id}')">标已读</button>`:''}</div>`).join('')||'<div class="muted">暂无</div>'}</div></div>`; }).join('')}
  </div>
  <button class="btn sm mt16" onclick="M_clearMsg()">全部标为已读</button>`;
  return { html, bind:()=>{} };
};
window.M_readMsg=function(id){ Store.replace('messages',id,{unread:false}); App.refresh(); App.updateBadge(); };
window.M_clearMsg=function(){ Store.update(d=>d.messages.forEach(m=>m.unread=false)); App.refresh(); App.updateBadge(); };

/* ---------------- 个人中心 ---------------- */
M.profile = function(){
  const m=Store.get().meta;
  const c=(window.Cloud&&Cloud.getConfig())||{};
  const online=Store.isCloud();
  const html=`
  <div class="crumbs">个人中心</div>
  <div class="card" style="max-width:640px"><div class="flex center gap12">
    <div class="avatar" style="width:64px;height:64px;font-size:28px">${esc(m.teacherName[0]||'师')}</div>
    <div><div style="font-size:20px;font-weight:800">${esc(m.teacherName)}</div><div class="muted">${esc(m.role)} · ${esc(m.school)}</div></div>
    <button class="btn primary sm" style="margin-left:auto" onclick="M_profileForm()">✏️ 编辑</button></div>
    <div class="grid cols-2 mt16">
      ${infoRow('姓名',m.teacherName)}${infoRow('职称',m.teacherTitle)}${infoRow('任教学科',m.subject)}${infoRow('角色',m.role)}
      ${infoRow('学校',m.school)}${infoRow('年级',m.grade)}${infoRow('班级',m.className)}${infoRow('班级人数',Store.classCount()+' 人')}
    </div>
  </div>
  <div class="card mt16" style="max-width:640px"><div class="section-title">☁️ 云端同步（多设备实时共享）<div class="line"></div></div>
    <div class="muted" style="font-size:13px;line-height:1.7">连接后，电脑与手机共用同一份数据，任一端修改会自动同步到另一端（依赖免费 Supabase 云数据库）。</div>
    <div class="mt12"><span class="pill ${online?'g':'r'}">${online?'🟢 已连接 · 实时同步中':'⚪ 未连接'}</span></div>
    <div class="grid cols-1 mt12 gap8">
      <input id="cUrl" class="input" placeholder="Supabase URL（如 https://xxxx.supabase.co）" value="${esc(c.url||'')}">
      <input id="cKey" class="input" placeholder="anon public key（公开密钥，可放前端）" value="${esc(c.anonKey||'')}">
      <input id="cWs" class="input" placeholder="工作台密钥（自定义，电脑手机填一样）" value="${esc(c.workspace||'')}">
    </div>
    <div class="flex gap8 mt12">
      <button class="btn primary sm" onclick="M_cloudConnect()">🔗 连接并同步</button>
      <button class="btn sm danger" onclick="M_cloudDisconnect()">断开</button>
      <button class="btn sm" onclick="M_cloudHelp()">❓ 如何获取密钥</button>
    </div>
  </div>
  <div class="card mt16" style="max-width:640px"><div class="section-title">数据安全 / 复制给其他教师<div class="line"></div></div>
    <div class="muted" style="font-size:13px;line-height:1.7">所有数据保存在本机浏览器。可导出整库文件交给其他教师/班级导入复用，实现“快速复制使用”。</div>
    <div class="flex gap8 mt16"><button class="btn sm" onclick="M_exportDB()">⬇ 导出整库(JSON)</button><button class="btn sm" onclick="M_importDB()">⬆ 导入整库</button><button class="btn sm danger" onclick="M_resetDB()">重置示例数据</button></div>
    <input type="file" id="dbFile" accept="application/json" style="display:none">
  </div>`;
  return { html, bind:bindProfile };
};
function bindProfile(root){ const f=root.querySelector('#dbFile'); if(f) f.onchange=e=>{ const file=e.target.files[0]; if(!file)return; const rd=new FileReader(); rd.onload=()=>{ try{Store.importDB(rd.result); UI.toast('导入成功'); App.refresh();}catch(err){UI.toast('文件格式错误');} }; rd.readAsText(file); }; }
window.M_profileForm=function(){ const m=Store.get().meta;
  UI.form({ title:'编辑教师资料', fields:[
    {key:'teacherName',label:'姓名',value:m.teacherName},{key:'teacherTitle',label:'职称',value:m.teacherTitle},
    {key:'subject',label:'任教学科',value:m.subject},
    {key:'role',label:'角色',type:'select',options:[{v:'班主任',t:'班主任（全部权限）'},{v:'任课教师',t:'任课教师（只读）'},{v:'管理员',t:'管理员（管理账号/班级）'}],value:m.role},
    {key:'school',label:'学校',value:m.school},{key:'grade',label:'年级',value:m.grade},{key:'className',label:'班级',value:m.className}],
    onSubmit:v=>{ Store.update(d=>{ Object.assign(d.meta,v); }); UI.toast('已保存'); UI.closeModal(); App.refresh(); }}); };
window.M_exportDB=function(){ const blob=new Blob([Store.exportDB()],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='教师工作台数据.json'; a.click(); UI.toast('已导出'); };
window.M_importDB=function(){ document.getElementById('dbFile').click(); };
window.M_resetDB=function(){ UI.confirm('将清空当前数据并恢复示例，确定？',()=>{ Store.reset(); Data.seed(); UI.toast('已重置'); App.refresh(); }); };
window.M_cloudConnect=function(){
  const url=(document.getElementById('cUrl').value||'').trim();
  const anonKey=(document.getElementById('cKey').value||'').trim();
  const workspace=(document.getElementById('cWs').value||'').trim();
  if(!url||!anonKey||!workspace){ UI.toast('URL、密钥、工作台密钥三项都要填'); return; }
  UI.toast('正在连接云端…');
  Store.setCloud({url,anonKey,workspace});
};
window.M_cloudDisconnect=function(){
  Store.disconnectCloud(); UI.toast('已断开云端同步（本机数据保留）'); App.refresh();
};
window.M_cloudHelp=function(){
  UI.modal(`<div class="modal-head"><h3>如何获取 Supabase 密钥</h3><button class="close" onclick="UI.closeModal()">×</button></div>
   <div style="padding:16px;line-height:1.95;font-size:14px">
   1. 打开 <b>supabase.com</b> 注册免费账号，新建一个 Project。<br>
   2. 左侧 <b>SQL Editor</b> → New query，粘贴本工作台目录下的 <code>supabase-schema.sql</code> 并执行（建表+开启实时+权限）。<br>
   3. 左侧 <b>Project Settings → API</b>，复制 <b>Project URL</b> 和 <b>anon public</b> 密钥。<br>
   4. 回到本工作台「个人中心 → 云端同步」，粘贴这三项，点「连接并同步」。<br>
   <span class="muted">· 工作台密钥随便自定义（如 class3），电脑和手机填一样即共享同一份数据。<br>
   · anon key 是公开密钥，可安全放前端；真正的隔离靠「工作台密钥」这串口令。</span>
   </div>`);
};

/* ---------------- 数据导入页 ---------------- */
const ImportPage = {
  open(){ const html=`
    <div class="upload-zone" id="drop">
      <div style="font-size:40px">📥</div>
      <div style="font-weight:800;margin:8px 0">拖拽或点击上传 Excel / Word</div>
      <div class="muted" style="font-size:13px">支持：学生信息表、成绩表、课表、座位表、值日表、班级资料（.xlsx/.xls/.csv/.docx）</div>
      <input type="file" id="fileInput" accept=".xlsx,.xls,.csv,.docx" multiple style="display:none">
      <button class="btn primary mt16" onclick="document.getElementById('fileInput').click()">选择文件</button>
    </div>
    <div id="importResult" class="mt16"></div>`;
    UI.modal(`<div class="modal-head"><h3>数据导入 · 自动识别归档</h3><button class="close" onclick="UI.closeModal()">×</button></div>${html}`);
    const dz=document.getElementById('drop'); const fi=document.getElementById('fileInput');
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag');}; dz.ondragleave=()=>dz.classList.remove('drag');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');[...e.dataTransfer.files].forEach(Import.process);};
    fi.onchange=e=>{[...e.target.files].forEach(Import.process);};
  }
};
window.ImportPage = ImportPage;
window.M_importManual=function(text){
  UI.form({ title:'Word 文本归类', fields:[
    {key:'cat',label:'归档到',type:'select',options:[{v:'notices',t:'通知'},{v:'research',t:'教研记录'},{v:'features',t:'特色工作'},{v:'comm',t:'家校记录'}]},
    {key:'title',label:'标题',value:'Word导入'},
    {key:'content',label:'内容',type:'textarea',value:text.slice(0,500)}],
    onSubmit:v=>{ if(v.cat==='notices')Store.add('notices',{title:v.title,content:v.content,type:'导入',time:new Date().toISOString().slice(0,10),read:[]});
      else if(v.cat==='research')Store.add('research',{type:'导入',title:v.title,content:v.content,time:new Date().toISOString().slice(0,10)});
      else if(v.cat==='features')Store.add('features',{cat:'班级特色活动',title:v.title,content:v.content,icon:'📌',time:new Date().toISOString().slice(0,10)});
      else Store.add('comms',{student:'—',parent:'—',time:new Date().toISOString().slice(0,10),way:'导入',content:v.content,feedback:''});
      UI.toast('已归档'); UI.closeModal(); App.refresh(); }});
};
})();
