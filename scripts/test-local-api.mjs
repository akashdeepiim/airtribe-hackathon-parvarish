import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { createClient } from '@supabase/supabase-js';

// Deliberately refuses hosted projects. Every row/object belongs to this disposable test run.
const env = Object.fromEntries(
  readFileSync(new URL('../.local/supabase.env', import.meta.url), 'utf8')
    .trim()
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
    }),
);
assert.match(
  env.API_URL,
  /^http:\/\/(127\.0\.0\.1|localhost):(54321|54421)$/,
  'This script only tests local Supabase',
);
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const run = Date.now();
const users = [];
const children = [];
const objects = [];
let checks = 0;
const choices = {
  memories: true,
  milestones: true,
  health: true,
  personalisation: true,
  notifications: true,
};
const notice = '2026-10-24.v2';
function check(condition, label) {
  assert.ok(condition, label);
  checks++;
  console.log(`PASS ${label}`);
}
async function identity(label) {
  const email = `qa-api-${label}-${run}@parvarish.test`;
  const generated = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  assert.ifError(generated.error);
  users.push(generated.data.user.id);
  const client = createClient(env.API_URL, env.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await client.auth.verifyOtp({
    email,
    token: generated.data.properties.email_otp,
    type: 'email',
  });
  assert.ifError(verified.error);
  return { client, email, id: generated.data.user.id };
}
async function rpc(client, name, args) {
  const result = await client.rpc(name, args);
  if (result.error)
    throw Object.assign(new Error(`Local RPC failed: ${name}`), { code: result.error.code });
  return result.data;
}
try {
  const owner = await identity('owner');
  const viewer = await identity('viewer');
  const stranger = await identity('stranger');
  const cid = await rpc(owner.client, 'create_child', {
    profile: {
      name: 'SYNTHETIC API FIXTURE',
      dob: '2025-01-01',
      sex: null,
      city: 'Bangalore',
      interests: [],
    },
    choices,
    adult_guardian: true,
    notice_version: notice,
  });
  children.push(cid);
  check(!!cid, 'verified email session creates a consented child');
  const invite = await rpc(owner.client, 'create_invite', {
    cid,
    recipient_email: viewer.email,
    member_role: 'family_viewer',
    relationship: 'Test family',
  });
  const wrong = await stranger.client.rpc('accept_invite', {
    invite_token: invite.token,
    choices,
    adult: true,
    notice_version: notice,
  });
  check(wrong.status === 403, 'forwarded invitation is denied with HTTP 403');
  await rpc(viewer.client, 'accept_invite', {
    invite_token: invite.token,
    choices,
    adult: true,
    notice_version: notice,
  });
  const pixels = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7WQAAAAASUVORK5CYII=',
    'base64',
  );
  const path = `${cid}/${owner.id}/api-fixture.png`;
  const upload = await owner.client.storage
    .from('child-photos')
    .upload(path, pixels, { contentType: 'image/png' });
  assert.ifError(upload.error);
  objects.push(path);
  check(true, 'owner uploads to private bucket');
  await rpc(owner.client, 'set_child_avatar', { cid, object_path: path });
  const mid = randomUUID();
  await rpc(owner.client, 'record_memory', {
    mid,
    cid,
    object_path: path,
    photo_date: '2025-06-01T12:00:00Z',
  });
  check(true, 'uploaded image is recorded as a dated memory');
  const batch = await viewer.client.functions.invoke('signed-memories', {
    body: { paths: [path] },
  });
  assert.ifError(batch.error);
  check(batch.data.photos.length === 1, 'family viewer can open a private memory batch');
  const foreignBatch = await stranger.client.functions.invoke('signed-memories', {
    body: { paths: [path] },
  });
  check(foreignBatch.error?.context?.status === 403, 'non-member cannot sign a memory batch');
  const forbiddenDelete = await viewer.client.functions.invoke('memory-actions', {
    body: { action: 'remove', memoryId: mid },
  });
  check(
    forbiddenDelete.error?.context?.status === 403,
    'viewer cannot delete memory through the function',
  );

  const viewerUpload = await viewer.client.storage
    .from('child-photos')
    .upload(`${cid}/${viewer.id}/forbidden.png`, pixels, { contentType: 'image/png' });
  check(!!viewerUpload.error, 'viewer cannot upload');
  const direct = await owner.client.storage.from('child-photos').createSignedUrl(path, 7200);
  check(!!direct.error, 'client cannot mint a two-hour photo URL');
  const endpoint = `${env.API_URL}/functions/v1/signed-photo`;
  const unsigned = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: env.ANON_KEY },
    body: JSON.stringify({ path }),
  });
  check(unsigned.status === 401, 'missing bearer token cannot sign a photo');
  const invalidToken = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.ANON_KEY,
      Authorization: 'Bearer invalid-test-token',
    },
    body: JSON.stringify({ path }),
  });
  check(invalidToken.status === 401, 'invalid bearer token cannot sign a photo');
  const customExpiry = await owner.client.functions.invoke('signed-photo', {
    body: { path, expiresIn: 7200 },
  });
  check(customExpiry.error?.context?.status === 400, 'client cannot override photo expiry');
  const foreignOrigin = await owner.client.functions.invoke('signed-photo', {
    body: { path },
    headers: { Origin: 'https://untrusted.example' },
  });
  check(foreignOrigin.error?.context?.status === 403, 'unlisted web origin is denied');
  const signed = await owner.client.functions.invoke('signed-photo', { body: { path } });
  assert.ifError(signed.error);
  const claims = JSON.parse(
    Buffer.from(
      new URL(signed.data.url).searchParams.get('token').split('.')[1],
      'base64url',
    ).toString(),
  );
  check(claims.exp - claims.iat <= 900, 'server signs for at most 15 minutes');
  const image = await fetch(signed.data.url);
  check(image.status === 200, 'authorised signed image loads');
  const strangerPhoto = await stranger.client.functions.invoke('signed-photo', { body: { path } });
  check(strangerPhoto.error?.context?.status === 403, 'non-member cannot get a signed photo');
  const publicImage = await fetch(`${env.API_URL}/storage/v1/object/public/child-photos/${path}`);
  check(publicImage.status !== 200, 'public bucket URL never serves the image');
  const short = await admin.storage.from('child-photos').createSignedUrl(path, 1);
  assert.ifError(short.error);
  await new Promise((resolve) => setTimeout(resolve, 2100));
  const expired = await fetch(short.data.signedUrl);
  check(expired.status !== 200, 'expired signed URL is rejected by Storage');
  const healthDenied = await viewer.client.rpc('read_health', { cid });
  check(healthDenied.status === 403, 'health endpoint returns 403 by default for viewer');
  const hid = await rpc(owner.client, 'write_health', {
    cid,
    entity: 'allergies',
    record_id: null,
    payload: { type: 'other', allergen: 'TEST ONLY', severity: 'TEST ONLY' },
    remove: false,
  });
  await rpc(owner.client, 'set_member_access', {
    cid,
    member_id: viewer.id,
    relationship: 'Test family',
    permissions: { 'health.read': true },
  });
  const health = await rpc(viewer.client, 'read_health', { cid });
  check(
    health.allergies.some((a) => a.id === hid),
    'explicit owner grant permits family health read',
  );
  const audit = await admin
    .from('audit_log')
    .select('id')
    .eq('child_id', cid)
    .eq('actor_id', viewer.id)
    .eq('action', 'read')
    .eq('entity_id', hid);
  assert.ifError(audit.error);
  check(audit.data.length === 1, 'health read writes an audit entry');
  await rpc(viewer.client, 'set_consent', {
    cid,
    purpose: 'health',
    granted: false,
    notice_version: notice,
  });
  const withdrawn = await viewer.client.rpc('read_health', { cid });
  check(withdrawn.status === 403, 'withdrawn purpose blocks otherwise permitted health access');
  await rpc(owner.client, 'revoke_member', { cid, member_id: viewer.id });
  const revoked = await viewer.client.functions.invoke('signed-photo', { body: { path } });
  check(revoked.error?.context?.status === 403, 'revoked member cannot mint new photo URLs');

  const generatedActivities = await owner.client.functions.invoke('weekly-activities', {
    body: { childId: cid },
  });
  assert.ifError(generatedActivities.error);
  check(generatedActivities.data.ready, 'activity function validates and saves a weekly batch');
  const activityBatch = await owner.client
    .from('activity_batches')
    .select('id,items,model')
    .eq('child_id', cid)
    .single();
  assert.ifError(activityBatch.error);
  check(activityBatch.data.items.length === 3, 'weekly batch contains three safe activities');
  await rpc(owner.client, 'record_activity_feedback', {
    cid,
    batch: activityBatch.data.id,
    item_index: 0,
    answer: 'did_it',
    photo: null,
  });
  check(true, 'activity completion feedback is saved');
  const exportRequest = await owner.client.functions.invoke('data-actions', {
    body: { action: 'export', childId: cid },
  });
  assert.ifError(exportRequest.error);
  const exportId = exportRequest.data.jobId;
  let exportJob;
  for (let i = 0; i < 25; i++) {
    const q = await owner.client.from('data_jobs').select('*').eq('id', exportId).single();
    assert.ifError(q.error);
    exportJob = q.data;
    if (exportJob.status === 'ready') break;
    await new Promise((r) => setTimeout(r, 250));
  }
  check(exportJob.status === 'ready', 'background export finishes independently');
  const download = await owner.client.functions.invoke('data-actions', {
    body: { action: 'download', jobId: exportId, part: 0 },
  });
  assert.ifError(download.error);
  const zip = await fetch(download.data.url);
  check(zip.ok, 'authorised export download succeeds');
  const entries = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  const payload = JSON.parse(strFromU8(entries['family.json']));
  check(
    payload.child.id === cid && payload.health.allergies.length === 1,
    'export ZIP contains scoped JSON and audited health records',
  );
  const foreignDownload = await stranger.client.functions.invoke('data-actions', {
    body: { action: 'download', jobId: exportId, part: 0 },
  });
  check(!!foreignDownload.error, 'non-member cannot download an export');

  const deleted = await owner.client.functions.invoke('memory-actions', {
    body: { action: 'remove', memoryId: mid },
  });
  assert.ifError(deleted.error);
  check(
    deleted.data.removed && deleted.data.cleanup === 'complete',
    'owner removal completes storage cleanup',
  );
  const remaining = await owner.client.from('memories').select('id').eq('id', mid);
  assert.ifError(remaining.error);
  check(remaining.data.length === 0, 'deleted memory is absent from timeline');
  const bytesAfterDelete = await admin.storage.from('child-photos').download(path);
  check(!!bytesAfterDelete.error, 'deleted image bytes are no longer in Storage');
  const deletion = await owner.client.functions.invoke('data-actions', {
    body: { action: 'delete', childId: cid, confirmation: 'DELETE' },
  });
  assert.ifError(deletion.error);
  let receipt;
  for (let i = 0; i < 25; i++) {
    const q = await owner.client
      .from('deletion_receipts')
      .select('id')
      .eq('id', deletion.data.jobId);
    assert.ifError(q.error);
    receipt = q.data;
    if (receipt.length) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  check(
    receipt.length === 1,
    'background deletion creates a receipt after storage and rows are removed',
  );
  const gone = await admin.from('children').select('id').eq('id', cid);
  assert.ifError(gone.error);
  check(gone.data.length === 0, 'child row is physically deleted');
  await admin.from('deletion_receipts').delete().eq('id', deletion.data.jobId);
  await admin.from('data_jobs').delete().eq('child_id', cid);

  console.log(`${checks} local API checks passed.`);
} finally {
  if (objects.length) {
    const r = await admin.storage.from('child-photos').remove(objects);
    assert.ifError(r.error);
  }
  for (const cid of children) {
    const r = await admin.from('children').delete().eq('id', cid);
    assert.ifError(r.error);
  }
  for (const uid of users) {
    const r = await admin.auth.admin.deleteUser(uid);
    assert.ifError(r.error);
  }
}
