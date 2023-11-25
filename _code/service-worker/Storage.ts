// TODO: move stuff from cache in here
class LocalMLCDN {

}

class LocalMLDatabase {
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
}