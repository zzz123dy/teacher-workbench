/* ===== store.js · 本地数据库（localStorage 持久化） ===== */
(function(){
  const KEY = 'teacher_workbench_v1';
  const listeners = [];

  // 数据库结构（也是交付物之一）：所有数据以对象集合存放
  const defaultDB = {
    meta: { teacherName:'体育老师', teacherTitle:'中小学一级教师', subject:'体育', role:'班主任',
            school:'示例实验学校', grade:'八年级', classNo:'3', className:'八年（3）班' },
    classInfo: { name:'八年（3）班', grade:'八年级', headTeacher:'体育老师', teachers:[],
                 count:0, intro:'阳光、团结、向上的集体。' },
    classes: [],          // 班级列表（多班级）：{id,name,grade,headTeacher,count}
    students: [],         // 花名册 / 学生档案（含 classId）
    exams: [],            // 考试（月考/期中/期末…）
    scores: {},           // { examId: { studentId: { 科目: 分数 } } }
    timetable: {},        // { 周一:[{节次,科目,教师}], ... }
    duty: [],             // 值日安排
    seating: { '当前座位':[], '考试座位':[], '特殊安排':[] },
    notices: [],          // 通知/家校
    messages: [],         // 消息中心（系统/学校/家长/教研）
    comms: [],            // 家校沟通记录
    resources: [],        // 我的资源
    research: [],         // 教研工具（教研/听课/活动）
    todo: [],             // 待办
    features: [],         // 特色工作（班级特色/德育/社团/科创/成长/荣誉）
    archives: {}          // 学生档案备注
  };

  let db = load();

  // ---- 云端同步状态 ----
  let cloudOn=false, cloudWorkspace=null, suppressPush=false, pushTimer=null;

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(raw) return Object.assign(JSON.parse(JSON.stringify(defaultDB)), JSON.parse(raw));
    }catch(e){}
    return JSON.parse(JSON.stringify(defaultDB));
  }
  function save(){ localStorage.setItem(KEY, JSON.stringify(db)); listeners.forEach(f=>f(db)); if(cloudOn && !suppressPush) schedulePush(); }
  function reset(){ db = JSON.parse(JSON.stringify(defaultDB)); save(); }

  // 防抖推送到云端
  function schedulePush(){
    clearTimeout(pushTimer);
    pushTimer=setTimeout(()=>{ if(!cloudOn) return;
      Cloud.save(cloudWorkspace, db).catch(e=>{ if(window.UI) UI.toast('云端同步失败：'+(e&&e.message||e)); }); }, 500);
  }

  // 连接云端：拉取远程覆盖本地，并订阅实时变更
  function setCloud(c){
    if(!c || !c.url || !c.anonKey || !c.workspace) return;
    cloudWorkspace = c.workspace;
    Cloud.saveConfig(c);
    if(window.__wbUnsub){ try{ window.__wbUnsub(); }catch(e){} window.__wbUnsub=null; }
    Cloud.configure(c.url, c.anonKey).then(()=>{ cloudOn=true; return Cloud.load(cloudWorkspace); })
      .then(remote=>{
        suppressPush=true;
        if(remote) db = Object.assign(JSON.parse(JSON.stringify(defaultDB)), remote);
        localStorage.setItem(KEY, JSON.stringify(db));
        suppressPush=false;
        listeners.forEach(f=>f(db)); if(window.App) App.refresh();
        if(!remote) Cloud.save(cloudWorkspace, db).catch(()=>{}); // 首次：把本地上传建行
        window.__wbUnsub = Cloud.subscribe(cloudWorkspace, remoteData=>{
          suppressPush=true;
          db = Object.assign(JSON.parse(JSON.stringify(defaultDB)), remoteData);
          localStorage.setItem(KEY, JSON.stringify(db));
          suppressPush=false;
          listeners.forEach(f=>f(db)); if(window.App) App.refresh();
        });
      })
      .catch(err=>{ cloudOn=false; if(window.UI) UI.toast('云端连接失败：'+(err&&err.message||err)); });
  }

  function disconnectCloud(){
    cloudOn=false; cloudWorkspace=null;
    if(window.__wbUnsub){ try{ window.__wbUnsub(); }catch(e){} window.__wbUnsub=null; }
    Cloud.clearConfig();
  }

  // 启动：若已保存过云端配置，自动重连
  function init(){
    const c = Cloud.getConfig();
    if(c && c.url && c.anonKey && c.workspace) setCloud(c);
  }

  function get(){ return db; }
  function set(path, val){ // path: "a.b.c"
    const ks = path.split('.'); let o = db;
    for(let i=0;i<ks.length-1;i++) o = o[ks[i]];
    o[ks[ks.length-1]] = val; save();
  }
  function update(mutator){ mutator(db); save(); }
  function subscribe(f){ listeners.push(f); }

  // 通用集合 CRUD：collection 为 db 中的数组字段名
  function list(col){ return db[col] || []; }
  function add(col, item){
    const arr = db[col] || (db[col]=[]);
    item.id = item.id || (col.slice(0,3)+'_'+Date.now()+Math.floor(Math.random()*900+100));
    arr.unshift(item); save(); return item;
  }
  function remove(col, id){ db[col] = (db[col]||[]).filter(x=>x.id!==id); save(); }
  function replace(col, id, patch){
    const arr = db[col]||[]; const i = arr.findIndex(x=>x.id===id);
    if(i>=0){ arr[i]=Object.assign({},arr[i],patch); save(); return arr[i]; } return null;
  }
  function find(col, id){ return (db[col]||[]).find(x=>x.id===id); }

  // 学生相关便捷方法
  function studentById(id){ return db.students.find(s=>s.id===id); }
  function classCount(){ return db.students.length; }

  // 简单 id 生成
  function uid(p){ return (p||'id')+'_'+Date.now()+Math.floor(Math.random()*900+100); }

  // 导出/导入整库（用于“支持不同教师、不同班级快速复制使用”）
  function exportDB(){ return JSON.stringify(db,null,2); }
  function importDB(json){
    const data = JSON.parse(json);
    db = Object.assign(JSON.parse(JSON.stringify(defaultDB)), data); save();
  }

  window.Store = { get, set, update, subscribe, list, add, remove, replace, find,
                   studentById, classCount, uid, reset, exportDB, importDB, KEY,
                   setCloud, disconnectCloud, isCloud:()=>cloudOn, init };
})();
