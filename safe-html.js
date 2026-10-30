/* Legacy views use HTML templates; all their sinks pass through this boundary. */
window.safeHTML = function safeHTML(value) {
  if (!window.DOMPurify) throw new Error('HTML sanitizer could not load. Reload before editing inventory.');
  return DOMPurify.sanitize(String(value ?? ''), {
    FORBID_TAGS: ['script','style','iframe','object','embed','svg','math','img','link','meta','a'],
    FORBID_ATTR: ['style'],
    ALLOW_UNKNOWN_PROTOCOLS: false
  });
};
