

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.4302e222.js","_app/immutable/chunks/scheduler.1d0e9f53.js","_app/immutable/chunks/index.4fcad0c5.js"];
export const stylesheets = ["_app/immutable/assets/0.b17d62f2.css"];
export const fonts = [];
