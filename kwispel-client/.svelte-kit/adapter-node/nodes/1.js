

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.c4a9c9cd.js","_app/immutable/chunks/scheduler.1d0e9f53.js","_app/immutable/chunks/index.4fcad0c5.js","_app/immutable/chunks/singletons.5ad59d33.js"];
export const stylesheets = [];
export const fonts = [];
