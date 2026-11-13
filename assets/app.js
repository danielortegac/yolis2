/* Sitio estático: navegación, contacto y utilidades locales. Sin servicios externos. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const body = document.body;
  const site = body.dataset.site;
  const email = body.dataset.email;
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  if (menu && nav) {
    body.dataset.enhanced = 'true';
    const close = focus => { nav.dataset.open = 'false'; menu.setAttribute('aria-expanded', 'false'); if (focus) menu.focus(); };
    menu.addEventListener('click', () => { const open = nav.dataset.open !== 'true'; nav.dataset.open = String(open); menu.setAttribute('aria-expanded', String(open)); });
    nav.addEventListener('click', event => { if (event.target.closest('a')) close(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.dataset.open === 'true') close(true); });
    document.addEventListener('click', event => { if (nav.dataset.open === 'true' && !event.target.closest('.site-header')) close(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 800) close(false); });
  }
  for (const link of document.querySelectorAll('[data-link]')) {
    const value = window.SITE_LINKS && window.SITE_LINKS[link.dataset.link];
    if (typeof value !== 'string' || !value.trim()) continue;
    try { const url = new URL(value.trim()); if (['http:', 'https:'].includes(url.protocol) && url.hostname) { link.href = url.href; link.hidden = false; link.target = '_blank'; link.rel = 'noopener noreferrer'; } } catch (_) { /* Un enlace sin configurar permanece oculto. */ }
  }
  const contact = $('contact-form');
  if (contact) contact.addEventListener('submit', event => {
    event.preventDefault();
    if (!contact.reportValidity()) return;
    const name = contact.elements.name.value.trim(), subject = contact.elements.subject.value.trim(), message = contact.elements.message.value.trim();
    if (!name || !message) { $('contact-status').textContent = 'Escribe tu nombre y tu mensaje antes de preparar el correo.'; return; }
    const text = `Hola,\n\nSoy ${name}.\n\n${message}\n\nGracias.`;
    $('contact-status').textContent = 'El correo está preparado. Tu aplicación de correo debe abrirse para que lo revises y lo envíes. También puedes usar el correo directo de esta página.';
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  });
  const trim = (value, max = 220) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2200-12-31') return false;
    const [y,m,d] = value.split('-').map(Number), date = new Date(Date.UTC(y,m-1,d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d;
  }
  const prettyDate = value => validDate(value) ? value.split('-').reverse().join('/') : 'Sin fecha';
  const utcDay = value => { const p = value.split('-').map(Number); return Date.UTC(p[0],p[1]-1,p[2]); };
  const dateFromUTC = value => new Date(value).toISOString().slice(0,10);
  function node(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
  function button(label, action, id, danger = false) { const el = node('button', label, 'quiet-button' + (danger ? ' danger' : '')); el.type = 'button'; el.dataset.action = action; el.dataset.id = id; return el; }
  const status = text => { if ($('tool-status')) $('tool-status').textContent = text; };
  let storageWarning = '';
  function readStore(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (_) { storageWarning = 'No se pudo recuperar el almacenamiento local. Puedes seguir trabajando y descargar una copia.'; return null; } }
  function writeStore(key, data, message) { try { localStorage.setItem(key, JSON.stringify(data)); status(message || 'Cambios guardados en este navegador.'); } catch (_) { status('El navegador no permitió guardar los cambios. Conserva el trabajo descargando una copia antes de salir.'); } }
  function download(text, name, type) { const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob); const link = node('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  const cell = value => { let s = String(value ?? ''); if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g,'""') + '"'; };
  const csv = rows => '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
  function jsonDownload(data, name) { download(JSON.stringify(data,null,2), name+'-'+today()+'.json', 'application/json;charset=utf-8'); }
  function setEmpty(empty, hasRows, filtered, heading, detail) { empty.hidden = hasRows; if (!hasRows) { empty.querySelector('h3').textContent = filtered ? 'No hay resultados con este filtro.' : heading; empty.querySelector('p').textContent = filtered ? 'Prueba otro filtro para ver los registros guardados.' : detail; } }
  function uniqueIds(rows) { const seen = new Set(); return rows.map(row => { if (!row.id || seen.has(row.id)) row.id = uid(); seen.add(row.id); return row; }); }
  function importJSON(id, validator, apply) {
    const input = $(id); if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0]; if (!file) return;
      try {
        if (file.size > 2500000) throw new Error('La copia supera el límite de 2,5 MB.');
        const data = validator(JSON.parse(await file.text()));
        if (!window.confirm('Recuperar esta copia reemplazará los registros actuales. Descarga una copia antes si quieres conservarlos. ¿Continuar?')) { status('La recuperación se canceló. Tus registros siguen igual.'); return; }
        apply(data);
      } catch (error) { status('No se recuperó la copia. ' + (error && error.message ? error.message : 'Revisa que sea un archivo JSON exportado desde esta herramienta.')); }
      finally { input.value = ''; }
    });
  }

  if (site === 'yolis' && $('task-form')) {
    const key = 'ibero_nov2026_yolis_plan_v2';
    const areas = ['Documentación','Plan de trabajo','Contratistas','Procesos','Seguimiento','Otra'];
    const types = ['Residencial','Comercial','Mixta','Otra'];
    const form = $('task-form'), profileForm = $('profile-form'), list = $('task-list');
    let filter = 'all', editing = null, profile = null, tasks = [];
    function cleanProfile(value) {
      if (!value || typeof value !== 'object' || !trim(value.name,120) || !types.includes(value.type)) return null;
      if (value.workers===null || value.contractors===null || typeof value.workers==='boolean' || typeof value.contractors==='boolean' || !Number.isInteger(Number(value.workers)) || !Number.isInteger(Number(value.contractors)) || value.workers === '' || value.contractors === '') return null;
      const workers = Number(value.workers), contractors = Number(value.contractors);
      if (workers<0 || workers>100000 || contractors<0 || contractors>100000) return null;
      return {name:trim(value.name,120),type:value.type,workers,contractors};
    }
    function cleanTask(value, legacy = false) {
      if (!value || typeof value !== 'object' || !trim(value.task,220) || !trim(value.owner,100)) return null;
      if (!validDate(value.due) && !(legacy && !value.due)) return null;
      return {id:trim(value.id,80)||uid(),task:trim(value.task,220),owner:trim(value.owner,100),due:validDate(value.due)?value.due:'',area:areas.includes(value.area)?value.area:'Otra',done:value.done===true};
    }
    const saved = readStore(key);
    if (saved && saved.site === 'yolis' && Array.isArray(saved.actions)) { profile=cleanProfile(saved.profile); tasks=uniqueIds(saved.actions.slice(0,1000).map(v=>cleanTask(v,true)).filter(Boolean)); }
    else { const old=readStore('ibero_nov2026_yolis_lista_v1'); if (Array.isArray(old)) tasks=uniqueIds(old.slice(0,1000).map(v=>cleanTask(v,true)).filter(Boolean)); }
    function packet() { return {schema:2,site:'yolis',exported_at:new Date().toISOString(),profile,actions:tasks}; }
    const persist = message => writeStore(key,packet(),message);
    const overdue = task => !task.done && validDate(task.due) && task.due < today();
    function fillProfile() {
      profileForm.elements.name.value = profile ? profile.name : '';
      profileForm.elements.type.value = profile ? profile.type : types[0];
      profileForm.elements.workers.value = profile ? String(profile.workers) : '';
      profileForm.elements.contractors.value = profile ? String(profile.contractors) : '';
    }
    function resetEditor() { editing=null;form.reset();$('save-task').textContent='Añadir acción ＋';$('editor-title').textContent='Añadir una acción';$('cancel-edit').hidden=true; }
    function render() {
      const complete = tasks.filter(t=>t.done).length, late=tasks.filter(overdue).length, percent=tasks.length?Math.round(complete/tasks.length*100):0;
      $('total-count').textContent=String(tasks.length);$('done-count').textContent=String(complete);$('pending-count').textContent=String(tasks.length-complete);$('overdue-count').textContent=String(late);$('progress-label').textContent=percent+' %';$('progress-bar').style.width=percent+'%';
      const visible=tasks.filter(t=>filter==='all'||filter==='done'&&t.done||filter==='pending'&&!t.done||filter==='overdue'&&overdue(t));
      $('visible-count').textContent=visible.length+' '+(visible.length===1?'acción':'acciones'); list.textContent='';
      for (const task of visible) {
        const row=node('article',undefined,'task-row'+(task.done?' is-done':''));
        const check=node('input');check.type='checkbox';check.checked=task.done;check.dataset.action='toggle';check.dataset.id=task.id;check.setAttribute('aria-label',(task.done?'Marcar pendiente: ':'Marcar completada: ')+task.task);
        const content=node('div');content.appendChild(node('h3',task.task));
        const meta=node('p',undefined,'record-meta'); meta.appendChild(node('span',task.area,'badge'));meta.appendChild(node('span',task.owner+' · '+prettyDate(task.due))); content.appendChild(meta);
        if (overdue(task)) content.appendChild(node('span','Fecha vencida','badge overdue'));
        const controls=node('div',undefined,'record-actions');controls.appendChild(button('Editar','edit',task.id));controls.appendChild(button('Eliminar','delete',task.id,true));content.appendChild(controls);row.appendChild(check);row.appendChild(content);list.appendChild(row);
      }
      setEmpty($('empty-state'),visible.length>0,tasks.length>0,'El orden empieza con una acción.','Completa la ficha y registra el primer pendiente de tu copropiedad.');
      $('export-csv').disabled=!tasks.length;$('export-json').disabled=!tasks.length&&!profile;$('clear-tasks').disabled=!tasks.length;
      for (const b of document.querySelectorAll('[data-filter]')) b.setAttribute('aria-pressed',String(b.dataset.filter===filter));
    }
    profileForm.addEventListener('submit',event=>{
      event.preventDefault();if(!profileForm.reportValidity())return;
      const draft=cleanProfile({name:profileForm.elements.name.value,type:profileForm.elements.type.value,workers:profileForm.elements.workers.value,contractors:profileForm.elements.contractors.value});
      if(!draft){$('profile-status').textContent='Completa la ficha con un nombre y cantidades enteras entre 0 y 100000.';return;}
      profile=draft;persist('Ficha de la copropiedad guardada.');$('profile-status').textContent='Ficha actualizada para '+profile.name+'.';render();
    });
    form.addEventListener('submit',event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const draft=cleanTask({id:editing||uid(),task:form.elements.task.value,owner:form.elements.owner.value,due:form.elements.due.value,area:form.elements.area.value,done:editing?tasks.find(t=>t.id===editing)?.done:false});
      if(!draft){status('Escribe una acción, un responsable y una fecha válida.');return;}
      if(!editing&&tasks.length>=1000){status('El plan admite hasta 1000 acciones. Descarga una copia antes de reorganizarlo.');return;}
      if(editing)tasks=tasks.map(t=>t.id===editing?draft:t);else tasks.push(draft);
      resetEditor();persist('Acción guardada.');render();form.elements.task.focus();
    });
    $('cancel-edit').addEventListener('click',()=>{resetEditor();status('Edición cancelada.');});
    list.addEventListener('change',event=>{const target=event.target;if(target.dataset.action!=='toggle')return;const task=tasks.find(t=>t.id===target.dataset.id);if(!task)return;task.done=target.checked;persist(task.done?'Acción marcada como completada.':'Acción marcada como pendiente.');render();});
    list.addEventListener('click',event=>{
      const target=event.target.closest('button[data-action]');if(!target)return;const task=tasks.find(t=>t.id===target.dataset.id);if(!task)return;
      if(target.dataset.action==='delete'){tasks=tasks.filter(t=>t.id!==task.id);if(editing===task.id)resetEditor();persist('Acción eliminada.');render();}
      if(target.dataset.action==='edit'){editing=task.id;for(const name of ['task','owner','due','area'])form.elements[name].value=task[name];$('save-task').textContent='Guardar cambios';$('editor-title').textContent='Editar acción';$('cancel-edit').hidden=false;form.elements.task.focus();status('Editando una acción. Guarda los cambios o cancela para volver.');}
    });
    for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{filter=b.dataset.filter;render();});
    $('clear-tasks').addEventListener('click',()=>{if(!tasks.length||!window.confirm('¿Vaciar todas las acciones? La ficha de la copropiedad se conservará. Descarga una copia si quieres recuperar el plan después.'))return;tasks=[];resetEditor();persist('Las acciones se vaciaron. La ficha se conservó.');render();});
    $('export-csv').addEventListener('click',()=>{const rows=[['Copropiedad','Tipo_copropiedad','Trabajadores','Contratistas','Id','Accion','Area','Responsable','Fecha_prevista','Estado'],...tasks.map(t=>[profile?.name||'',profile?.type||'',profile?.workers??'',profile?.contractors??'',t.id,t.task,t.area,t.owner,t.due,t.done?'Completada':overdue(t)?'Vencida':'Pendiente'])];download(csv(rows),'plan-copropiedad-'+today()+'.csv','text/csv;charset=utf-8');status('CSV preparado con las acciones y la ficha guardada.');});
    $('export-json').addEventListener('click',()=>{jsonDownload(packet(),'copropiedad');status('Copia JSON preparada. Puedes recuperarla desde esta herramienta.');});
    importJSON('import-json',value=>{
      if(!value||value.site!=='yolis'||value.schema!==2||!Array.isArray(value.actions)||value.actions.length>1000)throw new Error('El archivo no es una copia compatible del plan de copropiedad.');
      const importedProfile=value.profile===null?null:cleanProfile(value.profile);if(value.profile!==null&&!importedProfile)throw new Error('La ficha de la copropiedad no es válida.');
      const imported=value.actions.map(v=>cleanTask(v,true));if(imported.some(v=>!v))throw new Error('La copia contiene acciones incompletas o fechas no válidas.');
      return {profile:importedProfile,actions:uniqueIds(imported)};
    },value=>{profile=value.profile;tasks=value.actions;filter='all';resetEditor();fillProfile();persist('Copia recuperada: '+tasks.length+' acciones.');render();});
    fillProfile();render();if(storageWarning)status(storageWarning);
  }

})();
