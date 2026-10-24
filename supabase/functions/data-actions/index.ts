import {z} from 'npm:zod@4.6.7';
import {http,userClient,adminClient} from '../_shared/http.ts';
import {processDataJob} from '../_shared/data-jobs.ts';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('export'),childId:z.uuid()}).strict(),
 z.object({action:z.literal('delete'),childId:z.uuid(),confirmation:z.literal('DELETE')}).strict(),
 z.object({action:z.literal('download'),jobId:z.uuid(),part:z.number().int().min(0)}).strict(),
]);
Deno.serve(async req=>{const {respond,early}=http(req);if(early)return early;try{
 const auth=await userClient(req);if(!auth)return respond({error:'Sign in required'},401);
 const raw=await req.text();if(raw.length>1024)return respond({error:'Request too large'},413);const parsed=input.safeParse(JSON.parse(raw));if(!parsed.success)return respond({error:'Invalid request'},400);const b=parsed.data;
 if(b.action==='download'){
  const permitted=await auth.client.rpc('authorize_export_part',{job_id:b.jobId,part_index:b.part});if(permitted.error)return respond({error:'Export unavailable. Request a new export.'},403);
  const signed=await adminClient().storage.from('family-exports').createSignedUrl(permitted.data,300,{download:`parvarish-export-${b.part+1}.zip`});if(signed.error)throw signed.error;
  return respond({url:signed.data.signedUrl.replace(Deno.env.get('SUPABASE_URL')!,Deno.env.get('PUBLIC_SUPABASE_URL')??Deno.env.get('SUPABASE_URL')!),expiresAt:Date.now()+300000});
 }
 const result=b.action==='export'?await auth.client.rpc('request_data_export',{cid:b.childId}):await auth.client.rpc('request_child_deletion',{cid:b.childId,confirmation:b.confirmation});if(result.error)return respond({error:'This action requires the profile owner.'},403);
 // The durable queue is authoritative. The cron worker continues if this invocation is interrupted.
 EdgeRuntime.waitUntil(processDataJob(result.data).catch(()=>{}));return respond({jobId:result.data},202);
}catch{return respond({error:'The request could not be completed. Please retry.'},503);}});
