import { setTimeout as sleep } from 'node:timers/promises';
import { assertImageUrl } from './validation.mjs';

const key = process.env.RENDER_API_KEY;
const service = process.env.RENDER_SERVICE_ID;
const imageUrl = process.env.IMAGE_URL;
const prefix = 'https://api.render.com/v1';
if (!key || !/^srv-[a-z0-9-]+$/i.test(service ?? '')) {
  throw new Error('RENDER_API_KEY or RENDER_SERVICE_ID is missing/invalid.');
}
assertImageUrl(imageUrl);

async function call(path, options = {}) {
  const response = await fetch(prefix + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Render API HTTP ${response.status} on ${path}; check service, image or credentials`);
  }
  return response.json();
}

const deploy = await call(`/services/${service}/deploys`, {
  method: 'POST',
  body: JSON.stringify({ imageUrl }),
});
if (!deploy.id) throw new Error('Render did not return a deploy id');
console.log(`Render deploy started: ${service}, id=${deploy.id}, image=${imageUrl}`);
const failures = new Set(['build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'deactivated']);
const deadline = Date.now() + 15 * 60_000;
let lastStatus = '';
while (Date.now() < deadline) {
  const state = await call(`/services/${service}/deploys/${deploy.id}`);
  if (state.status !== lastStatus) {
    console.log(`Render status: ${state.status}`);
    lastStatus = state.status;
  }
  if (state.status === 'live') {
    console.log('Render deployment is live.');
    process.exit(0);
  }
  if (failures.has(state.status)) {
    throw new Error(`Render deploy ${deploy.id} ended with ${state.status}`);
  }
  await sleep(12000);
}
throw new Error(`Render deployment ${deploy.id} timed out (last state: ${lastStatus})`);
