export function visitorClient(base){
 let cookie='',csrf='';
 async function call(route,method='GET',body,extraHeaders={}){
  if(!csrf){const session=await fetch(base+'/api/auth/session');const set=session.headers.get('set-cookie');if(set)cookie=set.split(';')[0];const payload=await session.json();csrf=payload.csrfToken;}
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...extraHeaders},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
  return {status:response.status,body:await response.json().catch(()=>({})),headers:response.headers};
 }
 return {call,get cookie(){return cookie;},get csrf(){return csrf;}};
}

export function adminClient(base){
 let cookie='',csrf='';
 return async(route,method='GET',body)=>{
  if(!cookie){
   const session=await fetch(base+'/api/auth/session');cookie=session.headers.get('set-cookie').split(';')[0];csrf=(await session.json()).csrfToken;
   const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({username:'test-admin',password:'test-password'})});
   if(!login.ok)throw Error('Test login failed: '+await login.text());
   cookie=login.headers.get('set-cookie').split(';')[0];csrf=(await login.json()).csrfToken;
  }
  const response=await fetch(base+route,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return {status:response.status,body:await response.json().catch(()=>({})),headers:response.headers};
 };
}
