const DB_NAME = 'violin-author-assets-v1';
const STORE_NAME = 'author_assets';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('weekOf', 'weekOf', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(mode, handler) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = handler(store);

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export async function replaceWeekAssets(weekOf, files = [], existingAssetIds = []) {
  const normalizedFiles = Array.from(files);

  await deleteAssets(existingAssetIds);
  const assets = normalizedFiles.map((file) => ({
    id: `${weekOf}:${file.name}:${file.lastModified}:${Math.random().toString(36).slice(2, 8)}`,
    weekOf,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    lastModified: file.lastModified || Date.now(),
    blob: file,
  }));

  if (!assets.length) {
    return [];
  }

  await withStore('readwrite', (store) => {
    assets.forEach((asset) => store.put(asset));
  });

  return assets.map(({ id, weekOf: assetWeekOf, name, type, size, lastModified }) => ({
    id,
    weekOf: assetWeekOf,
    name,
    type,
    size,
    lastModified,
  }));
}

export async function getAssetBlob(assetId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(assetId);

    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAssets(assetIds = []) {
  if (!assetIds.length) {
    return;
  }

  await withStore('readwrite', (store) => {
    assetIds.forEach((assetId) => store.delete(assetId));
  });
}
