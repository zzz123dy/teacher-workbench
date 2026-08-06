/* ===== modules.js · 各功能模块渲染（首页/班级管理/特色） ===== */
window.Modules = window.Modules || {};
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
window.esc = esc;

/* ---------- 首页工作台 ---------- */
Modules.home = function(){
  const db = Store.get();
  const students = Store.list('students');
  const todo = Store.list('todo');
  const notices = Store.list('notices');
  const features = Store.list('features');
  const msgs = Store.list('messages').filter(m=>m.unread);
  const exams = Store.list('exams');

  // 数据简报：最近一次考试班级平均
  let avgHtml='—';
  if(exams.length){
    const last = exams[exams.length-1];
    const sc = db.scores[last.id]||{};
    const subs = Object.keys(sc[Object.keys(sc)[0]]||{});
    let sum=0,cnt=0;
    Object.values(sc).forEach(m=>subs.forEach(s=>{ if(!isNaN(m[s])){sum+=m[s];cnt++;} }));
    avgHtml = cnt? (sum/cnt).toFixed(1):'—';
  }

  // 今日课程（按当前星期几取，周末显示周一）
  const wd = new Date().getDay(); const dayIdx = wd===0?1:(wd>5?1:wd);
  const dayName = ['周一','周二','周三','周四','周五','周一','周一'][wd===0?6:wd-1]||'周一';
  const todayClass = (db.timetable[dayName]||[]).map(c=>`<span class="pill b">${esc(c.节次)}节</span> ${esc(c.科目)} <span class="muted">${esc(c.教师)}</span>`).join('　')||'无课';

  // 学生提醒：任一最新考试体育低于70
  const lowStu=[];
  if(exams.length){ const last=exams[exams.length-1]; const sc=db.scores[last.id]||{};
    students.forEach(s=>{ const m=sc[s.id]; if(m && m['体育']!=null && m['体育']<70) lowStu.push(s.name+'('+m['体育']+')'); }); }

  const quickCards = [
    ['今日考勤','✅','查看/登记出勤','#todo'],['值日安排','🧹','今日值日小组','#duty'],
    ['作业提醒','📚','布置与提醒','#todo'],['成绩录入','📝','录入本次考试','#grades'],
    ['家校通知','📢','发布班级通知','#comm'],['班级事务','🗂️','待办与事务','#todo']
  ];
  const featCards = [
    ['班级特色活动','🎨','#features'],['德育活动','💜','#features'],['社团活动','🏀','#features'],
    ['科创项目','🔬','#features'],['学生成长记录','🌱','#features'],['班级荣誉','🏆','#features']
  ];

  const html = `
  <div class="grid cols-4">
    ${kpiBox('班级人数', students.length+' 人')}
    ${kpiBox('今日待办', todo.filter(t=>!t.done).length+' 项', 'w')}
    ${kpiBox('未读消息', msgs.length+' 条', 'r')}
    ${kpiBox('班级平均', avgHtml, 'g')}
  </div>

  <div class="grid cols-3 mt16">
    <div class="card" style="grid-column:span 2">
      <div class="section-title">今日课程 · ${dayName}<div class="line"></div></div>
      <div class="muted" style="line-height:2">${todayClass}</div>
      <div class="section-title mt16">班级动态<div class="line"></div></div>
      <div class="list">
        ${features.slice(0,3).map(f=>`<div class="list-item"><span style="font-size:22px">${f.icon||'📌'}</span><div><div style="font-weight:700">${esc(f.title)}</div><div class="muted" style="font-size:12px">${esc(f.cat)} · ${esc(f.time)}</div></div></div>`).join('')||'<div class="muted">暂无动态</div>'}
      </div>
    </div>
    <div class="card">
      <div class="section-title">最新通知<div class="line"></div></div>
      <div class="list">
        ${notices.slice(0,3).map(n=>`<div class="list-item"><div><div style="font-weight:700">${esc(n.title)}</div><div class="muted" style="font-size:12px">${esc(n.type)} · ${esc(n.time)}</div></div></div>`).join('')||'<div class="muted">暂无</div>'}
      </div>
      <div class="section-title mt16">学生提醒<div class="line"></div></div>
      <div class="muted" style="font-size:13px">${lowStu.length? '体育待加强：'+lowStu.join('、') : '暂无特别提醒'}</div>
    </div>
  </div>

  <div class="section-title mt16">常规工作<div class="line"></div></div>
  <div class="grid cols-3">
    ${quickCards.map(c=>`<div class="quick" onclick="App.go('${c[3].slice(1)}')"><span class="q-ico">${c[1]}</span><span class="q-title">${c[0]}</span><span class="q-tag">点击进入</span></div>`).join('')}
  </div>
  <div class="section-title mt16">特色工作<div class="line"></div></div>
  <div class="grid cols-3">
    ${featCards.map(c=>`<div class="quick" onclick="App.go('${c[2].slice(1)}')"><span class="q-ico">${c[1]}</span><span class="q-title">${c[0]}</span><span class="q-tag">点击进入</span></div>`).join('')}
  </div>`;
  return { html, bind:()=>{} };
};
function kpiBox(lab,num,color){
  const c = color==='g'?'var(--good)':color==='w'?'var(--warn)':color==='r'?'var(--bad)':'var(--p3)';
  return `<div class="kpi"><div class="k-lab">${lab}</div><div class="k-num" style="color:${c}">${num}</div></div>`;
}

