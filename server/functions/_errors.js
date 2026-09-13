// ============================================================
// Shared helper: turn ANY upstream error response shape into a readable
// string. `new Error(x)` silently coerces a non-string x into the literal
// text "[object Object]" instead of throwing or extracting anything useful
// — several call sites across this app used `j.error || j.message` as an
// Error's message argument, assuming it was always already a string, which
// broke (as "[object Object]" surfacing all the way to the user) the
// moment an upstream API returned a nested error object instead of a
// plain string. Confirmed live 2026-07-17 via Flyer Studio's design
// assistant with reference images attached.
// ============================================================
function extractErrorMessage(j) {
  if (!j) return '';
  const e = j.error;
  if (typeof e === 'string') return e;
  if (e && typeof e.message === 'string') return e.message;
  if (Array.isArray(j.detail)) return j.detail.map((d) => (d && d.msg) || (typeof d === 'string' ? d : JSON.stringify(d))).join('; ');
  if (typeof j.message === 'string') return j.message;
  if (e) { try { return JSON.stringify(e); } catch (_) { return String(e); } }
  return '';
}

module.exports = { extractErrorMessage };
