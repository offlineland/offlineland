/// <reference lib="webworker" />




//  ██████   ██████  ██ ██      ███████ ██████  ██████  ██       █████  ████████ ███████ 
//  ██   ██ ██    ██ ██ ██      ██      ██   ██ ██   ██ ██      ██   ██    ██    ██      
//  ██████  ██    ██ ██ ██      █████   ██████  ██████  ██      ███████    ██    █████   
//  ██   ██ ██    ██ ██ ██      ██      ██   ██ ██      ██      ██   ██    ██    ██      
//  ██████   ██████  ██ ███████ ███████ ██   ██ ██      ███████ ██   ██    ██    ███████ 
// #region boilerplate



// #region libs
/*
Firefox does not handle ES import/export syntax in service workers (see https://bugzilla.mozilla.org/show_bug.cgi?id=1360870).
The only thing available is `importScripts`, which syncronously runs a separate script.
I could make classes in separate files and use them here, but then my editor would lose track of them and their types.
*/

importScripts("/_code/libs/path-to-regexp.js");
importScripts("/_code/libs/qs.js");
importScripts("/_code/libs/jszip.js");
importScripts("/_code/libs/zod.umd.js");
importScripts("/_code/libs/idb-keyval.umd.js");



// #endregion libs




// Wrap the entire code in a function to get proper type inference on `self`
const main = (
    /** @type { ServiceWorkerGlobalScope } */ self,
    /** @type { (path: string) => (path: string) => boolean } */ matchPath,
    /** @type { import('qs' )} */ Qs,
    /** @type { import('jszip' )} */ JSZip,
    /** @type { import('zod' )} */ Zod,
    /** @type { import('idb-keyval/dist/index.cjs' )} */ idbKeyval,
) => {

try {



// #region misc
const z = Zod;

const cloudfrontHosts = "d3t4ge0nw63pin d3sru0o8c0d5ho d39pmjr4vi5228 djaii3xne87ak d1qx0qjm5p9x4n d1ow0r77w7e182 d12j1ps7u12kjc dzc91kz5kvpo5 d3jldpr15f31k5 d2r3yza02m5b0q dxye1tpo9csvz"
    .split(" ").map(s => s + ".cloudfront.net")
const originUrl = new URL(self.origin)

const ringAreas = ["0", "1", "2", "3", "4", "5", "6", "7", "8"]

const bundledAreasFile = {
    //"test2": {
    //    areaId: "53ed27dfb3f6f9c3205157e1",
    //},
    "chronology": {
        areaId: "56ed2214c94d7b0e132538b9",
        tags: []
    },
    "oosforest": {
        areaId: "5963e0d370c6b17b13c75b26",
        tags: [ "exploration" ]
    },
    "oosjungle": {
        areaId: "5bc003b5051ec03628866ecb",
        tags: [ "exploration" ]
    },
    "hell": {
        areaId: "5b76e3f46c3ef97b26871968",
        tags: [ "exploration" ],
        subareas: {
            //"jungle spawn": ,
        }
    },
    "blancnoir": {
        areaId: "540f4a6fbcd7bbcf2e509c8d",
        tags: [ "puzzle" ],
        subareas: {
            "level one": "544c7e89f06c47f141f4bc96",
        }
    },
    "gemcastle": {
        areaId: "541b035c44aff03338610fca",
        tags: [ "parkour" ],
    },
    //"sandcastle": {
    //    areaId: "5522c6f01c963d1308f12e0a",
    //    subareas: {
    //        "the castle": "5523f96cab0f5a3e0c353aab",
    //    },
    //},
}
const getAreaList = async () => {
    // TODO get the file
    return Object.keys(bundledAreasFile)
}
/** @param {string} areaUrlName @returns {string} */
const getAreaIdForAreaName = (areaUrlName) => {
    // TODO: read from file
    const areaData = bundledAreasFile[areaUrlName]

    if (areaData) return areaData.areaId;
    else return generateObjectId();
}


/** * @param {string} clientId * @param {any} msg */
const sendWsMessageToClient = async (clientId, msg) => {
    const client = await self.clients.get(clientId)

    if (client) {
        client.postMessage(msg);
    }
}

/**
 * 
 * @template K, V
 * @param {Map<K, V>} map 
 * @param {(key: K) => V} ctor 
 * @returns {(key: K) => V}
 */
const makeGetOrCreate = (map, ctor) => {
    return (key) => {
        const value = map.get(key);
        if (value) return value;

        const newValue = ctor(key)
        map.set(key, newValue)
        return newValue;
    }
}

/**
 * 
 * @param {number} timestamp
 * @param {number} machineId
 * @param {number} processId
 * @param {number} counter
 * @returns {string}
 */
const generateObjectId_ = (timestamp, machineId, processId, counter) => {
  const hexTimestamp = Math.floor(timestamp / 1000).toString(16).padStart(8, '0');
  const hexMachineId = machineId.toString(16).padStart(6, '0');
  const hexProcessId = processId.toString(16).padStart(4, '0');
  const hexCounter = counter.toString(16).padStart(6, '0');

  return hexTimestamp + hexMachineId + hexProcessId + hexCounter;
}
let objIdCounter = 0;
const generateObjectId = () => generateObjectId_(Date.now(), 0, 0, objIdCounter++)






// #endregion misc

// #region creation

// thank you chatGPT
const decompressAscii = (compressedString) => {
    const indexToCharMap = {};
    let currentIndex = 256, previousChar = "", currentChar, decompressedString = "";

    // Initialize the map with ASCII characters
    for (let i = 0; i < 256; i++) {
        indexToCharMap[i] = String.fromCharCode(i);
    }

    // Convert the input JSON string to an array
    const indexArray = JSON.parse(compressedString);

    // Iterate through the array to build the decompressed string
    for (let i = 0; i < indexArray.length; i++) {
        const index = indexArray[i];

        if (indexToCharMap[index]) {
            // If the index exists in the map, retrieve the character sequence
            currentChar = indexToCharMap[index];
        } else {
            // If the index does not exist, it must be the current sequence + its first character
            currentChar = previousChar + previousChar.charAt(0);
        }

        decompressedString += currentChar;

        // Add new sequences to the map
        if (previousChar !== "") {
            indexToCharMap[currentIndex++] = previousChar + currentChar.charAt(0);
        }

        previousChar = currentChar;
    }

    return decompressedString;
}

const tileWidthDefault = 19;
const tileHeightDefault = 19;

/**
 * @param {{r: number, g: number, b: number, alpha: number}[]} colors 
 * @param {number[][][]} cells - a 3D array for a x-y grid of palette indexes, wrapped into cells `cells[0][x][y]`
 */
const generateCreationSpriteFromPixels = async (colors, cells) => {
    // TODO: is this the right way to do it? (Taking the length of every cell)
    const width = cells.reduce((width, currentCell) => width + currentCell.length, 0)
    const height = cells[0][0].length

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const fillStyles = colors.map(({r, g, b, alpha}) => `rgba(${[r, g, b, alpha].join(',')})`)

    let currCellOffset = 0;
    for (const cellIndex in cells) {
        const cell = cells[cellIndex];

        for (const x in cell) {
            const row = cell[x];

            for (const y in row) {
                const paletteIndex = cell[x][y];
                ctx.fillStyle = fillStyles[paletteIndex];

                const spriteX = currCellOffset + Number(x);
                const spriteY = Number(y);
                ctx.fillRect(spriteX, spriteY, 1, 1); // Fill in one pixel at the specified position

            }
        }

        currCellOffset += cell.length;
    }

    return await canvas.convertToBlob();
}

const saveCreation = async (itemData) => {
    console.log("client tried to create something!", itemData)

    const pixels = JSON.parse(decompressAscii(itemData.pixels));
    const spriteBlob = await generateCreationSpriteFromPixels(itemData.colors, pixels);

    // Magic numbers to get the id to end in "19191919"
    const itemId = generateObjectId_(Date.now(), 0, 25, 1644825)

    const itemDef = {
        id: itemId,
        name: itemData.name,
        base: itemData.type,
        creator: defaultPlayer.rid,
        prop: itemData.prop,
        // TODO: anything else?
    }

    await cache_setCreationSprite(itemId, spriteBlob);
    await cache_setCreationDef(itemId, JSON.stringify(itemDef));
    await inventory_addCreated(defaultPlayer.rid, itemId);

    return {
        itemId: itemId,
    }
}

// #endregion creation

// #region cache
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


// #region creations_cache
/** @param {string} creationId @param {Blob} blob */
const cache_setCreationSprite = async (creationId, blob) => {
    const cache = await self.caches.open("CREATION-SPRITES-V1");

    const url = self.origin + "/sprites/" + creationId;
    await cache.put(url, new Response(blob, { headers: { 'Content-Type': 'image/png' } }))
}

/** @param {string} creationId */
const cache_getCreationSprite = async (creationId) => {
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
    const fromCache = await cache_getCreationSprite(creationId)

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
                cache_setCreationSprite(creationId, await res.clone().blob())
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
const cache_setCreationDef = async (creationId, jsonStr) => {
    const cache = await self.caches.open("CREATION-DEFS-V1");

    const url = self.origin + "/_mlspinternal_/defs/" + creationId;
    await cache.put(url, new Response(jsonStr, { headers: { 'Content-Type': 'application/json' } }))
}

/** @param {string} creationId */
const cache_getCreationDef = async (creationId) => {
    const cache = await self.caches.open("CREATION-DEFS-V1");

    const url = self.origin + "/_mlspinternal_/defs/" + creationId;
    const cacheMatch = await cache.match(url)

    return cacheMatch;
}

const getCreationDefRes = async (creationId) => {
    const fromCache = await cache_getCreationDef(creationId)

    if (fromCache) {
        return fromCache;
    }

    console.warn("creation def not in cache!", creationId)



    if (FETCH_MISSING_DEFS_FROM_LIVE_CDN) {
        const url = originUrl.protocol + "//" + CLOUDFRONT_ROOT_ITEMDEFS + "/" + creationId;

        try {
            const res = await fetch(url);
            if (res.ok) {
                cache_setCreationDef(creationId, await res.clone().text())
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

// #endregion creations_cache

// #region areazips_cache
// #endregion areazips_cache




// #region WS
const msgTypes = {
    "PLAYER_SPAWN": "qv",
    "SIM_PLAYER_SPAWN": "po", //only received, unhandled
    "PLAYER_DATA": "uq",
    "PLAYER_LIST": "qq",
    "OWN_INFO": "on",
    "STATE_UPDATE_NON_BINARY": "ej",
    "PLAYER_DEATH": "ud",
    "PLAYER_DESPAWN": "lm",
    "MAP_EDIT": "bd",
    "MAP_EDIT_REJECTED": "th",
    "REQUEST_PLAYER_LIST": "eh", //sent 500ms after loading a new sector
    "REQUEST_PLAYER_DATA": "zd",
    "REQUEST_SYNCBLOCK_HOT": "sd", //sent on initialization complete, ws re-open, window focus and immediately after entering a new sector. Server replies with SYNC_BLOCKs
    "SET_SPAWNPOINT": "jq",
    "RESET_SPAWNPOINT": "xu",
    "DONTKNOW_ATT": "ok", //add or remove attachment
    "CHANGE_NAME": "pw",
    "TELEPORT": "lr",
    "PORTAL": "lc",
    "PORTALRING": "fc",
    "SYNC_BLOCK": "iy", //only received, used to update status for item throwers, gatherables, movers and crumblings (dunno if more) {loc: {}, pos, vel, sta, evt?, } || { loc: { x: 34, y: 13 }, sta: 0 } only received, no rid, broadcast
    "TRIGGER": "zr", //only sent, received by others as SYNC_BLOCK
    "SPEECH": "en",
    "SPARKLE_LINE": "it",
    "PLAYER_VOTE_UP": "mo", //only sent {id}
    "PLAYER_VOTE_DOWN": "ss",
    "PLAYER_ADD_FLAG": "zo",
    "PLAYER_REMOVE_FLAG": "si",
    "PEACEPARKER": "dy", //hmm
    "UNUSED_MAINTENANCE": "ot", //only received, unhandled
    "WSS_CHANGE": "ba", //only received, WSS Change CMD: {h, p}, client reopens a connection to h(ost):p(ort)
    "RELOAD": "rl",
    "RANKUPDATE": "rk",
    "HEARTBEAT": "md",
    "UNUSED1": "qj", //unhandled and unsent
    "CHANGE_ATTACHMENT": "us",
    "THROW_ATTACHMENT": "mw",
    "PASTE": "zc",
    "INSTRUMENT_NOTE": "xf",
    "WELCOME_INVITATION": "cf",
    "HOLDABLE_INTERACTION": "ef",
    "MOTION": "ff",
    "EQUIPMENT_ACTION": "ub",
    "HOLDER_VIEWED": "qw",
    "INTERACTING_ACTIVITY": "nv",
    "MODIFY_POSSESSION_SET": "ep",
    "LATENCY_CHECK": "fd",
    "HELD_OFFSET": "wf", //they both share the same key?
    //"ECHO": "wf", //unhandled and unsent
    "PING_FRIEND": "lh",
    "ADDED_LINES": "rj",
    "CLEAR_LINES": "cl",
    "MIFT_ALERT": "ua",
    "AREA_BAN": "dm",
    "EDITOR_RIGHTS_CHANGE": "ux",
    "BOOST_STARTED": "zn",
    "BOOST_RESPONSE": "ex",
    "BOOST_REJECTED": "rt",
    "SNAPSHOT_TAKEN": "bn",
    "AREA_SETTINGS_EDITED": "gh",
    "MOVER_BODY_HEALTH_CHANGE": "le",
    "CLOCK_SYNC_PING": "pe",
    "TRANSPORT_REJECTED": "oj",
    "MULTITHING_ACTIVITY": "od",
    "WSLIMIT": "ey",
    "PAINTER_ACTIVITY": "pa",
}

const msgTypes_rev = reverseObject(msgTypes)
function reverseObject(obj) {
    let reversed = {};
    for (let key in obj) {
        reversed[obj[key]] = key;
    }
    return reversed;
}


const mappingClientToServer = {"A" : '"vel":{"x":0,"y":0},"acl":{"x":0,"y":0},"ani":"idle","flp":false,"g":',"B" : '"vel":{"x":0,"y":0},"acl":{"x":0,"y":0},"ani":"idle","flp":true,"g":',"J" : '"m":"st","data":{"pos":{"x":',"C" : '"m":"sh","data":{"key":"_c',"D" : '","rotation":0,"flip":0},"',"&" : '"m":"rq","data":null}',"E" : '"m":"rm","data":null}',"F" : ',"def":null,"rId":"',"G" : '"vel":{"x":0,"y":0}',"H" : '"acl":{"x":0,"y":0}',"K" : '"m":"me","data":{',"~" : '"ani":"swimming',"L" : ',"def":{"tid":"',"M" : '"ani":"idle"',"N" : '"ani":"jump"',"O" : '"ani":"fall"',"P" : '"ani":"afk"',"Q" : '"ani":"run"',"R" : '"flp":false',"W" : '"pos":{"x":',"X" : '"acl":{"x":',"V" : '"vel":{"x":',"S" : '"flp":true',"T" : '"m":"hb"}',"U" : ',"data":{',"!" : '"act":',"@" : '"g":',"Y" : '"x":',"Z" : '"y":',"?" : '"}}',"%" : "}}","^" : "},","*" : '",',"=" : "1",";" : "2","<" : "3",">" : "4","(" : "0",")" : "5"};
const mappingServerToClient = {"A" : '"vel":{"x":0,"y":0},"acl":{"x":0,"y":0},',"B" : '"m":"mu","data":{"loc":{"x":',"C" : '"m":"st","data":{"rid":"',"/" : '"m":"sh","data":{"rid":"',"D" : '"m":"np","data":{',"E" : '"flp":false,"g":',"F" : '"flp":true,"g":',"G" : '"ani":"idle"',"H" : '"ani":"jump"',"J" : '"ani":"fall"',"O" : '"flp":false,',"K" : '"ani":"afk"',"L" : '"pos":{"x":',"M" : '"vel":{"x":',"N" : '"acl":{"x":',"P" : '"ani":"run"',"Q" : '"flp":true,',"R" : '"map":{"p":',"@" : '","data":{',"T" : '},"sta":0',"U" : '},"sta":1',"?" : '"key":"_',"V" : '"ach":"',"W" : '"rid":"',"X" : '"aid":"',"Y" : '"snm":"',"S" : '"wid":',"Z" : '"r":',"!" : '"x":',"#" : '"y":',">" : '"}}',"%" : "}}","^" : "},","*" : '",',"=" : "1",";" : "2","<" : "3","(" : "0",")" : "5"};

/**
 * 
 * @param {Record<string, string>} mapping 
 * @param {string} str 
 * @return {unknown}
 */
const expand = (mapping, str) => {
    if (str[0] === "{") {
        return JSON.parse(str);
    }
    else {
        let expanded = str;

        for (const short in mapping) {
            const long = mapping[short];
            expanded = replaceAll(expanded, short, long);
        }

        console.log("expanded: {" + expanded)
        return JSON.parse("{" + expanded);
    }
}

/**
 * 
 * @param {Record<string, string>} mapping 
 * @param {any} data 
 * @returns { string }
 */
const minify = (mapping, data) => {
    const str = JSON.stringify(data);

    const strHasCharFromMapping = Object.keys(mapping).some(short => str.includes(short))

    if (strHasCharFromMapping) {
        return str;
    }
 
    if (str[0] === "{") {
        let minified = str.slice(1);

        for (const short in mapping) {
            const long = mapping[short];
            minified = replaceAll(minified, long, short);
        }

        return minified;
    }
    else {
        console.log(`WARNING: JSON ws send string did not start with '{'! ${str}`)
        return str;
    }
} 

const toServer = (data) => minify(mappingClientToServer, data)
const fromServer = (str) => expand(mappingServerToClient, str)

const toClient = (data) => minify(mappingServerToClient, data)
const fromClient = (str) => expand(mappingClientToServer, str)

function replaceAll(str, find, replace) {
    return str.toString().replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function escapeRegExp(str) {
    return str.toString().replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
// #endregion WS



// #region basicrouterboilerplate

/**
 * @param {string} dataUrl
 * @returns {Blob}
 */
const dataURLtoBlob = (dataUrl) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
}

/**
 * @param {Request} request 
 * @returns {Promise<any>}
 */
const readRequestBody = async (request) => {
    const text = await request.text();
    const data = Qs.parse(text);

    return data;
}




const groundId = "50372a99f5d33dc56f000001"
const SpriteGroundDataURI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATBAMAAACAfiv/AAAAD1BMVEVaKx9+PSyjTjjJdmHzmY8fDNQBAAAAXklEQVQI13XP0Q2AIAxF0aYTIG7QLmD63AD2n8m+ojF+eL8OTQNBtqcmOyYbkZyrQYKdJMIyR5PuiTzlbre74ponww0pLgCGgBe9blvTfwYpQR6aVGFKmlb2efj9xQWlGxm7CYadIwAAAABJRU5ErkJggg=="
const SpriteGroundBlob = dataURLtoBlob(SpriteGroundDataURI);
const GET = "GET";
const POST = "POST";






// This is fairly naive but good enough
const makeRouter = () => {
    const routes = new Set();


    /**
     * @typedef {Object} RouteHandlersBagOfTricks
     * @property {any} params - Parameters for the path. If you're adventurous, set to unknown here and define schemas for everything
     * @property {FetchEvent} event
     * @property {Request} request
     * @property {string} clientId
     * @property {(json: any) => Response} json
     */

    /**
     * 
     * @param {"GET" | "POST"} method 
     * @param {string} matcher 
     * @param {(ctx: RouteHandlersBagOfTricks) => Response | Promise<Response>} handler 
     * @returns 
     */
    const route = (method, matcher, handler) => routes.add({ method, matcher: matchPath(matcher), handler });
    /**
     * @param {string} matcher 
     * @param {(ctx: RouteHandlersBagOfTricks) => Response | Promise<Response>} handler 
     */
    const get = (matcher, handler) => route(GET, matcher, handler);
    /**
     * @param {string} matcher 
     * @param {(ctx: RouteHandlersBagOfTricks) => Response | Promise<Response>} handler 
     */
    const post = (matcher, handler) => route(POST, matcher, handler);

    /**
     * 
     * @param {"GET" | "POST"} method 
     * @param {string} pathname 
     * @param {FetchEvent} event
     * @returns 
     */
    const matchRoute = async (method, pathname, event) => {
        for (const route of routes) {
            if (route.method !== method) continue;

            const matchRes = route.matcher(pathname);
            if (matchRes === false) continue;


            return await route.handler({
                params: matchRes.params,
                event: event,
                request: event.request,
                clientId: event.clientId,
                json: (data) => Response.json( data ),
            });
        }

        // If this happens, either it's because of an unhandled method (the client only sends GETs and POSTs though), or something is very wrong
        throw new Error("matchRoute: No match found!")
    }

    return { route, get, post, matchRoute }
}


// #endregion basicrouterboilerplate


// #region zodschemas
// #region ws
// TODO: put this in an object?
const ws_trigger = z.object({
    loc: z.object({
        x: z.number(),
        y: z.number(),
    }),
    trd: z.number(),
})
// TODO: why do they appear as optional even with .required?
const ws_set_spawnpoint = Zod.object({
    x: Zod.number(),
    y: Zod.number(),
}).required()
const ws_change_attachment = Zod.object({
    ats: Zod.string(),
    ati: Zod.string().nullable(),
}).required()
// #endregion ws


// #region http
const schema_aps_s = Zod.object({
    areaGroupId: Zod.string(),
    ids: Zod.string().array().optional(),
})
// #endregion http
// #endregion zodschemas


// #region typedefs

/**
 * @typedef {Object} MinimapPlacenameData
 * @property {number} x
 * @property {number} y
 * @property {string} n
 */

/**
 * @typedef {Object} MinimapTileData
 * @property {number} x
 * @property {number} y
 * @property {string | null} id
 * @property {MinimapPlacenameData[]} pn
 */

/**
 * @typedef {Object} PositionPixels
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Attachments
 * @property { string | null } b - body
 * @property { string | null } w - wearable
 * @property { string | null } h - holdable
 * @property { string | null } m - mount
 * @property { string | null } br - brain
 */


// #endregion typedefs



// #endregion boilerplate











//    SSSSSSSSSSSSSSS     tttt                                  tttt                             
//  SS:::::::::::::::S ttt:::t                               ttt:::t                             
// S:::::SSSSSS::::::S t:::::t                               t:::::t                             
// S:::::S     SSSSSSS t:::::t                               t:::::t                             
// S:::::S       ttttttt:::::ttttttt     aaaaaaaaaaaaa ttttttt:::::ttttttt       eeeeeeeeeeee    
// S:::::S       t:::::::::::::::::t     a::::::::::::at:::::::::::::::::t     ee::::::::::::ee  
//  S::::SSSS    t:::::::::::::::::t     aaaaaaaaa:::::t:::::::::::::::::t    e::::::eeeee:::::ee
//   SS::::::SSSStttttt:::::::tttttt              a::::tttttt:::::::tttttt   e::::::e     e:::::e
//     SSS::::::::SS   t:::::t             aaaaaaa:::::a     t:::::t         e:::::::eeeee::::::e
//        SSSSSS::::S  t:::::t           aa::::::::::::a     t:::::t         e:::::::::::::::::e 
//             S:::::S t:::::t          a::::aaaa::::::a     t:::::t         e::::::eeeeeeeeeee  
//             S:::::S t:::::t    ttttta::::a    a:::::a     t:::::t    ttttte:::::::e           
// SSSSSSS     S:::::S t::::::tttt:::::a::::a    a:::::a     t::::::tttt:::::e::::::::e          
// S::::::SSSSSS:::::S tt::::::::::::::a:::::aaaa::::::a     tt::::::::::::::te::::::::eeeeeeee  
// S:::::::::::::::SS    tt:::::::::::tta::::::::::aa:::a      tt:::::::::::tt ee:::::::::::::e  
//  SSSSSSSSSSSSSSS        ttttttttttt   aaaaaaaaaa  aaaa        ttttttttttt     eeeeeeeeeeeeee  
// #region State


// #region Minimap
const getPixelsFor = async (/** @type { Blob } */ blob) => {
    const imageBitmap = await self.createImageBitmap(blob)

    const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const context = offscreenCanvas.getContext('2d');
    context.drawImage(imageBitmap, 0, 0);
    const imageData = context.getImageData(0, 0, imageBitmap.width, imageBitmap.height);

    return imageData.data;
}

/** @param { Uint8ClampedArray } pixels */
const getMostUsedColor = (pixels) => {
  const colorCount = new Map();
  let maxCount = 0;
  let mostUsedColor = null;

  for (let i = 0; i < pixels.length; i += 4) {
    // Get the color as a string in the format "r,g,b,a"
    const color = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`;

    // Update the count for this color
    const count = (colorCount.get(color) || 0) + 1;
    colorCount.set(color, count);

    // Update the most used color if this color has a higher count
    if (count > maxCount) {
      maxCount = count;
      mostUsedColor = color;
    }
  }

  // Return the most used color as an array [r, g, b]
  return mostUsedColor ? mostUsedColor.split(',').map(Number) : null;

}

const getMapPixelColorFor = async (creationId) => {
    console.log("getMapPixelColorFor", creationId)
    const fromDb = await idbKeyval.get(`pixelColor-c${creationId}`);
    if (fromDb) return fromDb;


    const creationRes = await cache_getCreationSprite(creationId)

    if (!creationRes) {
        console.error("getMapColorFor(): creation does not exist in cache!", creationId)
        // Note: this means that it will generate *and cache* the minimap tile with this red pixel!
        // This is probably alright, since the map is just there to get around
        return [255, 0, 0, 1];
    }

    const blob = await creationRes.blob();
    const pixels = await getPixelsFor(blob);
    // TODO: this isn't exactly how ML picks it's colors, but we don't have access to creation palette here.
    const mostUsedColor = getMostUsedColor(pixels)

    await idbKeyval.set(`pixelColor-c${creationId}`, mostUsedColor);

    return mostUsedColor;
}

/** @param {[number, number, [ number, number, number, number]][]} xyc */
const generateMinimapTile = async (xyc) => {
    const size = 32;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');

    xyc.forEach(item => {
        const [x, y, color] = item;
        ctx.fillStyle = `rgba(${color.join(',')})`;
        ctx.fillRect(x, y, 1, 1); // Fill in one pixel at the specified position
    });

    return await canvas.convertToBlob();
}

// #endregion Minimap

// #region inventory_collect
// Note: Loading one big array to/from indexedDB will probably trash a lot if people start collecting everything they see. Not really a design goal though

/**
 * @param {string} playerId
 * @param {string} itemId
 * @param {number} atIndex
 */
const inventory_collect = async (playerId, itemId, atIndex) => {
    let alreadyExisted = false;
    await idbKeyval.update(`playerinventory-collected-p${playerId}`, (/** @type { string[] | undefined } */ val) => {
        const inventory = (val || []);

        const indexIfAlreadyCollected = inventory.indexOf(itemId)
        if (indexIfAlreadyCollected > -1) {
            alreadyExisted = true;
            inventory.splice(indexIfAlreadyCollected, 1)
        }

        inventory.splice(atIndex, 0, itemId)

        return inventory;
    })

    return { alreadyExisted }
}

/**
 * @param {string} playerId
 * @returns { Promise<string[]> }
 */
const inventory_getCollected = async (playerId) => {
    return await idbKeyval.get(`playerinventory-collected-p${playerId}`) || [];
}

/**
 * @param {string} playerId
 * @param {number} start
 * @param {number} end
 */
const inventory_getCollectedPage = async (playerId, start, end) => {
    const fullInventory = await inventory_getCollected(playerId);
    return {
        items: fullInventory.slice(start, end),
        itemCount: fullInventory.length
    };
}

/**
 * @param {string} playerId
 * @param {string} itemId
 */
const inventory_deleteCollected = async (playerId, itemId) => {
    await idbKeyval.update(`playerinventory-collected-p${playerId}`, (/** @type { string[] | undefined } */ val) => {
        const inventory = (val || []);

        const indexIfAlreadyCollected = inventory.indexOf(itemId)
        if (indexIfAlreadyCollected > -1) {
            inventory.splice(indexIfAlreadyCollected, 1)
        }

        return inventory;
    })
}
// #endregion inventory_collect

// #region inventory_creations
/**
 * @param {string} playerId
 * @param {string} itemId
 */
const inventory_addCreated = async (playerId, itemId) => {
    await idbKeyval.update(`playerinventory-created-p${playerId}`, (/** @type { string[] | undefined } */ val) => {
        const inventory = (val || []);
        inventory.unshift(itemId)
        return inventory;
    })
}

/**
 * @param {string} playerId
 * @returns { Promise<string[]> }
 */
const inventory_getCreatedAll = async (playerId) => {
    return await idbKeyval.get(`playerinventory-created-p${playerId}`) || [];
}

/**
 * @param {string} playerId
 * @param {number} start
 * @param {number} end
 */
const inventory_getCreatedPage = async (playerId, start, end) => {
    const fullInventory = await inventory_getCreatedAll(playerId);
    return {
        items: fullInventory.slice(start, end),
        itemCount: fullInventory.length
    };
}

/**
 * @param {string} playerId
 * @param {string} itemId
 */
const inventory_deleteCreated = async (playerId, itemId) => {
    await idbKeyval.update(`playerinventory-created-p${playerId}`, (/** @type { string[] | undefined } */ val) => {
        const inventory = (val || []);

        const indexIfAlreadyCollected = inventory.indexOf(itemId)
        if (indexIfAlreadyCollected > -1) {
            inventory.splice(indexIfAlreadyCollected, 1)
        }

        return inventory;
    })
}
// #endregion inventory_creations





//#region Player
class Player {
    constructor({ name, rid, age, isFullAccount, leftMinfinityAmount, isBacker, boostsLeft, hasMinfinity }) {
        this.name = name || "explorer 123";
        this.rid = rid || "000000000000000000000000";
        this.age = age || 19191919;
        this.isFullAccount = isFullAccount || true;
        this.leftMinfinityAmount = leftMinfinityAmount || 19191919;
        this.isBacker = isBacker || true;
        this.boostsLeft = boostsLeft || 19191919;
        this.hasMinfinity = hasMinfinity || true;

        idbKeyval.update(`attachments-p${this.rid}`, (/** @type {Attachments | undefined} */ value) => {
            if (value) return value
            else return {
                // TODO: pick a random base body
                "b":"00000000000000000000074f",
                "w":null,
                "m":null,
                "h":null,
                "br":null
            }
        })
    }

    getInitData_http() {
        return {
            "rid": this.rid,
            "age": this.age,
            "ifa": this.isFullAccount,
            "lma": this.leftMinfinityAmount,
            "isb": this.isBacker,
            "bbl": this.boostsLeft,
            "hmf": this.hasMinfinity,
        }
    }

    async setAttachment(slot, id) {
        await idbKeyval.update(`attachments-p${this.rid}`, (value) => {
            const atts = (value || {});
            atts[slot] = id;
            return atts;
        })
    }

    async getAttachments() {
        return await idbKeyval.get(`attachments-p${this.rid}`)
    }

    async getInitData_ws() {
        return {
            "rid": this.rid,
            "snm": this.name,
            "aid":"80-1-1-f",
            "att": await this.getAttachments(),
            "r":10,
            "ani":"idle",
            "flp":false,
            "wof":{
                "w":{"x":0,"y":0},"h":{"x":0,"y":0},"wp":{"x":0,"y":0}
            },
            "shs":{}
        }
    }
}
//#endregion Player





//#region AreaManager
// TODO: store changes locally
// TODO: Networking?
class LocalAreaManager {
    clients = new Set();

    constructor(wssUrl, areaId) {
        this.wssUrl = wssUrl;
        this.areaId = areaId;

        this.isRingArea = areaId === "" || ringAreas.includes(areaId)
    }

    static async make(wssUrl, areaId) {
        return new LocalAreaManager(wssUrl, areaId)
    }

    async getInitData(player, urlName) {
        const playerData = player.getInitData_http();
        const defaultData = {
            "wsh": this.wssUrl,
            "wsp": 80,

            "ieh": true, // isEditorHere
            "ish": true, // isSuperHere

            "sha": false,  // ShowAdvertisment, unused
            "noi": true,  // no in-app purchases, steam-related
            "fla": false, // flag warning
            "ise": false, // ? Related to area being full
        }

        if (this.isRingArea) {
            return {
                ...playerData,
                ...defaultData,

                "sub": false, // isSubarea
                "acl": { "x": 15, "y": 15 }, // areaCenterLocation
            }
        }
        else {
            return {
                ...playerData,
                ...defaultData,

                "sub": false, // isSubarea
                "acl": { "x": 15, "y": 15 }, // areaCenterLocation

                aid: this.areaId,
                gid: this.areaId,
                arn: urlName,
                aun: urlName,
                agn: urlName,
                ard: "191919", // Description

                // area drift
                adr: { angle: 0, speed: 0 },
                // AreaProtection
                apr: "INDIVIDUALS",
                // AreaPossessions
                aps: { ids: null, values: null }, 

                axx: false, // AreaClosed
                aul: false, // AreaUnlisted
                spe: false, // SinglePlayerExperience
                ece: false, // Explorer Chat enabled if Editor is around
                mpv: 191919
            }
        }
    }

    // TODO
    getDataForSector(x, y) {
        return {
            "iix": [ "50372a99f5d33dc56f000001" ],
            "ps": [
                [ 15, 17, 0, 0, 0, 0 ],
                [ 14, 17, 0, 0, 0, 0 ],
                [ 16, 17, 0, 0, 0, 0 ],
                [ 13, 17, 0, 0, 0, 0 ],
                [ 17, 17, 0, 0, 0, 0 ]
            ],
            "v": 5,
            "x": x,
            "y": y,
            "i": {
                "b": [ "SOLID" ],
                "p": [],
                "n": [ "ground" ],
                "dr": [ null ]
            }
        }
    }

    async onWsConnection(client) {
        console.log("received WS connection!", { client })
        const player = getPlayerForClient(client.id);

        console.log("sending WS_OPEN message...")
        client.postMessage({ m: "WS_OPEN", data: { areaId: this.areaId } });

        console.log("sending own info message...")
        const initDataMsg = toClient({
            "m": msgTypes.OWN_INFO,
            "data":{
                ...await player.getInitData_ws(),

                "neo":true, // ?
                "map":{ "p":0,"a": this.areaId },
                "ach":"[0,4,10,11,12,8,39,5,35,9]",
                "ieh":true,
                "ifa":true,
                "smi":"18329",
                "ups":5,
            }
        })
        client.postMessage({ m: "WS_MSG", data: initDataMsg });
    }

    onWsMessage(client, msg) {
        if (typeof msg === "string")
            // TODO actually handle messages
            console.log("onWsMessage()", fromClient(msg))
        else {
            // TODO read binary messages
            console.log("onWsMessage() binary", msg)
        }
    }
}


// Possessions (and numbers) are set to the AreaGroupId, so this makes it easier to set/retrieve
class AreaPossessionsManager {
    constructor() {
    }

    /** @param {string} groupAreaId @param {string[] | null} ids */
    async setPossessions(groupAreaId, ids) {
        await idbKeyval.set(`area-possessions-${groupAreaId}`, ids)
    }

    /** @param {string} areaGroupId @returns {Promise<string[] | null>} data */
    async getPossessions(areaGroupId) {
        return await idbKeyval.get(`area-possessions-${areaGroupId}`)
    }
}


class ArchivedAreaManager {
    clients = new Set();

    /**
     * 
     * @param {string} wssUrl
     * @param {string} areaId
     * @param {*} data 
     * @param {*} zip 
     * @param {AreaPossessionsManager} possessionsMgr
     */
    constructor(wssUrl, areaId, data, zip, possessionsMgr) {
        this.zip = zip;
        this.wssUrl = wssUrl;
        this.areaId = areaId;
        this.possessionsMgr = possessionsMgr;

        this.isRingArea = areaId === "" || ringAreas.includes(areaId)

        this.isSubarea = data.sub;
        this.centerLocation = data.acl;
        this.areaId = data.aid;
        this.areaGroupId = data.gid;
        this.areaRealName = data.arn;
        this.areaGroupName = data.agn;
        this.areaUrlName = data.aun;
        this.description = data.ard;
        this.globalInteractingId = data.iid;
        this.drift = data.adr;
        this.protection = data.apr;
        this.isLocked = data.axx;
        this.isUnlisted = data.aul;
        this.isSinglePlayerExperience = data.spe;
        this.explorerChatAllowed = data.ece;
        this.mpv = data.mpv;
    }

    /**
     * 
     * @param {string} wssUrl
     * @param {string} areaId
     * @param {AreaPossessionsManager} possessionsMgr
     * @returns 
     */
    static async make(wssUrl, areaId, possessionsMgr) {
        // TODO: fetch data from storage
        // TODO: cache
        const res = await fetch(`/static/data/v2/${areaId}.zip`)
        // TODO handle errors?
        console.log("zip res", res, res.ok, res.status)

        const blob = await res.blob()

        console.log("reading zip")
        const zip = await JSZip.loadAsync(blob)
        console.log("reading zip ok", zip)

        console.log("reading settings file")
        const data = JSON.parse(await zip.file("area_settings.json").async("string"))
        console.log("reading settings file ok", { areaId, data, zip })

        zip.folder("creations/").forEach((path, file) => {
            const filenameWithoutExtension = path.slice(0, path.lastIndexOf("."))
            if (filenameWithoutExtension.length !== 24) {
                console.warn("got a file that does not seem to be a creationId!", path, file)
                return;
            }

            // TODO: do this when "downloading" the area instead
            // TODO: check if not already in cache
            if (path.endsWith(".png")) {
                console.log("adding", filenameWithoutExtension, "to cache (sprite)")
                file.async("blob").then(blob => cache_setCreationSprite(filenameWithoutExtension, blob))
            }
            else if (path.endsWith(".json")) {
                console.log("adding", filenameWithoutExtension, "to cache (def)")
                file.async("text").then(text => cache_setCreationDef(filenameWithoutExtension, text))
            }
        })


        return new ArchivedAreaManager(wssUrl, areaId, data, zip, possessionsMgr)
    }

    /**
     * 
     * @param {Player} player
     * @returns 
     */
    async getInitData(player) {
        const playerData = player.getInitData_http();

        const defaultData = {
            "wsh": this.wssUrl,
            "wsp": 80,

            "ieh": true, // isEditorHere
            "ish": true, // isSuperHere

            "sha": false,  // ShowAdvertisment, unused
            "noi": true,  // no in-app purchases, steam-related
            "fla": false, // flag warning
            "ise": false, // ? Related to area being full
        }

        if (this.isRingArea) {
            return {
                ...playerData,
                ...defaultData,

                "sub": false, // isSubarea
                "acl": this.centerLocation,
            }
        }
        else {
            return {
                ...playerData,
                ...defaultData,

                sub: this.isSubarea,
                acl: this.centerLocation,

                aid: this.areaId,
                gid: this.areaGroupId,
                arn: this.areaRealName,
                aun: this.areaUrlName,
                agn: this.areaGroupName,
                ard: this.description,

                adr: this.drift,
                apr: this.protection,
                iid: this.globalInteractingId,
                aps: {
                    ids: await this.possessionsMgr.getPossessions(this.areaGroupId),
                    values: null //TODO
                },

                axx: this.isLocked,
                aul: this.isUnlisted,
                spe: this.isSinglePlayerExperience,
                ece: this.explorerChatAllowed,
                mpv: this.mpv,
            }
        }
    }

    async getDataForSector(x, y) {
        console.log(`loadingsectordata ${x}:${y}: reading zip`)
        const sectorFile = this.zip.file(`sectors/sector${x}T${y}.json`)
        console.log(`loadingsectordata ${x}:${y}: reading zip ok`, sectorFile)

        if (sectorFile === null) return undefined;

        console.log(`loadingsectordata ${x}:${y}: parsing file`)
        const data = JSON.parse(await sectorFile.async("string"))
        console.log(`loadingsectordata ${x}:${y}: parsing file ok`, data)

        return data;
    }

    getSpawnpoint() {
        if (this.isRingArea) {
            // TODO some ring areas have a specific spawnpoint
            return { x: 288, y: 288 }
        }
        else {
            return { x: 288, y: 288 }
        }
    }

    /** @returns { Promise<PositionPixels> } */
    async getPlayerPosition() {
        const storedPos = await idbKeyval.get(`area-position-${this.areaId}`)
        if (storedPos) return storedPos;

        return this.getSpawnpoint()
    }
    /** @param {PositionPixels} pos @returns { Promise<void> } */
    async setPlayerPosition(pos) {
        await idbKeyval.set(`area-position-${this.areaId}`, pos)
    }

    async getMinimapData_Tile(x, y) {
        console.log("getMinimapData_Tile", x, y, this.areaId)
        const key = `area-minimaptile-${this.areaId}_${x}_${y}`;
        const fromDb = await idbKeyval.get(key)
        if (fromDb) return fromDb;


        console.log("getMinimapData_Tile", x, y, "getting sector")
        const sectorFile = this.zip.file(`sectors/sector${x}T${y}.json`)

        if (sectorFile === null) {
            const data = { x: x, y: y, id: null, pn: [] }
            await idbKeyval.set(key, data);
            return data;
        }


        console.log("getMinimapData_Tile", x, y, "opening cache")
        const maptilesCache = await caches.open("MAP_TILES_V1");

        console.log("getMinimapData_Tile", x, y, "reading sector")
        const sector = JSON.parse(await sectorFile.async("string"))
        console.log("getMinimapData_Tile", x, y, "reading sector ok", sector)

        const colors = await Promise.all(sector.iix.map(id => getMapPixelColorFor(id)))
        console.log("generating minimapTileBlob...")
        const minimapTileBlob = await generateMinimapTile(sector.ps.map(([x, y, i]) => [x, y, colors[i]]))

        // Nobody said they HAD to be mongoIds...
        const tileId = `maptilefakeid-${this.areaId}-${x}-${y}`
        const url = new URL(self.origin + "/sct/" + tileId + ".png")
        console.log("storing to cache as", url.toString())
        await maptilesCache.put(url, new Response(minimapTileBlob, { headers: { 'Content-Type': 'image/png' } }))


        // TODO: find place names!
        const placeNames = [];
        const data = { x: x, y: y, id: tileId, pn: placeNames }
        console.log("storing to db...")
        await idbKeyval.set(key, data);
        return data;
    }

    async getMinimapData_Region(x1, y1, x2, y2) {
        const coords = [];
        const keys = [];

        for (let x = x1; x <= x2; x++) {
            for (let y = y1; y <= y2; y++) {
                coords.push([x, y])
                keys.push(`area-minimaptile-${this.areaId}_${x}_${y}`);
            }
        }


        const fromDb = await idbKeyval.getMany(keys)
        const tiles = Promise.all(fromDb.map((tile, i) => {
            if (tile) return tile;
            else {
                const [ x, y ] = coords[i];
                return this.getMinimapData_Tile(x, y);
            }
        }))

        return tiles;
    }

    async onWsConnection(client) {
        console.log("received WS connection!", { client })
        const player = getPlayerForClient(client.id);

        console.log("sending WS_OPEN message...")
        client.postMessage({ m: "WS_OPEN", data: { areaId: this.areaId } });

        console.log("sending own info message...")
        const initDataMsg = toClient({
            "m": msgTypes.OWN_INFO,
            "data":{
                ...await player.getInitData_ws(),
                pos: await this.getPlayerPosition(),

                "ach":"[0,4,10,11,12,8,39,5,35,9]",
                "neo":true, // ?
                "ieh":true,
                "ifa":true,

                "map":{
                    "p":0,
                    "a": this.areaId
                },
                "smi":"18329", // TODO ?
                "ups":5,
            }
        })
        client.postMessage({ m: "WS_MSG", data: initDataMsg });


    }

    /**
     * 
     * @param {Client} client
     * @param {string | ArrayBuffer} msg 
     */
    onWsMessage(client, msg) {
        if (typeof msg === "string") {
            // TODO: validate
            const parsedMsg = /** @type { { data: any, m: string } } */ (fromClient(msg))
            console.log("onWsMessage()", msgTypes_rev[parsedMsg.m], parsedMsg)

            switch (parsedMsg.m) {
                case msgTypes.REQUEST_SYNCBLOCK_HOT: {
                    // TODO: need to read current sector, get all the server-handled blocks (moving, deadly moving, gatherable, item thrower, crumblings) and handle their states

                    // this is the first movable block in gemcastle.
                    client.postMessage({
                        m: "WS_MSG",
                        data: toClient({
                            m: msgTypes.SYNC_BLOCK,
                            data: {
                                pos: { x: 2168, y: -19 },
                                vel: { x: -29.958401433280066, y: 0 },
                                loc: { x: 111, y: -1 }
                            }
                        })
                    });

                    break;
                }
                case msgTypes.TELEPORT: {
                    // TODO: store current player position once we actually decode it from binary messages

                    if (parsedMsg.data === null) {
                        console.log("tried to go to elsewhere")
                        client.postMessage({ m: "NAVIGATE_TO_MAINSCREEN" })
                    }
                    else if (parsedMsg.data.tol) {
                        console.log("user asked to teleport to", parsedMsg.data.tol)
                        if (bundledAreasFile[this.areaUrlName]?.subareas?.[parsedMsg.data.tol]) {
                            console.log("subarea found!")
                        }
                        else {
                            console.log("no subarea..")
                        }
                    }
                    // TODO: use Zod unions to figure out the object's shape
                    else if (parsedMsg.data.a) {
                        // TODO: this can be used to teleport across areas!
                        console.log("tried to teleport via minimap")
                        if (parsedMsg.data.a === this.areaId) {
                            console.log("in this area. Setting player position then sending teleport event")
                            client.postMessage({
                                m: "WS_MSG",
                                data: toClient({
                                    m: msgTypes.TELEPORT,
                                    data: {
                                        rid: defaultPlayer.rid,
                                        gun: null,
                                    }
                                })
                            });
                            this.setPlayerPosition({x: parsedMsg.data.x * 19, y: parsedMsg.data.y * 19})
                        }
                    }

                    break;
                }

                case msgTypes.SET_SPAWNPOINT: {
                    const {x, y} = ws_set_spawnpoint.parse(parsedMsg.data);
                    this.setPlayerPosition({ x: x * 19, y: y * 19 })

                    break;
                }
                case msgTypes.RESET_SPAWNPOINT: {
                    this.setPlayerPosition(this.getSpawnpoint())
                    break;
                }
                case msgTypes.CHANGE_ATTACHMENT: {
                    const {ats, ati} = ws_change_attachment.parse(parsedMsg.data);
                    // TODO do we keep this defaultPlayer thing?
                    defaultPlayer.setAttachment(ats, ati)
                    break;
                }

                case msgTypes.TRIGGER: {
                    const data = ws_trigger.parse(parsedMsg.data);

                    client.postMessage({
                        m: "WS_MSG",
                        data: toClient({ m: msgTypes.SYNC_BLOCK, data: {
                            loc: data.loc,
                            sta: {
                                sta: 1, //TODO: figure out proper state based on the triggered block's attributes
                                uid: defaultPlayer.rid, // TODO
                                tid: 555 // TODO: actually keep track of ids
                            }
                        }})
                    });



                    break;
                }

                default: {
                    console.log("unhandled message", parsedMsg);
                    break;
                }
            }
        }
        else {
            // TODO read binary messages
            console.log("onWsMessage() binary", msg)
        }
    }
}

//#endregion AreaManager



const getAreaManagerClassForAreaId = (areaId) => {
    // TODO
    for (const area of Object.values(bundledAreasFile)) {
        if (area.areaId === areaId) {
            return ArchivedAreaManager;
        }
    }

    return LocalAreaManager;
}


class AreaManagerManager {
    wssCount = 0;
    areaManagerByWSSUrl = new Map();
    areaManagerByAreaId = new Map();

    /**
     * 
     * @param {AreaPossessionsManager} areaPossessionsMgr
     */
    constructor(areaPossessionsMgr) {
        this.areaPossessionsMgr = areaPossessionsMgr;
    }

    async makeAreaManager(/** @type { string } */ areaId) {
        console.log("AreaManagerManager: makeAreaManager()", areaId)
        const wssUrl = `ws191919x${String(this.wssCount++)}.ws.manyland.local`;

        const amClass = getAreaManagerClassForAreaId(areaId)
        const am = await amClass.make(wssUrl, areaId, this.areaPossessionsMgr)

        this.areaManagerByWSSUrl.set(wssUrl, am)
        this.areaManagerByAreaId.set(areaId, am)

        return am;
    }

    async getByWSSUrl(/** @type { string } */ wssUrl) {
        //console.log("amm: getByWssUrl", wssUrl)
        const am = this.areaManagerByWSSUrl.get(wssUrl);
        if (am) return am;
        else return await this.makeAreaManager("shouldnthappen_" + String(Date.now()));
    }

    async getByAreaId(/** @type { string } */ areaId) {
        const am = this.areaManagerByAreaId.get(areaId);
        if (am) return am;
        else return await this.makeAreaManager(areaId);
    }

    async getByAreaName(clientId, /** @type { string } */ areaUrlName) {
        // TODO: handle cases where client is in a subarea
        const areaId = getAreaIdForAreaName(areaUrlName);
        return await this.getByAreaId(areaId)
    }
}









// TODO
// @ts-ignore
const defaultPlayer = new Player({ name: "explorer 123" });
/** @param {string} clientId  @returns {Player} */
const getPlayerForClient = (clientId) => defaultPlayer;

// #endregion State







//   HHHHHHHHH     HHHHHHHHH  TTTTTTTTTTTTTTTTTTTTTTT  TTTTTTTTTTTTTTTTTTTTTTT  PPPPPPPPPPPPPPPPP   
//   H:::::::H     H:::::::H  T:::::::::::::::::::::T  T:::::::::::::::::::::T  P::::::::::::::::P  
//   H:::::::H     H:::::::H  T:::::::::::::::::::::T  T:::::::::::::::::::::T  P::::::PPPPPP:::::P 
//   HH::::::H     H::::::HH  T:::::TT:::::::TT:::::T  T:::::TT:::::::TT:::::T  PP:::::P     P:::::P
//     H:::::H     H:::::H    TTTTTT  T:::::T  TTTTTT  TTTTTT  T:::::T  TTTTTT    P::::P     P:::::P
//     H:::::H     H:::::H            T:::::T                  T:::::T            P::::P     P:::::P
//     H::::::HHHHH::::::H            T:::::T                  T:::::T            P::::PPPPPP:::::P 
//     H:::::::::::::::::H            T:::::T                  T:::::T            P:::::::::::::PP  
//     H:::::::::::::::::H            T:::::T                  T:::::T            P::::PPPPPPPPP    
//     H::::::HHHHH::::::H            T:::::T                  T:::::T            P::::P            
//     H:::::H     H:::::H            T:::::T                  T:::::T            P::::P            
//     H:::::H     H:::::H            T:::::T                  T:::::T            P::::P            
//   HH::::::H     H::::::HH        TT:::::::TT              TT:::::::TT        PP::::::PP          
//   H:::::::H     H:::::::H        T:::::::::T              T:::::::::T        P::::::::P          
//   H:::::::H     H:::::::H        T:::::::::T              T:::::::::T        P::::::::P          
//   HHHHHHHHH     HHHHHHHHH        TTTTTTTTTTT              TTTTTTTTTTT        PPPPPPPPPP          
// #region HTTP routes

//  ██████   ██████  ██    ██ ████████ ███████ ███████ 
//  ██   ██ ██    ██ ██    ██    ██    ██      ██      
//  ██████  ██    ██ ██    ██    ██    █████   ███████ 
//  ██   ██ ██    ██ ██    ██    ██    ██           ██ 
//  ██   ██  ██████   ██████     ██    ███████ ███████ 

class FakeAPI {
    constructor(
        /** @type { AreaManagerManager } */ areaManagerMgr,
        /** @type { AreaPossessionsManager } */ areaPossessionsMgr,
    ) {
        const router = this.router = makeRouter()


        // Area init
        router.post("/j/i/", async ({ json, request, clientId, }) => {
            const data = await readRequestBody(request)
            
            console.log("getting area manager for area", data)

            const areaManager = await areaManagerMgr.getByAreaName(clientId, data.urlName);
            const player = getPlayerForClient(clientId);
            const areaData = await areaManager.getInitData(player, data.urlName);

            //clientIdToAreas.set(clientId, data.urlName)

            console.log("sending area data", { areaData, areaManager })
            
            return json(areaData)
        });

        // item data
        router.get("/j/i/def/:creationId", async ({ params }) => {
            const { creationId } = params;

            return await getCreationDefRes(creationId)
        })




        // #region User
        // Friends And Blocked
        router.get("/j/u/fab/", ({ json }) => json({ "friends":[],"blocked":[] }) );
        // GetFreshRank
        router.post("/j/u/gfr/", ({ json }) => json( 10 ) );
        // Achievement
        router.post("/j/u/a/", async ({ json, request, clientId }) => {
            const { id } = await readRequestBody(request)
            return json({ ok: true, message: "I don't know how the real server answers but the client looks for a 200 so this is fine"});
            const achievements = {
              MOVED: 0,
              OPENED_CHNG_BODY: 4,
              OPENED_PEOPLE: 5,
              PASSED_CTEST: 6,
              ISSUED_CTEST: 7,
              ADDED_SNAPSHOT: 8,
              TELEPORTED: 9,
              DID_INWORLD_BUILD: 10,
              DID_INWORLD_REMOVE: 11,
              USED_MEET: 12,
              TRIGGERED_WELCOME_INVITATION: 13,
              SAVED_CREATION: 14,
              CREATED_AREA_SNAPSHOT: 15,
              USED_FILL_BUILD: 16,
              SAVED_CLONED_CREATION: 17,
              SAW_FRIEND_ON_FRIENDS_LIST: 18,
              SAVED_SPECIFIC_INTERACTING: 19,
              CHANGED_BODY: 20,
              SAVED_WRITABLE_COMMENT: 21,
              SAVED_SPECIFIC_FLYING_MOUNT: 22,
              USED_MOVE_BACKWARDS_BOOST: 23,
              USED_ALTERNATIVE_COLORS_VIEW: 24,
              SEARCHED_IN_BIN: 25,
              CONSUMED_HOT_EDIBLE: 26,
              CAUGHT_ITEM_FROM_ITEM_THROWER: 27,
              PLAYED_CHORD_WITH_KEYS: 28,
              PLACED_FILL_LIGHT: 29,
              ATTACHED_MOTION: 30,
              SAT_DOWN_IN_BUSY_CREATED_AREA: 31,
              PLACED_SOMETHING_IN_GRID_HOLDER: 32,
              TELEPORTED_HOME: 33,
              SOLVED_BASE_POST_KEY: 34,
              DID_CREATE_AREA: 35,
              BLOCKED_AD: 36,
              SAW_DIALOG_REVIEW_MOBILE: 37,
              SAW_DIALOG_REVIEW_STEAM: 38,
              SAW_DIALOG_MOBILE_VERSION_AVAILABLE: 39
            }
          console.log("Achievement registered: " + Object.keys(achievements).find(key => achievements[key] === parseInt(id)));
          return json(true);
        })
        // PlayerInfo
        router.post("/j/u/pi/", async ({ json, request, clientId }) => {
            const { id, planeId, areaId } = await readRequestBody(request)
            return json({
                isFullAccount: true,
                hasMinfinity: true,
                isBacker: true,
                screenName: "todo",
                rank: 10,
                stat_ItemsPlaced: 191919,
                unfindable: true,
                ageDays: 191919,
                profileItemIds: [],
                profileColor: null,
                profileBackId: null,
                profileDynaId: null,
                online: false,
                flagged: false,
                isEditorHere: true,
            });
        })
        router.get("/j/u/ps/:userId", async ({ params, json }) => {
          return json({
            hideInFriendsList: false,
            unfindable: true,
            status: "test test test",
            crAreaUrlName: "stockpile"
          });
        })
        // Ordered Our Friends?
        router.get("/j/u/oof/", async ({ params, json }) => {
          return json([]);
        })
        // Toggle Unfindable
        router.post("/j/u/tu/", async ({ json, request, clientId }) => {
          // toggles whatever state the server has the player in
          // does not receive true/false from client
          return json({ unfindable: false });
        })
        // Total Online Count
        router.get("/j/u/toc/", async ({ params, json }) => {
          return json({
            "core": [
              {
                "p": "1",
                "a": "1",
                "n": 0
              },
              {
                "p": "1",
                "a": "2",
                "n": 0
              },
              {
                "p": "1",
                "a": "3",
                "n": 0
              },
              {
                "p": "1",
                "a": "4",
                "n": 0
              },
              {
                "p": "1",
                "a": "5",
                "n": 0
              },
              {
                "p": "1",
                "a": "6",
                "n": 0
              },
              {
                "p": "1",
                "a": "7",
                "n": 0
              },
              {
                "p": "1",
                "a": "8",
                "n": 0
              },
              {
                "p": "2",
                "a": "1",
                "n": 0
              }
            ],
            "all": 1
          });
        })
        // RandomAvatarVariations
        router.get("/j/u/rav/:count", async ({ params, json }) => {
          // return random count of explorer bodies
          // this is the complete list
          var randomAvatars = ["00000000000000000000056e","00000000000000000000087f","00000000000000000000074e","00000000000000000000105e","00000000000000000000023e","00000000000000000000007e","00000000000000000000052e","00000000000000000000101e","00000000000000000000029e","00000000000000000000022e","00000000000000000000141e","00000000000000000000084e","00000000000000000000097e","00000000000000000000053e","00000000000000000000119e","00000000000000000000106e","00000000000000000000043e","00000000000000000000002f","00000000000000000000003e","00000000000000000000117f","00000000000000000000092f","00000000000000000000111e","00000000000000000000042e","00000000000000000000065e","00000000000000000000046e","00000000000000000000018f","00000000000000000000029f","00000000000000000000010f","00000000000000000000058e","00000000000000000000048f","00000000000000000000034e","00000000000000000000048e","00000000000000000000054e","00000000000000000000118e","00000000000000000000098e","00000000000000000000138e","00000000000000000000089e","00000000000000000000055f","00000000000000000000130f","00000000000000000000025f","00000000000000000000047f","00000000000000000000098f","00000000000000000000087e","00000000000000000000130e","00000000000000000000043f","00000000000000000000065f","00000000000000000000006e","00000000000000000000124f","00000000000000000000139f","00000000000000000000054f","00000000000000000000127f","00000000000000000000131e","00000000000000000000066e","00000000000000000000026f","00000000000000000000097f","00000000000000000000090e","00000000000000000000059f","00000000000000000000131f","00000000000000000000089f","00000000000000000000135f","00000000000000000000035f","00000000000000000000107e","00000000000000000000134f","00000000000000000000076e","00000000000000000000027e","00000000000000000000133f","00000000000000000000114e","00000000000000000000100e","00000000000000000000109e","00000000000000000000129e","00000000000000000000135e","00000000000000000000009e","00000000000000000000068f","00000000000000000000041e","00000000000000000000033e","00000000000000000000080e","00000000000000000000034f","00000000000000000000139e","00000000000000000000122e","00000000000000000000075e","00000000000000000000031e","00000000000000000000116e","00000000000000000000002e","00000000000000000000080f","00000000000000000000005e","00000000000000000000108e","00000000000000000000104f","00000000000000000000050e","00000000000000000000071f","00000000000000000000031f","00000000000000000000078e","00000000000000000000083e","00000000000000000000024f","00000000000000000000113e","00000000000000000000137e","00000000000000000000021e","00000000000000000000108f","00000000000000000000063e","00000000000000000000057e","00000000000000000000125e","00000000000000000000025e","00000000000000000000112f","00000000000000000000076f","00000000000000000000115f","00000000000000000000045f","00000000000000000000007f","00000000000000000000049f","00000000000000000000016e","00000000000000000000004f","00000000000000000000000e","00000000000000000000132f","00000000000000000000099e","00000000000000000000075f","00000000000000000000030f","00000000000000000000069e","00000000000000000000024e","00000000000000000000014f","00000000000000000000060f","00000000000000000000085e","00000000000000000000066f","00000000000000000000124e","00000000000000000000058f","00000000000000000000128e","00000000000000000000114f","00000000000000000000094e","00000000000000000000035e","00000000000000000000073f","00000000000000000000067e","00000000000000000000020e","00000000000000000000078f","00000000000000000000057f","00000000000000000000040f","00000000000000000000141f","00000000000000000000001f","00000000000000000000028e","00000000000000000000095f","00000000000000000000127e","00000000000000000000047e","00000000000000000000013e","00000000000000000000074f","00000000000000000000004e","00000000000000000000011f","00000000000000000000119f","00000000000000000000095e","00000000000000000000070f","00000000000000000000042f","00000000000000000000133e","00000000000000000000019f","00000000000000000000052f","00000000000000000000070e","00000000000000000000137f","00000000000000000000067f","00000000000000000000053f","00000000000000000000110e","00000000000000000000117e","00000000000000000000104e","00000000000000000000006f","00000000000000000000001e","00000000000000000000022f","00000000000000000000113f","00000000000000000000106f","00000000000000000000032e","00000000000000000000060e","00000000000000000000100f","00000000000000000000096e","00000000000000000000009f","00000000000000000000061e","00000000000000000000129f","00000000000000000000086e","00000000000000000000103e","00000000000000000000091f","00000000000000000000134e","00000000000000000000010e","00000000000000000000033f","00000000000000000000102f","00000000000000000000073e","00000000000000000000041f","00000000000000000000044f","00000000000000000000055e","00000000000000000000084f","00000000000000000000120f","00000000000000000000110f","00000000000000000000101f","00000000000000000000013f","00000000000000000000091e","00000000000000000000094f","00000000000000000000136f","00000000000000000000044e","00000000000000000000079f","00000000000000000000062f","00000000000000000000059e","00000000000000000000079e","00000000000000000000028f","00000000000000000000077e","00000000000000000000128f","00000000000000000000093e","00000000000000000000088f","00000000000000000000105f","00000000000000000000069f","00000000000000000000088e","00000000000000000000023f","00000000000000000000107f","00000000000000000000138f","00000000000000000000123e","00000000000000000000017e","00000000000000000000083f","00000000000000000000068e","00000000000000000000012f","00000000000000000000000f","00000000000000000000056f","00000000000000000000071e","00000000000000000000118f","00000000000000000000021f","00000000000000000000026e","00000000000000000000121e","00000000000000000000008f","00000000000000000000093f","00000000000000000000077f","00000000000000000000049e","00000000000000000000050f","00000000000000000000140f","00000000000000000000122f","00000000000000000000037f","00000000000000000000011e","00000000000000000000111f","00000000000000000000064f","00000000000000000000064e","00000000000000000000039e","00000000000000000000036f","00000000000000000000115e","00000000000000000000096f","00000000000000000000017f","00000000000000000000012e","00000000000000000000109f","00000000000000000000019e","00000000000000000000085f","00000000000000000000140e","00000000000000000000125f","00000000000000000000046f","00000000000000000000132e","00000000000000000000120e","00000000000000000000036e","00000000000000000000103f","00000000000000000000082e","00000000000000000000051f","00000000000000000000003f","00000000000000000000020f","00000000000000000000040e","00000000000000000000123f","00000000000000000000015e","00000000000000000000018e","00000000000000000000016f","00000000000000000000039f","00000000000000000000121f","00000000000000000000008e","00000000000000000000051e","00000000000000000000027f","00000000000000000000061f","00000000000000000000030e","00000000000000000000045e","00000000000000000000063f","00000000000000000000092e","00000000000000000000099f","00000000000000000000090f","00000000000000000000102e","00000000000000000000081e","00000000000000000000136e","00000000000000000000072f","00000000000000000000038e","00000000000000000000014e","00000000000000000000082f","00000000000000000000037e","00000000000000000000015f","00000000000000000000126f","00000000000000000000126e","00000000000000000000062e","00000000000000000000032f","00000000000000000000081f","00000000000000000000072e","00000000000000000000005f","00000000000000000000086f","00000000000000000000038f","00000000000000000000116f","00000000000000000000112e"].sort(() => Math.random() - 0.5).slice(0, params.count);
          
          return json(randomAvatars);
        })
        // TopCreatedR
        router.get("/j/i/tcr/:playerId", async ({ params, json }) => {
            return json([]);
        });
        // #endregion User




        // #region Items
        // ItemDef
        const itemDefRoot_CDN  = "d2h9in11vauk68.cloudfront.net/"
        router.get("/j/i/def/:creationId", ({ params, json }) => {
            if (typeof params.creationId === "string" && params.creationId.length === 24) {
                return fetch("https://" + itemDefRoot_CDN + params.creationId);
            }
            else return Response.error();
        });

        // Create
        router.post("/j/i/c/", async ({ request, json }) => {
            const { itemData } = await readRequestBody(request)
            const { itemId } = await saveCreation(itemData)

            return json( { itemId: itemId });
        });

        // Delete
        router.post("/j/i/d/", async ({ request, json }) => {
            const { itemId } = await readRequestBody(request)

            await inventory_deleteCreated(defaultPlayer.rid, itemId);

            return json( { ok: true } );
        });

        // Motions
        // TODO
        router.get("/j/i/mo/:creationId", ({ params, json }) => json({ ids: [], midpoint: 0 }) );

        // Statistics
        router.get("/j/i/st/:creationId", async ({ params, json }) => {
            // TODO?
            return json({ timesCd: 19, timesPd: 19 });
        });

        // Report Missing Item
        router.post("/j/i/rmi/", async ({ request, json }) => {
          const data = await readRequestBody(request)
          console.warn("client reported missing item!", data)

          return json({ ok: true });
        });

        // CreatorInfoName
        router.get("/j/i/cin/:creationId", async ({ params, json }) => {
            const creatorId = generateObjectId();
            return json({ id: creatorId, name: "todo" });
        });

        // Collectors
        router.get("/j/i/cols/:creationId", async ({ params, json }) => {
            return json({
                collectors: [
                    { _id: generateObjectId(), name: "todo" },
                    { _id: generateObjectId(), name: "todo" },
                    { _id: generateObjectId(), name: "todo" },
                ],
                lastCollector: { _id: generateObjectId(), name: "todo" },
            });
        });

        router.post("/j/i/gu/", async ({ request, json }) => {
            const { id } = await readRequestBody(request)
            return json({ unlisted: false });
        });
        // #endregion Items



        // #region Collections
        // Get collected
        router.get("/j/c/r/:start/:end", async ({ params, json }) => {
            const data = await inventory_getCollectedPage(defaultPlayer.rid, Number(params.start), Number(params.end))
            return json(data)
        });

        // Collect
        router.post("/j/c/c", async ({ request, json }) => {
            const data = await readRequestBody(request)

            const { alreadyExisted } = await inventory_collect(defaultPlayer.rid, data.itemId, data.index)

            return json({
                alreadyExisted: alreadyExisted,
                actionWasBlocked: false,
            });
        });

        // Delete
        router.post("/j/c/d", async ({ request, json }) => {
            const { itemId } = await readRequestBody(request)

            await inventory_deleteCollected(defaultPlayer.rid, itemId)

            // TODO: what does the server actually returns?
            return json( true );
        });

        // Check if Collected
        router.get("/j/c/check/:itemId/", async ({ params, json }) => {
            return json( (await inventory_getCollected(defaultPlayer.rid)).includes(params.itemId) )
        });

        // Check if I Flagged Item (always returns false for now)
        router.get("/j/i/chkf/:itemId", ({ json }) => json( false ));


        // Get Created
        router.get("/j/i/gcr/:start/:end", async ({ params, json }) => {
            const data = await inventory_getCreatedPage(defaultPlayer.rid, Number(params.start), Number(params.end))
            return json(data)
        });
        // #endregion Collections



        // #region Search
        // Search Item
        router.post("/j/s/i/", ({ json }) => json({ items: [ groundId ], more: false }) );
        // #endregion Search



        // #region News
        // GetUnreadCount
        router.get("/j/n/guc/", ({ json }) => json( 319 ) );
        // GetLatestNews
        router.get("/j/n/gln/", ({ json }) => json( [
            { _id: generateObjectId(), text: "TODO", isImportant: false, date: new Date().toISOString(), unread: true },
            { _id: generateObjectId(), text: "TODO", isImportant: false, date: new Date().toISOString(), unread: true },
            { _id: generateObjectId(), text: "TODO", isImportant: false, date: new Date().toISOString(), unread: true },
            { _id: generateObjectId(), text: "TODO", isImportant: false, date: new Date().toISOString(), unread: true },
            { _id: generateObjectId(), text: "TODO", isImportant: false, date: new Date().toISOString(), unread: true },
        ] ) );
        // #endregion News



        // #region Mifts
        // GetUnseenMifts
        router.get("/j/mf/umc/", ({ json }) => json( { count: 0 } ) );
        
        router.post("/j/mf/grm/", async ({ request, json }) => {
          const body = await readRequestBody(request)
          
          var miftData = {
            "results": [{
              "_id": generateObjectId(),
              "fromId": generateObjectId(),
              "fromName": "TODO",
              "toId": defaultPlayer.rid,
              "itemId": "57286c91b19fff08136aa4a5",
              "text": "TODO",
              "deliverySeenByRecipient": false,
              "ts": new Date().toISOString()
            }]
          }
          if(body.priv == "true"){
            // we'll never have their private mifts
            miftData = {"results": []};
          }
  
          return json(miftData)
        })
        // #endregion Mifts



        // #region Map
        // CreatedMapVersion(?) TODO
        router.post("/j/m/cmv/", ({ json }) => json({ v: 1 }) );
        // SectorPlus
        router.get("/j/m/sp/:x/:y/:ap/:aid", async ({ params, json }) => {
            const am = await areaManagerMgr.getByAreaId(params.aid)
            const s = (x, y) => am.getDataForSector(Number(params.x) + x, Number(params.y) + y)

            const sectors = await Promise.all([
                s(-1, -1), s(-1, 0), s(-1, 1),
                s( 0, -1), s( 0, 0), s( 0, 1),
                s( 1, -1), s( 1, 0), s( 1, 1),
            ])

            return json(sectors.filter(e => !!e))
        });
        // SectorPlusLoading (not exactly sure what's different)
        router.get("/j/m/spl/:x/:y/:ap/:aid", async ({ params, json }) => {
            console.log("TESTDEBUG sectorPlusLoading params:", params)

            const am = await areaManagerMgr.getByAreaId(params.aid)
            const s = (x, y) => am.getDataForSector(Number(params.x) + x, Number(params.y) + y)

            const sectors = await Promise.all([
                s(-1, -1), s(-1, 0), s(-1, 1),
                s( 0, -1), s( 0, 0), s( 0, 1),
                s( 1, -1), s( 1, 0), s( 1, 1),
            ])
            console.log("sectors,", sectors)

            return json(sectors.filter(e => !!e))
        });
        router.post("/j/m/s/", async ({ request, json }) => {
            const body = await readRequestBody(request)

            const areaId = body.a;
            const areaPane = body.p;
            const requestedSectors = JSON.parse(body.s);

            const sectorData = [];
            const am = await areaManagerMgr.getByAreaId(areaId)

            for (const [x, y] of requestedSectors) {
                const temp = await am.getDataForSector(x, y)
                if (!temp) continue;

                sectorData.push(temp)
            }



            return json(sectorData)
        });
        // DeletionMarkerForSectors
        router.post("/j/m/dmss/", async ({ json, request }) => {
            console.log("TESTDEBUG deletionmarker request body:", await readRequestBody(request))

            return json([]);
        })
        // placer
        router.get("/j/m/placer/:x/:y/:areaPlane/:areaId", ({ params, json }) => {
            const placerId = generateObjectId();
            return json({
                id: placerId,
                name: "todo",
                ts: new Date().toISOString(),
            })
        })


        // AreaPossessions
        router.post("/j/aps/s/", async ({ request, json }) => {
            const body = await readRequestBody(request)

            const { areaGroupId, ids } = schema_aps_s.parse(body);
            areaPossessionsMgr.setPossessions(areaGroupId, ids)

            return json({ ok: true })
        });
        // #endregion Map


        // #region Minimap

        router.get("/j/a/mal/:areaid", async ({ params, json }) => {
            // TODO
            return json([])
        })
        // ExploredSectorIndividual? Info?
        router.get("/j/e/esi/:x/:y/:ap/:aid", async ({ params, json }) => {
            const am = await areaManagerMgr.getByAreaId(params.aid)

            const data = await am.getMinimapData_Tile(Number(params.x), Number(params.y))
            /** @type { MinimapTileData } */
            //const data = { x: Number(params.x), y: Number(params.y), id: null, pn: [ { x: 0, y: 0, n: "test"} ] }

            return json(data)
        });
        // ExploredSectorRegion?
        router.get("/j/e/esr/:x1/:y1/:x2/:y2/:ap/:aid", async ({ params, json }) => {
            const am = await areaManagerMgr.getByAreaId(params.aid)

            const data = await am.getMinimapData_Region(Number(params.x1), Number(params.y1), Number(params.x2), Number(params.y2))

            return json({ sectors: data })
        });
        // #endregion Minimap


        // Catch-all
        router.get("/j/:splat+", ({ event }) => {
            console.log("FETCH no match for", event.request.url)
            return new Response("Not found or not implemented", { status: 404 })
        })
        router.post("/j/:splat+", ({ event }) => {
            console.log("FETCH no match for", event.request.url)
            return new Response("Not found or not implemented", { status: 404 })
        })

    }

    /**
     * 
     * @param {"GET" | "POST"} method 
     * @param {string} pathname 
     * @param {FetchEvent} event
     * @returns 
     */
    async handle(method, pathname, event) {
        console.log("FakeAPI.handle()", method, pathname, event);
        return await this.router.matchRoute(method, pathname, event);
    }
}

// #endregion HTTP routes





/***
 *    ███    ███  █████  ██ ███    ██
 *    ████  ████ ██   ██ ██ ████   ██
 *    ██ ████ ██ ███████ ██ ██ ██  ██
 *    ██  ██  ██ ██   ██ ██ ██  ██ ██
 *    ██      ██ ██   ██ ██ ██   ████
 */
//#region main

console.log("Hi from service worker global context")
const areaPossessionsMgr = new AreaPossessionsManager();
const areaManagerMgr = new AreaManagerManager(areaPossessionsMgr);
const fakeAPI = new FakeAPI(areaManagerMgr, areaPossessionsMgr);

/***
 *     ██████   ██████  ██    ██ ████████ ██ ███    ██  ██████  
 *     ██   ██ ██    ██ ██    ██    ██    ██ ████   ██ ██       
 *     ██████  ██    ██ ██    ██    ██    ██ ██ ██  ██ ██   ███ 
 *     ██   ██ ██    ██ ██    ██    ██    ██ ██  ██ ██ ██    ██ 
 *     ██   ██  ██████   ██████     ██    ██ ██   ████  ██████  
 */
//#region main_routing
/**
 * @param { FetchEvent } event
 * @returns { Promise<Response> }
 */
const handleFetchEvent = async (event) => {
    try {
        const url = new URL(event.request.url);
        console.log("FETCH", event.clientId, event.request.url, { event })

        if (url.host === originUrl.host) {
            // TODO: properly handle cache, following best practices. Cache the .html pages, and set up a mechanism to properly update them when they change + reload the client

            if (url.pathname === "/") {
                // TODO: why is this cached??
                const res = await fetch("/index.html?CACHEBUST");
                console.log("asked for mainscreen, sending", await res.clone().text())
                return res;
            }
            if (url.pathname.startsWith("/_code/")) return fetch(event.request);
            // TODO: rename this, since there's an area named "static" lol
            if (url.pathname.startsWith("/static/")) return getOrSetFromCache(CACHE_NAME, event.request);
            // Why is the painter fetched at /media/painter/spritesheet.png instead of using window.staticroot...?
            // Oops, my fault, if the mlenv is set to test, it tries to load the painter from /media/painter instead of //static.manyland.com!
            if (url.pathname === "/media/painter/spritesheet.png") return getOrSetFromCache(CACHE_NAME, new Request(self.origin + "/static/media/painter/spritesheet.png"));
            if (url.pathname.startsWith("/j/")) return await fakeAPI.handle(/** @type { "GET" | "POST" } */ (event.request.method), url.pathname, event)

            if (url.pathname.startsWith("/sct/")) {
                const maptilesCache = await caches.open("MAP_TILES_V1");
                return await maptilesCache.match(url);
            }




            /** * @param {string} id */
            const getZipUrlForAreaId = (id) => new URL(self.origin + `/static/data/v2/${id}.zip`).toString()

            // TODO get this from a file (and update it)
            if (url.pathname === "/_mlspinternal_/getdata") {
                const availableAreas = await getAreaList()
                const areasv2cache = await caches.open(CACHE_AREAS_V2);
                const areasStoredLocally = []
                for (const areaUrlName of availableAreas) {
                    const cachematch = await areasv2cache.match(new URL(self.origin + `/static/data/v2/${getAreaIdForAreaName(areaUrlName)}.zip`))
                    if (cachematch) {
                        areasStoredLocally.push(areaUrlName)
                    }
                }

                return Response.json({ areasStoredLocally, availableAreas });
            }
            if (url.pathname === "/_mlspinternal_/dlArea") {
                const areaName = url.searchParams.get("area");

                // TODO: extract this to a function
                const areasv2cache = await caches.open(CACHE_AREAS_V2);

                const areaData = bundledAreasFile[areaName]
                if (!areaData) {
                    console.error("asked to download an area that isn't referenced in our file!")
                    return Response.json({ ok: false });
                }


                try {
                    const subareaIds = Object.values(areaData.subareas || {}).map(subareaId => subareaId);
                    await areasv2cache.addAll([
                        getZipUrlForAreaId(areaData.areaId),
                        ...subareaIds.map(id => getZipUrlForAreaId(id)),
                    ]);

                    return Response.json({ ok: true });
                } catch(e) {
                    console.log("error while caching! Are you sure the files exist (for all subareas too)?", e)
                    return Response.json({ ok: false });
                }

            }



            // Special pages
            if ( url.pathname.startsWith("/info")
            || url.pathname.startsWith("/support")
            || url.pathname.startsWith("/intermission")
            ) {
                return new Response("Not implemented sorry", { status: 500 })
            }

            // Catch-all in case we're somehow trying to fetch a ressource or something
            if (url.pathname.slice(1).includes("/")) {
                return new Response("Not sure what you're querying here", { status: 500 })
            }

            // If nothing else matches, we assume it's trying to load an area's index.html (TODO: would request headers indicate client only accepts html?)
            // TODO: check if area is available locally. If not, display an error page and/or redirect to /
            return fetch("/game.html")
        }

        if (cloudfrontHosts.includes(url.hostname)) {

            const creationId = url.pathname.slice(1)
            return await getCreationSpriteRes(creationId)
        }
        // With the current settings, the game should query /def instead of the CDN
        if (url.hostname === CLOUDFRONT_ROOT_ITEMDEFS) {
            const creationId = url.pathname.slice(1);

            return await getCreationDefRes(creationId)
        }

        return new Response("No rules match this request!", { status: 404 })
    } catch(e) {
        console.error("Error handling request", e)
        return Response.error()
    }
};

//#endregion main_routing

/**
 * @param {ExtendableMessageEvent} event
 */
const handleClientMessage = async (event) => {
    try {
        const message = event.data;
        const client = /** @type { Client } */ (event.source);

        //console.log("MSG", client.id, message, { event })
        if (message.m === "WSMSG") {
            const { areaId } = message.data;
            const amgr = await areaManagerMgr.getByAreaId(areaId)

            amgr.onWsMessage(client, message.data.msg)
        }
        else if (message.m === "PLS_OPEN_WS") {
            console.log("client sent PLS_OPEN_WS!", message)

            const wsUrl = new URL(message.data.wsUrl);
            const amgr = await areaManagerMgr.getByWSSUrl(wsUrl.host)

            amgr.onWsConnection(client)
        }
    } catch(e) {
        console.error("MSG: error processing message!", { message: event.data, error: e })
    }
};

//#endregion main



//#region boilerplate

const onInstall = async (/** @type {ExtendableEvent} */ event) => {
    try {
        console.log("service worker install event")

        // TODO: create cache for sounds and other static assets
        // This cache is for the v1 area archive storage and will probably be deleted later
        const areasv2cache = await caches.open(CACHE_AREAS_V2);
        await areasv2cache.addAll([
            new URL(self.origin + `/static/data/v2/${getAreaIdForAreaName("chronology")}.zip`).toString()
        ]);
    } catch(e) {
        console.error("onInstall error!", e)
    }

    self.skipWaiting();
}





// Service Worker's Listeners

self.addEventListener('install', event => event.waitUntil(onInstall(event)) );

// Update and take over as soon as possible
self.addEventListener('activate', event => {
    console.log("service worker activate event")
    event.waitUntil(self.clients.claim())
});

self.addEventListener('fetch', event => event.respondWith(handleFetchEvent(event)))
self.addEventListener('message', handleClientMessage)





} catch(e) {
    console.error("error in main()", e)
}


}; //main() ends here

self.addEventListener("error", (event) => console.error("error event", event))
self.addEventListener("unhandledrejection", (event) => console.error("unhandledrejection event", event))

// Now we call main() with everything in global scope while telling tsc to squint
main(
    // @ts-ignore
    self,
    // @ts-ignore
    matchPath,
    // @ts-ignore
    Qs,
    // @ts-ignore
    JSZip,
    // @ts-ignore
    Zod,
    // @ts-ignore
    idbKeyval
)

//#endregion boilerplate
