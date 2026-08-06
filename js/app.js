/* ===== app.js · 主控：导航 / 路由 / UI 组件 ===== */
window.App = (function(){
  // 导航结构（与需求模块一一对应）
  const NAV = [
    { title:'首页工作台', items:[ {id:'home',label:'工作台首页',icon:'🏠'} ] },
    { title:'班级管理', items:[
      {id:'classInfo',label:'班级信息',icon:'🏫'}, {id:'roster',label:'花名册',icon:'👥'},
      {id:'archive',label:'学生档案',icon:'📇'} ] },
    { title:'班级事务', items:[
      {id:'seating',label:'座次表',icon:'🪑'}, {id:'duty',label:'值日表',icon:'🧹'},
      {id:'timetable',label:'课表',icon:'📅'} ] },
    { title:'学情 & 学生', items:[
      {id:'analytics',label:'学情分析',icon:'📊'}, {id:'students',label:'学生管理',icon:'🧑‍🎓'} ] },
    { title:'成绩管理', items:[ {id:'grades',label:'成绩管理',icon:'📝'} ] },
    { title:'家校沟通', items:[ {id:'comm',label:'家校沟通',icon:'💬'} ] },
    { title:'资源与工具', items:[ {id:'resources',label:'资源与工具',icon:'📚'} ] },
    { title:'消息中心', items:[ {id:'messages',label:'消息中心',icon:'🔔'} ] },
    { title:'个人中心', items:[ {id:'profile',label:'个人中心',icon:'⚙️'} ] },
    { title:'数据导入', items:[ {id:'import',label:'导入数据',icon:'📥'} ] }
  ];
  const TITLES = {};
  NAV.forEach(g=>g.items.forEach(i=>TITLES[i.id]=i.label));

  let current='home', param=null;

  // 路由映射
  function route(id){
    switch(id){
      case 'home': return Modules.home();
      case 'classInfo': return Modules.classInfo();
      case 'roster': return Modules.roster();
      case 'students': return Modules.studentsManage();
      case 'archive': return Modules.archive(param);
      case 'features': return Modules.features();
      case 'todo': return Modules.todo();
      case 'seating': return Modules.seating();
      case 'duty': return Modules.duty();
      case 'timetable': return Modules.timetable();
      case 'analytics': return Modules.analytics();
      case 'grades': return Modules.grades();
      case 'comm': return Modules.comm();
      case 'resources': return Modules.resources();
      case 'messages': return Modules.messages();
      case 'profile': return Modules.profile();
      case 'import': return importPage();
      default: return Modules.home();
    }
  }
  function importPage(){
    return { html:`<div class="card" style="max-width:680px"><div class="section-title">数据导入<div class="line"></div></div>
      <div class="muted" style="line-height:1.8">上传 Excel / Word，系统将<b>自动识别</b>文件类型并分类归档到对应模块：学生信息、成绩、课表、座次、值日、班级资料。识别后可一键进入对应页面查看。</div>
      <button class="btn primary mt16" onclick="ImportPage.open()">📥 选择文件导入</button></div>`, bind:()=>{} };
  }

  function renderNav(){
    const nav=document.getElementById('nav');
    nav.innerHTML = NAV.map(g=>`<div class="nav-group">${g.title}</div>`+g.items.map(i=>
      `<div class="nav-item ${i.id===current?'active':''}" data-id="${i.id}">
      <span class="nav-ico">${i.icon}</span><span class="nav-label">${i.label}</span></div>`).join('')).join('');

    // 底部导航（移动端快捷 5 项）
    const bn=document.getElementById('bottomNav');
    const quick=[['home','🏠','首页'],['roster','👥','花名册'],['seating','🪑','座次'],
      ['analytics','📊','学情'],['messages','🔔','消息']];
    bn.innerHTML = quick.map(q=>`<div class="bn ${q[0]===current?'active':''}" onclick="App.go('${q[0]}')"><span class="bn-ico">${q[1]}</span>${q[2]}</div>`).join('');
  }

  function render(){
    const r = route(current);
    const content=document.getElementById('content');
    content.innerHTML = r.html;
    document.getElementById('pageTitle').textContent = TITLES[current]||'工作台';
    renderNav();
    if(r.bind) r.bind(content);
    applyPermissions(content);
    updateTopUser();
    window.scrollTo(0,0);
  }

  function go(id, p){
    current=id; param=p||null;
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
    render();
  }

  function refresh(){ render(); }

  // 权限设计：任课教师为只读，隐藏所有新增/修改/删除按钮
  function applyPermissions(root){
    const role = Store.get().meta.role;
    if(role!=='任课教师') return;
    root.querySelectorAll('button').forEach(b=>{
      const t=b.textContent.trim();
      const editVerbs=['改','删','编辑','新增','添加','发布','发送','+','保存','💾'];
      if(b.classList.contains('danger') || editVerbs.some(k=>t.includes(k)))
        b.style.display='none';
    });
  }

  function updateTopUser(){
    const m=Store.get().meta;
    const ini=(m.teacherName||'师')[0];
    document.getElementById('sideAvatar').textContent=ini;
    document.getElementById('topAvatar').textContent=ini;
    document.getElementById('sideName').textContent=m.teacherName;
    document.getElementById('sideRole').textContent=m.role+' · '+m.className;
    updateBadge();
  }

  function updateBadge(){
    const n=Store.list('messages').filter(m=>m.unread).length;
    const b=document.getElementById('msgBadge');
    if(n>0){ b.hidden=false; b.textContent=n; } else b.hidden=true;
  }

  /* ---------- UI 组件 ---------- */
  const UI = {
    toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.hidden=false;
      clearTimeout(t._t); t._t=setTimeout(()=>t.hidden=true,1800); },
    modal(html){ const root=document.getElementById('modalRoot'); root.innerHTML=`<div class="modal">${html}</div>`;
      document.getElementById('overlay').classList.add('show');
      requestAnimationFrame(()=>root.querySelector('.modal').classList.add('show')); },
    closeModal(){ document.getElementById('overlay').classList.remove('show');
      const m=document.querySelector('#modalRoot .modal'); if(m)m.classList.remove('show');
      setTimeout(()=>document.getElementById('modalRoot').innerHTML='',200); },
    confirm(msg, cb){ UI.modal(`<div class="modal-head"><h3>请确认</h3></div>
      <div class="muted" style="line-height:1.7">${esc(msg)}</div>
      <div class="modal-actions"><button class="btn" onclick="UI.closeModal()">取消</button>
      <button class="btn danger" onclick="UI._c()">确定</button></div>`);
      UI._c=()=>{ UI.closeModal(); cb(); }; },
    form(cfg){ // cfg:{title,fields:[{key,label,type,value,options,placeholder}],onSubmit,onDelete}
      const fields=(cfg.fields||[]).map(f=>{
        const val=esc(f.value==null?'':f.value);
        let ctrl;
        if(f.type==='textarea') ctrl=`<textarea id="f_${f.key}" placeholder="${esc(f.placeholder||'')}">${val}</textarea>`;
        else if(f.type==='select') ctrl=`<select id="f_${f.key}">${(f.options||[]).map(o=>`<option value="${esc(o.v)}" ${o.v==f.value?'selected':''}>${esc(o.t||o.v)}</option>`).join('')}</select>`;
        else ctrl=`<input id="f_${f.key}" type="${f.type==='number'?'number':'text'}" value="${val}" placeholder="${esc(f.placeholder||'')}">`;
        return `<div class="field"><label>${esc(f.label)}</label>${ctrl}</div>`;
      }).join('');
      const del = cfg.onDelete? `<button class="btn danger" onclick="UI._d()">删除</button>`:'';
      UI.modal(`<div class="modal-head"><h3>${esc(cfg.title)}</h3><button class="close" onclick="UI.closeModal()">×</button></div>
        ${fields}
        <div class="modal-actions">${del}<button class="btn" onclick="UI.closeModal()">取消</button><button class="btn primary" onclick="UI._s()">保存</button></div>`);
      UI._s=()=>{ const v={}; (cfg.fields||[]).forEach(f=>{ const el=document.getElementById('f_'+f.key);
        v[f.key]= el? el.value.trim():''; }); cfg.onSubmit(v); };
      UI._d=()=>{ UI.closeModal(); cfg.onDelete(); };
    }
  };
  window.UI = UI;

  /* ---------- 导入结果处理 ---------- */
  function afterImport(res){
    if(res.type==='word'){ UI.closeModal(); M_importManual(res.wordText||''); return; }
    const labelMap={students:'学生信息',scores:'成绩',timetable:'课表',seating:'座次表',duty:'值日表',unknown:'未识别',word:'Word文档'};
    if(res.type==='unknown'){
      UI.modal(`<div class="modal-head"><h3>未能自动识别</h3><button class="close" onclick="UI.closeModal()">×</button></div>
        <div class="muted" style="line-height:1.7">系统未判断出文件类型，请手动选择归档位置：</div>
        <div class="flex gap8 wrap mt16">
          <button class="btn" onclick="UI.closeModal();App.go('roster')">📥 学生信息</button>
          <button class="btn" onclick="UI.closeModal();App.go('grades')">📥 成绩</button>
          <button class="btn" onclick="UI.closeModal();App.go('timetable')">📥 课表</button>
          <button class="btn" onclick="UI.closeModal();App.go('seating')">📥 座次</button>
          <button class="btn" onclick="UI.closeModal();App.go('duty')">📥 值日</button>
        </div>`);
      return;
    }
    const msg = res.msg? ('（'+res.msg+'）') : '';
    UI.modal(`<div class="modal-head"><h3>导入完成</h3><button class="close" onclick="UI.closeModal()">×</button></div>
      <div class="muted" style="line-height:1.8">已识别为 <b>${labelMap[res.type]||res.type}</b>${res.count?('，成功归档 <b>'+res.count+'</b> 条'):''}。${msg}</div>
      <div class="modal-actions"><button class="btn" onclick="UI.closeModal()">关闭</button>
      <button class="btn primary" onclick="UI.closeModal();App.go('${res.type==='students'?'roster':res.type==='scores'?'grades':res.type==='timetable'?'timetable':res.type==='seating'?'seating':res.type==='duty'?'duty':'home'}')">查看</button></div>`);
    updateBadge();
  }

  /* ---------- 搜索 ---------- */
  function doSearch(q){
    q=q.trim(); if(!q) return;
    const st=Store.list('students').filter(s=>s.name.includes(q)||(s.sid||'').includes(q));
    const no=Store.list('notices').filter(n=>n.title.includes(q)||n.content.includes(q));
    let html=`<div class="modal-head"><h3>搜索：“${esc(q)}”</h3><button class="close" onclick="UI.closeModal()">×</button></div>`;
    html+=`<div class="section-title">学生（${st.length}）<div class="line"></div></div>`;
    html+= st.length? st.map(s=>`<div class="list-item"><div style="font-weight:700">${esc(s.name)}</div><button class="btn sm" onclick="UI.closeModal();App.go('archive','${s.id}')">档案</button></div>`).join('') : '<div class="muted">无匹配</div>';
    html+=`<div class="section-title mt16">通知（${no.length}）<div class="line"></div></div>`;
    html+= no.length? no.map(n=>`<div class="list-item"><div style="font-weight:700">${esc(n.title)}</div></div>`).join('') : '<div class="muted">无匹配</div>';
    UI.modal(html);
  }

  /* ---------- 初始化 ---------- */
  function init(){
    Data.seed();
    // 侧栏收缩
    document.getElementById('sidebarToggle').onclick=()=>document.getElementById('sidebar').classList.toggle('mini');
    // 移动端抽屉
    document.getElementById('menuBtn').onclick=()=>{ document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('show'); };
    document.getElementById('overlay').onclick=()=>{ document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); };
    // 顶栏按钮
    document.getElementById('importBtn').onclick=()=>ImportPage.open();
    document.getElementById('bellBtn').onclick=()=>go('messages');
    document.getElementById('globalSearch').addEventListener('keydown',e=>{ if(e.key==='Enter') doSearch(e.target.value); });
    // 窗口缩放：回到宽屏时清理移动端抽屉/遮罩残留，避免遮罩挡住侧栏点击
    window.addEventListener('resize',()=>{ if(window.innerWidth>860){
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('overlay').classList.remove('show');
    } });
    // 导航点击委托（与内联 onclick 双保险，确保左侧栏始终可选）
    document.getElementById('nav').addEventListener('click',e=>{
      const item=e.target.closest('.nav-item'); if(item&&item.dataset.id) go(item.dataset.id);
    });
    // 点击遮罩关闭弹窗
    document.getElementById('overlay').addEventListener('click',()=>{ if(document.querySelector('#modalRoot .modal')) UI.closeModal(); });
    render();
    // 若已保存过云端配置，自动重连并拉取远程数据
    if(window.Store && Store.init) Store.init();
  }

  return { go, refresh, init, updateBadge, afterImport };
})();

document.addEventListener('DOMContentLoaded', App.init);
