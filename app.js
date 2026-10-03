const WORKER_URL = "https://blackfox.s04693400.workers.dev";
const page = document.body.dataset.page;

function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function saveHistory(key,value){try{const a=JSON.parse(localStorage.getItem(key)||"[]");a.unshift(value);localStorage.setItem(key,JSON.stringify(a.slice(0,50)))}catch{}}
function openSearch(q){q=q.trim();if(!q)return;saveHistory("volox_search_history",q);window.open(`results.html?q=${encodeURIComponent(q)}`,"_blank","noopener");}

if(page==="home"){
 const form=document.getElementById("searchForm"), input=document.getElementById("searchInput");
 form.addEventListener("submit",e=>{e.preventDefault();openSearch(input.value)});
 const menu=document.getElementById("menuButton"),drawer=document.getElementById("drawer"),close=document.getElementById("closeMenu"),scrim=document.getElementById("scrim");
 const set=(open)=>{drawer.classList.toggle("open",open);scrim.classList.toggle("open",open);drawer.setAttribute("aria-hidden",String(!open))};
 menu.addEventListener("click",()=>set(true));close.addEventListener("click",()=>set(false));scrim.addEventListener("click",()=>set(false));
 loadDiscover();document.getElementById("refreshDiscover").addEventListener("click",loadDiscover);
}

async function loadDiscover(){
 const grid=document.getElementById("discoverGrid");if(!grid)return;grid.innerHTML='<div class="loading-card">Loading fresh stories…</div>';
 try{const r=await fetch(`${WORKER_URL}/api/discover`);const d=await r.json();if(!r.ok)throw Error(d.error||"Discover failed");
  const cats=["cricket","news","technology","robotics"];let stories=[];
  cats.forEach(cat=>(d[cat]?.results||[]).slice(0,2).forEach((x,i)=>stories.push({category:cat,title:x.title||"Untitled story",content:x.content||x.description||"",url:x.url||"#",image:x.image||d[cat]?.images?.[i]?.url||d[cat]?.images?.[i]||""})));
  grid.innerHTML=stories.length?stories.slice(0,8).map(s=>`<article class="discover-card">${s.image?`<img src="${esc(s.image)}" alt="" loading="lazy">`:``}<div class="discover-body"><div class="discover-cat">${esc(s.category.toUpperCase())}</div><h3><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></h3><p>${esc(s.content).slice(0,145)}${s.content.length>145?"…":""}</p></div></article>`).join(""):'<div class="loading-card">No stories found right now.</div>';
 }catch(e){grid.innerHTML=`<div class="loading-card">Discover could not load. ${esc(e.message)}</div>`}
}

if(page==="results"){
 const params=new URLSearchParams(location.search), initial=params.get("q")||"", input=document.getElementById("resultsInput");input.value=initial;
 document.getElementById("resultsSearch").addEventListener("submit",e=>{e.preventDefault();if(input.value.trim())location.href=`results.html?q=${encodeURIComponent(input.value.trim())}`});
 if(initial)runSearch(initial);else document.getElementById("searchStatus").textContent="Type a search above.";
}
async function runSearch(q){
 const status=document.getElementById("searchStatus"),quick=document.getElementById("quickAnswer"),shop=document.getElementById("shoppingSection"),articles=document.getElementById("articleResults");status.textContent=`Results for “${q}”`;quick.innerHTML="";shop.innerHTML="";articles.innerHTML="<p>Searching the web…</p>";
 try{const r=await fetch(`${WORKER_URL}/api/search?q=${encodeURIComponent(q)}`),d=await r.json();if(!r.ok)throw Error(d.error||"Search failed");
  if(d.answer)quick.innerHTML=`<div class="quick-answer"><h2>About this search</h2><p>${esc(d.answer)}</p></div>`;
  if(d.shopping?.items?.length){shop.innerHTML=`<div class="shopping-box"><h2>Products, prices & purchase links</h2><div class="product-grid">${d.shopping.items.map(p=>`<div class="product-card"><h3>${esc(p.title)}</h3><div class="price">${esc(p.price||"Price shown on store")}</div><div class="result-source">${esc(p.store||"")}</div><a class="buy-link" href="${esc(p.url)}" target="_blank" rel="noopener">View / purchase ↗</a></div>`).join("")}</div><p class="tiny-note">Prices and availability can change; the purchase link opens the source store/article.</p></div>`}
  const rs=d.results||[];articles.innerHTML=rs.length?rs.map(x=>`<article class="result-card"><div class="result-source">${esc(x.url||"")}</div><h3><a href="${esc(x.url||"#")}" target="_blank" rel="noopener">${esc(x.title||"Untitled")}</a></h3><p>${esc(x.content||x.description||"")}</p></article>`).join(""):"<p>No articles found.</p>";
 }catch(e){articles.innerHTML=`<p>Search couldn't load: ${esc(e.message)}</p>`}
}