/* ---------- 班级信息 ---------- */
Modules.classInfo = function(){
  const c = Store.get().classInfo;
  const html = `
  <div class="crumbs">班级管理 / 班级信息</div>
  <div class="card">
    <div class="flex between center">
      <div class="section-title" style="margin:0">${esc(c.name)}<div class="line"></div></div>
      <button class="btn primary sm" onclick="UI.form(Modules.classInfoFields())">✏️ 编辑</button>
    </div>
    <div class="grid cols-2 mt16">
      ${infoRow('年级', c.grade)} ${infoRow('班主任', c.headTeacher)}
      ${infoRow('班级人数', Store.classCount()+' 人')}
      ${infoRow('任课教师', (Store.get().classInfo.teachers||[]).map(t=>t.subject+'·'+t.name).join('，')||'—')}
    </div>
    <div class="field mt16"><label>班级简介</label><div class="muted" style="line-height:1.7">${esc(c.intro)}</div></div>
    <div class="section-title mt16">任课教师列表<div class="line"></div></div>
    <div class="table-wrap"><table><thead><tr><th>学科</th><th>教师</th><th>操作</th></tr></thead><tbody>
      ${(Store.get().classInfo.teachers||[]).map((t,i)=>`<tr><td>${esc(t.subject)}</td><td>${esc(t.name)}</td><td><button class="btn sm danger" onclick="Modules.delTeacher(${i})">删除</button></td></tr>`).join('')}
    </tbody></table></div>
    <button class="btn sm mt16" onclick="Modules.addTeacher()">+ 添加任课教师</button>
  </div>`;
  return { html, bind:()=>{} };
};
function infoRow(k,v){ return `<div class="field"><label>${k}</label><div style="font-weight:700">${esc(v)||'—'}</div></div>`; }
Modules.classInfoFields = function(){
  const c = Store.get().classInfo;
  return { title:'编辑班级信息',
    fields:[
      {key:'name',label:'班级名称',value:c.name},
      {key:'grade',label:'年级',value:c.grade},
      {key:'headTeacher',label:'班主任',value:c.headTeacher},
      {key:'intro',label:'班级简介',type:'textarea',value:c.intro}
    ],
    onSubmit:v=>{ Store.update(d=>{ d.classInfo.name=v.name; d.classInfo.grade=v.grade; d.classInfo.headTeacher=v.headTeacher; d.classInfo.intro=v.intro; }); UI.toast('已保存'); UI.closeModal(); App.refresh(); },
    onDelete:null };
};
Modules.addTeacher = function(){
  UI.form({ title:'添加任课教师', fields:[
    {key:'subject',label:'学科'},{key:'name',label:'教师姓名'}],
    onSubmit:v=>{ Store.update(d=>{ d.classInfo.teachers=d.classInfo.teachers||[]; d.classInfo.teachers.push(v); }); UI.toast('已添加'); UI.closeModal(); App.refresh(); }});
};
Modules.delTeacher = function(i){ UI.confirm('确定删除该任课教师？',()=>{ Store.update(d=>{ d.classInfo.teachers.splice(i,1); }); App.refresh(); }); };

