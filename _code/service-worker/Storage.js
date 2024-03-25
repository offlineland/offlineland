// TODO: move stuff from cache in here
class LocalMLCDN {
}
class LocalMLDatabase {
    db;
    constructor(DB) {
        this.db = DB;
    }
    static async make() {
        console.log("making db");
        const db = await idb.openDB('offlineland-db', 6, {
            upgrade(db, oldVersion, newVersion) {
                console.log("upgrading db from", oldVersion, "to", newVersion);
                if (oldVersion < 1) { // 0
                    console.log("running migration 0");
                    const areasStore = db.createObjectStore('area-data', { keyPath: 'aid' });
                    areasStore.createIndex('by-gid', 'gid');
                    areasStore.createIndex('by-aun', 'aun');
                }
                if (oldVersion < 2) { // 1
                    console.log("running migration 1");
                    // Nothing here
                }
                if (oldVersion < 3) { // 2
                    console.log("running migration 2");
                    // Nothing here
                }
                if (oldVersion < 4) { // 3
                    console.log("running migration 3");
                    const multisStore = db.createObjectStore("multis");
                    multisStore.createIndex("by-_id", "data._id");
                    multisStore.createIndex("by-multithingId", "data.multithingId");
                    db.createObjectStore("holders");
                    db.createObjectStore("motions-of-body");
                    db.createObjectStore("creation-stats");
                    db.createObjectStore("creation-painter-data");
                    db.createObjectStore("minimap-colors");
                }
                if (oldVersion < 5) {
                    console.log("running migration 4");
                    db.createObjectStore("minimap-area-tile-ids");
                }
                if (oldVersion < 6) {
                    console.log("running migration 5");
                    db.createObjectStore("area-sectors");
                }
                console.log("done!");
            }
        });
        console.log("making db ok");
        return new LocalMLDatabase(db);
    }
    // #region player
    async player_setTopCreations(playerId, topCreations) {
        await idbKeyval.set(`playertopcreations-p${playerId}`, topCreations);
    }
    async player_getTopCreations(playerId) {
        return await idbKeyval.get(`playertopcreations-p${playerId}`);
    }
    async player_getSettings(playerId) {
        return (await idbKeyval.get(`playersettings-p${playerId}`)) || {};
    }
    async player_setSetting(playerId, settingName, settingValue) {
        await idbKeyval.update(`playersettings-p${playerId}`, (v) => {
            const settings = v || {};
            if (settingValue === "") {
                delete settings[settingName];
            }
            else {
                settings[settingName] = settingValue;
            }
            return settings;
        });
    }
    async player_setSettings(playerId, settings) {
        await idbKeyval.set(`playersettings-p${playerId}`, settings);
    }
    async player_getVoice(playerId) {
        return (await idbKeyval.get(`playervoice-p${playerId}`)) || null;
    }
    async player_setVoice(playerId, voiceName) {
        await idbKeyval.set(`playervoice-p${playerId}`, voiceName);
    }
    async player_getBoostAssociations(playerId) {
        return (await idbKeyval.get(`playerboostassociations-p${playerId}`)) || {};
    }
    async player_setBoostAssociation(playerId, boostName, value) {
        await idbKeyval.update(`playerboostassociations-p${playerId}`, (v) => {
            const data = v || {};
            data[boostName] = value;
            return data;
        });
    }
    async player_setBoostAssociations(playerId, associations) {
        await idbKeyval.set(`playerboostassociations-p${playerId}`, associations);
    }
    // #endregion player
    // #region creation
    async creation_setMotionData(bodyId, data) {
        await this.db.put("motions-of-body", data, bodyId);
    }
    async creation_getMotionData(bodyId) {
        return await this.db.get("motions-of-body", bodyId);
    }
    async creation_setHolderContent(holderId, data) {
        await this.db.put("holders", data, holderId);
    }
    async creation_getHolderContent(holderId) {
        return await this.db.get("holders", holderId);
    }
    async creation_setMultiData(multiId, data) {
        await this.db.put("multis", data, multiId);
    }
    async creation_getMultiData(multiId) {
        return await this.db.get("multis", multiId);
    }
    async creation_setPainterData(creationId, data) {
        await this.db.put("creation-painter-data", data, creationId);
    }
    async creation_getPainterData(creationId) {
        return await this.db.get("creation-painter-data", creationId);
    }
    async creation_setStats(creationId, data) {
        await this.db.put("creation-stats", data, creationId);
    }
    async creation_getStats(creationId) {
        return await this.db.get("creation-stats", creationId);
    }
    async creation_setMinimapColor(creationId, colorStr) {
        if (!colorStr.startsWith("rgba(")) {
            throw new Error("setMinimapColor: tried to set a colorStr that doesn't start with rgba(!");
        }
        await this.db.put("minimap-colors", colorStr, creationId);
    }
    async creation_getMinimapColor(creationId) {
        return await this.db.get("minimap-colors", creationId);
    }
    // #endregion creation
    // #region area
    // #region minimap
    async minimap_getTile(areaId, x, y) {
        const key = `${areaId}_${x}_${y}`;
        return await this.db.get("minimap-area-tile-ids", key);
    }
    async minimap_setTile(areaId, x, y, tileId) {
        const key = `${areaId}_${x}_${y}`;
        return await this.db.put("minimap-area-tile-ids", tileId, key);
    }
    // #endregion minimap
    async area_getSector(areaId, x, y, tx) {
        const key = `${areaId}_${x}_${y}`;
        return await (tx ? tx.store.get(key) : this.db.get("area-sectors", key));
    }
    async area_setSector(areaId, x, y, sectorData, tx = this.db.transaction("area-sectors", "readwrite")) {
        const key = `${areaId}_${x}_${y}`;
        return await tx.store.put(sectorData, key);
    }
    async area_delAllAreaSectors(id) {
        const keys = await this.db.getAllKeys("area-sectors");
        for (const key of keys) {
            if (key.startsWith(id + "_")) {
                await this.db.delete("area-sectors", key);
            }
        }
    }
    async area_setData(data) {
        try {
            return await this.db.put("area-data", data);
        }
        catch (e) {
            console.error("error storing area data!", data);
            console.error(e);
            throw e;
        }
    }
    async area_getData(id) {
        return await this.db.get("area-data", id);
    }
    async area_getData_all() {
        return await this.db.getAll("area-data");
    }
    async area_delArea(id) {
        return await this.db.delete("area-data", id);
    }
    async area_getDataByAun(areaUrlName) {
        return (await this.db.getAllFromIndex("area-data", "by-aun", areaUrlName)).at(0);
    }
    async area_getSubareasIn(gid) {
        const areas = await this.db.getAllFromIndex("area-data", "by-gid", gid);
        return areas.filter(area => area.sub);
    }
}
const SECTOR_SIZE_FOR_COORDS_MATH = 32;
const SECTOR_SIZE_FOR_LOOPS = 31;
const worldCoordsToSectorPlusOffset = (worldX, worldY) => {
    const sector = {
        x: Math.floor(worldX / SECTOR_SIZE_FOR_COORDS_MATH),
        y: Math.floor(worldY / SECTOR_SIZE_FOR_COORDS_MATH)
    };
    return {
        sector: sector,
        offset: {
            x: worldX - sector.x * SECTOR_SIZE_FOR_COORDS_MATH,
            y: worldY - sector.y * SECTOR_SIZE_FOR_COORDS_MATH
        },
    };
};
// This directly manipulates the compact sector data
// TODO: decide if it's fine to re-query the DB on each request, or if we should
// keep a local copy and enfoce one single instance of this class managing the area.
// How long does it take to read-write a map edit? Is idb fast enough? How much does it vary between browsers/computers?
class AreaSectorManager_raw {
    areaId;
    db;
    constructor(areaId, db) {
        this.areaId = areaId;
        this.db = db;
    }
    async getPlacement(worldX, worldY) {
        const { sector, offset } = worldCoordsToSectorPlusOffset(worldX, worldY);
        const sectorData = await this.db.area_getSector(this.areaId, sector.x, sector.y);
        const placement = sectorData.ps.find(([x, y]) => x === offset.x && y === offset.y);
        if (placement) {
            return {
                tid: sectorData.iix[placement[0]],
                rotation: placement[3],
                flip: placement[4],
                placedAt: placement[5],
                placedBy: placement[6],
            };
        }
    }
    async removePlacement(worldX, worldY) {
        // Leaky abstraction, oh well
        const tx = this.db.db.transaction("area-sectors", "readwrite");
        const { sector, offset } = worldCoordsToSectorPlusOffset(worldX, worldY);
        const sectorData = await this.db.area_getSector(this.areaId, sector.x, sector.y, tx) || { "iix": [], "ps": [], "v": 1919, "x": sector.x, "y": sector.y, "i": { "b": [], "p": [], "n": [], "dr": [] } };
        const targetPsIndex = sectorData.ps.findIndex(([x, y]) => x === offset.x && y === offset.y);
        if (targetPsIndex === -1) { // There's no placement here to delete
            await tx.done;
            return {
                ok: false,
                reasonCode: 9,
            };
        }
        else {
            const [targetPs] = sectorData.ps.splice(targetPsIndex, 1);
            const targetCreationIndex = targetPs[2];
            const moreOfThisCreation = sectorData.ps.some((p) => p[2] === targetCreationIndex);
            if (!moreOfThisCreation) {
                sectorData.iix.splice(targetCreationIndex, 1);
                sectorData.i.b.splice(targetCreationIndex, 1);
                sectorData.i.dr.splice(targetCreationIndex, 1);
                sectorData.i.n.splice(targetCreationIndex, 1);
                sectorData.i.p.splice(targetCreationIndex, 1);
                sectorData.ps = sectorData.ps.map(psArr => {
                    if (psArr[2] > targetCreationIndex) {
                        psArr[2] = psArr[2] - 1;
                    }
                    return psArr;
                });
            }
            await this.db.area_setSector(this.areaId, sector.x, sector.y, sectorData, tx);
        }
        await tx.done;
        return { ok: true };
    }
    async addPlacement(worldX, worldY, placement, creationData, placedAt, placedBy) {
        const { tid: creationId, rotation, flip } = placement;
        const { sector, offset } = worldCoordsToSectorPlusOffset(worldX, worldY);
        // LocalMLDatabase is now a Leaky Abstraction, oh well
        const tx = this.db.db.transaction("area-sectors", "readwrite");
        const sectorData = await this.db.area_getSector(this.areaId, sector.x, sector.y, tx) || { "iix": [], "ps": [], "v": 1919, "x": sector.x, "y": sector.y, "i": { "b": [], "p": [], "n": [], "dr": [] } };
        const targetPsIndex = sectorData.ps.findIndex(([x, y]) => x === offset.x && y === offset.y);
        if (targetPsIndex !== -1) { // There's already a placement here
            console.log("already a creation there", targetPsIndex, sectorData.ps[targetPsIndex]);
            await tx.done;
            const target = sectorData.ps[targetPsIndex];
            return {
                ok: false,
                reasonCode: 10,
                revertTo: {
                    tid: sectorData.iix[targetPsIndex],
                    rotation: target[3],
                    flip: target[4],
                }
            };
        }
        else {
            const index = sectorData.iix.indexOf(creationId);
            if (index > -1) {
                sectorData.ps.push([offset.x, offset.y, index, rotation, flip, placedAt.valueOf(), placedBy]);
            }
            else {
                const index = sectorData.iix.push(creationId) - 1;
                sectorData.ps.push([offset.x, offset.y, index, rotation, flip, placedAt.valueOf(), placedBy]);
                sectorData.i.b.push(creationData.base);
                sectorData.i.dr.push(creationData.direction);
                sectorData.i.n.push(creationData.name);
                sectorData.i.p.push(creationData.props);
            }
            await this.db.area_setSector(this.areaId, sector.x, sector.y, sectorData, tx);
            await tx.done;
            return { ok: true };
        }
    }
}
