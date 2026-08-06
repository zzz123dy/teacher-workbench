# 教师智能工作台 · 数据库结构说明

数据全部保存在浏览器 `localStorage`（键名 `teacher_workbench_v1`），无需服务器。
结构为顶层对象集合，字段如下：

```
teacher_workbench_v1 = {
  meta: {                        // 教师/学校信息
    teacherName, teacherTitle, subject, role, school, grade, classNo, className
  },
  classInfo: {                   // 班级信息
    name, grade, headTeacher, teachers:[{subject,name}], count, intro
  },
  classes: [ { id, name, grade, headTeacher, count } ],  // 班级列表（多班级）
  students: [ {                  // 花名册 / 学生档案基础
    id, classId, name, gender, sid, phone, parent, parentPhone,
    birth, address, family, study, rewards, advantage, weak
  } ],
  students: [ {                  // 花名册 / 学生档案基础
    id, name, gender, sid, phone, parent, parentPhone,
    birth, address, family, study, rewards, advantage, weak
  } ],
  exams: [ { id, name, date, type } ],          // 考试（月考/期中/期末/模拟）
  scores: {                      // 成绩：scores[examId][studentId][科目]=分数
    "ex1": { "st_0": { "语文":88, "数学":92, ... }, ... }
  },
  timetable: {                   // 课表：timetable["周一"]=[{节次,科目,教师}]
    "周一": [ {节次:1,科目:"语文",教师:"张老师"}, ... ]
  },
  duty: [ { id, group, members, task, week } ],  // 值日表
  seating: {                     // 座次表（多版本）
    "当前座位": [[姓名,...],...], "考试座位":[...], "特殊安排":[...]
  },
  notices: [ { id, title, content, type, target, time, read:[] } ], // 家长通知
  messages: [ { id, cat, text, time, unread } ],  // 消息中心（系统/学校/家长/教研）
  comms: [ { id, student, parent, time, way, content, feedback } ], // 家校沟通记录
  resources: [ { id, name, type, size, time } ],   // 我的资源
  research: [ { id, type, title, content, time } ],// 教研工具
  todo: [ { id, text, done, date } ],             // 待办
  features: [ { id, cat, title, content, icon, time } ], // 特色工作
  archives: {                    // 学生档案备注（按 studentId）
    "st_0": { advantage, weak, comment, growth:[{title,time,text}] }
  }
}
```

## 数据导入自动识别规则（import.js）
- 表头含「姓名+学号/性别/家长」→ 学生信息
- 表头含「姓名+科目(语文/数学/…)」→ 成绩
- 表头含「星期/节次+科目」→ 课表
- 表头含「值日/小组」→ 值日表
- 纯姓名矩阵 → 座次表
- Word(.docx) → 提取文本，人工选择归类（通知/教研/特色/家校）

## 复制给其他教师/班级
个人中心 → 导出整库(JSON) / 导入整库(JSON)，即可把整套数据交给同事复用。

## 权限设计（可选）
`meta.role` 控制权限：班主任（全部权限）、任课教师（只读，自动隐藏所有新增/修改/删除按钮）、管理员（管理账号与班级数据）。在「个人中心」切换角色即时生效。
