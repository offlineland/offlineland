
// TODO: move stuff from cache in here
class LocalMLCDN {

}



type AreaData = {
    aid: string;
    gid: string;
    sub: boolean;
    arn: string;
    agn: string;
    aun: string;
    ard: string;
}

type MultiData = unknown;

type MotionsOfBody = {
    midpoint: number;
    ids: string[];
}

type HolderData = {
    isCreator: boolean;
    contents: {
        _id: string;
        itemId: string;
        x: number;
        y: number;
        z: number;
        flip: number;
        rot: number;
        pageNo: number;
    }[];
}

type CreationStats = {
    timesCd: number;
    timesPd: number;
}

type CreationProps = {
    textSize?: number;
    rgb?: string;
    rgb2?: string;
    attr?: number[];
    // TODO: more
}

type PainterData = {
    name: string;
    base: string;
    prop: CreationProps;
    imageData: {
        pixels: number[][][];
        colors: { alpha: number | string, r: number | string, g: number | string, b: number | string }[];
    }
    creator: string;
}

// TODO: migrate the idb-keyval data to this?
interface OfflinelandIDBSchema extends DBSchema {
    "area-data": {
        key: string;
        value: AreaData;
        indexes: {
            "by-gid": string;
            "by-aun": string;
        }
    };
    "multis": {
        key: string;
        value: MultiData;
        indexes: {
            "by-_id": string;
            "by-multithingId": string;
        }
    };
    "holders": { key: string; value: HolderData; };
    "motions-of-body": { key: string; value: MotionsOfBody | null; };
    "creation-stats": { key: string; value: CreationStats };
    "creation-painter-data": { key: string; value: PainterData };
    "minimap-colors": { key: string; value: string; };
}

type OfflinelandDB = Awaited<ReturnType<typeof idb.openDB<OfflinelandIDBSchema>>>;

class LocalMLDatabase {
    db: OfflinelandDB;

    constructor(DB: OfflinelandDB) {
        this.db = DB;
    }

    static async make() {
        console.log("making db")
        const db = await idb.openDB<OfflinelandIDBSchema>('offlineland-db', 4, {
            upgrade(db, oldVersion, newVersion) {
                console.log("upgrading db from", oldVersion, "to", newVersion)

                if (oldVersion < 1) { // 0
                    console.log("running migration 0")
                    const areasStore = db.createObjectStore('area-data', { keyPath: 'aid' });

                    areasStore.createIndex('by-gid', 'gid');
                    areasStore.createIndex('by-aun', 'aun');
                }
                if (oldVersion < 2) { // 1
                    console.log("running migration 1")
                    // Nothing here
                }
                if (oldVersion < 3) { // 2
                    console.log("running migration 2")
                    // Nothing here
                }
                if (oldVersion < 4) { // 3
                    console.log("running migration 3")
                    // Nothing here
                }
                if (oldVersion < 5) { // 3
                    console.log("running migration 4")
                    const multisStore = db.createObjectStore("multis");
                    multisStore.createIndex("by-_id", "data._id");
                    multisStore.createIndex("by-multithingId", "data.multithingId");

                    db.createObjectStore("holders");
                    db.createObjectStore("motions-of-body");
                    db.createObjectStore("creation-stats");
                    db.createObjectStore("creation-painter-data");
                    db.createObjectStore("minimap-colors");
                }
                console.log("done!")
            }
        });
        console.log("making db ok")

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

            settings[settingName] = settingValue;

            return settings;
        })
    }
    async player_setSettings(playerId, settings) {
        await idbKeyval.set(`playersettings-p${playerId}`, settings)
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
        })
    }
    async player_setBoostAssociations(playerId, associations) {
        await idbKeyval.set(`playerboostassociations-p${playerId}`, associations);
    }


    async creation_setMotionData(bodyId: string, data: MotionsOfBody | null) {
        await this.db.put("motions-of-body", data, bodyId);
    }
    async creation_getMotionData(bodyId) {
        return await this.db.get("motions-of-body", bodyId);
    }

    async creation_setHolderContent(holderId, data) {
        await this.db.put("holders", data, holderId)
    }
    async creation_getHolderContent(holderId) {
        return await this.db.get("holders", holderId)
    }

    async creation_setMultiData(multiId, data) {
        await this.db.put("multis", data, multiId)
    }
    async creation_getMultiData(multiId) {
        return await this.db.get("multis", multiId)
    }

    async creation_setPainterData(creationId: string, data: PainterData) {
        await this.db.put("creation-painter-data", data, creationId)
    }
    async creation_getPainterData(creationId) {
        return await this.db.get("creation-painter-data", creationId)
    }

    async creation_setStats(creationId: string, data: CreationStats) {
        await this.db.put("creation-stats", data, creationId)
    }
    async creation_getStats(creationId: string) {
        return await this.db.get("creation-stats", creationId)
    }

    async creation_setMinimapColor(creationId: string, colorStr: string) {
        if (!colorStr.startsWith("rgba(")) {
            throw new Error("setMinimapColor: tried to set a colorStr that doesn't start with rgba(!")
        }

        await this.db.put("minimap-colors", colorStr, creationId);
    }
    async creation_getMinimapColor(creationId: string) {
        return await this.db.get("minimap-colors", creationId);
    }


    async area_setData(data: AreaData) {
        try {
            return await this.db.put("area-data", data)
        } catch(e) {
            console.error("error storing area data!", data)
            console.error(e);
            throw e;
        }
    }
    async area_getData(id: string) {
        return await this.db.get("area-data", id)
    }
    async area_delArea(id: string) {
        return await this.db.delete("area-data", id)
    }
    async area_getDataByAun(areaUrlName: string): Promise<AreaData | null> {
        return (await this.db.getAllFromIndex("area-data", "by-aun", areaUrlName)).at(0)
    }
    async area_getSubareasIn(gid: string): Promise<AreaData[]> {
        const areas = await this.db.getAllFromIndex("area-data", "by-gid", gid);

        return areas.filter(area => area.sub)
    }
}
