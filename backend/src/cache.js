const cacheStore = new Map();

function getFromCache(key) {
  const entry = cacheStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value;
}

function setInCache(key, value, ttlSeconds) {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

function clearCache() {
  cacheStore.clear();
}

module.exports = {
  getFromCache,
  setInCache,
  clearCache,
  cacheStore
};
