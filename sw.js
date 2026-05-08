// sw.js – caches and decrypts tool files
const CACHE_NAME = 'omr-v3';
const BASE = '/a4_50_bgd_omr'; // adjust if needed

const LIBRARIES = [
  `${BASE}/libs/opencv.js`,
  `${BASE}/libs/pdf.min.js`,
  `${BASE}/libs/pdf.worker.min.js`,
  `${BASE}/libs/xlsx.full.min.js`,
  `${BASE}/libs/jszip.min.js`,
  `${BASE}/libs/pdf-lib.min.js`,
  `${BASE}/libs/jspdf.umd.min.js`,
  `${BASE}/theme-bridge.js`
];

const ENCRYPTED_TOOLS = [
  `${BASE}/encrypted/tool1.html.enc`,
  `${BASE}/encrypted/tool2.html.enc`,
  `${BASE}/encrypted/tool3.html.enc`,
  `${BASE}/encrypted/tool4.html.enc`
];

let decryptionKey = null; // stored in IndexedDB inside SW

// Open IndexedDB to store the key
function openKeyDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('omr_key_db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getKey() {
  if (decryptionKey) return decryptionKey;
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readonly');
    const store = tx.objectStore('keys');
    const get = store.get('aes-key');
    get.onsuccess = () => {
      decryptionKey = get.result;
      resolve(decryptionKey);
    };
    get.onerror = () => reject(get.error);
    db.close();
  });
}

async function setKey(base64Key) {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    const put = store.put(base64Key, 'aes-key');
    put.onsuccess = () => {
      decryptionKey = base64Key;
      resolve();
    };
    put.onerror = () => reject(put.error);
    db.close();
  });
}

// Decrypt using Web Crypto
async function decrypt(encryptedArrayBuffer, keyBase64) {
  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const nonce = encryptedArrayBuffer.slice(0, 12);
  const ciphertext = encryptedArrayBuffer.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, cryptoKey, ciphertext);
  return new TextDecoder().decode(plaintext);
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([...LIBRARIES, ...ENCRYPTED_TOOLS]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Intercept tool1.html, tool2.html, etc.
  if (url.pathname.match(/\/tool[1-4]\.html$/)) {
    event.respondWith((async () => {
      // Map to the corresponding encrypted file
      const toolName = url.pathname.split('/').pop(); // e.g., "tool1.html"
      const encFileName = toolName.replace('.html', '.html.enc');
      const encryptedUrl = `${BASE}/encrypted/${encFileName}`;
      
      const cache = await caches.open(CACHE_NAME);
      let response = await cache.match(encryptedUrl);
      if (!response) {
        // Fallback: fetch from network (should not happen after first visit)
        response = await fetch(encryptedUrl);
        if (response.ok) await cache.put(encryptedUrl, response.clone());
      }
      const encryptedBuffer = await response.arrayBuffer();
      
      const key = await getKey();
      if (!key) {
        // No key stored – redirect to index page to ask for key
        return Response.redirect(`${BASE}/?needkey=1`, 302);
      }
      try {
        const htmlContent = await decrypt(encryptedBuffer, key);
        // Return as HTML with proper content type
        return new Response(htmlContent, {
          headers: { 'Content-Type': 'text/html' }
        });
      } catch(e) {
        return new Response('Decryption failed', { status: 500 });
      }
    })());
    return;
  }
  
  // For all other requests (libraries, index.html, etc.), serve from cache or network
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
