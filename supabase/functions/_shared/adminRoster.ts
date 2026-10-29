// Read-only pagination for admin roster consumers. A failed page is never a complete roster.
export type PageResult<T> = { data: T[] | null; error?: unknown };
export async function readAllRosterPages<T>(read: (offset: number, size: number) => PromiseLike<PageResult<T>>, identity: (row: T) => string, size = 200): Promise<T[]> {
  const rows = new Map<string,T>();
  let offset = 0;
  for (let page = 0; page < 10000; page++) {
    const result = await read(offset, size);
    if (result.error) throw new Error('Account roster could not be loaded completely');
    if (!Array.isArray(result.data)) throw new Error('Account roster page is unavailable');
    if (result.data.length === 0) return [...rows.values()];
    let added = 0;
    for (const row of result.data) {
      const key = identity(row);
      if (!key) throw new Error('Account roster identity is unavailable');
      if (!rows.has(key)) added++;
      rows.set(key,row);
    }
    if (!added) throw new Error('Account roster pagination did not advance');
    // Advance by the received length, so a lower PostgREST row cap cannot skip accounts.
    offset += result.data.length;
  }
  throw new Error('Account roster pagination is incomplete');
}
export async function readAllAuthUsers<T extends { id: string }>(read: (page: number, perPage: number) => PromiseLike<{ data: { users: T[] } | null; error?: unknown }>, perPage = 200): Promise<T[]> {
  const users = new Map<string,T>();
  for (let page = 1; page <= 10000; page++) {
    const result = await read(page,perPage);
    if (result.error || !Array.isArray(result.data?.users)) throw new Error('Account email roster could not be loaded completely');
    if (!result.data.users.length) return [...users.values()];
    let added = 0;
    for (const user of result.data.users) {
      if (!user.id) throw new Error('Account email identity is unavailable');
      if (!users.has(user.id)) added++;
      users.set(user.id,user);
    }
    if (!added) throw new Error('Account email pagination did not advance');
  }
  throw new Error('Account email pagination is incomplete');
}
export function rosterRoleMap(roles: {user_id:string;role:string}[]): Map<string,string> {
  const map = new Map<string,string>();
  for (const row of roles) {
    // A second role can never hide an administrator from student eligibility checks.
    if (map.get(row.user_id) !== 'admin') map.set(row.user_id,row.role);
  }
  return map;
}
