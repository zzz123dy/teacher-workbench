/* ===== data.js · 示例数据 & 学科字典 ===== */
window.Data = (function(){
  // 系统自动识别的考试科目（按上传成绩表动态扩展，这里给默认全集）
  const SUBJECTS = ['语文','数学','英语','物理','化学','生物','历史','地理','道法','信息技术','体育'];

  const NAMES = ['王浩然','李思琪','张子轩','刘梓萱','陈嘉怡','杨明轩','赵雨彤','黄俊杰',
    '周梦洁','吴泽涛','徐若曦','孙天宇','马欣怡','朱晨阳','胡可欣','郭晓磊'];

  function seed(){
    const db = Store.get();
    if(db.students && db.students.length) return; // 已初始化

    const students = NAMES.map((nm,i)=>({
      id:'st_'+i, name:nm, gender: i%2? '女':'男',
      sid:'202403'+(String(i+1).padStart(2,'0')),
      phone:'138****'+(1000+i), parent:['王父','李母','张父','刘母','陈父'][i%5],
      parentPhone:'139****'+(2000+i),
      birth:'2011-'+(String((i%12)+1).padStart(2,'0'))+'-15',
      address:'幸福路'+(i+1)+'号',
      family:'独生子女 / 双职工家庭',
      study:['基础扎实，课堂积极','需加强细心','偏科，理科较弱','进步明显','稳定发挥','注意力易分散'][i%6],
      rewards: i%4===0? '校运动会接力冠军':(i%3===0?'月度文明之星':''),
      advantage:'', weak:''
    }));
    db.students = students;
    students.forEach(s=> s.classId='cls_main');
    db.classInfo.count = students.length;
    db.classes = [{ id:'cls_main', name:db.classInfo.name, grade:db.classInfo.grade,
                    headTeacher:db.classInfo.headTeacher, count:students.length }];
    db.classInfo.teachers = [
      {subject:'语文',name:'张老师'},{subject:'数学',name:'李老师'},
      {subject:'英语',name:'王老师'},{subject:'物理',name:'赵老师'},
      {subject:'体育',name:'体育老师(班主任)'}
    ];

    // 考试
    const exams = [
      {id:'ex1', name:'第一次月考', date:'2026-03-10', type:'月考'},
      {id:'ex2', name:'期中考试', date:'2026-04-22', type:'期中'},
      {id:'ex3', name:'期末考试', date:'2026-06-30', type:'期末'}
    ];
    db.exams = exams;

    // 成绩：为每个学生每场考试、每科生成合理分数，并制造进退步
    const scores = {};
    exams.forEach((ex,ei)=>{
      scores[ex.id] = {};
      students.forEach((st,si)=>{
        const obj = {};
        const base = 78 + (si%5)*3;        // 学生整体水平差异
        const drift = (ei)* ( (si%2?1:-1) * ( (si%3)+1 ) ); // 进退步趋势
        SUBJECTS.forEach(sub=>{
          let full = sub==='体育'?100: (sub==='信息技术'?100:100);
          let s = base + drift + ((si*7+sub.length)%13) - 6;
          if(sub==='体育') s = 82 + (si%4)*4 + (ei* (si%2?1:-1));
          s = Math.max(45, Math.min(full, Math.round(s)));
          obj[sub] = s;
        });
        scores[ex.id][st.id] = obj;
      });
    });
    db.scores = scores;

    // 课表（周一~周五）
    const subj = ['语文','数学','英语','物理','体育','道法','历史','生物','地理','信息技术'];
    const teach = {'语文':'张老师','数学':'李老师','英语':'王老师','物理':'赵老师','体育':'体育老师(班主任)',
      '道法':'周老师','历史':'吴老师','生物':'郑老师','地理':'孙老师','信息技术':'钱老师'};
    const tpl = {1:['语文','数学','英语','体育','道法'],2:['数学','语文','物理','英语','历史'],
      3:['英语','体育','数学','生物','地理'],4:['语文','信息技术','道法','英语','物理'],
      5:['数学','历史','语文','体育','信息技术']};
    db.timetable = {};
    for(let d=1;d<=5;d++){
      db.timetable['周'+['一','二','三','四','五'][d-1]] =
        tpl[d].map((s,j)=>({节次:j+1,科目:s,教师:teach[s]||'待定'}));
    }

    // 值日
    const groups = ['第一组','第二组','第三组','第四组'];
    db.duty = groups.map((g,i)=>({id:'du'+i, group:g, members:students.slice(i*4,i*4+4).map(s=>s.name).join('、'),
      task:'扫地、拖地、倒垃圾', week:'第'+(i+1)+'周'}));

    // 座次（6x? 按人数排）
    const rows = Math.ceil(students.length/4);
    db.seating['当前座位'] = makeSeats(students, 4, rows);
    db.seating['考试座位'] = makeSeats(students.slice().reverse(), 4, rows);
    db.seating['特殊安排'] = makeSeats(students, 4, rows);

    // 通知 / 家校
    db.notices = [
      {id:'no1', title:'关于秋季运动会的通知', content:'本周五举行校运会，请同学们积极报名接力与跳绳项目。',
        type:'班级事务', target:'全班', time:'2026-08-05', read:[]},
      {id:'no2', title:'防溺水安全教育', content:'请家长配合做好暑期防溺水教育，签署回执。',
        type:'家校通知', target:'全体家长', time:'2026-08-03', read:[]}
    ];

    // 消息中心
    db.messages = [
      {id:'m1', cat:'系统通知', text:'欢迎使用教师智能工作台，数据已自动备份。', time:'2026-08-07', unread:true},
      {id:'m2', cat:'学校公告', text:'下周一下午召开全体教师例会。', time:'2026-08-06', unread:true},
      {id:'m3', cat:'家长消息', text:'王浩然家长：孩子近期体育成绩进步明显，谢谢老师！', time:'2026-08-05', unread:false},
      {id:'m4', cat:'教研消息', text:'体育组教研活动定于周四第3节。', time:'2026-08-04', unread:false}
    ];

    // 家校沟通记录
    db.comms = [
      {id:'c1', student:'王浩然', parent:'王父', time:'2026-08-05', way:'微信',
        content:'反馈孩子体育中考项目训练情况，家长表示配合。', feedback:'好的，谢谢老师。'},
      {id:'c2', student:'李思琪', parent:'李母', time:'2026-07-30', way:'电话',
        content:'沟通期末数学成绩波动，建议假期补课。', feedback:'已安排。'}
    ];

    // 资源 / 教研
    db.resources = [
      {id:'r1', name:'八年级体育中考训练教案.doc', type:'文档', size:'1.2MB', time:'2026-08-01'},
      {id:'r2', name:'班级运动会PPT.pptx', type:'PPT', size:'3.4MB', time:'2026-07-20'}
    ];
    db.research = [
      {id:'re1', type:'教研记录', title:'体育中考项目教学研讨', content:'围绕耐力跑与实心球展开。', time:'2026-08-02'},
      {id:'re2', type:'听课记录', title:'听李老师数学课', content:'课堂互动充分，值得借鉴。', time:'2026-07-28'}
    ];

    // 待办
    db.todo = [
      {id:'t1', text:'录入期中体育成绩', done:false, date:'2026-08-07'},
      {id:'t2', text:'发布防溺水回执通知', done:false, date:'2026-08-07'},
      {id:'t3', text:'更新座位表（调座）', done:true, date:'2026-08-06'}
    ];

    // 特色工作（校园动态/德育/社团/科创/成长/荣誉）
    db.features = [
      {id:'f1', cat:'班级荣誉', title:'校运会团体总分第三名', content:'八年（3）班在接力与跳绳项目表现优异。', icon:'🏆', time:'2026-07-10'},
      {id:'f2', cat:'德育活动', title:'学雷锋志愿服务', content:'组织学生清理校园周边环境。', icon:'💜', time:'2026-06-20'},
      {id:'f3', cat:'社团活动', title:'篮球社团招新', content:'班级12人加入校篮球社团。', icon:'🏀', time:'2026-06-12'},
      {id:'f4', cat:'科创项目', title:'校园体能数据小研究', content:'用表格记录同学体测数据并分析。', icon:'🔬', time:'2026-05-30'},
      {id:'f5', cat:'学生成长', title:'月度进步之星', content:'李思琪、吴泽涛本月进步显著。', icon:'⭐', time:'2026-05-15'}
    ];

    Store.update(()=>{}); // persist
  }

  function makeSeats(students, cols, rows){
    const grid = [];
    let i=0;
    for(let r=0;r<rows;r++){
      const row=[];
      for(let c=0;c<cols;c++){ row.push(students[i]? students[i].name : ''); i++; }
      grid.push(row);
    }
    return grid;
  }

  return { SUBJECTS, seed, makeSeats, NAMES };
})();
