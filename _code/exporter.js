
(async () => {
    eval(await (await fetch("https://redom.js.org/redom.min.js")).text());
    eval(await (await fetch("https://unpkg.com/zod@3.22.0/lib/index.umd.js")).text());
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/idb@7/build/umd.js")).text());
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js")).text());
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js")).text());
    const sleep = (ms = 1) => new Promise(res => setTimeout(res, ms));
    const dateFromObjectId = (objectId) => new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
    
    const z = Zod;
    const log = typeof consoleref !== 'undefined' ? consoleref.log : console.log;
    const csrfToken = document.cookie.match("(^|;)\\s*" + "act" + "\\s*=\\s*([^;]+)").pop();
    

    log("creating db")
    const db = await idb.openDB("mlexporter", 2, {
        upgrade(db) {
            db.createObjectStore('misc-data');

            db.createObjectStore('inventory-creations', { autoIncrement: true });
            db.createObjectStore('inventory-collections', { autoIncrement: true });

            db.createObjectStore('snapshots-data');
            db.createObjectStore('snapshots-image');

            db.createObjectStore('creations-data-def');
            db.createObjectStore('creations-data-painter');
            db.createObjectStore('creations-image');

            db.createObjectStore('mifts');
            db.createObjectStore('holders-content');
            db.createObjectStore('multis-content');
        }
    });
    log("creating db OK")

    // TODO:
    // profile
    // creations
    // collections (with collection stats)
    // holder / multi content
    // mifts
    // OK snapshots
    // area list



    // SNAPSHOTS

    const storeSnapsProgress = async (latestSnapIndex, isDone) => await db.put('misc-data', { latestSnapIndex, isDone }, "state-snapshots");
    const storeSnapData = async (snap) => await db.put('snapshots-data', snap, snap.shortCode);
    const getSnapData = async (shortCode) => await db.get('snapshots-data', shortCode);
    const getAllSnapShortCodes = async () => await db.getAllKeys('snapshots-data')
    /**
     * @param {string} shortCode
     * @param {Blob} blob
     */
    const storeSnapImage = async (shortCode, blob) => await db.put('snapshots-image', blob, shortCode);
    const getSnapImage = async (shortCode) => await db.get('snapshots-image', shortCode);


    const schema_snap = z.object({
        visitedLocation: z.object({
          _id: z.string(),
          isPrivate: z.boolean().optional(),
          shortCode: z.string(),
          loc: z.object({ p: z.coerce.number(), a: z.coerce.string(), x: z.coerce.number(), y: z.coerce.number() })
        }).optional(),
        moreResults: z.boolean()
    })
    const getSnap = async (index) => await (await fetch(`https://manyland.com/j/v/loc/${index}`, { credentials: "include", mode: "cors", headers: { "X-CSRF": csrfToken } })).json();
    const scanSnaps = async (startIndex = 0) => {
      let index = startIndex;
      while (true) {
        const rawData = await getSnap(index++);
        const result = schema_snap.safeParse(rawData);

        log(rawData, result)
        if (result.success === false) {
          log("unable to parse snap data", { index, error: result.error, rawData })
        };
        const snap = result.data;
        
        log("storing state...")
        await storeSnapsProgress(index, snap.moreResults === true)
        if (snap.moreResults !== true) break;
    
        log("storing snap data...")
        await storeSnapData(snap.visitedLocation);

        await sleep(500)
      }
    }

    const downloadAndStoreSnap = async (shortCode) => {
        const inDb = await getSnapImage(shortCode)

        if (inDb) {
            log("snap already downloaded")
        }
        else {
            log("fetching snap", shortCode)
            const res = await fetch(`https://snapshot.manyland.com/${shortCode}.png`);
            const blob = await res.blob();
            await storeSnapImage(shortCode, blob);
        }
    }
    const downloadAllStoredSnaps = async () => {
        const allSnaps = await getAllSnapShortCodes();

        for (const shortCode of allSnaps) {
            await downloadAndStoreSnap(shortCode)
            await sleep(500)
        }
    }







    const createZip = async () => {
        log("creating zip...")
        const zip = new JSZip();

        // Snaps
        const allSnaps = await getAllSnapShortCodes();
        const snapFilenames = {}

        for (const shortCode of allSnaps) {
            log("adding snap", shortCode)
            const data = await getSnapData(shortCode);
            const imageBlob = await getSnapImage(shortCode);

            const filename = `${dateFromObjectId(data._id).toISOString()}-${data.loc?.a}-${shortCode}-${data.isPrivate ? "private" : "public"}`;
            snapFilenames[shortCode] = filename;

            zip.file(`snapshots/${filename}.json`, JSON.stringify(data))
            zip.file(`snapshots/${filename}.png`, imageBlob)
        }

        zip.file(`snapshots/filename_mapping.json`, JSON.stringify(snapFilenames));



        log("generating file...")
        const zipBlob = await zip.generateAsync({type: "blob"})
        log("downloading file...")
        saveAs(zipBlob, "manyland-account-archive.zip");
        log("done!")
    }







    log("scanning snaps")
    await scanSnaps()
    log("scanning snaps OK")

    log("getting all snaps")
    await downloadAllStoredSnaps();
    await createZip();


})()
