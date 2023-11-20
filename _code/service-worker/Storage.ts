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