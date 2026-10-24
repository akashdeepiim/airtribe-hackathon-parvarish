import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
export function http(req: Request) {
  const origin = req.headers.get('origin');
  const allowed = (Deno.env.get('APP_ORIGINS') ?? 'http://localhost:8081,http://localhost:8082,http://127.0.0.1:8081,http://127.0.0.1:8082').split(',');
  const headers = { 'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin','Access-Control-Allow-Origin':origin && allowed.includes(origin) ? origin : allowed[0], 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS' };
  const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  const early=origin && !allowed.includes(origin) ? respond({error:'Origin not allowed'},403) : req.method==='OPTIONS' ? new Response(null,{status:204,headers}) : req.method!=='POST' ? respond({error:'Method not allowed'},405) : null;
  return {respond,early};
}
export async function userClient(req:Request){
  const authorization=req.headers.get('authorization');
  if(!authorization?.startsWith('Bearer ')) return null;
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const result=await client.auth.getUser();
  return result.error||!result.data.user?null:{client,user:result.data.user};
}
export function adminClient(){return createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});}
export async function cleanupPhotos(jobId:string|null=null){
  const admin=adminClient();
  const jobs=await admin.rpc('claim_photo_cleanup',{job_id:jobId});
  if(jobs.error) return false;
  let success=true;
  for(const job of jobs.data??[]){
    const removed=await admin.storage.from(job.bucket).remove([job.object_path]);
    const done=await admin.rpc('finish_photo_cleanup',{job_id:job.id,succeeded:!removed.error});
    success&&=!removed.error&&!done.error;
  }
  return success;
}
