

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.8d1cca98.js","_app/immutable/chunks/scheduler.1d0e9f53.js","_app/immutable/chunks/index.4fcad0c5.js","_app/immutable/chunks/singletons.f2acc981.js"];
export const stylesheets = [];
export const fonts = [];
