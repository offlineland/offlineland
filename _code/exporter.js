
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

    const ourPlayer = Object.values(ig.game).find(e => e instanceof EntityPlayer);
    const ourId = Object.values(ourPlayer).find(e => typeof e === "string" && e.length === 24);
    

    log("creating db")
    const db = await idb.openDB("mlexporter", 1, {
        upgrade(db) {
            db.createObjectStore('misc-data');

            db.createObjectStore('inventory-creations', { autoIncrement: true });
            db.createObjectStore('inventory-collections', { autoIncrement: true });

            db.createObjectStore('snapshots-data');
            db.createObjectStore('snapshots-image');

            db.createObjectStore('creations-data-def');
            db.createObjectStore('creations-data-painter');
            db.createObjectStore('creations-image');

            db.createObjectStore('mifts-public');
            db.createObjectStore('mifts-private');

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


    // #region profile
    const storeProfileData = async (data) => await db.put('misc-data', data, 'profile-data');
    // #endregion profile

    // #region creations
    const store_addCreationDef = async (creationId, creationDef) => await db.put('creations-data-def', creationDef, creationId);
    const store_getCreationDef = async (creationId) => await db.get('creations-data-def', creationId);
    const store_addCreationImage = async (creationId, blob) => await db.put('creations-image', blob, creationId);
    const store_getCreationImage = async (creationId) => await db.get('creations-image', creationId);
    const saveCreation = async (creationId) => {
        if ((await store_getCreationDef(creationId)) == undefined) {
            const def = await (await fetch(`https://d2h9in11vauk68.cloudfront.net/${creationId}`)).text();
            await store_addCreationDef(creationId, def);
        }

        if ((await store_getCreationImage(creationId)) == undefined) {
            // TODO: rotate through CDNs
            const img = await (await fetch(`https://d3sru0o8c0d5ho.cloudfront.net/${creationId}`)).blob();
            await store_addCreationImage(creationId, img);
        }
    }
    // #endregion creations

    // #region mifts
    const store_addMift = async (mift, priv) => await db.put(priv ? 'mifts-private' : 'mifts-public', mift, mift._id);
    const store_getAllMifts = async (priv) => await db.getAll(priv ? 'mifts-private' : 'mifts-public')
    const schema_mift = z.object({
        "_id": z.string(),
        "fromId": z.string(),
        "fromName": z.string(),
        "toId": z.string(),
        "itemId": z.string(),
        "text": z.string(),
        "deliverySeenByRecipient": z.boolean(),
        "ts": z.string(),
    })
    const schema_mift_page = z.object({ results: z.array(schema_mift) });

    const api_getMiftPage = async (id, olderThan, priv) => {
        const res = await fetch(`https://manyland.com/j/mf/grm/`, {
            method: "POST",
            credentials: "include",
            mode: "cors",
            headers: { "X-CSRF": csrfToken, "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: `olderThan=${olderThan}&newerThan=&setSize=5&id=${id}&priv=${priv}`
        })
        const data = await res.json();
        const miftPage = schema_mift_page.parse(data);

        return miftPage;
    }
    const api_scanAllMifts = async (id, priv) => {
        let lastDate = "";

        while (true) {
            log("Getting page of olderThan", lastDate)
            const page = await api_getMiftPage(id, lastDate, priv);

            for (mift of page.results) {
                log("mift", mift)
                await store_addMift(mift, priv);
                await saveCreation(mift.itemId);
            }

            if (page.results.length < 5) break;
            lastDate = page.results.at(-1).ts;
            await sleep(500);
        }
    }
    // #endregion mifts


    // SNAPSHOTS
    // #region snaps
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
        await storeSnapsProgress(index, snap.moreResults === false)
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
    // #endregion snaps








    const makeNameSafeForFile = (str) => str.replace(/[^a-z0-9. -]+/gi, '_');
    const makeDateSafeForFile = (str) => str.replace(/:/g, '.').slice(0, 19) + 'Z';

    // #region zip
    const createZip = async () => {
        log("creating zip...")
        const zip = new JSZip();

        // #region zip_snaps
        const allSnaps = await getAllSnapShortCodes();
        const snapFilenames = {}

        for (const shortCode of allSnaps) {
            log("adding snap", shortCode)
            const data = await getSnapData(shortCode);
            const imageBlob = await getSnapImage(shortCode);

            const filename = `${makeDateSafeForFile(dateFromObjectId(data._id).toISOString())}-${data.loc?.a}-${shortCode}-${data.isPrivate ? "private" : "public"}`;
            snapFilenames[shortCode] = filename;

            zip.file(`snapshots/${filename}.json`, JSON.stringify(data, null, 2));
            zip.file(`snapshots/${filename}.png`, imageBlob);
        }

        zip.file(`snapshots/filename_mapping.json`, JSON.stringify(snapFilenames, null, 2));
        // #endregion zip_snaps




        // #region zip_mifts
        log("adding public mifts")
        const allPublicMifts = await store_getAllMifts(false);
        for (const mift of allPublicMifts) {
            const filename = makeNameSafeForFile(`${makeDateSafeForFile(mift.ts)} - from ${mift.fromName} - ${mift.text.slice(0, 60)}`);

            zip.file(`mifts/public/${filename}.json`, JSON.stringify(mift, null, 2));
            zip.file(`mifts/public/${filename}.png`, store_getCreationImage(mift.itemId));
        }
        log("adding private mifts")
        const allPrivateMifts = await store_getAllMifts(true);
        for (const mift of allPrivateMifts) {
            const filename = makeNameSafeForFile(`${makeDateSafeForFile(mift.ts)} - from ${mift.fromName} - ${mift.text.slice(0, 60)}`);

            zip.file(`mifts/private/${filename}.json`, JSON.stringify(mift, null, 2));
            zip.file(`mifts/private/${filename}.png`, store_getCreationImage(mift.itemId));
        }
        // #endregion zip_mifts




        log("generating file...")
        const zipBlob = await zip.generateAsync({type: "blob"})
        log("downloading file...")
        saveAs(zipBlob, "manyland-account-archive.zip");
        log("done!")
    }
    // #endregion zip







    log("scanning snaps")
    //await scanSnaps()
    log("scanning snaps OK")

    log("getting all snaps")
    //await downloadAllStoredSnaps();


    await api_scanAllMifts(ourId, false);
    await api_scanAllMifts(ourId, true);




    await createZip();


    db.close();
})()
