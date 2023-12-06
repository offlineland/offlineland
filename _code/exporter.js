(async () => {
    const version = "3";

	if(window.location.protocol === "http:"){
		if(confirm("Redirecting to secure context...")){
			window.location.href = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
		}else{
			return;
		}
	}
	if(window.location.pathname !== "/info-rift"){
		if(confirm("Redirecting to /info-rift?")){
			window.location = "/info-rift";
		}
	}
    if (!window.console) {
        alert("You might have an ablocker that will break things! If things don't work, try disabling it (or switch to ublock origin, that one seems to work fine)")
        // add stubs anyway
        window.console = {
            log: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
            debug: () => {},
            time: () => {},
            timeEnd: () => {},
            timeLog: () => {},
        }
    }
	
    // #region boilerplate
    eval(await (await fetch("https://redom.js.org/redom.min.js", { cache: "force-cache" })).text());
    eval(await (await fetch("https://unpkg.com/zod@3.22.0/lib/index.umd.js", { cache: "force-cache" })).text());
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/idb@7/build/umd.js", { cache: "force-cache" })).text());
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js", { cache: "force-cache" })).text());
    // https://csv.js.org/stringify/api/sync/
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/csv-stringify@6.4.4/dist/iife/sync.js", { cache: "force-cache" })).text());
    eval(await (await fetch("https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js", { cache: "force-cache" })).text());
    
    const { el, text, mount, setAttr } = redom;
    const z = Zod;
    const log = typeof consoleref !== 'undefined' ? consoleref.log : console.log;
    const csrfToken = document.cookie.match("(^|;)\\s*" + "act" + "\\s*=\\s*([^;]+)").pop();
    const initData = (await (await fetch(`https://manyland.com/j/i/`, {
            method: "POST",
            credentials: "include",
            mode: "cors",
            headers: { "X-CSRF": csrfToken, "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: `urlName=stockpile&buster=${Date.now()}`
        })).json());
    const ourId = initData.rid;


    const sleep = (ms = 1) => new Promise(res => setTimeout(res, ms));

    const dateFromObjectId = (objectId) => new Date(parseInt(objectId.substring(0, 8), 16) * 1000);


    /**
     * Retries an async function until it returns without throwing, up until maxAttempts.
     * @template T
     * @param {() => T} fn 
     * @param {number} sleepMs
     * @param {number} maxAttempts 
     * @returns {Promise<T>}
     * @throws The last error caught from the function if all attemps failed
     */
    const retryOnThrow = async (fn, sleepMs = 1000, maxAttempts = 3) => {
        const errors = [];

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch(e) {
                console.warn("retry: function failed! Attempts left:", maxAttempts - attempt)
                errors.push(e);
                await sleep(sleepMs);
            }
        }


        log("retry: all attemps failed!", errors)
        throw errors.at(-1);
    }

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
    /** @type { import("idb").IDBPDatabase} */
    const db = await idb.openDB("mlexporter", 2, {
        upgrade(db, oldVersion, newVersion) {
            console.log("upgrading db from", oldVersion, "to", newVersion);

            if (oldVersion < 1) {
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
            if (oldVersion < 2) {
                db.createObjectStore('public-creations-downloaded-prefixes');
                db.createObjectStore('public-creations');
            }

        }
    });
    log("creating db OK")


    const SLEEP_CREATIONDL_API_SUBCONTENT = 700;
    const SLEEP_CREATIONDL_API_STATS = 300;
    const SLEEP_CREATIONDL_API_PAINTER_DATA = 700;
    const SLEEP_INVENTORYPAGE_COLLECTIONS = 500;
    const SLEEP_INVENTORYPAGE_CREATIONS = 800;
    const SLEEP_INVENTORYPAGE_SEARCH = 800;
    const SLEEP_MIFT_PAGE = 500;
    const SLEEP_SNAP_PAGE = 300;
    // These are off of a CDN
    const SLEEP_SNAP_DL = 50;
    const SLEEP_CREATIONDL_CDN = 20;

    const api_getMyAreaList = async () => await api_getJSON(`https://manyland.com/j/a/mal/`);


    /**
     * Check if a creation is in universe search by fetching the list of public items that start with the same prefix from offlineland.io
     * @param {string} creationId
     * @returns { Promise<boolean> }
     */
    const isCreationPublic = async (creationId) => {
        const PREFIX_LENGTH = 3;
        const prefix = creationId.substring(0, PREFIX_LENGTH)

        // Download the json file if we don't have it yet
        const prefixFileWasDownloaded = await db.get("public-creations-downloaded-prefixes", prefix)
        if (prefixFileWasDownloaded !== true) {
            const prevStatusText = status.textContent;
            status.textContent = prevStatusText +  ` (checking public creations ${prefix}...)`;

            console.time(`Downloading creation Ids ${prefix}`)
            /** @type { string[] } */
            const ids = await fetch(`https://offlineland.io/static/offlineland/public-creations/by-prefix/${PREFIX_LENGTH}/${prefix}.json`).then(res => res.json())
            console.timeEnd(`Downloading creation Ids ${prefix}`)


            status.textContent = prevStatusText +  ` (saving public creations ${prefix}...)`;

            console.time(`Storing creation Ids ${prefix}`)
            const tx = db.transaction('public-creations', "readwrite");
            await Promise.all(ids.map(id => tx.store.put(true, id)))
            console.timeLog(`Storing creation Ids ${prefix}`, "closing transaction")
            await tx.done;
            console.timeEnd(`Storing creation Ids ${prefix}`)

            await db.put("public-creations-downloaded-prefixes", true, prefix);
            status.textContent = prevStatusText;
        }

        return db.get("public-creations", creationId);
    }


    const STATE_PROGRESS_SNAPS = "snapAlbum";
    const STATE_PROGRESS_COLLECTIONS = "collectionsTab";
    const STATE_PROGRESS_CREATIONS = "creationsTab";
    const STATE_PROGRESS_BIN = "creationsInBin";
    /**
     * @param {STATE_PROGRESS_SNAPS | STATE_PROGRESS_COLLECTIONS | STATE_PROGRESS_CREATIONS | STATE_PROGRESS_BIN} stateName 
     * @param {number} lastIndex
     * @param {boolean} isDone 
     */
    const storeProgress = async (stateName, lastIndex, isDone) => await db.put('misc-data', { lastIndex, isDone }, `state2-${stateName}`);
    /**
     * @param {STATE_PROGRESS_SNAPS | STATE_PROGRESS_COLLECTIONS | STATE_PROGRESS_CREATIONS | STATE_PROGRESS_BIN} stateName 
     * @returns { Promise<{ lastIndex: number, isDone: boolean }>}
     */
    const getProgress = async (stateName) => (await db.get('misc-data', `state2-${stateName}`)) || { lastIndex: 0, isDone: false };


    // #endregion boilerplate


    // #region UI

    const status = text("waiting");

    const mkNumberStat = (init) => {
        const txtNode = text(init);
        let value = init;

        const update = (fn) => {
            value = fn(value);
            txtNode.textContent = value;
        }

        return { el: txtNode, update }
    }

    // NOTE: Ideally we'd use a Re:dom component here instead of putting everything into consts,
    // but I haven't figured out how to make it work with my typechecker setup so bear with me
    const status_totalSnapsFound = mkNumberStat(await db.count("snapshots-data"));
    const status_currentMiftsPublicSaved = mkNumberStat(await db.count("mifts-public"));
    const status_currentMiftsPrivateSaved = mkNumberStat(await db.count("mifts-private"));

    const status_totalSavedCreations = mkNumberStat(await db.count("creations-data-def"));
    const status_creationsInQueue = mkNumberStat(await db.count("creations-queue"));

    const status_totalCollectionsFound = mkNumberStat(await db.count("inventory-collections"));
    const status_totalPublicCollectionsFound = mkNumberStat(0);
    const status_currentPageCollections = mkNumberStat(0);
    const status_totalPageCollections = mkNumberStat(0);

    const status_totalCreationsFound = mkNumberStat(await db.count("inventory-creations"));
    const status_currentPageCreations = mkNumberStat(0);
    const status_totalPagesCreations = mkNumberStat(0);



    const progressBin = await getProgress(STATE_PROGRESS_BIN);
    const progressSnaps = await getProgress(STATE_PROGRESS_SNAPS);
    const progressCreations = await getProgress(STATE_PROGRESS_CREATIONS);
    const progressCollections = await getProgress(STATE_PROGRESS_COLLECTIONS);

    console.log({ progressSnaps, progressCreations, progressCollections })

    const btn_snapsEnabled = el("input", { type: "checkbox", checked: progressSnaps.isDone === false })
    const status_atPageSnaps = mkNumberStat(progressSnaps.lastIndex);
    const btn_resetSnapAlbumProgress = el("button", { onclick: () => storeProgress(STATE_PROGRESS_SNAPS, 0, false)}, "Restart from zero")

    const btn_creationsEnabled = el("input", { type: "checkbox", checked: progressCreations.isDone === false })
    const status_atPageCreations = mkNumberStat(progressCreations.lastIndex);
    const btn_resetCreationsProgress = el("button", { onclick: () => storeProgress(STATE_PROGRESS_CREATIONS, 0, false)}, "Restart from zero")

    const btn_collectionsEnabled = el("input", { type: "checkbox", checked: progressCollections.isDone === false })
    const status_atPageCollections = mkNumberStat(progressCollections.lastIndex);
    const btn_resetCollectionsProgress = el("button", { onclick: () => storeProgress(STATE_PROGRESS_COLLECTIONS, 0, false)}, "Restart from zero")

    const btn_binEnabled = el("input", { type: "checkbox", checked: progressBin.isDone === false })
    const btn_miftsEnabled = el("input", { type: "checkbox", checked: true })
    const btn_queueEnabled = el("input", { type: "checkbox", checked: false })
    const btn_start = el("button.okButton", ["Start exporter"])



    const root = el("div.contentPart", [
        el("div", { style: "padding-bottom: 2em;" }, [
            el("h1", "offlineland.io's exporter thingy"),
            el("div", "Note: it'll pick back where it left off, you can reload at any time to stop it"),
        ]),

        el("div", { style: "font-family: initial; font-size: initial; text-transform: initial; background-color: rgb(208,188,178); color: black; border-radius: 5px; padding: 30px;" }, [
            el("div", [
                el("ul", [
                    el("li", [
                        el("label", [ btn_snapsEnabled, "Update the snap album" ]),
                        progressSnaps.isDone ? " (Done! Page: " : " (At page: ", status_atPageSnaps, ") ",
                        btn_resetSnapAlbumProgress,
                    ]),
                    el("li", [
                        el("label", [ btn_creationsEnabled, "Update the creations tab" ]),
                        progressCreations.isDone ? " (Done! Page: " : " (At page: ", status_atPageCreations, ") ",
                        btn_resetCreationsProgress,
                    ]),
                    el("li", [
                        el("label", [ btn_collectionsEnabled, "Update the collections tab" ]),
                        progressCollections.isDone ? " (Done! Page: " : " (At page: ", status_atPageCollections, ") ",
                        btn_resetCollectionsProgress,
                    ]),
                    el("li", el("label", [ btn_binEnabled, "Creations in bin (search tab)", progressCollections.isDone ? "Done!" : "" ])),
                    el("li", el("label", [ btn_miftsEnabled, "Update mifts" ])),
                    el("li", el("label", [ btn_queueEnabled, "Things in multis, holders, and body motions (this can take a very long time!)" ])),
                ])
            ]),

            el("div", { style: "padding: 1em; text-align: center;" }, [
                btn_start,
            ]),

            el("div", { style: "padding-top: 1em;"}, [
                el("p.text-left", ["status:", status ]),
                el("ul", [
                    el("li", [ "Snaps: ", status_totalSnapsFound.el ]),
                    el("li", [ "Mifts (public): ", status_currentMiftsPublicSaved.el ]),
                    el("li", [ "Mifts (private): ", status_currentMiftsPrivateSaved.el ]),
                    el("li", [ "Inventory (creations): ", status_totalCreationsFound.el ]),
                    el("li", [ "Inventory (collects): ", status_totalCollectionsFound.el, "( skipped public creations: ", status_totalPublicCollectionsFound.el, " )" ]),
                    el("li", [ "Total saved items: ", status_totalSavedCreations.el ]),
                    el("li", [ "Remaining items in multis/holders/bodies to download: ", status_creationsInQueue.el ]),
                ]),
            ]),


            el("div", { style: "padding-top: 2em; font-size: 12px;"}, [
                el("p", [
                    "Note: this can take a while! To speed up things, collected public creations (those in the universe search) are not downloaded. They'll appear in your inventory on offlineland.io though!"
                ])

            ])
        ])
    ]);

 
    const isInfoRiftPage = document.querySelector('.intermission') != undefined;
    if (isInfoRiftPage) {
        const _root = el("div#exporter-root.content", root, { style: { width: "unset", top: "0px", "text-align": "initial", display: "flex", "justify-content": "space-around" }});
        document.querySelector('.intermission .content').remove();

        mount(document.querySelector('.intermission'), _root, null, true);
    }
    else {
        const _root = el("div#alertDialog", root, {
            style: {
                "display": "flex",
                "justify-content": "space-around",
                "position": "unset",
                "width": "50vw",
                "height": "100vh",
                "margin-top": "2em",
                "margin-bottom": "2em",
                "margin-left": "auto",
                "margin-right": "auto",
                "padding": "1em",
                "font-size": "12px",
            }
        });

        mount(document.body, _root);

    }
    // #endregion UI




    // #region profile
    const [store_setProfileData, store_getProfileData]  = db_makeSetGetWithStaticKey('misc-data', 'profile-data');
    const [store_setProfileTopCreations, store_getProfileTopCreations ] = db_makeSetGetWithStaticKey('misc-data', 'profile-top-creations');
    const api_getPlayerProfile = async (id) => await api_postJSON(`https://manyland.com/j/u/pi/`, `id=${id}&planeId=1&areaId=3`)
    const api_getPlayerTopCreations = async (id) => await api_getJSON(`https://manyland.com/j/i/tcr/${id}/`)
    const api_getPlayerBoostAssociations = async () => await api_postJSON(`https://manyland.com/j/bo/ga/`, "")

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

        const boostAssociations = await api_getPlayerBoostAssociations();
        if (boostAssociations && boostAssociations.associations) {
            const itemsInBoosts = Object.values(boostAssociations.associations).filter(v => typeof v === "string" && v.length == 24);
            for (const creationId of itemsInBoosts) {
                await saveCreation(creationId)
            }
        }
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

    const store_addToQueue = async (creationId) => {
        status_creationsInQueue.update(v => v + 1);
        await db.put("creations-queue", null, creationId);
    }
    const saveCreation = async (creationId) => {
        if ((await store_getCreationDef(creationId)) == undefined) {
            const res = await retryOnThrow(() => fetch(`https://d2h9in11vauk68.cloudfront.net/${creationId}`)).catch(e => {
                console.warn(`Network error while downloading creation data ${creationId}! Check that you're online. In the meantime, I'm going to stop here.`);
                status.textContent += ` Network error! Are you online? Retry later!`

                e._offlineland_handled = true;
                throw e;
            });

            if (!res.ok) {
                console.warn(`error downloading creation data ${creationId}! Server says: ${res.status} ${res.statusText}. I'm going to skip this creation; if you want to retry it later, just re-run the exporter.`)
                return;
            }

            const def = await retryOnThrow(() => res.json()).catch(e => {
                console.warn("Unable to read creation data! It's likely the server sent us an HTML error instead. Is manyland down? In the meantime, I'm going to stop here.", e, creationId)
                status.textContent += ` Unable to read creation data! Is manyland online? Retry later!`

                e._offlineland_handled = true;
                throw e;
            });

            if (def.base === "HOLDER" && (await store_getHolderContent(creationId)) == undefined) {
                log(`Creation "${def.name}" is a holder, fetching content`);
                const data = await retryOnThrow(() => api_getHolderContent(def.id));

                for (const content of data.contents) {
                    await store_addToQueue(content.itemId)
                }

                await store_setHolderContent(def.id, data);
                await sleep(SLEEP_CREATIONDL_API_SUBCONTENT);
                log(`Creation "${def.name}" is a holder, fetching content done`);
            }
            if (def.base === "MULTITHING" && (await store_getMultiData(creationId)) == undefined) {
                log(`Creation "${def.name}" is a multi, fetching content`);
                const data = await retryOnThrow(() => api_getMultiData(def.id));

                if (Array.isArray(data?.itemProps)) {
                    for (const { id } of data.itemProps) {
                        await store_addToQueue(id);
                    }
                }

                await store_setMultiData(def.id, data);
                await sleep(SLEEP_CREATIONDL_API_SUBCONTENT);
                log(`Creation "${def.name}" is a multi, fetching content done`);
            }
            else if (def.base === "STACKWEARB" && (await store_getBodyMotions(creationId)) == undefined) {
                log(`Creation "${def.name}" is a body, fetching motion bar`);
                const data = await retryOnThrow(() => api_getBodyMotions(def.id));

                if (Array.isArray(data.ids)) {
                    for (const id of data.ids) {
                        await store_addToQueue(id);
                    }
                }

                await store_setBodyMotions(def.id, data);
                await sleep(SLEEP_CREATIONDL_API_SUBCONTENT);
                log(`Creation "${def.name}" is a body, fetching motion bar done`);
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
            if (def.props?.thingRefs) {
                if (Array.isArray(def.props.thingRefs)) {
                    for (const [ id ] of def.props.thingRefs) {
                        await store_addToQueue(id);
                    }
                }
            }

            await store_addCreationDef(creationId, def);
            status_totalSavedCreations.update(v => v + 1);
            await sleep(SLEEP_CREATIONDL_CDN);
        }

        if ((await store_getCreationImage(creationId)) == undefined) {
            // TODO: rotate through CDNs
            const img = await retryOnThrow(() => fetch(`https://d3sru0o8c0d5ho.cloudfront.net/${creationId}`).then(res => res.blob()));
            await store_addCreationImage(creationId, img);
        }


        const creatorId = (await store_getCreationDef(creationId)).creator;
        if (creatorId === ourId) {
            if ((await store_getCreationStats(creationId)) == undefined) {
                const stats = await retryOnThrow(() => api_getCreationStats(creationId));
                await store_setCreationStats(creationId, stats);

                await sleep(SLEEP_CREATIONDL_API_STATS)
            }

            if ((await store_getCreationPainterData(creationId)) == undefined) {
                const data = await retryOnThrow(() => api_getCreationPainterData(creationId));
                await store_setCreationPainterData(creationId, data);

                await sleep(SLEEP_CREATIONDL_API_PAINTER_DATA);
            }
        }
    }
    const processCreationsInQueue = async () => {
        log("processing queue")
        while (true) {
            log("still processing queue...")
            const queue = await db.getAllKeys("creations-queue");
            status.textContent = `Downloading queued creations... (0 / ${queue.length})`
            if (queue.length === 0) break;

            for (let i = 0; i < queue.length; i++) {
                const id = queue[i];
                status.textContent = `Downloading queued creations... (${i} / ${queue.length}) (ETA: ${Math.ceil(queue.length * SLEEP_CREATIONDL_CDN / 1000 / 60)} mins)`

                if (await isCreationPublic(id)) {
                    status_totalPublicCollectionsFound.update(v => v + 1);
                    console.debug("skipping creation", id, "as it is available from universe search");
                }
                else {
                    await saveCreation(id);
                }

                db.delete("creations-queue", id);
                status_creationsInQueue.update(v => v - 1);
            }

        }
        log("processing queue done")
    }
    // #endregion creations

    // #region inventory
    const store_addCollectedId = async (creationId) => await db.put("inventory-collections", null, creationId);
    const store_hasCollectedId = async (creationId) => await db.get("inventory-collections", creationId);
    const store_addCreatedId = async (creationId) => await db.put("inventory-creations", null, creationId);
    const store_hasCreatedId = async (creationId) => await db.get("inventory-creations", creationId);

    /**
     * 
     * @param {number} a
     * @param {number} b
     */
    // @ts-ignore
    const getRandomInt = (a, b) => parseInt(Math.floor((b + 1 - a) * Math.random() + a), 10);
    /**
     * 
     * @param {number} length
     * @returns {string}
     */
    const genId = (length = 16) => {
        var b = "";
        for (var c = 0; c < length; c++) b += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(getRandomInt(0, 61));
        return b
    }
    /**
     * 
     * @param {string} context
     * @returns {string}
     */
    const api_getCacheKey = (context) => {
        const key = "urlCacheAppend_" + context;
        sessionStorage[key] || (sessionStorage[key] = genId());
        return sessionStorage[key]
    }
    const api_getInventoryCollectionsPage = async (start, end) => await api_getJSON(`https://manyland.com/j/c/r/${start}/${end}?${api_getCacheKey("collectedItems")}`)
    const api_getInventoryCreationsPage = async (start, end) => await api_getJSON(`https://manyland.com/j/i/gcr/${start}/${end}?${api_getCacheKey("createdItems")}`)
    const api_searchInBin = async (start, end) => await api_postJSON(`https://manyland.com/j/s/i/`, `qs=in%3Abin&start=${start}&end=${end}`)

    const MAX_COLLECTIONS_PAGE_SIZE = 20;
    const MAX_CREATIONS_PAGE_SIZE = 20;
    const MAX_SEARCH_PAGE_SIZE = 10;
    const scanInventoryCollections = async (startAtPage = 0) => {
        let page = startAtPage;

        while (true) {
            log("scanInventoryCollections page", page)

            const start = page * MAX_COLLECTIONS_PAGE_SIZE;
            const end = start + MAX_COLLECTIONS_PAGE_SIZE;
            const { items, itemCount } = await api_getInventoryCollectionsPage(start, end);

            const lastPage = Math.floor(itemCount / MAX_COLLECTIONS_PAGE_SIZE);
            status.textContent = `Scrolling through collection tab... (page ${page} / ${lastPage})`;
            status_totalPageCollections.update(() => lastPage);
            status_currentPageCollections.update(() => page);

            for (const item of items) {
                if (await store_hasCollectedId(item) === false) {
                    await store_addCollectedId(item);
                    status_totalCollectionsFound.update(v => v + 1);
                }
            }

            const reachedEnd = end >= itemCount;
            await storeProgress(STATE_PROGRESS_COLLECTIONS, page, reachedEnd)
            status_atPageCollections.update(() => page);

            if (reachedEnd) break;
            page++;
            await sleep(SLEEP_INVENTORYPAGE_COLLECTIONS);
        }

        log("scanInventoryCollections done")
    }
    const downloadAllCollectedCreations = async () => {
        const allIds = await db.getAllKeys("inventory-collections");

        for (let i = 0; i < allIds.length; i++) {
            status.textContent = `Downloading collected creations... (${i} / ${allIds.length})`
            const id = allIds[i];

            if (await isCreationPublic(id)) {
                status_totalPublicCollectionsFound.update(v => v + 1);
                console.debug("skipping creation", id, "as it is available from universe search");
            }
            else {
                await saveCreation(id);
            }
        }
    }
    const scanInventoryCreations = async (startAtPage = 0) => {
        let page = startAtPage;

        while (true) {
            log("scanInventoryCreations page", page)

            const start = page * MAX_CREATIONS_PAGE_SIZE;
            const end = start + MAX_CREATIONS_PAGE_SIZE;
            const { items, itemCount} = await api_getInventoryCreationsPage(start, end);

            const lastPage = Math.floor(itemCount / MAX_CREATIONS_PAGE_SIZE);
            status.textContent = `Scrolling through creation tab... (page ${page} / ${lastPage})`;
            status_totalPagesCreations.update(() => lastPage);
            status_currentPageCreations.update(() => page);

            for (const item of items) {
                if (await store_hasCollectedId(item)) {
                    status_totalCreationsFound.update(v => v + 1);
                    await store_addCreatedId(item);
                }
            }

            const reachedEnd = end >= itemCount;
            await storeProgress(STATE_PROGRESS_CREATIONS, page, reachedEnd)
            status_atPageCreations.update(() => page);

            if (reachedEnd) break;
            page++;
            await sleep(SLEEP_INVENTORYPAGE_CREATIONS);
        }

        log("scanInventoryCreations done")
    }
    const scanInBin = async () => {
        let page = 0;

        while (true) {
            log("scanInBin page", page)
            status.textContent = `Finding creations in bin... (page ${ page + 1 })`;


            const start = page * MAX_SEARCH_PAGE_SIZE;
            const end = start + MAX_SEARCH_PAGE_SIZE;
            const { items, more } = await api_searchInBin(start, end);

            for (const item of items) {
                await store_addCreatedId(item);
            }
            
            const reachedEnd = more === false;
            await storeProgress(STATE_PROGRESS_BIN, page, reachedEnd)

            if (reachedEnd) break;
            page++;
            await sleep(SLEEP_INVENTORYPAGE_SEARCH);
        }

        log("scanInBin done")
    }
    const downloadAllCreatedCreations = async () => {
        const allIds = await db.getAllKeys("inventory-creations");

        for (let i = 0; i < allIds.length; i++) {
            status.textContent = `Downloading created creations... (${i} / ${allIds.length})`
            const id = allIds[i];
            await saveCreation(id);
        }
    }
    // #endregion inventory

    // #region mifts
    const store_addMift = async (mift, priv) => await db.put(priv ? 'mifts-private' : 'mifts-public', mift, mift._id);
    const store_getMift  = async (miftId, priv) => await db.get(priv ? 'mifts-private' : 'mifts-public', miftId);
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

        mainloop: while (true) {
            log("Getting page of olderThan", lastDate)
            const page = await api_getMiftPage(id, lastDate, priv);

            for (const mift of page.results) {
                if (await (store_getMift(mift._id)) != undefined) {
                    log("Reached known mift, stopping here.")
                    break mainloop;
                }
                await store_addMift(mift, priv);
                await saveCreation(mift.itemId);


                if (priv) status_currentMiftsPrivateSaved.update(v => v + 1);
                else status_currentMiftsPublicSaved.update(v => v + 1);
            }

            if (page.results.length < 5) break;
            lastDate = page.results.at(-1).ts;
            await sleep(SLEEP_MIFT_PAGE);
        }
    }
    // #endregion mifts


    // SNAPSHOTS
    // #region snaps
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
                continue;
            };
            const snap = result.data;

            log("storing state...")
            await storeProgress(STATE_PROGRESS_SNAPS, index, snap.moreResults === false)
            if (snap.moreResults !== true) break;
            if (!snap.visitedLocation) break;

            if (await getSnapData(snap.visitedLocation.shortCode) === false) {
                // Only increment this if it's a new snap
                status_totalSnapsFound.update(v => v + 1);
            }
            // This is slightly late, but it's aggravating to not have them all update at the same time, and it's not like people will notice
            status.textContent = `Archiving snaps... (page ${index})`;
            status_atPageSnaps.update(() => index);

            log("storing snap data...")
            await storeSnapData(snap.visitedLocation);

            await sleep(SLEEP_SNAP_PAGE)
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
            await sleep(SLEEP_SNAP_DL);
        }
    }
    const downloadAllStoredSnaps = async () => {
        const allSnaps = await getAllSnapShortCodes();

        for (let i = 0; i < allSnaps.length; i++) {
            const shortCode = allSnaps[i]
            status.textContent = "Downloading snaps... (" + i + ")"
            await downloadAndStoreSnap(shortCode)
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
            zip.file(`profile_own-id.json`, JSON.stringify(ourId, null, 2));
            if (initData.stn) {
                zip.file(`profile_settings.json`, JSON.stringify(initData.stn, null, 2));
            }

            const profile = await store_getProfileData();
            zip.file(`profile.json`, JSON.stringify(profile, null, 2));

            const topCreations = await store_getProfileTopCreations();
            zip.file(`profile_top-creations.json`, JSON.stringify(topCreations, null, 2));

            const boostAssociations = await api_getPlayerBoostAssociations();
            zip.file(`profile_boost-assocs.json`, JSON.stringify(boostAssociations.associations, null, 2));
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
            const filename = `${makeDateSafeForFile(takenAtDate)}_${shortCode}_${data.loc?.a}_${data.isPrivate ? "private" : "public"}`;
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
                    zip.file(`my-creations_stats/${id}.json`, JSON.stringify(stats));

                    const painterData = await store_getCreationPainterData(id);
                    zip.file(`my-creations_painterdata/${id}.json`, JSON.stringify(painterData));

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

        zip.file(`inventory-collected.json`, JSON.stringify(await db.getAllKeys(`inventory-collections`), null, 2));
        zip.file(`inventory-created.json`, JSON.stringify(await db.getAllKeys(`inventory-creations`), null, 2));


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




    const runExporter = async () => {
        setAttr(btn_start, { disabled: true });

        try {
            log("starting!")
            status.textContent = "Archiving profile..."
            await scanProfile()

            if (btn_snapsEnabled.checked) {
                status.textContent = "Finding snaps..."
                const progress = await getProgress(STATE_PROGRESS_SNAPS);
                await scanSnaps(progress.lastIndex);
                status.textContent = "Downloading snaps..."
            }
            await downloadAllStoredSnaps();

            if (btn_miftsEnabled.checked) {
                status.textContent = "Archiving public mifts..."
                await api_scanAllMifts(ourId, false);

                status.textContent = "Archiving private mifts..."
                await api_scanAllMifts(ourId, true);

            }

            if (btn_creationsEnabled.checked) {
                status.textContent = "Scrolling through creation tab...";
                const progress = await getProgress(STATE_PROGRESS_CREATIONS);
                await scanInventoryCreations(progress.lastIndex);
            }

            if (btn_binEnabled.checked) {
                status.textContent = "Finding creations in bin..."
                await scanInBin();
            }

            if (btn_collectionsEnabled.checked) {
                status.textContent = "Scrolling through collection tab...";
                const progress = await getProgress(STATE_PROGRESS_COLLECTIONS);
                await scanInventoryCollections(progress.lastIndex);
            }


            status.textContent = "Downloading created creations..."
            await downloadAllCreatedCreations();


            status.textContent = "Downloading collected creations..."
            await downloadAllCollectedCreations();

            if (btn_queueEnabled.checked) {
                status.textContent = "Downloading queued creations..."
                await processCreationsInQueue();
            }




            status.textContent = "Creating zip..."
            await createZip();
            status.textContent = "Done!"
        }
        catch(e) {
            console.error("error:", e);

            if (!e._offlineland_handled) {
                status.textContent += "Unexpected error! Retry later or post on the offlineland board!"
            }

        }





        //db.close();
        setAttr(btn_start, { disabled: false });
    }

    btn_start.onclick = runExporter;



    document.addEventListener("error", (e) => {
        console.error("error:", e);

        if (!e._offlineland_handled) {
            status.textContent += "Unexpected error! Retry later or post on the offlineland board!"
        }
    })
    document.addEventListener("unhandledrejection", (e) => {
        console.error("unhandledrejection:", e);

        if (!e._offlineland_handled) {
            status.textContent += "Unexpected error! Retry later or post on the offlineland board!"
        }
    })
})()
