import { describe, expect, it } from '@jest/globals';
import { jwtSecret } from './access-tokens';
import { PasswordHasher } from './password-hasher';

describe('TV5 password hash and signing configuration', () => {
  const passwords = new PasswordHasher();

  it('randomizes salt and checks correct/wrong passwords using the actual KDF', async () => {
    const a = await passwords.hash('Coffee-password-test-42');
    const b = await passwords.hash('Coffee-password-test-42');
    expect(a).not.toBe(b);
    expect(await passwords.verify('Coffee-password-test-42', a)).toBe(true);
    expect(await passwords.verify('wrong-password-test-42', a)).toBe(false);
  });

  it.each(['', 'plaintext', 'scrypt$999999999$8$3$ff$ff', 'scrypt$32768$8$3$ff$ff'])
    ('rejects corrupt or arbitrary-cost stored hashes: %s', async encoded => {
      expect(await passwords.verify('Coffee-password-test-42', encoded)).toBe(false);
    });

  it('rejects missing or short signing secrets rather than using a default key', () => {
    const previous = process.env.JWT_SECRET;
    try {
      delete process.env.JWT_SECRET;
      expect(jwtSecret).toThrow('JWT_SECRET');
      process.env.JWT_SECRET = ' '.repeat(32);
      expect(jwtSecret).toThrow('JWT_SECRET');
      process.env.JWT_SECRET = 'your_jwt_secret_key';
      expect(jwtSecret).toThrow('JWT_SECRET');
      process.env.JWT_SECRET = 'valid-test-only-secret-at-least-32-bytes';
      expect(jwtSecret()).toBe(process.env.JWT_SECRET);
    } finally {
      if (previous === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previous;
    }
  });
});
