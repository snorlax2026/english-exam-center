'use strict';
const STORAGE_KEY = 'nancy-exam-library-v1';
const safeUrl = value => { try { const u = new URL(String(value || '')); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
function normalizeExam(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('考卷資料格式不正確');
  const string = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const id = string(raw.id, 100), title = string(raw.title, 120), term = string(raw.term, 50), series = string(raw.series, 80);
  const book = Number(raw.book), variant = string(raw.variant, 1);
  if (!id || !title || !term || !series || !Number.isInteger(book) || book < 1 || book > 99 || !['A','B','C'].includes(variant)) throw new Error('請填寫有效的名稱、系列、冊別、考試及卷別');
  const links = {};
  for (const key of ['pdf','studentWord','teacher','folder']) { links[key] = safeUrl(raw[key]); if (raw[key] && !links[key]) throw new Error('連結必須是完整的 HTTPS 網址'); }
  if (raw.audio != null && !Array.isArray(raw.audio)) throw new Error('音檔資料格式不正確');
  const audio = (raw.audio || []).slice(0, 20).map((a,i) => { const url = safeUrl(a?.url); if (!url) throw new Error('音檔連結必須是完整的 HTTPS 網址'); return {title:string(a.title, 200) || `音檔 ${i+1}`, url}; });
  return {id,title,series,book,term,variant,...links,audio,notes:string(raw.notes),tags:Array.isArray(raw.tags) ? raw.tags.filter(x=>typeof x==='string').slice(0,20).map(x=>x.slice(0,50)) : []};
}
function validateBackup(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.exams) || raw.exams.length > 2000) throw new Error('請選擇此資料庫匯出的有效備份（最多 2,000 組）');
  const exams = raw.exams.map(normalizeExam);
  if (new Set(exams.map(e=>e.id)).size !== exams.length) throw new Error('備份包含重複的考卷 ID');
  return {exams, favorites:Array.isArray(raw.favorites) ? raw.favorites.filter(x=>typeof x==='string').slice(0,2000) : []};
}
function filterExams(exams, filters, favorites = new Set()) {
  const query = (filters.query || '').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return exams.filter(e => (!filters.book || String(e.book) === filters.book) && (!filters.term || e.term === filters.term) && (!filters.variant || e.variant === filters.variant) && (!filters.favoriteOnly || favorites.has(e.id)) && query.every(q => [e.title,e.series,`HWG ${e.book}`,e.term,e.variant,e.notes,...e.tags].join(' ').toLocaleLowerCase().includes(q)));
}
if (typeof module !== 'undefined') module.exports = {safeUrl, normalizeExam, validateBackup, filterExams};
if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  let seed = [], exams = [], favorites = new Set(), favoriteOnly = false, ready = false;
  let toastTimer;
  function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>$('toast').classList.remove('show'),3500); }
  function saveState(nextExams, nextFavorites) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version:1,exams:nextExams,favorites:[...nextFavorites]})); }
    catch { throw new Error('瀏覽器無法儲存資料，請先允許網站儲存空間或匯出備份'); }
    exams = nextExams; favorites = nextFavorites;
  }
  function element(tag, className, text) { const el = document.createElement(tag); if(className) el.className = className; if(text != null) el.textContent = text; return el; }
  function link(url, text, className) { const a = element('a',className,text); a.href = safeUrl(url); a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
  function updateOptions() {
    for (const [key, values, label] of [['book',[...new Set(exams.map(e=>e.book))].sort((a,b)=>a-b),'全部冊別'],['term',[...new Set(exams.map(e=>e.term))].sort(),'全部考試']]) {
      const current = $(key).value; $(key).replaceChildren(new Option(label,'')); values.forEach(v=>$(key).add(new Option(key==='book'?`第 ${v} 冊`:v,v))); $(key).value = values.some(v=>String(v)===current)?current:'';
    }
  }
  function card(e) {
    const c = element('article','card'), top = element('div','card-top');
    top.append(element('span','badge',`${e.series.toUpperCase()} · ${String(e.book).padStart(2,'0')}`));
    const star = element('button','favorite',favorites.has(e.id)?'★':'☆'); star.type='button'; star.setAttribute('aria-label',`收藏 ${e.title}`); star.setAttribute('aria-pressed',String(favorites.has(e.id)));
    star.onclick=()=>{const next = new Set(favorites); next.has(e.id)?next.delete(e.id):next.add(e.id); try { saveState(exams,next); render(); } catch(err){toast(err.message);} }; top.append(star); c.append(top,element('h3','',e.title),element('p','meta',e.notes || `${e.term} · ${e.variant} 卷`));
    if(e.pdf) {const pdf=link(e.pdf,'學生版 PDF','pdf-link');pdf.append(element('span','','開啟 ↗'));c.append(pdf);} else c.append(element('span','missing','尚未加入學生版 PDF'));
    const secondary=element('div','secondary-links'); if(e.teacher) secondary.append(link(e.teacher,'教師卷 ↗')); if(e.studentWord) secondary.append(link(e.studentWord,'學生 Word ↗')); c.append(secondary);
    c.append(element('p','audio-label','LISTENING · 聽力音檔'));
    const audios=element('div','audio-links'); e.audio.forEach((a,i)=>{const part=a.title.match(/Part\s*([A-Z])/i);const l=link(a.url,`▷ ${part?`Part ${part[1].toUpperCase()}`:`音檔 ${i+1}`} ↗`);l.title=a.title;l.setAttribute('aria-label',`${e.title} ${a.title}`);audios.append(l);}); if(!e.audio.length) audios.append(element('span','hint','尚未加入音檔')); c.append(audios);
    const bottom=element('div','card-bottom'); if(e.folder) bottom.append(link(e.folder,'原始資料夾 ↗')); else bottom.append(element('span','','個人考卷'));
    const edit=element('button','text-button','編輯');edit.onclick=()=>openEditor(e);bottom.append(edit);c.append(bottom);return c;
  }
  function render() {
    const filtered=filterExams(exams,{query:$('search').value,book:$('book').value,term:$('term').value,variant:$('variant').value,favoriteOnly},favorites);
    $('total').textContent=exams.length;$('pdfCount').textContent=exams.filter(e=>e.pdf).length;$('audioCount').textContent=exams.reduce((n,e)=>n+e.audio.length,0);
    $('result').textContent=`顯示 ${filtered.length} 組 / 共 ${exams.length} 組考卷`;$('cards').replaceChildren(...filtered.map(card));$('empty').hidden=filtered.length>0;
    $('sectionTitle').textContent=favoriteOnly?'我的備課收藏':'挑一份，開始備課';$('allTab').classList.toggle('active',!favoriteOnly);$('favoritesTab').classList.toggle('active',favoriteOnly);
  }
  function openEditor(e) {
    if(!ready) {toast('考卷尚未載入，請稍後再試');return;}
    const form=$('editForm');form.reset(); form.elements.id.value=e?.id||'';$('editorTitle').textContent=e?'編輯考卷':'新增考卷';$('formError').textContent='';
    if(e) for(const key of ['title','series','book','term','variant','pdf','studentWord','teacher','folder','notes']) form.elements[key].value=e[key]||'';
    form.elements.audio1.value=e?.audio[0]?.url||'';form.elements.audio2.value=e?.audio[1]?.url||'';
    $('editor').showModal();
  }
  $('manage').onclick=$('addBottom').onclick=()=>openEditor();
  $('allTab').onclick=()=>{favoriteOnly=false;render();};$('favoritesTab').onclick=()=>{favoriteOnly=true;render();};
  ['search','book','term','variant'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
  $('reset').onclick=()=>{['search','book','term','variant'].forEach(id=>$(id).value='');render();};
  document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  $('editForm').onsubmit=event=>{
    event.preventDefault();const raw=Object.fromEntries(new FormData(event.target));const existing=exams.find(e=>e.id===raw.id);
    raw.id=raw.id||`custom-${crypto.randomUUID()}`;raw.tags=existing?.tags||[];raw.audio=[raw.audio1,raw.audio2].filter(Boolean).map((url,i)=>({title:existing?.audio[i]?.title||`音檔 ${i+1}`,url}));
    // Preserve additional imported audio entries when editing the first two links.
    raw.audio.push(...(existing?.audio.slice(2)||[]));
    try {const e=normalizeExam(raw);const next=exams.some(x=>x.id===e.id)?exams.map(x=>x.id===e.id?e:x):[...exams,e];saveState(next,new Set(favorites));updateOptions();render();$('editor').close();toast('已儲存到此瀏覽器');}catch(err){$('formError').textContent=err.message;}
  };
  $('backup').onclick=()=>{$('backupStatus').textContent='';$('backupDialog').showModal();};
  $('export').onclick=()=>{if(!ready){toast('考卷尚未載入');return;}const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),exams,favorites:[...favorites]},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`南西老師考卷備份-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
  $('import').onchange=async event=>{try {if(!ready)throw new Error('請先等待資料載入');const file=event.target.files[0];if(!file)return;if(file.size>8*1024*1024)throw new Error('備份檔案不可超過 8 MB');const data=validateBackup(JSON.parse(await file.text()));const merged=new Map(exams.map(e=>[e.id,e]));data.exams.forEach(e=>merged.set(e.id,e));if(merged.size>2000)throw new Error('合併後最多可儲存 2,000 組考卷');saveState([...merged.values()],new Set([...favorites,...data.favorites].filter(id=>merged.has(id))));updateOptions();render();$('backupStatus').textContent=`已合併 ${data.exams.length} 組考卷。`; }catch(err){$('backupStatus').textContent=`匯入失敗：${err.message}`;}finally{event.target.value='';}};
  $('restore').onclick=()=>{if(!ready)return;if(!confirm('確定還原網站預設資料？此瀏覽器新增、編輯的考卷與收藏都會清除。建議先匯出備份。'))return;try{saveState(structuredClone(seed),new Set());updateOptions();render();$('backupStatus').textContent='已還原網站預設資料。';}catch(err){$('backupStatus').textContent=err.message;}};
  async function init(){try{const response=await fetch('data.json');if(!response.ok)throw new Error('無法讀取預設資料');const data=validateBackup(await response.json());seed=data.exams;exams=structuredClone(seed);try {const stored=localStorage.getItem(STORAGE_KEY);if(stored){const local=validateBackup(JSON.parse(stored));const merged=new Map(seed.map(e=>[e.id,e]));local.exams.forEach(e=>merged.set(e.id,e));exams=[...merged.values()];favorites=new Set(local.favorites);}}catch{toast('本機儲存資料無法讀取，已載入網站資料；請使用備份還原。');}ready=true;updateOptions();render();}catch(err){$('result').textContent='載入失敗，請重新整理頁面再試。';$('cards').replaceChildren(element('p','error',err.message));}}
  init();
}