/* ---------- 花名册 ---------- */
Modules.roster = function(){
  const list = Store.list('students');
  const html = `
  <div class="crumbs">班级管理 / 花名册</div>
  <div class="flex between center wrap gap8">
    <div class="section-title" style="margin:0">花名册（${list.length} 人）<div class="line"></div></div>
    <div class="flex gap8">
      <button class="btn sm" onclick="ImportPage.open()">📥 Excel导入</button>
      <button class="btn primary sm" onclick="Modules.studentForm()">+ 添加学生</button>
    </div>
  </div>
  <div class="table-wrap mt16"><table>
    <thead><tr><th>姓名</th><th>性别</th><th>学号</th><th>联系电话</th><th>家长</th><th>学习情况</th><th>操作</th></tr></thead>
    <tbody>
    ${list.map(s=>`<tr>
      <td><b>${esc(s.name)}</b></td><td>${esc(s.gender)}</td><td>${esc(s.sid)}</td>
      <td>${esc(s.phone)}</td><td>${esc(s.parent)}</td><td class="muted">${esc(s.study)}</td>
      <td class="flex gap8">
        <button class="btn sm" onclick="App.go('archive','${s.id}')">档案</button>
        <button class="btn sm" onclick="Modules.studentForm('${s.id}')">改</button>
        <button class="btn sm danger" onclick="Modules.delStudent('${s.id}')">删</button>
      </td></tr>`).join('')}
    </tbody></table></div>`;
  return { html, bind:()=>{} };
};
Modules.studentForm = function(id){
  const s = id? Store.find('students',id):{};
  UI.form({ title: id?'编辑学生':'添加学生', fields:[
    {key:'name',label:'姓名',value:s.name},{key:'gender',label:'性别',type:'select',options:[{v:'男',t:'男'},{v:'女',t:'女'}],value:s.gender},
    {key:'sid',label:'学号',value:s.sid},{key:'phone',label:'联系电话',value:s.phone},
    {key:'parent',label:'家长',value:s.parent},{key:'parentPhone',label:'家长电话',value:s.parentPhone},
    {key:'birth',label:'出生日期',value:s.birth},{key:'address',label:'家庭住址',value:s.address},
    {key:'family',label:'家庭情况',value:s.family},{key:'study',label:'学习情况',type:'textarea',value:s.study},
    {key:'rewards',label:'奖惩记录',value:s.rewards}
  ],   onSubmit:v=>{
    if(id) Store.replace('students',id,v); else Store.add('students',Object.assign({classId:curClass},v));
    Store.set('classInfo.count', Store.list('students').length);
    UI.toast('已保存'); UI.closeModal(); App.refresh();
  }, onDelete: id? ()=>Modules.delStudent(id):null });
};
Modules.delStudent = function(id){ UI.confirm('删除该学生将同时移除其成绩与档案，确定？',()=>{
  Store.remove('students',id);
  Store.update(d=>{ Object.keys(d.scores).forEach(e=>delete d.scores[e][id]); });
  Store.set('classInfo.count', Store.list('students').length);
  App.refresh();
}); };

