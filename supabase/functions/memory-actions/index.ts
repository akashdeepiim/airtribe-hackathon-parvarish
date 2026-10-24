import {z} from 'npm:zod@4.6.7';
import {http,userClient,cleanupPhotos} from '../_shared/http.ts';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('remove'),memoryId:z.uuid()}).strict(),
 z.object({action:z.literal('discard'),childId:z.uuid(),path:z.string().max(512).regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-zA-Z0-9_.-]+$/)}).strict(),
]);
Deno.serve(async(req:Request)=>{
 const {respond,early}=http(req);if(early)return early;
 try{
  const auth=await userClient(req);if(!auth)return respond({error:'Sign in required'},401);
  const body=await req.text();if(body.length>2048)return respond({error:'Request too large'},413);
  const parsed=input.safeParse(JSON.parse(body));if(!parsed.success)return respond({error:'Invalid memory request'},400);
  const p=parsed.data;
  const job=p.action==='remove'?await auth.client.rpc('remove_memory',{mid:p.memoryId}):await auth.client.rpc('discard_memory_upload',{cid:p.childId,object_path:p.path});
  if(job.error)return respond({error:'Memory action not permitted'},job.error.code==='PT403'?403:400);
  const completed=await cleanupPhotos(job.data);
  return respond({removed:true,cleanup:completed?'complete':'queued'});
 }catch{return respond({error:'Unable to update memory'},400);}
});
