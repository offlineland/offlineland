
const importPlayerData = async (zip: Zip, db: LocalMLDatabase, cache: ReturnType<typeof makeCache>, onProgress: (current: number, total: number) => void, onError: (message: string) => void) => {
    const readJson = (path: string) => zip.file(path).async("text").then(JSON.parse);
    const readJsonf = (file): Promise<any> => file.async("text").then(JSON.parse);

    const filesCount = Object.keys(zip.files).length;
    let handledFiles = 0;

    const ourId = await readJson("profile_own-id.json");
    const profile = await readJson("profile.json");
    await PlayerDataManager.import_setProfile(idbKeyval, ourId, profile)

    const player = await PlayerDataManager.make(idbKeyval, db);
    await readJson("profile_top-creations.json").then(data => db.player_setTopCreations(player.rid, data))
    await readJson("profile_settings.json").then(data => db.player_setSettings(player.rid, data))
    await readJson("profile_boost-assocs.json").then(data => db.player_setBoostAssociations(player.rid, data))


    const getIdFromCreation_friendly = (filename: string) => {
        const id = filename.split('_')[1];

        if (!id || id.length !== 24) {
            return false;
        }

        else return id;
    }

    const getIdFromCreation_simple = (filename: string) => {
        const id = filename.slice(0, filename.lastIndexOf("."))

        if (!id || id.length !== 24) {
            return false;
        }

        else return id;
    }



    for (const file of Object.values(zip.files)) {
        const fullPath = file.name
        try {
            const path = fullPath.substring(0, fullPath.lastIndexOf('/'));
            const filename = fullPath.substring(fullPath.lastIndexOf('/') + 1);

            // TODO: deduplicate this with area import
            // TODO: refactor this to use the matchPath router thing instead
            if (path === "other-creations/") {
                const id = getIdFromCreation_friendly(filename);
                if (id === false) {
                    console.warn("other-creations/ couldn't find creationId!", fullPath)
                    continue;
                }

                if (filename.endsWith(".png")) {
                    console.log("adding", id, "to cache (sprite)")
                    const blob = await file.async("blob");
                    await cache.setCreationSprite(id, blob);
                }
                else if (filename.endsWith(".json")) {
                    console.log("adding", id, "to cache (def)")
                    const jsonStr = await file.async("text");
                    await cache.setCreationDef(id, jsonStr);
                }
                else {
                    console.warn("unknown file!", fullPath)
                }
            }
            else if (path === "my-creations/") {
                console.log("loading my-creations", filename)
                const id = getIdFromCreation_friendly(filename);
                if (id === false) {
                    console.warn("my-creations/ couldn't find creationId!", fullPath)
                    continue;
                }

                if (filename.endsWith(".png")) {
                    console.log("adding", id, "to cache (sprite)")
                    const blob = await file.async("blob");
                    await cache.setCreationSprite(id, blob);
                }
                else if (filename.endsWith(".json")) {
                    console.log("adding", id, "to cache (def)")
                    const jsonStr = await file.async("text");
                    await cache.setCreationDef(id, jsonStr);
                }
                else {
                    console.warn("unknown file!", fullPath)
                }
            }
            else if (path === "my-creations_painterdata/") {
                console.log("loading my-creation_painterdata/", filename)
                const id = getIdFromCreation_simple(filename)
                if (!id) {
                    console.warn("got a file that does not seem to be a creationId!", fullPath, file)
                    continue;
                }

                const data = await readJsonf(file);
                db.creation_setPainterData(id, data);
            }
            else if (path === "my-creations_stats/") {
                console.log("loading my-creation_stats/", filename)
                const id = getIdFromCreation_simple(filename)
                if (!id) {
                    console.warn("got a file that does not seem to be a creationId!", fullPath, file)
                    return;
                }

                const data = await readJsonf(file);
                await db.creation_setStats(id, data);
            }
            else if (path === "creations-data/body-motions/") {
                const id = getIdFromCreation_simple(filename)
                if (!id) {
                    console.warn("got a file that does not seem to be a creationId!", path, file)
                    return;
                }

                const data = await readJsonf(file);
                await db.creation_setMotionData(id, data);
            }
            else if (path === "creations-data/holders/") {
                const id = getIdFromCreation_simple(filename)
                if (!id) {
                    console.warn("got a file that does not seem to be a creationId!", path, file)
                    return;
                }

                const data = await readJsonf(file);
                await db.creation_setHolderContent(id, data);
            }
            else if (path === "creations-data/multis/") {
                const id = getIdFromCreation_simple(filename)
                if (!id) {
                    console.warn("got a file that does not seem to be a creationId!", path, file)
                    return;
                }

                const data = await readJsonf(file);
                await db.creation_setMultiData(id, data);
            }
            else {
                console.warn("unhandled file!", fullPath)
            }
            // TODO snaps
            // TODO mifts


            handledFiles++;

            if (handledFiles % 20 === 0) {
                onProgress(handledFiles, filesCount);
            }
        }
        catch(e) {
            console.error("error while handling file", fullPath, e)
            onError(`Error while processing file "${fullPath}": "${e.message}"`)
        }
    }


    await player.import_setCreated(await readJson("inventory-created.json"))
    await player.import_setCollected(await readJson("inventory-collected.json"))

    return profile;
}



