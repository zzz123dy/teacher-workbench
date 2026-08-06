/* ===== import.js · Excel/Word 上传自动识别与分类归档 ===== */
window.Import = (function(){
  // 把工作表转为对象数组
  function sheetToRows(ws){
    const json = XLSX.utils.sheet_to_json(ws, {defval:''});
    return json;
  }

  // 根据表头/内容推断类型
  function detectType(rows, fileName){
    if(!rows.length) return 'unknown';
    const head = Object.keys(rows[0]).join(' ');
    const headHas = k => head.includes(k);
    if(headHas('姓名') && (headHas('学号')||headHas('性别')||headHas('班级')||headHas('家长'))) return 'students';
    // 成绩：有姓名 + 多科目数字列
    const SUBJ=['语文','数学','英语','物理','化学','生物','历史','地理','道法','信息技术','体育','政治','科学'];
    if(headHas('姓名') && SUBJ.some(s=>headHas(s))) return 'scores';
    if((headHas('星期')||headHas('周一')||headHas('节次')) && (headHas('科目')||headHas('课程'))) return 'timetable';
    if(headHas('值日')||headHas('值日组')||headHas('小组')) return 'duty';
    // 座位：无明确表头，多为姓名矩阵
    const allVals = rows.flatMap(r=>Object.values(r).map(String));
    const nameLike = allVals.filter(v=>/[\u4e00-\u9fa5]{2,4}/.test(v)).length;
    if(nameLike>allVals.length*0.6 && !headHas('语文') && !headHas('数学')) return 'seating';
    if(/成绩|分数|score/i.test(fileName)) return 'scores';
    return 'unknown';
  }

  function applyStudents(rows){
    let n=0;
    rows.forEach(r=>{
      if(!r['姓名']) return;
      const name=String(r['姓名']).trim();
      if(!name) return;
      const exist = Store.list('students').find(s=>s.name===name);
      const item = {
        name, gender: r['性别']||'', sid: r['学号']||'', phone: r['联系电话']||r['手机']||'',
        parent: r['家长']||r['监护人']||'', parentPhone: r['家长电话']||r['家长手机']||'',
        birth: r['出生']||r['出生日期']||'', address: r['家庭住址']||r['地址']||'',
        family: r['家庭情况']||'', study: r['学习情况']||'', rewards: r['奖惩']||r['奖惩记录']||''
      };
      if(exist){ Store.replace('students', exist.id, item); }
      else { item.id='st_'+Date.now()+Math.floor(Math.random()*999); Store.add('students', item); }
      n++;
    });
    Store.set('classInfo.count', Store.list('students').length);
    return n;
  }

  function applyScores(rows){
    // 需要选定考试；若行里有“考试”列则按考试分，否则用默认新建/首个
    let examId = Store.list('exams')[0] && Store.list('exams')[0].id;
    const SUBJ=['语文','数学','英语','物理','化学','生物','历史','地理','道法','信息技术','体育','政治','科学'];
    if(!examId){ const e=Store.add('exams',{name:'导入成绩',date:new Date().toISOString().slice(0,10),type:'导入'}); examId=e.id; }
    let n=0;
    rows.forEach(r=>{
      const name=String(r['姓名']||'').trim(); if(!name) return;
      const st = Store.list('students').find(s=>s.name===name);
      if(!st) return;
      const map={};
      Object.keys(r).forEach(k=>{
        const sub = SUBJ.find(s=>k.includes(s));
        if(sub && r[k]!=='' && !isNaN(Number(r[k]))) map[sub]=Number(r[k]);
      });
      Store.update(d=>{ d.scores[examId]=d.scores[examId]||{}; d.scores[examId][st.id]=map; });
      n++;
    });
    return n;
  }

  function applyTimetable(rows){
    // 期望列：星期/节次/科目/教师
    const map={};
    rows.forEach(r=>{
      const day = r['星期']||r['周']||''; const idx=day.replace('周','');
      const cn={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':7}[idx]||1;
      const key='周'+['一','二','三','四','五','六','日'][cn-1];
      map[key]=map[key]||[];
      map[key].push({节次:Number(r['节次']||map[key].length+1),科目:r['科目']||r['课程']||'',教师:r['教师']||r['任课教师']||''});
    });
    Object.keys(map).forEach(k=>map[k].sort((a,b)=>a.节次-b.节次));
    Store.set('timetable', map);
    return Object.keys(map).length;
  }

  function applySeating(rows){
    const grid = rows.map(r=>Object.values(r).map(v=>String(v).trim()));
    Store.update(d=>{ d.seating=d.seating||{}; d.seating['导入座位']=grid; });
    return grid.length;
  }

  function applyDuty(rows){
    let n=0;
    rows.forEach(r=>{
      if(!r['组']&&!r['小组']&&!r['值日组']) return;
      Store.add('duty',{group:r['组']||r['小组']||r['值日组'],members:r['成员']||r['学生']||r['姓名']||'',
        task:r['任务']||r['值日内容']||'',week:r['周次']||r['周']||''});
      n++;
    });
    return n;
  }

  // Word：提取文本后引导人工归类
  async function handleWord(file){
    const arrayBuffer = await file.arrayBuffer();
    const res = await mammoth.extractRawText({arrayBuffer});
    const text = res.value;
    return text;
  }

  async function process(file){
    const name = file.name.toLowerCase();
    const result = {file:file.name, type:'', count:0, msg:''};
    try{
      if(name.endsWith('.xlsx')||name.endsWith('.xls')){
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf,{type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = sheetToRows(ws);
        const type = detectType(rows, file.name);
        result.type = type;
        if(type==='students') result.count=applyStudents(rows);
        else if(type==='scores') result.count=applyScores(rows);
        else if(type==='timetable') result.count=applyTimetable(rows);
        else if(type==='seating') result.count=applySeating(rows);
        else if(type==='duty') result.count=applyDuty(rows);
        else { result.msg='未能自动识别，请手动选择归档模块'; }
        result.rows = rows;
      } else if(name.endsWith('.docx')){
        const text = await handleWord(file);
        result.type='word'; result.wordText=text;
      } else if(name.endsWith('.csv')){
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buf),{type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = sheetToRows(ws);
        const type = detectType(rows, file.name); result.type=type;
        if(type==='students') result.count=applyStudents(rows);
        else if(type==='scores') result.count=applyScores(rows);
        else if(type==='timetable') result.count=applyTimetable(rows);
        else if(type==='seating') result.count=applySeating(rows);
        else if(type==='duty') result.count=applyDuty(rows);
        else result.msg='未能自动识别，请手动选择归档模块';
        result.rows=rows;
      } else {
        result.msg='不支持的文件格式';
      }
    }catch(e){ result.msg='解析失败：'+e.message; }
    if(window.App) App.afterImport(result);
    return result;
  }

  return { process, detectType };
})();
