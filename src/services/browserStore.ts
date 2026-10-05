import { calculateNightMetrics } from '../domain/scoring';
import type { NightSession } from '../domain/types';

export type StoredNight = { night: NightSession; clip: Blob | null };

/** Audio and history stay in this browser's IndexedDB; object URLs never go into storage. */
export class BrowserNightStore {
  private database: Promise<IDBDatabase> | null = null;
  private readonly clipUrls = new Map<string, string>();

  private open(): Promise<IDBDatabase> {
    if (!this.database) {
      this.database = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('wellm-local-audio', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('nights', { keyPath: 'night.id' });
          request.result.createObjectStore('checkpoint');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error('Local browser storage is unavailable.'));
        request.onblocked = () =>
          reject(new Error('Close other WellM tabs to open local storage.'));
      }).catch((error) => {
        this.database = null;
        throw error;
      });
    }
    return this.database!;
  }

  private async transaction<T>(
    stores: string[],
    mode: IDBTransactionMode,
    action: (transaction: IDBTransaction) => IDBRequest<T>,
  ): Promise<T> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(stores, mode);
      const request = action(transaction);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Could not save to browser storage.'));
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Could not save to browser storage.'));
    });
  }

  private withClip({ night, clip }: StoredNight): NightSession {
    let url = this.clipUrls.get(night.id) ?? null;
    if (clip && !url) {
      url = URL.createObjectURL(clip);
      this.clipUrls.set(night.id, url);
    }
    return { ...night, loudestClipUri: url };
  }

  async getNights(): Promise<NightSession[]> {
    const records = await this.transaction<StoredNight[]>(['nights'], 'readonly', (tx) =>
      tx.objectStore('nights').getAll(),
    );
    return records.map((record) => this.withClip(record)).sort((a, b) => b.endedAt - a.endedAt);
  }

  async checkpoint(record: StoredNight): Promise<void> {
    await this.transaction(['checkpoint'], 'readwrite', (tx) =>
      tx.objectStore('checkpoint').put(record, 'active'),
    );
  }

  async discardCheckpoint(): Promise<void> {
    await this.transaction(['checkpoint'], 'readwrite', (tx) =>
      tx.objectStore('checkpoint').delete('active'),
    );
  }

  async finish(record: StoredNight): Promise<NightSession> {
    let removedIds: string[] = [];
    await this.transaction<StoredNight[]>(['nights', 'checkpoint'], 'readwrite', (tx) => {
      tx.objectStore('checkpoint').delete('active');
      const nights = tx.objectStore('nights');
      nights.put(record);
      const request = nights.getAll();
      request.onsuccess = () => {
        const history = (request.result as StoredNight[]).sort(
          (a, b) => b.night.endedAt - a.night.endedAt,
        );
        removedIds = history.slice(90).map(({ night }) => night.id);
        for (const id of removedIds) nights.delete(id);
      };
      return request;
    });
    for (const id of removedIds) {
      const url = this.clipUrls.get(id);
      if (url) URL.revokeObjectURL(url);
      this.clipUrls.delete(id);
    }
    return this.withClip(record);
  }

  async recoverInterruptedNight(): Promise<void> {
    const record = await this.transaction<StoredNight | undefined>(
      ['checkpoint'],
      'readonly',
      (tx) => tx.objectStore('checkpoint').get('active'),
    );
    if (!record) return;
    const night = { ...record.night, interrupted: true };
    Object.assign(night, calculateNightMetrics(night));
    await this.finish({ ...record, night });
  }

  async deleteNight(id: string): Promise<void> {
    await this.transaction(['nights'], 'readwrite', (tx) => tx.objectStore('nights').delete(id));
    const url = this.clipUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    this.clipUrls.delete(id);
  }

  async deleteAllNights(): Promise<void> {
    await this.transaction(['nights'], 'readwrite', (tx) => tx.objectStore('nights').clear());
    for (const url of this.clipUrls.values()) URL.revokeObjectURL(url);
    this.clipUrls.clear();
  }
}
