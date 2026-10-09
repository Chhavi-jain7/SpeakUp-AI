export class ApiError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("I can't reach the server. Make sure the backend is running, then try again.", 'NETWORK');
  }
    if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new ApiError(data?.error?.message || 'Something went wrong. Please try again.', data?.error?.code || 'SERVER_ERROR');
  return data;
}

export const api = {
  start: (mode) => post('/start', { mode }),
  turn: (p) => post('/turn', p),
  speech: (text, mode) => post('/speech', { text, mode }),
  feedback: (p) => post('/feedback', p),
};

export const FATAL_CODES = ['NO_KEY', 'INVALID_KEY'];
