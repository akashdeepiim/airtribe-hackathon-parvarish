import {z} from 'npm:zod@4.6.7';
import {adminClient,cleanupPhotos} from '../_shared/http.ts';
import {processDataJob} from '../_shared/data-jobs.ts';
import {generateFor} from '../_shared/activity-generation.ts';
const pushesSchema=z.array(z.object({id:z.uuid(),childId:z.uuid(),type:z.string(),name:z.string().nullable(),tokens:z.array(z.string())}));
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response(null,{status:405});
 const admin=adminClient(),auth=await admin.rpc('authorize_background_worker',{candidate:req.headers.get('x-worker-token')});
 if(auth.error||auth.data!==true)return new Response(null,{status:401});
 const work=async()=>{
  for(let i=0;i<8;i++){try{if(!await processDataJob())break;}catch{break;}}
  await admin.rpc('queue_orphan_photos');await cleanupPhotos();
  const candidates=await admin.rpc('pending_activity_children');
  for(const c of z.array(z.object({child_id:z.uuid(),actor:z.uuid()})).parse(candidates.data??[]).slice(0,1)){try{await generateFor(c.child_id,c.actor);}catch{}}
  await admin.rpc('enqueue_reminders');
  const claim=await admin.rpc('claim_pushes');
  for(const n of pushesSchema.parse(claim.data??[])){
   const body=n.name?`A little moment for ${n.name}. Open your family space.`:'A little moment for your family. Open Parvarish.';
   let success=false;const invalid:string[]=[];
   try{const r=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(n.tokens.map(to=>({to,title:'Parvarish',body,data:{url:`/children/${n.childId}`},sound:'default'}))),signal:AbortSignal.timeout(10000)});const data=z.object({data:z.array(z.object({status:z.string(),details:z.object({error:z.string().optional()}).optional()}))}).parse(await r.json());success=r.ok&&data.data.some(t=>t.status==='ok');data.data.forEach((t,i)=>{if(t.details?.error==='DeviceNotRegistered')invalid.push(n.tokens[i]!);});}catch{}
   await admin.rpc('finish_push',{nid:n.id,success,invalid_tokens:invalid});
  }
 };
 EdgeRuntime.waitUntil(work().catch(()=>{}));return Response.json({accepted:true},{status:202,headers:{'Cache-Control':'no-store'}});
});
