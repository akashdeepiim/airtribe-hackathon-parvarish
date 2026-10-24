import {cleanupPhotos} from '../_shared/http.ts';
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST'||req.headers.get('authorization')!==`Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`)return new Response(null,{status:401});
 try{return Response.json({completed:await cleanupPhotos()},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Cleanup will retry'},{status:500});}
});
