export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {"start":"_app/immutable/entry/start.feeb15ea.js","app":"_app/immutable/entry/app.692293e2.js","imports":["_app/immutable/entry/start.feeb15ea.js","_app/immutable/chunks/scheduler.1d0e9f53.js","_app/immutable/chunks/singletons.5ad59d33.js","_app/immutable/entry/app.692293e2.js","_app/immutable/chunks/scheduler.1d0e9f53.js","_app/immutable/chunks/index.4fcad0c5.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		}
	}
}
})();

export const prerendered = new Set([]);
