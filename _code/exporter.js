
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

    // TODO migrate everything to these helpers
    const api_getJSON = async (url) => await (await fetch(url, { credentials: "include", mode: "cors", headers: { "X-CSRF": csrfToken } })).json();
    const api_postJSON = async (url, bodyStr) => await (await fetch(url, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: { "X-CSRF": csrfToken, "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: bodyStr
    })).json();
    const db_makeSetGet = (storeId) => {
        const set = async (key, data) => await db.put(storeId, data, key);
        const get = async (key) => await db.get(storeId, key);

        return [ set, get ];
    }
    const db_makeSetGetWithStaticKey = (storeId, key) => {
        const set = async (data) => await db.put(storeId, data, key);
        const get = async () => await db.get(storeId, key);

        return [ set, get ];
    }
    

    log("creating db")
    const db = await idb.openDB("mlexporter", 1, {
        upgrade(db) {
            db.createObjectStore('misc-data');

            db.createObjectStore('inventory-creations');
            db.createObjectStore('inventory-collections');

            db.createObjectStore('snapshots-data');
            db.createObjectStore('snapshots-image');

            db.createObjectStore('creations-data-def');
            db.createObjectStore('creations-data-painter');
            db.createObjectStore('creations-image');
            db.createObjectStore('creations-stats');
            db.createObjectStore('creations-queue');

            db.createObjectStore('mifts-public');
            db.createObjectStore('mifts-private');

            db.createObjectStore('holders-content');
            db.createObjectStore('multis-content');
            db.createObjectStore('body-motions');

        }
    });
    log("creating db OK")


    const api_getMyAreaList = async () => await api_getJSON(`https://manyland.com/j/a/mal/`);


    // #region profile
    const [store_setProfileData, store_getProfileData]  = db_makeSetGetWithStaticKey('misc-data', 'profile-data');
    const [store_setProfileTopCreations, store_getProfileTopCreations ] = db_makeSetGetWithStaticKey('misc-data', 'profile-top-creations');
    const api_getPlayerProfile = async (id) => await api_postJSON(`https://manyland.com/j/u/pi/`, `id=${id}&planeId=1&areaId=3`)
    const api_getPlayerTopCreations = async (id) => await api_getJSON(`https://manyland.com/j/i/tcr/${id}/`)

    const scanProfile = async () => {
        const profile = await api_getPlayerProfile(ourId);
        if (Array.isArray(profile.profileItemIds)) {
            for (const creationId of profile.profileItemIds) {
                if (creationId == null) continue;
                await saveCreation(creationId);
            }
        }
        if (profile.profileBackId) await saveCreation(profile.profileBackId);
        if (profile.profileDynaId) await saveCreation(profile.profileDynaId);

        await store_setProfileData(profile);

        const topCreations = await api_getPlayerTopCreations(ourId);
        for (const creationId of topCreations) {
            await saveCreation(creationId)
        }
        await store_setProfileTopCreations(topCreations);
    }
    // #endregion profile

    // #region creations
    const store_addCreationDef = async (creationId, creationDef) => await db.put('creations-data-def', creationDef, creationId);
    const store_getCreationDef = async (creationId) => await db.get('creations-data-def', creationId);
    const store_addCreationImage = async (creationId, blob) => await db.put('creations-image', blob, creationId);
    const store_getCreationImage = async (creationId) => await db.get('creations-image', creationId);
    const [ store_setHolderContent, store_getHolderContent ] = db_makeSetGet('holders-content');
    const [ store_setMultiData, store_getMultiData ] = db_makeSetGet('multis-content');
    const [ store_setBodyMotions, store_getBodyMotions ] = db_makeSetGet('body-motions');
    const store_setCreationStats = async (creationId, stats) => await db.put('creations-stats', stats, creationId);
    const store_getCreationStats = async (creationId) => await db.get('creations-stats', creationId);
    const [store_setCreationPainterData, store_getCreationPainterData] = db_makeSetGet('creations-data-painter');

    const api_getHolderContent = async (id) => await api_getJSON(`https://manyland.com/j/h/gc/${id}`)
    const api_getBodyMotions = async (id) => await api_getJSON(`https://manyland.com/j/i/mo/${id}`)
    const api_getMultiData = async (id) => await api_getJSON(`https://manyland.com/j/t/gt/${id}`)
    const api_getWritableSettings = async (id) => await api_postJSON(`https://manyland.com/j/f/gs/`, `id=${id}`)
    const api_getCreationStats = async (id) => await api_getJSON(`https://manyland.com/j/i/st/${id}`)
    const api_getCreationPainterData = async (id) => await api_getJSON(`https://manyland.com/j/i/datp/${id}`)

    const store_addToQueue = async (creationId) => await db.put("creations-queue", null, creationId);
    const saveCreation = async (creationId) => {
        if ((await store_getCreationDef(creationId)) == undefined) {
            const def = await (await fetch(`https://d2h9in11vauk68.cloudfront.net/${creationId}`)).json();

            if (def.base === "HOLDER" && (await store_getHolderContent(creationId)) == undefined) {
                log("Queueing content of holder", def.name);
                const data = await api_getHolderContent(def.id);

                for (const content of data.contents) {
                    await store_addToQueue(content.itemId)
                }

                await store_setHolderContent(def.id, data);
            }
            if (def.base === "MULTITHING" && (await store_getMultiData(creationId)) == undefined) {
                const data = await api_getMultiData(def.id);

                if (Array.isArray(data?.itemProps)) {
                    log("Queueing items of multi", def.name);
                    for (const { id } of data.itemProps) {
                        await store_addToQueue(id);
                    }
                }

                await store_setMultiData(def.id, data);
            }
            else if (def.base === "STACKWEARB" && (await store_getBodyMotions(creationId)) == undefined) {
                const data = await api_getBodyMotions(def.id);

                if (Array.isArray(data.ids)) {
                    log("Queueing motions of body", def.name);
                    for (const id of data.ids) {
                        await store_addToQueue(id);
                    }
                }

                await store_setBodyMotions(def.id, data);
            }
            // TODO: not all boards have settings. Is it really even useful to store this?
            //else if (def.base === "WRITABLE") {
            //    const data = api_getWritableSettings(def.id)
            //}

            // get from props
            if (def.props?.emitsId) await store_addToQueue(def.props.emitsId)
            if (def.props?.motionId) await store_addToQueue(def.props.motionId)
            if (def.props?.environmentId) await store_addToQueue(def.props.environmentId)
            if (def.props?.getId) await store_addToQueue(def.props.getId)
            if (def.props?.hasId) await store_addToQueue(def.props.hasId)
            if (def.props?.holdableId) await store_addToQueue(def.props.holdableId)
            if (def.props?.wearableId) await store_addToQueue(def.props.wearableId)
            if (def.props?.thingsRef) {
                for (thingRef in def.props.thingsRef) {
                    await store_addToQueue(def.props.wearableId);
                }
            }

            await store_addCreationDef(creationId, def);
        }

        if ((await store_getCreationImage(creationId)) == undefined) {
            // TODO: rotate through CDNs
            const img = await (await fetch(`https://d3sru0o8c0d5ho.cloudfront.net/${creationId}`)).blob();
            await store_addCreationImage(creationId, img);
        }


        const creatorId = (await store_getCreationDef(creationId)).creator;
        if (creatorId === ourId) {
            if ((await store_getCreationStats(creationId)) == undefined) {
                const stats = await api_getCreationStats(creationId);
                await store_setCreationStats(creationId, stats);
            }

            if ((await store_getCreationPainterData(creationId)) == undefined) {
                const data = await api_getCreationPainterData(creationId);
                await store_setCreationPainterData(creationId, data);
            }
        }
    }
    const processCreationsInQueue = async () => {
        log("processing queue")
        while (true) {
            const queue = await db.getAllKeys("creations-queue");
            if (queue.length === 0) break;

            for (const id of queue) {
                await saveCreation(id);
                await db.delete("creations-queue", id);
            }

        }
        log("processing queue done")
    }
    // #endregion creations

    // #region inventory
    const store_addCollectedId = async (creationId) => await db.put("inventory-collections", null, creationId);
    const store_addCreatedId = async (creationId) => await db.put("inventory-creations", null, creationId);

    const getRandomInt = (a, b) => parseInt(Math.floor((b + 1 - a) * Math.random() + a), 10);
    const genId = (length) => {
        var b = "";
        if (undefined === length) length = 16;
        for (var c = 0; c < length; c++) b += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(getRandomInt(0, 61));
        return b
    }
    const api_getCacheKey = (context) => {
        const key = "urlCacheAppend_" + context;
        sessionStorage[key] || (sessionStorage[key] = genId());
        return sessionStorage[key]
    }
    const api_getInventoryCollectionsPage = async (start, end) => await api_getJSON(`https://manyland.com/j/c/r/${start}/${end}?${api_getCacheKey("collectedItems")}`)
    const api_getInventoryCreationsPage = async (start, end) => await api_getJSON(`https://manyland.com/j/i/gcr/${start}/${end}?${api_getCacheKey("createdItems")}`)
    const api_searchInBin = async (start, end) => await api_postJSON(`https://manyland.com/j/s/i/`, `qs=in%3Abin&start=${start}&end=${end}`)

    const scanInventoryCollections = async () => {
        let page = 0;
        while (true) {
            log("scanInventoryCollections page", page)

            const start = page * 20;
            const end = start + 20;
            const { items, itemCount} = await api_getInventoryCollectionsPage(start, end);

            for (const item of items) {
                await store_addCollectedId(item);
            }

            if (end >= itemCount) break;
            page++;
            await sleep(500);
        }

        log("scanInventoryCollections done")
    }
    const downloadAllCollectedCreations = async () => {
        const allIds = await db.getAllKeys("inventory-collections");

        // TODO notify progress
        for (const id of allIds) {
            await saveCreation(id);
            await sleep(5);
        }
    }
    const scanInventoryCreations = async () => {
        let page = 0;
        while (true) {
            log("scanInventoryCreations page", page)

            const start = page * 100;
            const end = start + 100;
            const { items, itemCount} = await api_getInventoryCreationsPage(start, end);

            for (const item of items) {
                await store_addCreatedId(item);
            }

            if (end >= itemCount) break;
            page++;
            await sleep(500);
        }

        log("scanInventoryCreations done")
    }
    const scanInBin = async () => {
        let page = 0;
        while (true) {
            log("scanInBin page", page)

            const start = page * 10;
            const end = start + 10;
            const { items, more } = await api_searchInBin(start, end);

            for (const item of items) {
                await store_addCreatedId(item);
            }

            if (more == false) break;
            page++;
            await sleep(500);
        }

        log("scanInBin done")
    }
    const downloadAllCreatedCreations = async () => {
        const allIds = await db.getAllKeys("inventory-creations");

        // TODO notify progress
        for (const id of allIds) {
            await saveCreation(id);
            await sleep(100);
        }
    }
    // #endregion inventory

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
                // TODO: if we know this mift, break out of the top while loop
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
    const MAX_CREATION_NAME_LENGTH = 37;
    const MAX_MIFT_TEXT_LENGTH = 60;

    // #region zip
    const createZip = async () => {
        log("creating zip...")
        const zip = new JSZip();

        // #region zip_profile
        {
            const profile = await store_getProfileData();
            zip.file(`profile.json`, JSON.stringify(profile, null, 2));

            const topCreations = await store_getProfileTopCreations();
            zip.file(`profile_topCreations.json`, JSON.stringify(topCreations, null, 2));
        }
        // #endregion zip_profile

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
        zip.file(`snapshots.csv`, csv_stringify_sync.stringify(snapCsvDataset));
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

        zip.file(`mifts.csv`, csv_stringify_sync.stringify(csvDataset_mifts));
        // #endregion zip_mifts


        // #region zip_creations
        {
            const csvDataset = [[ "id", "createdAt", "type", "name", "timesPlaced", "timesCollected" ]];

            // NOTE: If a creation somehow had it's image and stats downloaded, but no def, it won't appear.
            //       This shouldn't happen, though, and I'm not sure how we'd recover from that anyway.
            const allKeys = await db.getAllKeys('creations-data-def');
            for await (const id of allKeys) {
                const def = await store_getCreationDef(id);
                const img = await store_getCreationImage(id);

                const date = dateFromObjectId(id).toISOString();
                const filename = `${makeDateSafeForFile(date)}_${id}_${def.base || ""}_${makeNameSafeForFile(def.name || "").slice(0, MAX_CREATION_NAME_LENGTH)}`


                if (def.creator === ourId) {
                    zip.file(`my-creations/${filename}.png`, img);
                    zip.file(`my-creations/${filename}.json`, JSON.stringify(def, null, 2));

                    const stats = await store_getCreationStats(id);
                    zip.file(`my-creations/stats/${id}.json`, JSON.stringify(stats));

                    const painterData = await store_getCreationPainterData(id);
                    zip.file(`my-creations/painterdata/${id}.json`, JSON.stringify(painterData));

                    csvDataset.push([ id, date, def.base, def.name, stats.timesPd, stats.timesCd ]);
                }
                else {
                    zip.file(`other-creations/${filename}.png`, img);
                    zip.file(`other-creations/${filename}.json`, JSON.stringify(def, null, 2));
                }


                if (def.base === "MULTITHING") {
                    const data = await store_getMultiData(id);
                    zip.file(`creations-data/multis/${id}.json`, JSON.stringify(data));
                }
                else if (def.base === "HOLDER") {
                    const data = await store_getHolderContent(id);
                    zip.file(`creations-data/holders/${id}.json`, JSON.stringify(data));
                }
                else if (def.base === "STACKWEARB") {
                    const data = await store_getBodyMotions(id);
                    zip.file(`creations-data/body-motions/${id}.json`, JSON.stringify(data));
                }
            }

            // NOTE: we only store CSV data for our own creations
            zip.file(`my-creations.csv`, csv_stringify_sync.stringify(csvDataset));
        }
        // #endregion zip_creations

        // #region zip_arealist
        {
            log("storing area list...");

            const areaList = await api_getMyAreaList();
            const csvDataset = [[ "groupId", "id", "areaName", "name", "isSubarea", "isCreator", "isEditor", "totalVisitors", "lastVisit" ]]
            let backupLinks = "";

            for (const area of areaList) {
                if (area.isCreator || area.isEditor) {
                    zip.file(`areas/${area.urlName}.json`, JSON.stringify(area));

                    csvDataset.push([ area.groupId, area.id, area.name, area.name, "false", String(area.isCreator), String(area.isEditor), area.totalVisitors, area.lastVisit ])
                    backupLinks += `https://areabackup.com/${area.urlName}\n`;

                    if (Array.isArray(area.subAreas)) {
                        for (const subarea of area.subAreas) {
                            csvDataset.push([ subarea.groupId, subarea.id, area.name, subarea.name, "true", String(subarea.isCreator), String(subarea.isEditor), subarea.totalVisitors, subarea.lastVisit ])
                            backupLinks += `https://areabackup.com/${area.urlName}/${encodeURIComponent(subarea.name)}`;
                        }
                    }
                }
            }

            zip.file(`areas-backup-links.txt`, backupLinks);
            zip.file(`areas.csv`, csv_stringify_sync.stringify(csvDataset));
        }
        // #endregion zip_arealist


        log("generating file...")
        const zipBlob = await zip.generateAsync({type: "blob"})
        log("downloading file...")
        saveAs(zipBlob, "manyland-account-archive.zip");
        log("done!")
    }
    // #endregion zip







    await scanProfile()
    //await scanSnaps()
    await downloadAllStoredSnaps();
    await api_scanAllMifts(ourId, false);
    await api_scanAllMifts(ourId, true);

    await scanInventoryCollections();
    await scanInventoryCreations();
    await scanInBin();

    log("downloading collected creations")
    await downloadAllCollectedCreations();
    log("downloading created creations")
    await downloadAllCreatedCreations();

    log("downloading creations in queue")
    await processCreationsInQueue();




    log("creating zip")
    await createZip();
    log("done!")


    db.close();
})()
