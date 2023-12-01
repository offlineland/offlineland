
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
}

type OfflinelandDB = Awaited<ReturnType<typeof idb.openDB<OfflinelandIDBSchema>>>;

class LocalMLDatabase {
    db: OfflinelandDB;

    constructor(DB: OfflinelandDB) {
        this.db = DB;
    }

    static async make() {
          const db = await idb.openDB<OfflinelandIDBSchema>('offlineland-db', 2, {
            upgrade(db, oldVersion, newVersion) {
                console.log("upgrading db from", oldVersion, "to", newVersion)

                if (oldVersion < 1) { // 0
                    const areasStore = db.createObjectStore('area-data', { keyPath: 'aid' });

                    areasStore.createIndex('by-gid', 'gid');
                    areasStore.createIndex('by-aun', 'aun');
                }
                if (oldVersion < 2) { // 1
                    // Nothing here
                }
                if (oldVersion < 3) { // 2
                    // Nothing here
                }
            }
        });

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


    async creation_setMotionData(bodyId, data) {
        await idbKeyval.set(`creationdata-bodymotions-c${bodyId}`, data);
    }
    async creation_getMotionData(bodyId) {
        return await idbKeyval.get(`creationdata-bodymotions-c${bodyId}`);
    }

    async creation_setHolderContent(holderId, data) {
        await idbKeyval.set(`creationdata-holdercontent-c${holderId}`, data);
    }
    async creation_getHolderContent(holderId) {
        return await idbKeyval.get(`creationdata-holdercontent-c${holderId}`);
    }

    async creation_setMultiData(multiId, data) {
        await idbKeyval.set(`creationdata-multidata-c${multiId}`, data);
    }
    async creation_getMultiData(multiId) {
        return await idbKeyval.get(`creationdata-multidata-c${multiId}`);
    }

    async creation_setPainterData(creationId, data) {
        await idbKeyval.set(`creationdata-painterdata-c${creationId}`, data);
    }
    async creation_getPainterData(creationId) {
        return await idbKeyval.get(`creationdata-painterdata-c${creationId}`);
    }

    async creation_setStats(creationId, data) {
        await idbKeyval.set(`creationdata-stats-c${creationId}`, data);
    }
    async creation_getStats(creationId) {
        return await idbKeyval.get(`creationdata-stats-c${creationId}`);
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
    async area_getDataByAun(areaUrlName: string): Promise<AreaData | null> {
        return (await this.db.getAllFromIndex("area-data", "by-aun", areaUrlName)).at(0)
    }
    async area_getSubareasIn(gid: string): Promise<AreaData[]> {
        const areas = await this.db.getAllFromIndex("area-data", "by-gid", gid);

        return areas.filter(area => area.sub)
    }
}
