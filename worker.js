export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
    if (url.pathname === "/api/search") return handleSearch(url, env);
    if (url.pathname === "/api/ai") return handleAI(request, env);
    if (url.pathname === "/api/discover") return handleDiscover(env);
    return env.ASSETS.fetch(request);
  }
};

async function tavilySearch(query, env, maxResults = 8) {
  const response = await fetch("https://api.tavily.com/search", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:env.SEARCH_API_KEY,query,search_depth:"advanced",max_results:maxResults,include_answer:true,include_images:true})});
  const data = await response.json(); if(!response.ok) throw new Error(data.message||data.error||"Search provider request failed."); return data;
}
function productIntent(q){return /\b(price|buy|purchase|cost|shop|shopping|amazon|flipkart|store|deal|offers?|₹|rs\.?|rupees?)\b/i.test(q)}
function extractPrice(text=""){const m=text.match(/(?:₹|Rs\.?|INR\s*)\s?[0-9][0-9,]*(?:\.\d{1,2})?/i);return m?m[0]:""}
async function handleSearch(url, env){
 if(!env.SEARCH_API_KEY)return json({error:"SEARCH_API_KEY secret is not configured."},500); const query=url.searchParams.get("q")?.trim(); if(!query)return json({error:"Missing search query."},400);
 try{const data=await tavilySearch(query,env,8);let shopping={items:[]};
  if(productIntent(query)){const s=await tavilySearch(`buy ${query} price India online store`,env,6);shopping.items=(s.results||[]).map(x=>({title:x.title||query,price:extractPrice(`${x.title||""} ${x.content||""}`),store:new URL(x.url).hostname.replace(/^www\./,""),url:x.url})).filter(x=>x.url).slice(0,6)}
  return json({query,answer:data.answer||"",results:data.results||[],images:data.images||[],shopping});
 }catch(error){console.error("VoloX search:",error);return json({error:error.message||"Search failed."},502)}
}
function getMessageText(m){if(!m)return"";if(typeof m.text==="string")return m.text;if(Array.isArray(m.parts))return m.parts.map(p=>typeof p?.text==="string"?p.text:"").join("");return""}
async function handleAI(request,env){
 if(request.method!=="POST")return json({error:"AI endpoint requires POST."},405); if(!env.GEMINI_API_KEY)return json({error:"GEMINI_API_KEY secret is not configured."},500);
 try{const body=await request.json();const messages=Array.isArray(body.messages)?body.messages:[];const contents=messages.filter(m=>m&&["user","model"].includes(m.role)).map(m=>({role:m.role,parts:[{text:getMessageText(m)}]})).filter(m=>m.parts[0].text);
  if(!contents.length)return json({error:"No valid conversation messages."},400);
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:"You are VoloX AI. Answer clearly and naturally. Maintain context across the conversation."}]},contents})});
  const data=await response.json();const text=data.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";return json({...data,text},response.ok?200:response.status);
 }catch(error){console.error("VoloX AI:",error);return json({error:error.message||"Gemini provider request failed."},502)}
}
async function handleDiscover(env){
 if(!env.SEARCH_API_KEY)return json({error:"SEARCH_API_KEY secret is not configured."},500);const topics={cricket:"latest cricket news match results scores today",news:"latest major news headlines today",technology:"latest artificial intelligence and technology news",robotics:"latest robotics engineering and robot news"};const output={};
 await Promise.all(Object.entries(topics).map(async([category,query])=>{try{output[category]=await tavilySearch(query,env,5)}catch(error){console.error(`VoloX Discover ${category}:`,error);output[category]={results:[],images:[],error:error.message}}}));return json({updatedAt:new Date().toISOString(),...output});
}
function corsHeaders(){return {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...corsHeaders()}})}
