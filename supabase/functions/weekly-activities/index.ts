import {z} from 'npm:zod@4.6.7';
import {http,userClient} from '../_shared/http.ts';
import {generateFor} from '../_shared/activity-generation.ts';
const input=z.object({childId:z.uuid()}).strict();
Deno.serve(async req=>{const{respond,early}=http(req);if(early)return early;try{const auth=await userClient(req);if(!auth)return respond({error:'Sign in required'},401);const raw=await req.text();if(raw.length>512)return respond({error:'Request too large'},413);const p=input.safeParse(JSON.parse(raw));if(!p.success)return respond({error:'Invalid activity request'},400);return respond(await generateFor(p.data.childId,auth.user.id));}catch(error){const code=(error as {code?:string})?.code;return respond({error:code==='PT409'?'Activities are being prepared. Try again shortly.':'Activities could not be prepared.'},code==='PT403'?403:code==='PT409'?409:503);}});
