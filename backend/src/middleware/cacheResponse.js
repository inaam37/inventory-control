const { getFromCache, setInCache } = require("../cache");

function cacheResponse(prefix, ttlSeconds = 30) {
  return (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    const key = `${prefix}:${req.originalUrl}`;
    const cachedPayload = getFromCache(key);

    if (cachedPayload) {
      return res.json({ ...cachedPayload, cache: "HIT" });
    }

    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      setInCache(key, payload, ttlSeconds);
      return originalJson({ ...payload, cache: "MISS" });
    };

    return next();
  };
}

module.exports = cacheResponse;
