import {z} from 'npm:zod@4.6.7';
import {zipSync,strToU8} from 'npm:fflate@0.8.3';
import {adminClient} from './http.ts';
const fileSchema=z.object({bucket:z.enum(['child-photos','health-photos','family-exports']),path:z.string().min(1)});
const jobSchema=z.object({id:z.uuid(),kind:z.enum(['export','deletion','expire']),lease:z.uuid().optional(),files:z.array(fileSchema).max(50),child_id:z.uuid().optional(),part:z.number().optional(),total:z.number().optional(),payload:z.record(z.string(),z.unknown()).optional()});
export async function processDataJob(requestedJob:string|null=null){
 const admin=adminClient(),claim=await admin.rpc('claim_data_job',{requested_job:requestedJob});if(claim.error)throw claim.error;if(!claim.data)return false;
 const job=jobSchema.parse(claim.data);let partPath:string|null=null;
 try{
  if(job.kind==='export'){
   const archive:Record<string,Uint8Array>={};
   archive[job.part===1?'family.json':'manifest.json']=strToU8(JSON.stringify(job.part===1?job.payload:{format_version:1,part:job.part,total_files:job.total,files:job.files},null,2));
   for(const f of job.files){const result=await admin.storage.from(f.bucket).download(f.path);if(result.error)throw result.error;archive[`${f.bucket}/${f.path}`]=new Uint8Array(await result.data.arrayBuffer());}
   // Photos are already compressed. STORE avoids CPU limits and processes at most 20 images per volume.
   const zipped=zipSync(archive,{level:0});partPath=`${job.child_id}/${job.id}/part-${job.part}.zip`;
   const upload=await admin.storage.from('family-exports').upload(partPath,zipped,{contentType:'application/zip',upsert:true,cacheControl:'0'});if(upload.error)throw upload.error;
  }else{
   for(const bucket of ['child-photos','health-photos','family-exports']){const paths=job.files.filter(f=>f.bucket===bucket).map(f=>f.path);if(paths.length){const removed=await admin.storage.from(bucket).remove(paths);if(removed.error)throw removed.error;}}
  }
  const finished=job.kind==='expire'?await admin.rpc('finish_export_expiry',{job_id:job.id}):await admin.rpc('finish_data_job',{job_id:job.id,token:job.lease,succeeded:true,processed:job.files.length,part_path:partPath});if(finished.error)throw finished.error;return true;
 }catch{
  if(job.lease)await admin.rpc('finish_data_job',{job_id:job.id,token:job.lease,succeeded:false});
  // Do not log paths, payloads or provider errors containing sensitive data.
  throw new Error('data_job_retry');
 }
}