/* ---------- 学生管理（班级列表 + 学生信息维护） ---------- */
let curClass = 'cls_main';
Modules.studentsManage = function(){
  const db = Store.get();
  const classes = (db.classes && db.classes.length)? db.classes :
    [{id:'cls_main',name:db.classInfo.name,grade:db.classInfo.grade,headTeacher:db.classInfo.headTeacher,count:Store.classCount()}];
  const list = Store.list('students').filter(s=>(s.classId||'cls_main')===curClass);
  const html = `
  <div class="crumbs">学情 & 学生 / 学生管理</div>
  <div class="section-title">班级列表<div class="line"></div></div>
  <div class="grid cols-3">
    ${classes.map(c=>`<div class="card" style="cursor:pointer" onclick="M_selClass('${c.id}')">
      <div style="font-weight:800">${esc(c.name)}</div>
      <div class="muted" style="font-size:12px">${esc(c.grade)} · 班主任 ${esc(c.headTeacher)}</div>
      <span class="pill" style="margin-top:8px">${Store.list('students').filter(s=>(s.classId||'cls_main')===c.id).length} 人</span>
      <div class="flex gap8 mt8"><button class="btn sm" onclick="event.stopPropagation();Modules.classForm('${c.id}')">改</button>
      ${classes.length>1?`<button class="btn sm danger" onclick="event.stopPropagation();Modules.delClass('${c.id}')">删</button>`:''}</div>
    </div>`).join('')}
    <div class="card" style="display:grid;place-items:center;cursor:pointer;border-style:dashed" onclick="Modules.classForm()">＋ 新增班级</div>
  </div>
  <div class="flex between center mt16"><div class="section-title" style="margin:0">学生信息维护<div class="line"></div></div>
    <button class="btn primary sm" onclick="Modules.studentForm()">+ 添加学生</button></div>
  <div class="table-wrap"><table><thead><tr><th>姓名</th><th>性别</th><th>学号</th><th>联系电话</th><th>家长</th><th>学习情况</th><th>操作</th></tr></thead>
  <tbody>${list.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.gender)}</td><td>${esc(s.sid)}</td><td>${esc(s.phone)}</td><td>${esc(s.parent)}</td><td class="muted">${esc(s.study)}</td>
    <td class="flex gap8"><button class="btn sm" onclick="App.go('archive','${s.id}')">档案</button><button class="btn sm" onclick="Modules.studentForm('${s.id}')">改</button><button class="btn sm danger" onclick="Modules.delStudent('${s.id}')">删</button></td></tr>`).join('')}</tbody></table></div>`;
  return { html, bind:()=>{} };
};
window.M_selClass=function(id){ curClass=id; App.refresh(); };
Modules.classForm=function(id){
  const c = id? (Store.get().classes.find(x=>x.id===id)) : {};
  UI.form({ title:id?'编辑班级':'新增班级', fields:[
    {key:'name',label:'班级名称',value:c.name},{key:'grade',label:'年级',value:c.grade},
    {key:'headTeacher',label:'班主任',value:c.headTeacher}],
    onSubmit:v=>{
      if(id) Store.update(d=>{ const x=d.classes.find(y=>y.id===id); if(x) Object.assign(x,v); });
      else { const nid='cls_'+Date.now(); Store.update(d=>{ d.classes=d.classes||[]; d.classes.push(Object.assign({id:nid,count:0},v)); }); curClass=nid; }
      UI.toast('已保存'); UI.closeModal(); App.refresh();
    },
    onDelete: id? ()=>Modules.delClass(id):null });
};
Modules.delClass=function(id){ UI.confirm('删除班级将同时移除其学生与成绩，确定？',()=>{
  Store.update(d=>{ d.classes=d.classes.filter(x=>x.id!==id);
    d.students=d.students.filter(s=>(s.classId||'cls_main')!==id);
    Object.keys(d.scores).forEach(e=>{ Object.keys(d.scores[e]).forEach(sid=>{ if(!(d.students.find(x=>x.id===sid))) delete d.scores[e][sid]; }); });
  });
  if(curClass===id) curClass='cls_main';
  App.refresh();
}); };


/* ---------- 学生档案 ---------- */
Modules.archive = function(id){
  const s = Store.find('students',id) || Store.list('students')[0];
  if(!s) return { html:'<div class="muted">暂无学生</div>', bind:()=>{} };
  const db = Store.get();
  const exams = Store.list('exams');
  // 各科趋势
  const subs = Object.keys((db.scores[exams[0]&&exams[0].id]&&db.scores[exams[0].id][s.id])||{});
  const labels = exams.map(e=>e.name);
  const series = subs.slice(0,4).map((sub,i)=>({name:sub,color:['#c084fc','#60a5fa','#34d399','#fbbf24'][i],
    points: exams.map(e=>(db.scores[e.id]&&db.scores[e.id][s.id]&&db.scores[e.id][s.id][sub])||0)}));
  const html = `
  <div class="crumbs">班级管理 / 学生档案 · ${esc(s.name)}</div>
  <div class="flex between center wrap gap8">
    <div class="section-title" style="margin:0">${esc(s.name)} 的档案<div class="line"></div></div>
    <button class="btn sm" onclick="Modules.studentForm('${s.id}')">✏️ 编辑基础信息</button>
  </div>
  <select class="btn sm mt16" onchange="App.go('archive',this.value)">
    ${Store.list('students').map(x=>`<option value="${x.id}" ${x.id===s.id?'selected':''}>${esc(x.name)}</option>`).join('')}
  </select>
  <div class="grid cols-3 mt16">
    <div class="card"><div class="section-title">基础信息<div class="line"></div></div>
      ${infoRow('性别',s.gender)}${infoRow('出生',s.birth)}${infoRow('学号',s.sid)}
      ${infoRow('家长',s.parent)}${infoRow('家长电话',s.parentPhone)}${infoRow('家庭住址',s.address)}
      <div class="field"><label>家庭情况</label><div class="muted">${esc(s.family)}</div></div>
    </div>
    <div class="card" style="grid-column:span 2"><div class="section-title">学习信息 · 成绩趋势<div class="line"></div></div>
      <div class="chart-box" id="archChart"></div>
      <div class="table-wrap mt16"><table><thead><tr><th>考试</th>${subs.map(x=>`<th>${x}</th>`).join('')}</tr></thead>
      <tbody>${exams.map(e=>`<tr><td>${esc(e.name)}</td>${subs.map(sub=>`<td>${esc(db.scores[e.id]&&db.scores[e.id][s.id]&&db.scores[e.id][s.id][sub])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </div>
  </div>
  <div class="grid cols-2 mt16">
    <div class="card"><div class="section-title">综合评价<div class="line"></div></div>
      ${Modules.archiveEdit(s)}
    </div>
    <div class="card"><div class="section-title">成长记录<div class="line"></div></div>
      <div class="list">${Modules.growthList(s.id)}</div>
      <button class="btn sm mt16" onclick="Modules.addGrowth('${s.id}')">+ 添加成长记录</button>
    </div>
  </div>`;
  return { html, bind:()=>{ Charts.line('archChart', labels, series); } };
};
Modules.archiveEdit = function(s){
  const a = Store.get().archives[s.id]||{};
  return `<div class="field"><label>优点</label><div class="muted">${esc(a.advantage||s.advantage||'—')}</div></div>
    <div class="field"><label>问题</label><div class="muted">${esc(a.weak||s.weak||'—')}</div></div>
    <div class="field"><label>教师评价</label><div class="muted">${esc(a.comment||'—')}</div></div>
    <button class="btn sm" onclick="Modules.editComment('${s.id}')">✏️ 编辑评价</button>`;
};
Modules.editComment = function(id){
  const a = Store.get().archives[id]||{};
  UI.form({ title:'编辑综合评价', fields:[
    {key:'advantage',label:'优点',type:'textarea',value:a.advantage||''},
    {key:'weak',label:'问题',type:'textarea',value:a.weak||''},
    {key:'comment',label:'教师评价',type:'textarea',value:a.comment||''}],
    onSubmit:v=>{ Store.update(d=>{ d.archives[id]=Object.assign(d.archives[id]||{},v); }); UI.toast('已保存'); UI.closeModal(); App.refresh(); }});
};
Modules.growthList = function(id){
  const arr = (Store.get().archives[id]&&Store.get().archives[id].growth)||[];
  return arr.length? arr.map(g=>`<div class="list-item"><div><div style="font-weight:700">${esc(g.title)}</div><div class="muted" style="font-size:12px">${esc(g.time)}</div><div>${esc(g.text)}</div></div></div>`).join('')
    : '<div class="muted">暂无成长记录</div>';
};
Modules.addGrowth = function(id){
  UI.form({ title:'添加成长记录', fields:[
    {key:'title',label:'标题'},{key:'time',label:'时间',value:new Date().toISOString().slice(0,10)},
    {key:'text',label:'内容',type:'textarea'}],
    onSubmit:v=>{ Store.update(d=>{ d.archives[id]=d.archives[id]||{}; d.archives[id].growth=d.archives[id].growth||[]; d.archives[id].growth.unshift(v); }); UI.toast('已添加'); UI.closeModal(); App.refresh(); }});
};

/* ---------- 特色工作 ---------- */
Modules.features = function(){
  const list = Store.list('features');
  const html = `
  <div class="crumbs">首页 / 特色工作</div>
  <div class="flex between center"><div class="section-title" style="margin:0">特色工作<div class="line"></div></div>
    <button class="btn primary sm" onclick="Modules.featureForm()">+ 新增</button></div>
  <div class="grid cols-3 mt16">
    ${list.map(f=>`<div class="card">
      <div class="flex between center"><span style="font-size:26px">${f.icon||'📌'}</span>
        <div class="flex gap8"><button class="btn sm" onclick="Modules.featureForm('${f.id}')">改</button><button class="btn sm danger" onclick="Modules.delFeature('${f.id}')">删</button></div></div>
      <div style="font-weight:800;margin-top:8px">${esc(f.title)}</div>
      <span class="pill" style="margin:8px 0">${esc(f.cat)}</span>
      <div class="muted" style="font-size:13px;line-height:1.6">${esc(f.content)}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">${esc(f.time)}</div>
    </div>`).join('')}
  </div>`;
  return { html, bind:()=>{} };
};
Modules.featureForm = function(id){
  const f = id? Store.find('features',id):{};
  UI.form({ title:id?'编辑特色工作':'新增特色工作', fields:[
    {key:'cat',label:'分类',type:'select',options:[{v:'班级特色活动',t:'班级特色活动'},{v:'德育活动',t:'德育活动'},{v:'社团活动',t:'社团活动'},{v:'科创项目',t:'科创项目'},{v:'学生成长',t:'学生成长'},{v:'班级荣誉',t:'班级荣誉'}],value:f.cat},
    {key:'title',label:'标题',value:f.title},{key:'icon',label:'图标(emoji)',value:f.icon||'📌'},
    {key:'content',label:'内容',type:'textarea',value:f.content},
    {key:'time',label:'时间',value:f.time||new Date().toISOString().slice(0,10)}],
    onSubmit:v=>{ if(id) Store.replace('features',id,v); else Store.add('features',v); UI.toast('已保存'); UI.closeModal(); App.refresh(); },
    onDelete: id? ()=>Modules.delFeature(id):null });
};
Modules.delFeature = function(id){ UI.confirm('确定删除？',()=>{ Store.remove('features',id); App.refresh(); }); };

/* ---------- 待办（今日考勤/作业/班级事务入口） ---------- */
Modules.todo = function(){
  const list = Store.list('todo');
  const html = `
  <div class="crumbs">首页 / 待办事项</div>
  <div class="flex between center"><div class="section-title" style="margin:0">今日待办（${list.filter(t=>!t.done).length} 项）<div class="line"></div></div>
    <button class="btn primary sm" onclick="M_todoForm()">+ 添加</button></div>
  <div class="list mt16">
    ${list.map(t=>`<div class="list-item"><input type="checkbox" ${t.done?'checked':''} onchange="M_todoToggle('${t.id}')" style="width:18px;height:18px">
      <div style="flex:1;${t.done?'text-decoration:line-through;opacity:.6':''}"><b>${esc(t.text)}</b><div class="muted" style="font-size:12px">${esc(t.date)}</div></div>
      <button class="btn sm danger" onclick="M_todoDel('${t.id}')">删</button></div>`).join('')||'<div class="muted">暂无待办</div>'}
  </div>`;
  return { html, bind:()=>{} };
};
window.M_todoForm = function(){ UI.form({ title:'添加待办', fields:[
  {key:'text',label:'内容'},{key:'date',label:'日期',value:new Date().toISOString().slice(0,10)}],
  onSubmit:v=>{ Store.add('todo',{done:false,text:v.text,date:v.date}); UI.toast('已添加'); UI.closeModal(); App.refresh(); }}); };
window.M_todoToggle = function(id){ const t=Store.find('todo',id); if(t) Store.replace('todo',id,{done:!t.done}); App.refresh(); };
window.M_todoDel = function(id){ UI.confirm('删除？',()=>{ Store.remove('todo',id); App.refresh(); }); };
