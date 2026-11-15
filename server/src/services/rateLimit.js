function rateLimit(max, windowMs) {
  const entries = new Map();
  return (key) => {
    const now = Date.now();
    for (const [id, entry] of entries) if (entry.until <= now) entries.delete(id);
    const entry = entries.get(key) || { count: 0, until: now + windowMs };
    entry.count++;
    entries.set(key, entry);
    return entry.count > max;
  };
}
module.exports = { rateLimit };
