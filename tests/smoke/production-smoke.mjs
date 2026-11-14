import { assertPublicUrl } from '../../scripts/cd/validation.mjs';

const api = assertPublicUrl(process.env.API_BASE_URL, 'API_BASE_URL');
const web = assertPublicUrl(process.env.WEB_BASE_URL, 'WEB_BASE_URL');
const checks = [
  {
    title: 'API health',
    url: `${api}/api/health`,
    validate: async (response) => {
      if (!response.ok) throw new Error(`health returned ${response.status}`);
      const payload = await response.json();
      if (payload.status !== 'ok' || payload.service !== 'brewlite-api') {
        throw new Error('health JSON did not match the expected contract');
      }
    },
  },
  {
    title: 'Products served by real API',
    url: `${api}/api/products`,
    validate: async (response) => {
      if (!response.ok) throw new Error(`products returned ${response.status}`);
      const products = await response.json();
      if (!Array.isArray(products)) throw new Error('products response is not an array');
    },
  },
  {
    title: 'JWT-protected order history',
    url: `${api}/api/orders/me`,
    validate: async (response) => {
      if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
    },
  },
  {
    title: 'Public menu page',
    url: `${web}/menu`,
    validate: async (response) => {
      if (!response.ok) throw new Error(`menu returned ${response.status}`);
      const html = await response.text();
      if (!/BrewLite/i.test(html)) throw new Error('menu did not render BrewLite');
    },
  },
];

async function runCheck(check) {
  const response = await fetch(check.url, {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  await check.validate(response);
}
for (const check of checks) {
  let passed = false;
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      await runCheck(check);
      passed = true;
      console.log(`PASS ${check.title}`);
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 8) await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  if (!passed) throw new Error(`FAIL ${check.title}: ${lastError?.message}`);
}
console.log('Live production smoke test passed');
