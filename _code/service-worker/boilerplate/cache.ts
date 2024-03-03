const CACHE_NAME = 'cache-v1';
const CACHE_THUMBS = "cache_thumbs_v2"

const getOrSetFromCache = async (cacheName: string, request: Request) => {
    const cache = await self.caches.open(cacheName);

    const cacheMatch = await cache.match(request)

    if (cacheMatch) return cacheMatch;



    const fetchRes = await fetch(request.clone());
    if (fetchRes.ok) {
        if (fetchRes.status === 206) {
            // Throwing in a timeout so that it's sent to the client but doesn't break the request
            // Ideally I'd have a better setup for sending errors/notices back to clients, but this is what I get for supporting firefox
            setTimeout(() => { throw new Error(`Received a status 206 for url "${request.url}" (cache ${cacheName})!`) }, 50)
        }
        else {
            cache.put(request, fetchRes.clone())
        }
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


// TODO: option to "use online.offlineland data"
const FETCH_MISSING_SPRITES_FROM_LIVE_CDN = true;
const FETCH_MISSING_DEFS_FROM_LIVE_CDN = true;
const ROOT_ITEMSPRITES = "https://archival.offlineland.io/creations/sprite/"
const ROOT_ITEMDEFS = "https://archival.offlineland.io/creations/def/"

/** @param {string} creationId */
const getCreationSpriteRes = async (creationId) => {
    const fromCache = await getCreationSprite(creationId)

    if (fromCache) {
        return fromCache;
    }

    console.log("creation sprite not in cache!", creationId)



    if (FETCH_MISSING_SPRITES_FROM_LIVE_CDN) {
        const url = ROOT_ITEMSPRITES + creationId;

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
        const url = ROOT_ITEMDEFS + creationId;

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



const addToCache = async (cacheName: string, path: string, blob: Blob) => {
    const cache = await caches.open(cacheName);
    const response = new Response(blob);
    await cache.put(new URL(self.origin + path), response)
}


const getAreaNameFromThumbnailReq = (url: URL) => {
    const start = "/static/data/area-thumbnails/".length;

    return url.pathname.slice(start, -4)
}

const addAreaThumb = (areaUrlName: string, thumbnail: Blob) => addToCache( CACHE_THUMBS, `/static/data/area-thumbnails/${areaUrlName}.png`, thumbnail)
const getAreaThumbRes = async (req: Request) => {
    const areaName = getAreaNameFromThumbnailReq(new URL(req.url))

    // Thumbnails are broken for short area names
    if (areaName.length < 6) {
        return await fetch(`/static/data/area-thumbnails/3.png`); // TODO find a proper default thumbnail
    }

    const cache = await self.caches.open(CACHE_THUMBS);
    const match = await cache.match(req);
    if (match) return match;

    return await fetch(`/static/data/area-thumbnails/3.png`); // TODO find a proper default thumbnail
}

return {
    getOrSetFromCache,
    getCreationDef,
    getCreationDefRes,
    setCreationDef,
    getCreationSprite,
    setCreationSprite,
    getCreationSpriteRes,

    addAreaThumb,
    getAreaThumbRes,
}
}