/**
 * Recording system using MediaRecorder API + IndexedDB storage.
 * Safari/iPad compatible.
 */

const DB_NAME = 'violin-practice';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

let _db = null;
let _recorder = null;
let _chunks = [];
let _startTime = 0;
let _currentMeta = null;
let _playbackAudio = null;

/** Open / create IndexedDB */
async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('exerciseId', 'exerciseId', { unique: false });
        store.createIndex('dayNumber', 'dayNumber', { unique: false });
        store.createIndex('weekOf', 'weekOf', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

const Recorder = {
  get isRecording() { return _recorder?.state === 'recording'; },

  async startRecording(exerciseId, dayNumber, weekOf) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Detect supported mime type (Safari prefers mp4)
    let mimeType = '';
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
    }

    const options = mimeType ? { mimeType } : {};
    _recorder = new MediaRecorder(stream, options);
    _chunks = [];
    _startTime = Date.now();
    _currentMeta = { exerciseId, dayNumber, weekOf };

    _recorder.ondataavailable = (e) => {
      if (e.data.size > 0) _chunks.push(e.data);
    };

    _recorder.start(1000); // collect data every second
  },

  async stopRecording() {
    if (!_recorder || _recorder.state !== 'recording') return null;

    return new Promise((resolve) => {
      _recorder.onstop = async () => {
        const durationMs = Date.now() - _startTime;
        const blob = new Blob(_chunks, { type: _recorder.mimeType || 'audio/webm' });

        // Stop microphone tracks
        _recorder.stream.getTracks().forEach(t => t.stop());

        const meta = {
          exerciseId: _currentMeta.exerciseId,
          dayNumber: _currentMeta.dayNumber,
          weekOf: _currentMeta.weekOf,
          createdAt: new Date().toISOString(),
          mimeType: _recorder.mimeType || 'audio/webm',
          durationMs,
          blob,
        };

        try {
          const db = await openDB();
          await dbPut(db, meta);
          resolve(meta);
        } catch (e) {
          console.error('Failed to save recording:', e);
          resolve(null);
        }

        _recorder = null;
        _chunks = [];
        _currentMeta = null;
      };

      _recorder.stop();
    });
  },

  async getRecordings(exerciseId, dayNumber, weekOf) {
    try {
      const db = await openDB();
      const all = await dbGetAll(db);
      return all.filter(r =>
        r.exerciseId === exerciseId &&
        r.dayNumber === dayNumber &&
        r.weekOf === weekOf
      ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      console.error('Failed to get recordings:', e);
      return [];
    }
  },

  async playRecording(id) {
    this.stopPlayback();
    try {
      const db = await openDB();
      const rec = await dbGet(db, id);
      if (!rec?.blob) return;

      const url = URL.createObjectURL(rec.blob);
      _playbackAudio = new Audio(url);
      _playbackAudio.onended = () => {
        URL.revokeObjectURL(url);
        _playbackAudio = null;
      };
      _playbackAudio.play();
    } catch (e) {
      console.error('Failed to play recording:', e);
    }
  },

  stopPlayback() {
    if (_playbackAudio) {
      _playbackAudio.pause();
      _playbackAudio = null;
    }
  },

  async deleteRecording(id) {
    try {
      const db = await openDB();
      await dbDelete(db, id);
    } catch (e) {
      console.error('Failed to delete recording:', e);
    }
  },

  /** Remove recordings from weeks other than current */
  async cleanupOldRecordings(currentWeekOf) {
    try {
      const db = await openDB();
      const all = await dbGetAll(db);
      const toDelete = all.filter(r => r.weekOf !== currentWeekOf);
      for (const r of toDelete) {
        await dbDelete(db, r.id);
      }
      if (toDelete.length > 0) {
        console.log(`Cleaned up ${toDelete.length} old recordings`);
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }
};

// ---- IndexedDB helpers ----

function dbPut(db, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export default Recorder;
