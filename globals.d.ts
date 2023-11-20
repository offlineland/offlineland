declare global {
    var Qs: typeof import('qs');
    var JSZip: typeof import('jszip/index.d.ts');
    var Zod: typeof import('zod/lib/index.d.ts');
    var idbKeyval: typeof import('idb-keyval/dist/index.d.ts');
    var matchPath: (path: string) => (path: string) => boolean;
}

export {};