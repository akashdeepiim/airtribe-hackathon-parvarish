import { z } from 'npm:zod@4.6.7';
import { http,userClient,adminClient,cleanupPhotos } from '../_shared/http.ts';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('photo'),childId:z.uuid(),recordId:z.uuid()}).strict(),
 z.object({action:z.literal('remove'),childId:z.uuid(),recordId:z.uuid(),entity:z.enum(['allergies','vaccination_logs','growth_measurements'])}).strict(),
]);
Deno.serve(async(req)=>{
 const {respond,early}=http(req);if(early)return early;
 try{
  const user=await userClient(req);if(!user)return respond({error:'Sign in to continue.'},401);
  const parsed=input.safeParse(await req.json());if(!parsed.success)return respond({error:'Check the request.'},400);
  const b=parsed.data;
  if(b.action==='photo'){
   const permitted=await user.client.rpc('authorize_health_photo',{cid:b.childId,record_id:b.recordId});
   if(permitted.error)return respond({error:'Card unavailable.'},permitted.error.code==='PT404'?404:403);
   const signed=await adminClient().storage.from('health-photos').createSignedUrl(permitted.data,900);
   if(signed.error)return respond({error:'Could not open this card.'},503);
   const internal=Deno.env.get('SUPABASE_URL')!;const external=Deno.env.get('PUBLIC_SUPABASE_URL')??internal;
   return respond({url:signed.data.signedUrl.replace(internal,external),expiresAt:Date.now()+900000});
  }
  const result=await user.client.rpc('remove_health_record',{cid:b.childId,entity:b.entity,record_id:b.recordId});
  if(result.error)return respond({error:'Record could not be removed.'},result.error.code==='PT404'?404:403);
  // Storage deletion retries through the scheduled worker if immediate cleanup fails.
  await cleanupPhotos();return respond({removed:true});
 }catch{return respond({error:'Health request could not be completed.'},400);}
});
