'use strict';
const {FOOD,AREAS,DEFAULT_FILTERS,cleanFilters,distanceMeters,filterFoods,mapPoint}=NearbyModel;
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svg={
  save:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4h12v17l-6-4-6 4V4Z"/></svg>',
  dir:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 11 18-8-8 18-2-8-8-2Z"/></svg>',
  reviews:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-3 3V11.5A7.5 7.5 0 0 1 9.5 4h3a7.5 7.5 0 0 1 7.5 7.5Z"/><path d="M7 10h8M7 14h5"/></svg>'
};
function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
const rawPreferences=readStore('nearby.preferences.v2',{});
const preferences=rawPreferences&&typeof rawPreferences==='object'?rawPreferences:{};
let area=AREAS.find(a=>a.id===preferences.area)||AREAS[0],origin=area,usingGPS=false;
let filters=cleanFilters(preferences.filters),draft=null,currentView=['discover','map','saved'].includes(preferences.view)?preferences.view:'discover';
let activeId=typeof preferences.activeId==='string'?preferences.activeId:'ramen',mapId=activeId,detailId=null,reviewSource='All',toastTimer,entered=preferences.entered===true;
const validIds=new Set(FOOD.map(f=>f.id)),storedSaved=readStore('nearby.saved.v1',[]);
let saved=new Set(Array.isArray(storedSaved)?storedSaved.filter(id=>validIds.has(id)):[]);
let mapZoom=1,mapX=0,mapY=0,drag=null,geoRequest=0;
function persist(){try{localStorage.setItem('nearby.preferences.v2',JSON.stringify({area:area.id,filters,view:currentView,activeId,entered}));}catch{}}
function getFood(id){const f=FOOD.find(f=>f.id===id);return f?{...f,meters:Math.round(distanceMeters(origin,f)/10)*10}:null;}
const distance=f=>f.meters<1000?`${f.meters} m`:`${(f.meters/1000).toFixed(1)} km`;
const filtered=()=>filterFoods(filters,origin);
function notify(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2700);}
function state(view=currentView,modal=null,extra={}){return {nearby:true,entered,view,modal,...extra};}
function showHome(){ $('landing').classList.add('hide');$('landing').inert=true;$('home').inert=false;$('home').classList.add('show'); }
function hideHome(){ $('landing').classList.remove('hide');$('landing').inert=false;$('home').inert=true;$('home').classList.remove('show'); }
function closeAll(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function navigate(view,{replace=false}={}){if(!replace&&view===currentView&&!history.state?.modal)return;closeAll();setView(view);history[replace?'replaceState':'pushState'](state(view),'');persist();}
function enter(){entered=true;showHome();history.pushState(state(),'');setView(currentView);persist();$('feed').focus({preventScroll:true});}
function openModal(id,extra={}){
  const d=$(id);if(d.open)return;
  closeAll();if(id==='rangeDialog'){draft={...filters};syncFilterSheet();}
  if(id==='searchDialog')$('searchInput').value=filters.query;
  d.showModal();history.pushState(state(currentView,id,extra),'');
}
function closeModal(d){if(history.state?.modal===d.id)history.back();else d.close();}
function locationLabel(){ $('locationName').textContent=usingGPS?'GPS · Demo places':`${area.name} · Demo`;document.querySelectorAll('[data-area]').forEach(b=>b.setAttribute('aria-pressed',String(!usingGPS&&b.dataset.area===area.id))); }
function chooseArea(id){geoRequest++;area=AREAS.find(a=>a.id===id)||AREAS[0];origin=area;usingGPS=false;locationLabel();mapZoom=1;mapX=mapY=0;refresh(false);navigate(currentView,{replace:true});persist();}
function useLocation(){
  if(!entered){entered=true;showHome();history.replaceState(state(),'');}
  if($('areaDialog').open)navigate(currentView,{replace:true});
  const request=++geoRequest;$('locationName').textContent='Locating…';
  if(!navigator.geolocation){locationLabel();notify('Location unavailable. Choose a demo area.');return;}
  navigator.geolocation.getCurrentPosition(p=>{if(request!==geoRequest)return;origin={lat:p.coords.latitude,lng:p.coords.longitude};usingGPS=true;locationLabel();mapZoom=1;mapX=mapY=0;refresh(false);notify('Showing sample places relative to your GPS.');persist();},()=>{if(request!==geoRequest)return;locationLabel();notify('Location unavailable. Choose a demo area.');},{enableHighAccuracy:false,timeout:6500,maximumAge:60000});
}
$('demoBtn').onclick=enter;$('locateBtn').onclick=useLocation;$('retryLocation').onclick=useLocation;
$('areaBtn').onclick=()=>openModal('areaDialog');$('useDemo').onclick=()=>chooseArea(area.id);
$('areaChoices').innerHTML=AREAS.map(a=>`<button class="area-choice" data-area="${a.id}">${a.name}<span>Demo food</span></button>`).join('');
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){document.querySelectorAll('.reel').forEach(r=>r.classList.remove('active'));e.target.classList.add('active');const id=e.target.dataset.id;if(id!==activeId){activeId=id;persist();}}}),{root:$('feed'),threshold:.65});
function actionButtons(f){return `<div class="action-stack"><button class="action review-action" data-action="reviews" data-id="${f.id}" aria-label="Reviews for ${esc(f.dish)}">${svg.reviews}<span>Reviews</span></button><button class="action save ${saved.has(f.id)?'is-saved':''}" data-action="save" data-id="${f.id}" aria-label="Save ${esc(f.dish)}" aria-pressed="${saved.has(f.id)}">${svg.save}</button><button class="action" data-action="go" data-id="${f.id}" aria-label="Directions for ${esc(f.dish)}">${svg.dir}</button></div>`;}
function renderFeed(preserve=true){
  observer.disconnect();const items=filtered(),old=preserve?activeId:null;
  $('feed').innerHTML=items.length?items.map(f=>`<article class="reel" data-id="${f.id}" aria-label="${esc(f.dish)} at ${esc(f.restaurant)}"><img class="reel-bg" src="${f.img}" alt="${esc(f.dish)} stock photo" loading="lazy"><div class="photo-status"><span>Loading photo…</span></div><div class="reel-content"><button class="dish-button" data-action="details" data-id="${f.id}" aria-label="About ${esc(f.dish)}"><h2 class="dish">${f.dish}</h2></button><p class="restaurant">${f.restaurant}</p><div class="rating-line"><button class="rating-button" data-action="reviews" data-id="${f.id}" data-source="Google" aria-label="Google reviews for ${esc(f.dish)}">★ ${f.rating}</button><span class="tiny-sep">·</span><span>RM${f.price}</span><span class="tiny-sep">·</span><span>${distance(f)}</span></div>${actionButtons(f)}</div></article>`).join(''):`<div class="empty-state"><h2>No bites found</h2><p>${usingGPS?'No sample places near this GPS location. Choose a demo area to browse.':'Try a wider distance or fewer filters.'}</p><button class="primary" data-action="${usingGPS?'area':'reset'}">${usingGPS?'Choose demo area':'Reset filters'}</button></div>`;
  const index=Math.max(0,items.findIndex(f=>f.id===old));activeId=items[index]?.id||null;$('feed').scrollTop=index*$('feed').clientHeight;document.querySelectorAll('.reel').forEach(r=>observer.observe(r));
}
$('feed').addEventListener('load',e=>{if(e.target.matches('.reel-bg'))e.target.parentElement.querySelector('.photo-status').hidden=true;},true);
$('feed').addEventListener('error',e=>{if(e.target.matches('.reel-bg')){const label=e.target.parentElement.querySelector('.photo-status');label.innerHTML='<span>Photo unavailable</span><button class="secondary" data-action="retry-photo">Retry</button>';}},true);
function renderSaved(){
  const items=FOOD.filter(f=>saved.has(f.id)).map(f=>getFood(f.id));
  $('savedGrid').innerHTML=items.length?items.map(f=>`<button class="saved-card" data-action="details" data-id="${f.id}" aria-label="About saved ${esc(f.dish)}"><img src="${f.img}" alt="${esc(f.dish)} stock photo" loading="lazy"><div><b>${f.dish}</b><span>${f.restaurant} · RM${f.price}<br>${f.areaName} · ★ ${f.rating}</span></div></button>`).join(''):'<div class="saved-empty">Nothing saved yet.<br>Save food you want to try.<br><button class="secondary" data-action="discover">Explore food</button></div>';
}
function saveFood(id){saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('nearby.saved.v1',JSON.stringify([...saved]));}catch{notify('Saved for this visit. Browser storage is unavailable.');}document.querySelectorAll(`[data-action="save"][data-id="${id}"]`).forEach(b=>{b.classList.toggle('is-saved',saved.has(id));b.setAttribute('aria-pressed',String(saved.has(id)));if(b.classList.contains('detail-save'))b.textContent=saved.has(id)?'Saved':'Save place';});renderSaved();}
function updateMapTransform(){ $('mapStage').style.transform=`translate(${mapX}px,${mapY}px) scale(${mapZoom})`;$('zoomOut').disabled=mapZoom<=.75;$('zoomIn').disabled=mapZoom>=2; }
function renderMap(){
  const items=filtered();if(!items.some(f=>f.id===mapId))mapId=items[0]?.id||null;
  $('mapPins').innerHTML=items.map(f=>{const p=mapPoint(f,origin,filters.range);return `<button class="pin ${f.id===mapId?'selected':''}" style="left:calc(${p.x}% - 24px);top:calc(${p.y}% - 24px)" data-action="pin" data-id="${f.id}" aria-label="Show ${esc(f.dish)} on demo map" aria-pressed="${f.id===mapId}"><img alt="" src="${f.img}"><span class="map-pin-label">RM${f.price}</span></button>`;}).join('');
  const f=getFood(mapId);$('mapCard').style.display=f?'flex':'none';$('mapCard').innerHTML=f?`<img src="${f.img}" alt="${esc(f.dish)} stock photo"><div><h3>${f.dish}</h3><p>${f.restaurant}<br>${distance(f)} · ★ ${f.rating}</p></div><button class="mini-cta" data-action="details" data-id="${f.id}" aria-label="Details for ${esc(f.dish)}">${svg.reviews}</button>`:'';
  $('mapEmpty').innerHTML=items.length?'':`No sample places here.<br><button class="secondary" data-action="${usingGPS?'area':'reset'}">${usingGPS?'Choose demo area':'Reset filters'}</button>`;
  $('mapLabel').textContent=`${usingGPS?'GPS':area.name} · Demo map`;$('mapRange').textContent=filters.range===500?'500 m':`${filters.range/1000} km`;updateMapTransform();
}
function setView(view){currentView=view;document.querySelectorAll('.nav-btn').forEach(b=>{const on=b.dataset.view===view;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');});['map','saved'].forEach(v=>{const el=$(v+'Screen');el.classList.toggle('show',view===v);el.inert=view!==v;});$('feed').inert=view!=='discover';$('rangeBtn').hidden=view==='saved';}
function refresh(preserve=true){renderFeed(preserve);renderMap();renderSaved();syncHeader();persist();}
function syncHeader(){const extra=(filters.category!=='all'?1:0)+(filters.onlyOpen?1:0)+(filters.budget?1:0);$('rangeText').textContent=(filters.range===500?'500 m':`${filters.range/1000} km`)+(extra?` · ${extra}`:'');$('searchBtn').classList.toggle('active',!!filters.query);$('searchBtn').setAttribute('aria-label',filters.query?`Search food: ${filters.query}`:'Search food');}
function syncFilterSheet(){
  const f=draft||filters;document.querySelectorAll('[data-category]').forEach(b=>{const on=b.dataset.category===f.category;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});[['openBtn',f.onlyOpen],['budgetBtn',f.budget]].forEach(([id,on])=>{$(id).classList.toggle('active',on);$(id).setAttribute('aria-pressed',String(on));});document.querySelectorAll('[data-range]').forEach(b=>{const on=Number(b.dataset.range)===f.range;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});const n=filterFoods(f,origin).length;$('applyFilters').textContent=`Show ${n} ${n===1?'place':'places'}`;
}
function resetFilters(){filters={...DEFAULT_FILTERS};refresh(false);}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>navigate(b.dataset.view));
document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{draft.category=b.dataset.category;syncFilterSheet();});
$('openBtn').onclick=()=>{draft.onlyOpen=!draft.onlyOpen;syncFilterSheet();};$('budgetBtn').onclick=()=>{draft.budget=!draft.budget;syncFilterSheet();};
$('rangeBtn').onclick=()=>openModal('rangeDialog');$('applyFilters').onclick=()=>{filters=cleanFilters(draft);draft=null;refresh(false);navigate(currentView,{replace:true});};$('resetFilters').onclick=()=>{draft={...DEFAULT_FILTERS,query:filters.query};syncFilterSheet();};
document.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>{draft.range=Number(b.dataset.range);syncFilterSheet();});
$('searchBtn').onclick=()=>{openModal('searchDialog');$('searchInput').focus();};
$('searchForm').onsubmit=e=>{e.preventDefault();filters={...filters,query:$('searchInput').value.trim().slice(0,100)};refresh(false);navigate('discover',{replace:true});};
$('clearSearch').onclick=()=>{filters={...filters,query:''};refresh(false);navigate('discover',{replace:true});};
function reviewsFor(f){return [{source:'Google',author:'Alex L.',date:'2 days ago',rating:5,text:f.google[0]},{source:'Google',author:'Jamie T.',date:'1 week ago',rating:4,text:f.google[1]},{source:'Instagram',author:'@weekend.bites.demo',date:'3 days ago',text:f.social},{source:'TikTok',author:'@firstbite.demo',date:'5 days ago',text:f.tiktok}];}
function reviewCards(f){return reviewsFor(f).filter(r=>reviewSource==='All'||r.source===reviewSource).map(r=>`<article class="review-card"><div class="review-head"><div class="review-by">${r.author}<small>${r.date} · Sample</small></div><span class="review-source">${r.source}</span></div>${r.rating?`<div class="review-stars" aria-label="${r.rating} out of 5 stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>`:'<span class="demo-label">'+(r.source==='Instagram'?'Post preview':'Video preview')+'</span>'}<p>${r.text}</p>${r.source!=='Google'?'<div class="review-foot">Sample '+(r.source==='Instagram'?'post':'video description')+' · no live media connected</div>':''}</article>`).join('');}
function renderDetail(id,source='All',push=true){
  const f=getFood(id);if(!f)return;detailId=id;reviewSource=source;
  $('detailBody').innerHTML=`<div class="dialog-top"><div class="grab"></div><button class="close-btn" data-close aria-label="Close place details">×</button></div><img class="detail-photo" src="${f.img}" alt="${esc(f.dish)} stock photo"><h2 id="detailTitle">${f.dish}</h2><p class="muted">${f.restaurant} · Demo place</p><div class="detail-meta"><span>★ ${f.rating} (${f.count})</span><span>RM${f.price}</span><span>${distance(f)}</span><span>${f.open?'Open now':'Closed'} · ${f.hours}</span></div><div class="detail-actions"><button class="primary outline detail-save" data-action="save" data-id="${f.id}" aria-pressed="${saved.has(f.id)}">${saved.has(f.id)?'Saved':'Save place'}</button><button class="primary" data-action="go" data-id="${f.id}">Directions</button></div><div class="review-tabs" aria-label="Review source">${['All','Google','Instagram','TikTok'].map(s=>`<button class="review-tab ${s===source?'active':''}" data-review-source="${s}" aria-pressed="${s===source}">${s}</button>`).join('')}</div><div id="reviewList">${reviewCards(f)}</div><p class="reviews-note">Sample data &amp; illustrative photos. Social posts are previews; no live media.</p>`;
  $('detailDialog').scrollTop=0;if(push){if($('detailDialog').open)history.pushState(state(currentView,'detailDialog',{id,kind:'details',source}),'');else openModal('detailDialog',{id,kind:'details',source});}else if(!$('detailDialog').open)$('detailDialog').showModal();
}
function routePreview(id,push=true){const f=getFood(id);if(!f)return;detailId=id;const minutes=Math.max(1,Math.round(f.meters/80));
  $('detailBody').innerHTML=`<div class="dialog-top"><div class="grab"></div><button class="close-btn" data-close aria-label="Close directions">×</button></div><h2 id="detailTitle">Getting there</h2><p class="muted">${f.restaurant} · Demo place</p><div class="route-preview"><span class="demo-label">Demo walking estimate</span><strong>${minutes} min</strong><p class="muted">${distance(f)} from ${usingGPS?'your GPS location':'the '+area.name+' demo starting point'}</p></div><p class="muted">Demo route. Search Google Maps for real places serving this food.</p><a class="primary external-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.dish+' '+f.areaName+' Malaysia')}" target="_blank" rel="noopener noreferrer">Search Google Maps</a><button class="secondary" data-action="back-detail" data-id="${f.id}">Back to place</button>`;
  $('detailDialog').scrollTop=0;if(push){if($('detailDialog').open)history.pushState(state(currentView,'detailDialog',{id,kind:'route',fromDetail:$('detailDialog').open}),'');else openModal('detailDialog',{id,kind:'route',fromDetail:$('detailDialog').open});}else if(!$('detailDialog').open)$('detailDialog').showModal();
}
document.addEventListener('click',e=>{
  const close=e.target.closest('[data-close]');if(close){closeModal(close.closest('dialog'));return;}
  const areaButton=e.target.closest('[data-area]');if(areaButton){chooseArea(areaButton.dataset.area);return;}
  const tab=e.target.closest('[data-review-source]');if(tab){reviewSource=tab.dataset.reviewSource;document.querySelectorAll('[data-review-source]').forEach(b=>{const on=b===tab;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});$('reviewList').innerHTML=reviewCards(getFood(detailId));history.replaceState({...history.state,source:reviewSource},'');return;}
  const b=e.target.closest('[data-action]');if(!b)return;const {action,id,source}=b.dataset;
  if(action==='save')saveFood(id);if(action==='details'||action==='reviews')renderDetail(id,source||'All');if(action==='go')routePreview(id);if(action==='back-detail'){if(history.state?.kind==='route'&&history.state?.fromDetail)history.back();else{renderDetail(id,'All',false);history.replaceState(state(currentView,'detailDialog',{id,kind:'details',source:'All'}),'');}}if(action==='pin'){mapId=id;renderMap();}if(action==='reset')resetFilters();if(action==='discover')navigate('discover');if(action==='area')openModal('areaDialog');if(action==='retry-photo'){const img=b.closest('.reel').querySelector('img');b.closest('.photo-status').innerHTML='<span>Loading photo…</span>';img.src=img.src.replace(/&retry=\d+/,'')+'&retry='+Date.now();}
});
document.querySelectorAll('dialog').forEach(d=>{
  d.addEventListener('cancel',e=>{e.preventDefault();closeModal(d);});
  d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal(d);}});
});
window.addEventListener('popstate',e=>{const s=e.state;closeAll();draft=null;if(!s?.nearby||!s.entered){entered=false;hideHome();persist();return;}entered=true;showHome();setView(s.view||'discover');if(s.modal==='detailDialog'){s.kind==='route'?routePreview(s.id,false):renderDetail(s.id,s.source||'All',false);}else if(s.modal){if(s.modal==='rangeDialog'){draft={...filters};syncFilterSheet();}if(s.modal==='searchDialog')$('searchInput').value=filters.query;$(s.modal).showModal();}persist();});
$('feed').addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();$('feed').scrollBy({top:(e.key==='ArrowDown'?1:-1)*$('feed').clientHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}});
window.addEventListener('resize',()=>{const cards=[...document.querySelectorAll('.reel')],i=cards.findIndex(r=>r.dataset.id===activeId);if(i>=0)$('feed').scrollTop=i*$('feed').clientHeight;});
$('zoomIn').onclick=()=>{mapZoom=Math.min(2,mapZoom+.25);updateMapTransform();};$('zoomOut').onclick=()=>{mapZoom=Math.max(.75,mapZoom-.25);updateMapTransform();};$('recenterMap').onclick=()=>{mapX=mapY=0;mapZoom=1;updateMapTransform();};
$('mapStage').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,oldX:mapX,oldY:mapY};$('mapStage').setPointerCapture(e.pointerId);});
$('mapStage').addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;mapX=Math.max(-600,Math.min(600,drag.oldX+e.clientX-drag.x));mapY=Math.max(-600,Math.min(600,drag.oldY+e.clientY-drag.y));updateMapTransform();});
['pointerup','pointercancel'].forEach(name=>$('mapStage').addEventListener(name,()=>{drag=null;}));
locationLabel();renderFeed();renderMap();renderSaved();syncHeader();setView(currentView);if(entered)showHome();history.replaceState(state(),'');
