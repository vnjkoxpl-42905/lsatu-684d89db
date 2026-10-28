import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';

import { IndexedDBPersistence } from './IndexedDBPersistence';

const DB_NAME = 'mc-bootcamp';

async function deleteTestDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

describe('IndexedDBPersistence upgrades', () => {
  beforeEach(deleteTestDatabase);

  it('repairs a version-2 database that predates the practice_sessions store', async () => {
    const legacy = await openDB(DB_NAME, 2, {
      upgrade(db) {
        db.createObjectStore('simulator_attempts', { keyPath: 'id' });
      },
    });
    legacy.close();

    const persistence = new IndexedDBPersistence('student-1');
    await persistence.set('practice_sessions', 'run-1', { status: 'in_progress' });

    await expect(persistence.get('practice_sessions', 'run-1')).resolves.toMatchObject({
      status: 'in_progress',
    });
  });
});