if(page==="ai"){
 let messages=[];const box=document.getElementById("chatMessages"),form=document.getElementById("chatForm"),input=document.getElementById("chatInput");
 form.addEventListener("submit",async e=>{e.preventDefault();const q=input.value.trim();if(!q)return; if(messages.length===0)box.innerHTML="";messages.push({role:"user",text:q});box.insertAdjacentHTML("beforeend",`<div class="message user">${esc(q)}</div>`);input.value="";box.insertAdjacentHTML("beforeend",`<div class="message model" id="thinking">VoloX AI is thinking…</div>`);box.scrollTop=box.scrollHeight;
  try{const r=await fetch(`${WORKER_URL}/api/ai`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages})});const d=await r.json();document.getElementById("thinking")?.remove();if(!r.ok)throw Error(d.error||d.message||"AI request failed");const text=d.text||d.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"Gemini returned no text.";messages.push({role:"model",text});box.insertAdjacentHTML("beforeend",`<div class="message model">${esc(text)}</div>`);saveHistory("volox_chat_history",{question:q,answer:text,time:Date.now()});box.scrollTop=box.scrollHeight}catch(err){document.getElementById("thinking")?.remove();box.insertAdjacentHTML("beforeend",`<div class="message model">${esc(err.message)}</div>`)}
 });
 document.getElementById("newChat").addEventListener("click",()=>{messages=[];box.innerHTML='<div class="chat-empty"><h1>VoloX AI</h1><p>Ask anything. Keep the conversation going.</p></div>';input.focus()});
}

if(page==="images"){
 const form=document.getElementById("imageSearchForm"),input=document.getElementById("imageQuery"),grid=document.getElementById("imageGrid");
 form.addEventListener("submit",async e=>{e.preventDefault();const q=input.value.trim();if(!q)return;saveHistory("volox_image_history",q);grid.innerHTML="<p>Searching images…</p>";try{const r=await fetch(`${WORKER_URL}/api/search?q=${encodeURIComponent(q)}`),d=await r.json();const imgs=d.images||[];grid.innerHTML=imgs.length?imgs.map((x,i)=>{const u=typeof x==="string"?x:x.url||x;return `<div class="image-card"><a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="${esc(q)}" loading="lazy"></a></div>`}).join(""):"<p>No images were returned for this search.</p>"}catch(err){grid.innerHTML=`<p>${esc(err.message)}</p>`}});
}

if(page==="lens"){
 const file=document.getElementById("lensFile"),button=document.getElementById("openCamera"),preview=document.getElementById("lensPreview"),msg=document.getElementById("lensMessage");
 button.addEventListener("click",()=>file.click());file.addEventListener("change",()=>{const f=file.files?.[0];if(!f)return;preview.src=URL.createObjectURL(f);preview.hidden=false;msg.textContent="Photo selected. Visual identification/search needs a vision API connection in the Worker."});
}
if(page==="create"){
 document.getElementById("createForm").addEventListener("submit",e=>{e.preventDefault();const p=document.getElementById("imagePrompt").value.trim();if(!p)return;localStorage.setItem("volox_last_image_prompt",p);document.getElementById("createMessage").textContent="Prompt saved. Connect an image-generation provider to turn this prompt into an actual image."});
}
if(page==="history"){
 const read=k=>JSON.parse(localStorage.getItem(k)||"[]");const render=(id,a,fn)=>document.getElementById(id).innerHTML=a.length?a.map(fn).join(""):"<p class='muted'>Nothing here yet.</p>";
 render("searchHistory",read("volox_search_history"),x=>`<div class="history-item"><a href="results.html?q=${encodeURIComponent(x)}">${esc(x)}</a></div>`);
 render("imageHistory",read("volox_image_history"),x=>`<div class="history-item"><a href="images.html?q=${encodeURIComponent(x)}">${esc(x)}</a></div>`);
 render("chatHistory",read("volox_chat_history"),x=>`<div class="history-item"><b>${esc(x.question)}</b><div class="muted">${esc(x.answer).slice(0,150)}…</div></div>`);
 document.getElementById("clearHistory").addEventListener("click",()=>{["volox_search_history","volox_image_history","volox_chat_history"].forEach(k=>localStorage.removeItem(k));location.reload()});
}
