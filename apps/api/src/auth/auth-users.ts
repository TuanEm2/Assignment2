/** Persistence contract for TV2. No Prisma model or in-memory fallback is installed here. */
export interface StoredAuthUser {
  id: string;
  email: string;
  passwordHash: string;
  name?: string | null;
}

export interface PublicUser {
  id: string;
  email: string;
  name?: string;
}

export class EmailAlreadyExists extends Error {}

export abstract class AuthUsers {
  abstract findByEmail(normalizedEmail: string): Promise<StoredAuthUser | null>;
  abstract findById(id: string): Promise<StoredAuthUser | null>;
  /** Must enforce unique normalized email atomically, mapping ONLY that conflict to EmailAlreadyExists. */
  abstract create(input: { email: string; passwordHash: string; name?: string }): Promise<StoredAuthUser>;
}

export function publicUser(user: StoredAuthUser): PublicUser {
  return { id: user.id, email: user.email, ...(user.name ? { name: user.name } : {}) };
}
