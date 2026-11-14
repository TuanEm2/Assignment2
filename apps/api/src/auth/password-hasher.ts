import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const PREFIX = 'scrypt$32768$8$3';

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(password, salt);
    return `${PREFIX}$${salt.toString('hex')}$${key.toString('hex')}`;
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    // Bound the stored format/parameters; never execute arbitrary KDF cost from a hash string.
    const match = /^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
    if (!match) return false;
    const expected = Buffer.from(match[2], 'hex');
    const actual = await derive(password, Buffer.from(match[1], 'hex'));
    return timingSafeEqual(expected, actual);
  }
}
