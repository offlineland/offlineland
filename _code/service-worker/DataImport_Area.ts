
const importAreaData = async (
    zip: Zip,
    db: LocalMLDatabase,
    cache: ReturnType<typeof makeCache>,
    onProgress: (areaUrlName: string, current: number, total: number) => void,
    onError: (message: string) => void,
) => {
    const readJson = (path: string) => zip.file(path).async("text").then(JSON.parse);
    const readJsonf = (file): Promise<any> => file.async("text").then(JSON.parse);

    const filesCount = Object.keys(zip.files).length;
    let handledFiles = 0;

    console.log("reading settings file")
    const data: AreaData = JSON.parse(await zip.file("area_settings.json").async("string"))
    const areaId = data.aid;
    console.log("reading settings file ok", { areaId, data, zip })


    console.log("storing area data")
    await db.area_setData(data);
    console.log("storing area data ok")




    const getIdFromCreation_simple = (filename: string) => {
        const id = filename.slice(0, filename.lastIndexOf("."))

        if (!id || id.length !== 24) {
            return false;
        }

        else return id;
    }


    for (const file of Object.values(zip.files)) {
        if (file.dir) continue;

        const fullPath = file.name
        try {
            const path = fullPath.substring(0, fullPath.lastIndexOf('/') + 1);
            const filename = fullPath.substring(fullPath.lastIndexOf('/') + 1);
            

            if (path === "creations/") {
                const id = getIdFromCreation_simple(filename);
                if (id === false) {
                    console.warn("got a file that does not seem to be a creationId!", fullPath)
                    continue;
                }


                if (filename.endsWith(".png")) {
                    const blob = await file.async("blob");
                    await cache.setCreationSprite(id, blob);
                }
                else if (filename.endsWith(".json")) {
                    const jsonStr = await file.async("text");
                    await cache.setCreationDef(id, jsonStr);
                }
                else {
                    console.warn("unknown file type!", fullPath)
                }
            }
            else if (path === "holders/") {
                const id = getIdFromCreation_simple(filename);
                if (id === false) {
                    console.warn("got a file that does not seem to be a creationId!", fullPath)
                    continue;
                }

                await readJsonf(file).then(data => db.creation_setHolderContent(id, data));
            }
            else if (path === "multis/") {
                const id = getIdFromCreation_simple(filename);
                if (id === false) {
                    console.warn("got a file that does not seem to be a creationId!", fullPath)
                    continue;
                }

                await readJsonf(file).then(data => db.creation_setMultiData(id, data));
            }
            else if (path === "sectors/") {
                const maybeMatch = filename.match(/sector(?<x>[-\d]+)T(?<y>[-\d]+).json/);
                if (maybeMatch === null) {
                    console.warn("got a file that does not seem to be a valid sector!", fullPath)
                    continue;
                }

                const x = Number(maybeMatch.groups.x);
                const y = Number(maybeMatch.groups.y);

                const data = await readJsonf(file)
                await db.area_setSector(areaId, x, y, data)
            }
            else if (fullPath === "thumbnail.png") {
                console.log("storing thumbnail")
                await file.async("blob").then((blob) => cache.addAreaThumb(data.aun, blob))
                console.log("storing thumbnail ok")
            }
            else if (fullPath === "area_editors.json") {} // TODO?
            // Ignored files
            else if (fullPath === "settings_backup.txt") {}
            else if (fullPath === "area_settings.json") {}
            else {
                console.warn("unhandled file!", fullPath)
            }





            handledFiles++;

            if (handledFiles % 20 === 0) {
                onProgress(data.aun, handledFiles, filesCount);
            }
        }
        catch(e) {
            console.error("error while handling file", fullPath, e)
            onError(`Error while processing file "${fullPath}": "${e.message}"`)
        }
    }


    console.log("done importing area", areaId);
    return data;
}