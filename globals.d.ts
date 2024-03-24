declare global {
    var Qs: typeof import('qs');
    var JSZip: typeof import('jszip/index.d.ts');
    var Zod: typeof import('zod/lib/index.d.ts');
    var idbKeyval: typeof import('idb-keyval/dist/index.d.ts');

    var idb: typeof import('idb/build/index.d.ts');
    type DBSchema = import('idb/build/index.d.ts').DBSchema;
    type IDBPDatabase = import('idb/build/index.d.ts').IDBPDatabase;
    type IDBPTransaction = import('idb/build/index.d.ts').IDBPTransaction;

    var matchPath: (path: string) => (path: string) => boolean;
}

export {};