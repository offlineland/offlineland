
const importPlayerData = async (zip: Zip, db: LocalMLDatabase, cache: ReturnType<typeof makeCache>) => {
    const promises = [];
    const readJson = (path: string) => zip.file(path).async("text").then(JSON.parse);
    const readJsonf = (file) => file.async("text").then(JSON.parse);

    const ourId = await readJson("profile_own-id.json");
    const profile = await readJson("profile.json");
    console.log("saving profile", profile)
    await PlayerDataManager.import_setProfile(idbKeyval, ourId, profile)

    const player = await PlayerDataManager.make(idbKeyval, db);
    promises.push(
        readJson("profile_top-creations.json").then(data => db.player_setTopCreations(player.rid, data))
    );
    promises.push(
        readJson("profile_settings.json").then(data => db.player_setSettings(player.rid, data))
    );
    promises.push(
        readJson("profile_boost-assocs.json").then(data => db.player_setBoostAssociations(player.rid, data))
    );



    zip.folder("creations-data/body-motions/").forEach((path, file) => {
        const id = path.slice(0, path.lastIndexOf("."))
        if (id.length !== 24) {
            console.warn("got a file that does not seem to be a creationId!", path, file)
            return;
        }

        promises.push( readJsonf(file).then(data => db.creation_setMotionData(id, data)) );
    })

    zip.folder("creations-data/holders/").forEach((path, file) => {
        const id = path.slice(0, path.lastIndexOf("."))
        if (id.length !== 24) {
            console.warn("got a file that does not seem to be a creationId!", path, file)
            return;
        }

        promises.push( readJsonf(file).then(data => db.creation_setHolderContent(id, data)) );
    })

    zip.folder("creations-data/multis/").forEach((path, file) => {
        const id = path.slice(0, path.lastIndexOf("."))
        if (id.length !== 24) {
            console.warn("got a file that does not seem to be a creationId!", path, file)
            return;
        }

        promises.push( readJsonf(file).then(data => db.creation_setMultiData(id, data)) );
    })



    // TODO: deduplicate this with area import
    zip.folder("other-creations/").forEach((path, file) => {
        console.log("loading other-creation/", path)
        const id = path.split('_')[1];
        if (!id || id.length !== 24) {
            console.warn("got a file that does not seem to be a creationId!", path, file)
            return;
        }

        if (path.endsWith(".png")) {
            console.log("adding", id, "to cache (sprite)")
            promises.push(
                file.async("blob").then(blob => cache.setCreationSprite(id, blob))
            )
        }
        else if (path.endsWith(".json")) {
            console.log("adding", id, "to cache (def)")
            promises.push(
                file.async("text").then(text => cache.setCreationDef(id, text))
            )
        }
    })


    zip.folder("my-creations/").forEach((path, file) => {
        console.log("loading my-creations", path)
        const id = path.split('_')[1];
        if (!id || id.length !== 24) {
            console.warn("got a file that does not seem to be a creationId!", path, file)
            return;
        }

        if (path.endsWith(".png")) {
            console.log("adding", id, "to cache (sprite)")
            promises.push(
                file.async("blob").then(blob => cache.setCreationSprite(id, blob))
            )
        }
        else if (path.endsWith(".json")) {
            console.log("adding", id, "to cache (def)")
            promises.push(
                file.async("text").then(text => cache.setCreationDef(id, text))
            )
        }
    })

    zip.folder("my-creations_painterdata/").forEach((path, file) => {
        console.log("loading my-creation_painterdata/", path)
        const id = path.slice(0, path.lastIndexOf("."))
        if (!id || id.length !== 24) {
            console.warn("got a file that does not seem to be a creationId!", path, file)
            return;
        }

        promises.push( readJsonf(file).then(data => db.creation_setPainterData(id, data)) );
    })

    zip.folder("my-creations_stats/").forEach((path, file) => {
        console.log("loading my-creation_stats/", path)
        const id = path.slice(0, path.lastIndexOf("."))
        if (!id || id.length !== 24) {
            console.warn("got a file that does not seem to be a creationId!", path, file)
            return;
        }

        promises.push( readJsonf(file).then(data => db.creation_setStats(id, data)) );
    })

    await Promise.all(promises);

    await player.import_setCreated(await readJson("inventory-created.json"))
    await player.import_setCollected(await readJson("inventory-collected.json"))

    // TODO snaps
    // TODO mifts
    return profile;
}



