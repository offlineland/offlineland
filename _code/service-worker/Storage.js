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
    async minimap_getTile(areaId, x, y) {
        const key = `${areaId}_${x}_${y}`;
        return await this.db.get("minimap-area-tile-ids", key);
    }
    async minimap_setTile(areaId, x, y, tileId) {
        const key = `${areaId}_${x}_${y}`;
        return await this.db.put("minimap-area-tile-ids", tileId, key);
    }
    async area_getSector(areaId, x, y) {
        const key = `${areaId}_${x}_${y}`;
        return await this.db.get("area-sectors", key);
    }
    async area_setSector(areaId, x, y, sectorData) {
        const key = `${areaId}_${x}_${y}`;
        return await this.db.put("area-sectors", sectorData, key);
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
