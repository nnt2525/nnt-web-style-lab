const assetRoot = new URL('./',import.meta.url);
const siteRoot = new URL('../',import.meta.url);
let csrfToken = '';
let mode = 'server';
let fixture;

export async function connect(){
  try{
    const response=await fetch(new URL('api/bootstrap',siteRoot),{headers:{Accept:'application/json'}});
    if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new Error('Backend unavailable');
    const result=await response.json();
    if(!result.csrfToken)throw new Error('No backend session');
    csrfToken=result.csrfToken;
    return {mode,bootstrap:result};
  }catch{
    mode='preview';
    const response=await fetch(new URL('catalog.json',assetRoot));
    if(!response.ok)throw new Error('Cannot load demo content. Run npm run build, then npm run dev.');
    fixture=await response.json();
    return {mode,bootstrap:fixture};
  }
}

export async function api(path,options={}){
  const method=options.method||'GET';
  if(mode==='preview'){
    if(method!=='GET')throw new Error('This public preview is read-only. Run npm run dev from the GitHub repo to use the real API and SQLite database.');
    const route=path.split('?')[0].replace(/^\//,'');
    if(route==='summary')return {incomeCents:0,expenseCents:0,balanceCents:0,entryCount:0};
    const keys={orders:'orders',bookings:'bookings',reservations:'reservations',tasks:'tasks',bookmarks:'bookmarks',progress:'progress',presets:'presets',ledger:'entries',classifications:'classifications',inquiries:'inquiries'};
    return fixture[route]?{[route]:fixture[route]}:{[keys[route]||route]:[]};
  }
  const headers={Accept:'application/json',...options.headers};
  let body=options.body;
  if(body!==undefined&&typeof body!=='string'){body=JSON.stringify(body);headers['Content-Type']='application/json';}
  if(method!=='GET')headers['X-CSRF-Token']=csrfToken;
  const response=await fetch(new URL('api/'+path.replace(/^\//,''),siteRoot),{...options,method,body,headers});
  const contentType=response.headers.get('content-type')||'';
  if(!contentType.includes('application/json'))throw new Error('The API returned an unexpected response. Check that the Node backend is running.');
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||`Request failed (${response.status})`);
  return result;
}
