import test from 'node:test';
import assert from 'node:assert/strict';
import { assertImageUrl, assertPublicUrl } from '../../scripts/cd/validation.mjs';

test('accepts versioned GHCR images and rejects mutable or malformed tags', () => {
  const sha = 'a'.repeat(40);
  assert.equal(assertImageUrl(`ghcr.io/tuanem2/assignment2-api:${sha}`),
    `ghcr.io/tuanem2/assignment2-api:${sha}`);
  assert.throws(() => assertImageUrl('ghcr.io/tuanem2/assignment2-api:latest'));
  assert.throws(() => assertImageUrl('docker.io/library/nginx:latest'));
});

test('requires public HTTPS origin for real smoke checks', () => {
  assert.equal(assertPublicUrl('https://web.example.com', 'web'), 'https://web.example.com');
  assert.throws(() => assertPublicUrl('http://localhost:3000', 'web'));
  assert.throws(() => assertPublicUrl('https://web.example.com/private', 'web'));
  assert.throws(() => assertPublicUrl('https://user:secret@example.com', 'web'));
});
