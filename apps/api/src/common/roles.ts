export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';
export const roleRank: Record<Role, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 };
