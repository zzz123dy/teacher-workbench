/* ===== sync.js · 云端同步（Supabase，免费云数据库） =====
 * 设计：整库状态序列化成一个 JSON 文档，按「工作台密钥(id)」存取。
 * 未配置时整应用回退到 localStorage（与改造前行为一致）。
 * anon key 是公开密钥，可安全放在前端；工作台密钥(id)充当共享口令。
 */
(function(){
  const CFG_KEY = 'teacher_workbench_cloud';
  let client = null;
  let cfg = (function(){ try{ return JSON.parse(localStorage.getItem(CFG_KEY)||'null'); }catch(e){ return null; } })();

  function loadClient(){
    return new Promise((resolve,reject)=>{
      if(window.supabase) return resolve(window.supabase);
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.async=true;
      s.onload=()=> window.supabase? resolve(window.supabase) : reject(new Error('Supabase 客户端加载失败'));
      s.onerror=()=>reject(new Error('无法加载 Supabase（请检查网络后重试）'));
      document.head.appendChild(s);
    });
  }

  function configure(url, anonKey){
    return loadClient().then(SB=>{ client = SB.createClient(url, anonKey); return client; });
  }

  function saveConfig(c){ cfg=c; try{ localStorage.setItem(CFG_KEY, JSON.stringify(c)); }catch(e){} }
  function clearConfig(){ cfg=null; try{ localStorage.removeItem(CFG_KEY); }catch(e){} }
  function getConfig(){ return cfg; }

  // 拉取整库文档（无则返回 null）
  function load(workspace){
    return client.from('workbench_data').select('data,updated_at').eq('id',workspace).maybeSingle()
      .then(({data,error})=>{ if(error) throw error; return data? data.data : null; });
  }
  // 写入（upsert）
  function save(workspace, data){
    return client.from('workbench_data')
      .upsert({ id:workspace, data, updated_at:new Date().toISOString() })
      .then(({error})=>{ if(error) throw error; });
  }
  // 实时订阅：其他设备修改后触发 cb(data)
  function subscribe(workspace, cb){
    if(!client) return ()=>{};
    const ch = client.channel('wb:'+workspace)
      .on('postgres_changes', { event:'*', schema:'public', table:'workbench_data', filter:'id=eq.'+workspace },
        payload=>{ const d = payload.new && payload.new.data; if(!d) return;
          try{ cb(typeof d==='string'? JSON.parse(d): d); }catch(e){} })
      .subscribe();
    return ()=>{ try{ client.removeChannel(ch); }catch(e){} };
  }

  window.Cloud = { configure, saveConfig, clearConfig, getConfig, load, save, subscribe };
})();
