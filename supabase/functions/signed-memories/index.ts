import {z} from 'npm:zod@4.6.7';
import {http,userClient,adminClient} from '../_shared/http.ts';
const input=z.object({paths:z.array(z.string().max(512).regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-zA-Z0-9_.-]+$/)).min(1).max(50)}).strict();
Deno.serve(async(req:Request)=>{
 const {respond,early}=http(req);if(early)return early;
 try{
  const auth=await userClient(req);if(!auth)return respond({error:'Sign in required'},401);
  const body=await req.text();if(body.length>28000)return respond({error:'Request too large'},413);
  const parsed=input.safeParse(JSON.parse(body));if(!parsed.success)return respond({error:'Invalid photo request'},400);
  const paths=[...new Set(parsed.data.paths)];
  const visible=await auth.client.from('memories').select('storage_path').in('storage_path',paths);
  if(visible.error||visible.data.length!==paths.length)return respond({error:'Photos unavailable'},403);
  const signed=await adminClient().storage.from('child-photos').createSignedUrls(paths,900);
  if(signed.error)return respond({error:'Photos unavailable'},404);
  const internal=Deno.env.get('SUPABASE_URL')!;const external=Deno.env.get('PUBLIC_SUPABASE_URL')??internal;
  return respond({photos:signed.data.filter(p=>p.signedUrl&&!p.error).map(p=>({path:p.path,url:p.signedUrl.replace(internal,external),expiresAt:Date.now()+900000}))});
 }catch{return respond({error:'Unable to open photos'},400);}
});
