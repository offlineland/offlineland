
(async () => {
    eval(await (await fetch("https://redom.js.org/redom.min.js")).text());
    eval(await (await fetch("https://unpkg.com/zod@3.22.0/lib/index.umd.js")).text());
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/idb@7/build/umd.js")).text());
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js")).text());
    // https://csv.js.org/stringify/api/sync/
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/csv-stringify@6.4.4/dist/iife/sync.js")).text());
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js")).text());
    const sleep = (ms = 1) => new Promise(res => setTimeout(res, ms));
    const dateFromObjectId = (objectId) => new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
    
    const z = Zod;
    const log = typeof consoleref !== 'undefined' ? consoleref.log : console.log;
    const csrfToken = document.cookie.match("(^|;)\\s*" + "act" + "\\s*=\\s*([^;]+)").pop();
    const ourId = (await (await fetch(`https://manyland.com/j/i/`, {
            method: "POST",
            credentials: "include",
            mode: "cors",
            headers: { "X-CSRF": csrfToken, "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: `urlName=stockpile&buster=${Date.now()}`
        })).json()).rid;
    const api_getJSON = async (url) => await (await fetch(url, { credentials: "include", mode: "cors", headers: { "X-CSRF": csrfToken } })).json();
    const api_postJSON = async (url, bodyStr) => await (await fetch(url, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: { "X-CSRF": csrfToken, "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: bodyStr
    })).json();
    

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
            db.createObjectStore('creations-stats');

            db.createObjectStore('mifts-public');
            db.createObjectStore('mifts-private');

            db.createObjectStore('holders-content');
            db.createObjectStore('multis-content');
            db.createObjectStore('body-motions');
        }
    });
    log("creating db OK")

    // TODO:
    // profile
    // creations
    // collections (with collection stats)
    // holder / multi content
    // OK mifts
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
    const store_setHolderContent = async (holderId, data) => await db.put('holders-content', data, holderId);
    const store_setBodyMotions = async (bodyId, data) => await db.put('body-motions', data, bodyId);
    const store_setCreationStats = async (creationId, stats) => await db.put('creations-stats', stats, creationId);
    const store_getCreationStats = async (creationId) => await db.get('creations-stats', creationId);

    const api_getHolderContent = async (id) => await api_getJSON(`https://manyland.com/j/h/gc/${id}`)
    const api_getBodyMotions = async (id) => await api_getJSON(`https://manyland.com/j/m/mo/${id}`)
    const api_getWritableSettings = async (id) => await api_postJSON(`https://manyland.com/j/f/gs/`, `id=${id}`)
    const api_getCreationStats = async (id) => await api_getJSON(`https://manyland.com/j/i/st/${id}`)

    const saveCreation = async (creationId) => {
        if ((await store_getCreationDef(creationId)) == undefined) {
            const def = await (await fetch(`https://d2h9in11vauk68.cloudfront.net/${creationId}`)).json();

            if (def.base === "HOLDER") {
                const data = await api_getHolderContent(def.id);

                for (const content of data.contents) {
                    await saveCreation(content.itemId)
                }

                await store_setHolderContent(def.id, data);
            }
            else if (def.base === "MULTITHING") {
                // TODO get content
            }
            else if (def.base === "STACKWEARB") {
                const data = await api_getBodyMotions(def.id);

                if (Array.isArray(data.ids)) {
                    for (const id of data.ids) {
                        await saveCreation(id);
                    }
                }

                await store_setBodyMotions(def.id, data);
            }
            // TODO: not all boards have settings. Is it really even useful to store this?
            //else if (def.base === "WRITABLE") {
            //    const data = api_getWritableSettings(def.id)
            //}

            // get from props
            if (def.props?.emitsId) await saveCreation(def.props.emitsId)
            if (def.props?.motionId) await saveCreation(def.props.motionId)
            if (def.props?.environmentId) await saveCreation(def.props.environmentId)
            if (def.props?.getId) await saveCreation(def.props.getId)
            if (def.props?.hasId) await saveCreation(def.props.hasId)
            if (def.props?.holdableId) await saveCreation(def.props.holdableId)
            if (def.props?.wearableId) await saveCreation(def.props.wearableId)
            if (def.props?.thingsRef) {
                for (thingRef in def.props.thingsRef) {
                    await saveCreation(def.props.wearableId);
                }
            }

            await store_addCreationDef(creationId, def);
        }

        if ((await store_getCreationImage(creationId)) == undefined) {
            // TODO: rotate through CDNs
            const img = await (await fetch(`https://d3sru0o8c0d5ho.cloudfront.net/${creationId}`)).blob();
            await store_addCreationImage(creationId, img);
        }

        if ((await store_getCreationStats(creationId)) == undefined) {
            const stats = await api_getCreationStats(creationId);
            await store_setCreationStats(creationId, stats);
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
        const snapCsvDataset = [[ "shortCode", "date", "areaId", "areaPlane", "x", "y", "isPrivate", "_id" ]]

        for (const shortCode of allSnaps) {
            log("adding snap", shortCode)
            const data = await getSnapData(shortCode);
            const imageBlob = await getSnapImage(shortCode);

            const takenAtDate = dateFromObjectId(data._id).toISOString();
            const filename = `${makeDateSafeForFile(takenAtDate)}-${data.loc?.a}-${shortCode}-${data.isPrivate ? "private" : "public"}`;
            snapFilenames[shortCode] = filename;

            zip.file(`snapshots/${filename}.json`, JSON.stringify(data, null, 2));
            zip.file(`snapshots/${filename}.png`, imageBlob);
            snapCsvDataset.push([ data.shortCode, takenAtDate, data.loc?.a, data.loc?.p, data.loc?.x, data.loc?.y, data.isPrivate ? "true" : "false", data._id ]);
        }

        zip.file(`snapshots/filename_mapping.json`, JSON.stringify(snapFilenames, null, 2));
        zip.file(`snapshots/snapshots.csv`, csv_stringify_sync.stringify(snapCsvDataset));
        // #endregion zip_snaps




        // #region zip_mifts
        log("adding public mifts")
        const csvDataset_mifts = [[ "date", "from", "text", "isPrivate", "fromId", "toId", "_id" ]]
        const allPublicMifts = await store_getAllMifts(false);
        for (const mift of allPublicMifts) {
            const filename = makeNameSafeForFile(`${makeDateSafeForFile(mift.ts)} - from ${mift.fromName} - ${mift.text.slice(0, 60)}`);

            zip.file(`mifts/public/${filename}.json`, JSON.stringify(mift, null, 2));
            zip.file(`mifts/public/${filename}.png`, store_getCreationImage(mift.itemId));
            csvDataset_mifts.push([ mift.ts, mift.fromName, mift.text, "false", mift.fromId, mift.toId, mift._id ]);
        }
        log("adding private mifts")
        const allPrivateMifts = await store_getAllMifts(true);
        for (const mift of allPrivateMifts) {
            const filename = makeNameSafeForFile(`${makeDateSafeForFile(mift.ts)} - from ${mift.fromName} - ${mift.text.slice(0, 60)}`);

            zip.file(`mifts/private/${filename}.json`, JSON.stringify(mift, null, 2));
            zip.file(`mifts/private/${filename}.png`, store_getCreationImage(mift.itemId));
            csvDataset_mifts.push([ mift.ts, mift.fromName, mift.text, "true", mift.fromId, mift.toId, mift._id ]);
        }

        zip.file(`mifts/mifts.csv`, csv_stringify_sync.stringify(csvDataset_mifts));
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
