// Tiny view router. Views register a render(root, params) function.
const views = new Map();
const routeListeners = new Set();
export const route = { name: 'home', params: {} };

export function registerView(name, render) {
  views.set(name, render);
}

export function onRoute(cb) {
  routeListeners.add(cb);
}

export function navigate(name, params = {}) {
  route.name = name;
  route.params = params;
  routeListeners.forEach((cb) => cb(route));
}

export function getView(name) {
  return views.get(name);
}
