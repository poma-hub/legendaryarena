const basePath = import.meta.env.BASE_URL === '/'
  ? ''
  : import.meta.env.BASE_URL.replace(/\/$/, '')

export function appPath(route = '') {
  const normalizedRoute = route.replace(/^\/+/, '')
  return normalizedRoute ? `${basePath}/${normalizedRoute}` : basePath ? `${basePath}/` : '/'
}

export function getRoutePath(pathname: string) {
  if (!basePath) return pathname.replace(/\/+$/, '') || '/'
  if (pathname === basePath || pathname === `${basePath}/`) return '/'
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length).replace(/\/+$/, '') || '/'
  }
  return pathname
}

export function isAppPath(pathname: string) {
  return basePath
    ? pathname === basePath || pathname.startsWith(`${basePath}/`)
    : pathname.startsWith('/')
}
