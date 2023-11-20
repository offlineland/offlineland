const CACHE_NAME = 'cache-v1';
const CACHE_AREAS_V2 = "cache_areas_v2"

const getOrSetFromCache = async (/** @type { string } */ cacheName, /** @type {Request} */ request) => {
    const cache = await self.caches.open(cacheName);

    const cacheMatch = await cache.match(request)

    if (cacheMatch) return cacheMatch;



    const fetchRes = await fetch(request.clone());
    if (fetchRes.ok) {
        cache.put(request, fetchRes.clone())
    }

    return fetchRes;
}

const deleteCachesNotIn = async (/** @type {string[]} */ cacheWhitelist) => {
    const cacheKeys = await self.caches.keys();

    const deletePromises = cacheKeys.map(cacheKey => {
        if (cacheWhitelist.includes(cacheKey) === false) {
            return caches.delete(cacheKey);
        }
    });

    await Promise.all(deletePromises);
}



const makeCache = (originUrl, SpriteGroundBlob) => {



// TODO: move this to a class. Move it to the same place as MLLocalDatabase?

// #region creations_cache
/** @param {string} creationId @param {Blob} blob */
const setCreationSprite = async (creationId, blob) => {
    const cache = await self.caches.open("CREATION-SPRITES-V1");

    const url = self.origin + "/sprites/" + creationId;
    await cache.put(url, new Response(blob, { headers: { 'Content-Type': 'image/png' } }))
}

/** @param {string} creationId */
const getCreationSprite = async (creationId) => {
    const cache = await self.caches.open("CREATION-SPRITES-V1");

    const url = self.origin + "/sprites/" + creationId;
    const cacheMatch = await cache.match(url)

    return cacheMatch;
}


const FETCH_MISSING_SPRITES_FROM_LIVE_CDN = true;
const FETCH_MISSING_DEFS_FROM_LIVE_CDN = true;
const CLOUDFRONT_ROOT_ITEMDEFS = "d2h9in11vauk68.cloudfront.net"

/** @param {string} creationId */
const getCreationSpriteRes = async (creationId) => {
    const fromCache = await getCreationSprite(creationId)

    if (fromCache) {
        return fromCache;
    }

    console.log("creation sprite not in cache!", creationId)



    if (FETCH_MISSING_SPRITES_FROM_LIVE_CDN) {
        // TODO: the game actually shards over multiple CDNs in a deterministic manner
        const url = "https://d3sru0o8c0d5ho.cloudfront.net/" + creationId;

        try {
            const res = await fetch(url);
            if (res.ok) {
                setCreationSprite(creationId, await res.clone().blob())
                return res;
            }
            else {
                console.error("getCreaationSpriteRes: attempted to pull data from live CDN but request failed", url, res.status, res.statusText, res)
                throw new Error("fetch not ok")
            }
        }
        catch(e) {
            console.warn("failed to pull from CDN or set to cache!", url, e)
        }
    }


    // Serve placeholder otherwise
    return new Response(SpriteGroundBlob)
}





/** @param {string} creationId @param {string} jsonStr */
const setCreationDef = async (creationId, jsonStr) => {
    const cache = await self.caches.open("CREATION-DEFS-V1");

    const url = self.origin + "/_mlspinternal_/defs/" + creationId;
    await cache.put(url, new Response(jsonStr, { headers: { 'Content-Type': 'application/json' } }))
}

/** @param {string} creationId */
const getCreationDef = async (creationId) => {
    const cache = await self.caches.open("CREATION-DEFS-V1");

    const url = self.origin + "/_mlspinternal_/defs/" + creationId;
    const cacheMatch = await cache.match(url)

    return cacheMatch;
}

const getCreationDefRes = async (creationId) => {
    const fromCache = await getCreationDef(creationId)

    if (fromCache) {
        return fromCache;
    }

    console.warn("creation def not in cache!", creationId)



    if (FETCH_MISSING_DEFS_FROM_LIVE_CDN) {
        const url = originUrl.protocol + "//" + CLOUDFRONT_ROOT_ITEMDEFS + "/" + creationId;

        try {
            const res = await fetch(url);
            if (res.ok) {
                setCreationDef(creationId, await res.clone().text())
                return res;
            }
            else {
                console.error("getCreationDefRes: attempted to pull data from live CDN but request failed", url, res.status, res.statusText, res)
                throw new Error("fetch not ok")
            }
        }
        catch(e) {
            console.warn("failed to pull from CDN or set to cache!", url, e)
        }
    }


    // Serve placeholder otherwise
    return Response.json({"base":undefined,"creator":undefined,"id":creationId,"name":"MISSING DATA"})
}


return {
    CLOUDFRONT_ROOT_ITEMDEFS,
    getOrSetFromCache,
    getCreationDef,
    getCreationDefRes,
    setCreationDef,
    getCreationSprite,
    setCreationSprite,
    getCreationSpriteRes,
}
}