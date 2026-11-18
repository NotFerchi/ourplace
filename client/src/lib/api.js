// Cliente mínimo de la API. Las cookies de sesión viajan solas (mismo origen).
async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // Sesión vencida o cerrada en otro lado: avisa a AuthProvider para volver al login
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('myplace:unauthorized'))
    throw Object.assign(new Error(data.error || 'Algo salió mal. Intenta de nuevo.'), { status: res.status })
  }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
}
