/// <reference lib="webworker" />

// This is mainly to debug cache issues
const SW_VERSION = 4;

type Snap = {};
type idbKeyval = typeof import('idb-keyval/dist/index.d.ts');
type Zip = typeof JSZip;


/*
Firefox does not handle ES import/export syntax in service workers (see https://bugzilla.mozilla.org/show_bug.cgi?id=1360870).
The only thing available is `importScripts`, which syncronously runs a separate script.
I could make classes in separate files and use them here, but then my editor would lose track of them and their types.
*/

importScripts("/_code/libs/path-to-regexp.js");
importScripts("/_code/libs/qs.js");
importScripts("/_code/libs/jszip.js");
importScripts("/_code/libs/zod.umd.js");
const z = Zod;
importScripts("/_code/libs/idb.umd.js");
importScripts("/_code/libs/idb-keyval.umd.js");



try {
importScripts("/_code/service-worker/boilerplate/basicrouter.js");
importScripts("/_code/service-worker/boilerplate/cache.js");
importScripts("/_code/service-worker/boilerplate/mongoId.js");
importScripts("/_code/service-worker/boilerplate/ws.js");
importScripts("/_code/service-worker/localCreations.js");
importScripts("/_code/service-worker/localMinimap.js");
importScripts("/_code/service-worker/PlayerDataManager.js");
importScripts("/_code/service-worker/Storage.js");
importScripts("/_code/service-worker/DataImport_Profile.js");
importScripts("/_code/service-worker/DataImport_Area.js");
} catch(e) {
    console.log("error while trying to import a module. Are you sure the paths are correct?", e)
}

//  ██████   ██████  ██ ██      ███████ ██████  ██████  ██       █████  ████████ ███████ 
//  ██   ██ ██    ██ ██ ██      ██      ██   ██ ██   ██ ██      ██   ██    ██    ██      
//  ██████  ██    ██ ██ ██      █████   ██████  ██████  ██      ███████    ██    █████   
//  ██   ██ ██    ██ ██ ██      ██      ██   ██ ██      ██      ██   ██    ██    ██      
//  ██████   ██████  ██ ███████ ███████ ██   ██ ██      ███████ ██   ██    ██    ███████ 
// #region boilerplate






// Wrap the entire code in a function to get proper type inference on `self`
const main = (
    self: ServiceWorkerGlobalScope,
) => {
try {
const originUrl = new URL(self.origin)
const groundId = "50372a99f5d33dc56f000001"
const SpriteGroundDataURI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATBAMAAACAfiv/AAAAD1BMVEVaKx9+PSyjTjjJdmHzmY8fDNQBAAAAXklEQVQI13XP0Q2AIAxF0aYTIG7QLmD63AD2n8m+ojF+eL8OTQNBtqcmOyYbkZyrQYKdJMIyR5PuiTzlbre74ponww0pLgCGgBe9blvTfwYpQR6aVGFKmlb2efj9xQWlGxm7CYadIwAAAABJRU5ErkJggg=="
const SpriteGroundBlob = dataURLtoBlob(SpriteGroundDataURI);


// #region misc

const dbPromise = LocalMLDatabase.make();
const cache = makeCache(originUrl, SpriteGroundBlob);
const { generateMinimapTile, getMapPixelColorFor } = makeMinimapGenerator(idbKeyval, cache.getCreationSprite)
const { saveCreation } = makeLocalCreations(idbKeyval)


const cloudfrontHosts = "d3t4ge0nw63pin d3sru0o8c0d5ho d39pmjr4vi5228 djaii3xne87ak d1qx0qjm5p9x4n d1ow0r77w7e182 d12j1ps7u12kjc dzc91kz5kvpo5 d3jldpr15f31k5 d2r3yza02m5b0q dxye1tpo9csvz"
    .split(" ").map(s => s + ".cloudfront.net")

const ringAreas = ["0", "1", "2", "3", "4", "5", "6", "7", "8"]

const bundledAreasFile = {
    //"test2": {
    //    areaId: "53ed27dfb3f6f9c3205157e1",
    //},
    "chronology": {
        areaId: "56ed2214c94d7b0e132538b9",
        areaRealName: "Chronology",
        tags: [],
        subareas: {},
    },
    "oosforest": {
        areaId: "5963e0d370c6b17b13c75b26",
        areaRealName: "Oo's forest",
        tags: [ "exploration" ],
        subareas: {},
    },
    "oosjungle": {
        areaId: "5bc003b5051ec03628866ecb",
        areaRealName: "Oo's jungle",
        tags: [ "exploration" ],
        subareas: {
            "jungle spawn": "5bc0067d64c04420c4d9a308",
        }
    },
    "hell": {
        areaId: "5b76e3f46c3ef97b26871968",
        areaRealName: "Hell",
        tags: [ "exploration" ],
        subareas: { }
    },
    "blancnoir": {
        areaId: "540f4a6fbcd7bbcf2e509c8d",
        areaRealName: "Blancnoir",
        tags: [ "puzzle" ],
        subareas: {
            "level one": "544c7e89f06c47f141f4bc96",
        }
    },
    "gemcastle": {
        areaId: "541b035c44aff03338610fca",
        areaRealName: "Gemcastle",
        tags: [ "parkour" ],
        subareas: {},
    },
    // TODO: this area has you spawn at 0,0 and the subarea names don't match the interacting. What's going on in there?
    //"chambersofzen": {
    //    areaId: "53dfbf8db859b70b11826454",
    //    tags: [ "puzzle", "parkour" ],
    //    subareas: {
    //        "chamber 1": "53e12f043e31890c131003b8",
    //    },
    //},
    "newpolis": {
        areaId: "53f21e4edbfc885003e92bb5",
        areaRealName: "Newpolis",
        tags: [ "puzzle", "adventure" ],
        subareas: {
            "muscles r us": "53f33c974b7f11943a9eb332",
            "inside generic": "53f2260fbec33016514f8c78",
            "good deals shop": "53f25d6601c59abb6001e115",
            "sewer": "53f3509a4b7f11943a9eb345",
            "appartment": "53f276e3f6eb8919776f173f",
            "dream": "53f27f37cbc31529441204eb",
            "mystery travel inc": "53f3173ec318666b4b4c775e",
            "train": "53f3654b4b7f11943a9eb36a",
            "sunny beach": "53f37d3c4b7f11943a9eb3a0",
        }
    },
    "sandcastle": {
        areaId: "5522c6f01c963d1308f12e0a",
        areaRealName: "Sandcastle",
        tags: [ "exploration" ],
        subareas: {
            "the castle": "5523f96cab0f5a3e0c353aab",
        },
    },
    "theweyard": {
        areaId: "5453e94cc3a79273732709ca",
        areaRealName: "Theweyard",
        tags: [ "exploration" ],
        subareas: {
            "theweyardcellar": "5462171a1683e7e04e56fdc0",
            "elemental": "556cea7385f2dfdc602564f4",
            "theweyardhouse": "546157a3ffe6b224575046dc",
            "theweyardart": "548a11aabd4eeab63d0cbdfa",
            "tree": "562fb57ab259aad676b50740",
        },
    },
    "electronics": {
        areaId: "5472c985b92c0f3971866bc6",
        areaRealName: "Electronics",
        tags: [ "exploration" ],
        subareas: {
            "boiler": "547c78dad3b95df927bf2364",
        }
    },
    "kingbrownssanctum": {
        areaId: "53ebd011d31b8354235a2d8f",
        areaRealName: "King Brown's Sanctum",
        tags: [ "exploration" ],
        subareas: {
            "the allfather": "55f337baf6fda73e1218bc62",
            "snow fort": "54614021a693cdae4bb019ba",
            "temple entrance": "585f0af476766272139794b8",
            "the abyss": "543dda9ea51913531b244ca8",
            "verthaven": "550cd6597aa9b89b12ef2d4a",
            "the corridor": "555e25c43e5ef31308b226fd",
            "the keep": "54dc35fd8ebe97ae6398fb06",
            "oac'ca": "5453142880d440615ef6e2f5",
            "the oracle": "550062e9980316e02f0ceaf5",
            "prison cell a": "54dd89fbbf826d4e47358bb8",
            "prison cell b": "54ddf8d43827a1397656ac5f",
            "prison cell c": "54dfb730e33832b16bba7427",
            "brown cinema vault": "543a04f37e81f3007a1a3e29",
        }
    }
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

// #endregion misc

// #region cache

// #region areazips_cache

// TODO: use these helpers everywhere
// TODO: should I use a non-existent path?? Or should I store blobs in idb?
const getURLForArea = (areaId: string) => new URL(self.origin + `/static/data/v2/${areaId}.zip`)
const getAreaIdFromUrl = (url: URL) => {
    const MONGOID_LENGTH = 24;
    const start = "/static/data/v2/".length
    const end = start + MONGOID_LENGTH;

    return url.pathname.slice(start, end);
}

const getAvailableAreas = async () => {
    const db = await dbPromise;
    const areasInCache: string[] = [];
    const data = [
        // TODO local areas
        { areaUrlName: "offlineland", areaRealName: "OfflineLand", status: "DOWNLOADED" },
    ];
    
    // Areas in cache
    const areasCache = await caches.open(CACHE_AREAS_V2);
    const keys = await areasCache.keys();

    for (const req of keys) {
        const areaId = getAreaIdFromUrl(new URL(req.url))
        console.log("checking cached area", areaId)

        areasInCache.push(areaId);
        const areaData = await db.area_getData(areaId);
        console.log(areaData);

        if (areaData.sub === true)
            continue;

        data.push({
            areaUrlName: areaData.aun,
            areaRealName: areaData.arn,
            status: "DOWNLOADED"
        })
    }


    // Bundled areas
    const availableAreas = await getAreaList();
    for (const areaUrlName of availableAreas) {
        const areaId = getAreaIdForAreaName(areaUrlName);

        if (areasInCache.includes(areaId))
            continue;

        const cachematch = await areasCache.match(new URL(self.origin + `/static/data/v2/${areaId}.zip`));

        data.push({
            areaUrlName: areaUrlName,
            areaRealName: bundledAreasFile[areaUrlName].areaRealName || areaUrlName,
            status: cachematch ? "DOWNLOADED" : "DOWNLOADABLE"
        })
    }


    return data;
}

const makeBundledAreaAvailableOffline = async (areaName: string) => {
    console.log("makeBundledAreaAvailableOffline()", areaName)
    const areaData = bundledAreasFile[areaName]
    if (!areaData) {
        console.error("asked to download an area that isn't referenced in our file!")
        return Response.json({ ok: false });
    }

    const db = await dbPromise;

    try {
        console.log("getting zip...")
        const zip = await cache.getAreaZip(areaData.areaId);
        await importAreaData(zip, db, cache)

        const subareaIds = Object.values(areaData.subareas || {}).map(subareaId => subareaId as string);
        for (const subareaId of subareaIds) {
            const subareaZip = await cache.getAreaZip(subareaId)
            await importAreaData(subareaZip, db, cache)
        }


        // TODO: send a message to client?
        return Response.json({ ok: true });
    } catch(e) {
        console.log("error while caching! Are you sure the files exist (for all subareas too)?", e)
        return Response.json({ ok: false });
    }
}

// #endregion areazips_cache


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

type PositionPixels = {
    x: number;
    y: number;
}

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


//#region AreaManager
// TODO: store changes locally
// TODO: Networking?
class LocalAreaManager {
    clients = new Set();
    wssUrl: any;
    areaId: any;
    isRingArea: boolean;

    constructor(wssUrl, areaId) {
        console.warn("LocalAreaManager constructor", wssUrl, areaId)
        this.wssUrl = wssUrl;
        this.areaId = areaId;

        this.isRingArea = areaId === "" || ringAreas.includes(areaId)
    }

    static async make(wssUrl, areaId) {
        return new LocalAreaManager(wssUrl, areaId)
    }

    async getInitData(player: PlayerDataManager, urlName) {
        const playerData = await player.getInitData_http();
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

    async onWsConnection(player: PlayerDataManager, client) {
        console.log("received WS connection!", { client })

        console.log("sending WS_OPEN message...")
        client.postMessage({ m: "WS_OPEN", data: { areaId: this.areaId } });

        console.log("sending own info message...")
        const initDataMsg = toClient({
            "m": msgTypes.OWN_INFO,
            "data":{
                ...await player.getInitData_ws(),
                pos: { x: 15 * 19, y: 15 * 19 },

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

    async onWsMessage(player: PlayerDataManager, client, msg) {
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


// TODO: move this to Storage
const getAreaOrSubareaIdFor = async (player: PlayerDataManager, areaGroupId: string): Promise<string> => {
    return (await idbKeyval.get(`area-current-subarea-${areaGroupId}`)) || areaGroupId
}

const findSubareaFor = async (areaUrlName: string, areaGroupId: string, subareaName: string) => {
    const inBundledFile = bundledAreasFile[areaUrlName]?.subareas?.[subareaName]
    if (inBundledFile) return inBundledFile;

    const db = await dbPromise;
    const inDB = await db.area_getSubareasIn(areaGroupId)
    return inDB.find(sub => sub.arn === subareaName);
}

class ArchivedAreaManager {
    clients = new Set();
    zip: typeof JSZip;
    wssUrl: string;
    areaId: string;
    possessionsMgr: AreaPossessionsManager;
    isRingArea: boolean;
    isSubarea: boolean;
    centerLocation: any;
    areaGroupId: string;
    areaRealName: string;
    areaGroupName: string;
    areaUrlName: string;
    description: string;
    globalInteractingId: string | null;
    drift: any;
    protection: string;
    isLocked: boolean;
    isUnlisted: boolean;
    isSinglePlayerExperience: boolean;
    explorerChatAllowed: boolean;
    mpv: number;

    constructor(wssUrl: string, areaId: string, data: any, zip: any, possessionsMgr: AreaPossessionsManager) {
        console.log("ArchivedAreaManager constructor", wssUrl, areaId, data)
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

    static async make(wssUrl: string, areaId: string, possessionsMgr: AreaPossessionsManager) {
        if (await cache.isAreaInCache(areaId) === false) {
            // This shouldn't happen, but in case it ever does, we just load it on the fly
            // TODO: send messages to inform progress?
            // TODO: this will fail if the area isn't a bundled one. It would be safer to display an error and return to /
            await makeBundledAreaAvailableOffline(areaId)
        }

        const res = await cache.getAreaRes(areaId);
        // TODO handle errors?
        console.log("AreaManager make(): zip res", res, res.ok, res.status)

        const blob = await res.blob()

        console.log("AreaManager make(): reading zip")
        const zip = await JSZip.loadAsync(blob)
        console.log("AreaManager make(): reading zip ok", zip)

        console.log("AreaManager make(): reading settings file")
        const data = JSON.parse(await zip.file("area_settings.json").async("string"))
        console.log("AreaManager make(): reading settings file ok", { areaId, data, zip })



        return new ArchivedAreaManager(wssUrl, areaId, data, zip, possessionsMgr)
    }

    async getInitData(player: PlayerDataManager) {
        const playerData = await player.getInitData_http();

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

    async getDataForSector(x: number, y: number) {
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

    async getPlayerPosition(): Promise<PositionPixels> {
        const storedPos = await idbKeyval.get(`area-position-${this.areaId}`)
        if (storedPos) return storedPos;

        return this.getSpawnpoint()
    }
    async setPlayerPosition(pos: PositionPixels): Promise<void> {
        await idbKeyval.set(`area-position-${this.areaId}`, pos)
    }

    async getMinimapData_Tile(x: number, y: number) {
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

    async onWsConnection(player: PlayerDataManager, client) {
        console.log("received WS connection!", { client })

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

    async setCurrentSubarea(subareaName: string | null) {
        await idbKeyval.set(`area-current-subarea-${this.areaGroupId}`, subareaName)
    }

    async onWsMessage(player: PlayerDataManager, client: Client, msg: String | ArrayBuffer) {
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
                        const subareaName = parsedMsg.data.tol;
                        const subareaId = await findSubareaFor(this.areaUrlName, this.areaGroupId, subareaName);

                        // NOTE: there are rare edge cases where there's actually a subarea with the same name as the current area. I'm going to ignore these
                        // TODO: this might break if the area name is spelled using the areaRealName instead of the areaUrlName!
                        if (subareaName === this.areaUrlName) {
                            console.log("player asked to teleport to main area!")
                            this.setCurrentSubarea(null)
                            client.postMessage({
                                m: "WS_MSG",
                                data: toClient({
                                    m: msgTypes.TELEPORT,
                                    data: {
                                        rid: player.rid,
                                        gun: null,
                                    }
                                })
                            });
                        } 
                        else if (subareaId) {
                            console.log(`subarea named "${subareaName} (id: "${subareaId}") found!`)
                            this.setCurrentSubarea(subareaId)
                            client.postMessage({
                                m: "WS_MSG",
                                data: toClient({
                                    m: msgTypes.TELEPORT,
                                    data: {
                                        rid: player.rid,
                                        gun: null,
                                    }
                                })
                            });
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
                                        rid: player.rid,
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
                    player.setAttachment(ats, ati)
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
                                uid: player.rid, // TODO
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



// TODO refactor this
const getAreaManagerClassForAreaId = async (areaId) => {
    const db = await dbPromise;
    const areaData = await db.area_getData(areaId);
    if (areaData) {
        return ArchivedAreaManager;
    }

    // TODO
    for (const area of Object.values(bundledAreasFile)) {
        if (area.areaId === areaId) {
            return ArchivedAreaManager;
        }

        if (Object.values(area.subareas).includes(areaId)) {
            return ArchivedAreaManager;
        }
    }

    return LocalAreaManager;
}


class AreaManagerManager {
    wssCount = 0;
    areaManagerByWSSUrl = new Map();
    areaManagerByAreaId = new Map();
    areaPossessionsMgr: any;

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

        const amClass = await getAreaManagerClassForAreaId(areaId)
        const am = await amClass.make(wssUrl, areaId, this.areaPossessionsMgr)

        this.areaManagerByWSSUrl.set(wssUrl, am)
        this.areaManagerByAreaId.set(areaId, am)

        return am;
    }

    async getByWSSUrl(/** @type { string } */ wssUrl) {
        console.warn("amm: getByWssUrl", wssUrl)

        const am = this.areaManagerByWSSUrl.get(wssUrl);
        if (am) return am;
        else return await this.makeAreaManager("shouldnthappen_" + String(Date.now()));
    }

    async getByAreaId(areaId: string) {
        console.log("AreaManagerManager: getByAreaId()", areaId)

        const am = this.areaManagerByAreaId.get(areaId);
        if (am) return am;
        else return await this.makeAreaManager(areaId);
    }

    async getByAreaName(player: PlayerDataManager, areaUrlName: string) {
        console.log("AreaManagerManager: getByAreaName()", areaUrlName)

        const db = await dbPromise;
        const areaData = await db.area_getDataByAun(areaUrlName);

        if (!areaData) {
            console.warn("getByAreaName(): unknown area!")
            return this.makeAreaManager("unknownarea_" + String(Date.now()));
        }

        const areaGroupId = areaData.gid;
        const currentAreaId = await getAreaOrSubareaIdFor(player, areaGroupId)
        console.log("AreaManagerManager: getByAreaName()", `player is currently in (sub)area ${currentAreaId} of area ${areaGroupId}(${areaUrlName})`)
        return await this.getByAreaId(currentAreaId)
    }
}









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


const makeFakeAPI = async (
    areaManagerMgr: AreaManagerManager,
    areaPossessionsMgr: AreaPossessionsManager,
) => {
    const db = await dbPromise;
    const router = this.router = makeRouter(matchPath)


    // #region routes


        // Area init
        router.post("/j/i/", async ({ player, json, request, }) => {
            const data: any = await readRequestBody(request)
            
            console.log("getting area manager for area", data)

            // TODO fix player handling
            const areaManager = await areaManagerMgr.getByAreaName(player, data.urlName);
            const areaData = await areaManager.getInitData(player, data.urlName);

            //clientIdToAreas.set(clientId, data.urlName)

            console.log("sending area data", { areaData, areaManager })
            
            return json(areaData)
        });

        // item data
        router.get("/j/i/def/:creationId", async ({ params }) => {
            const { creationId } = params;

            return await cache.getCreationDefRes(creationId)
        })




        // #region User
        // Friends And Blocked
        router.get("/j/u/fab/", ({ json }) => json({ "friends":[],"blocked":[] }) );
        // GetFreshRank
        router.post("/j/u/gfr/", ({ json }) => json( 10 ) );
        // Achievement
        router.post("/j/u/a/", async ({ json, request, clientId }) => {
            const schema = z.object({ id: z.string() })
            const { id } = schema.parse(await readRequestBody(request))

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
        router.post("/j/u/pi/", async ({ json, request, player }) => {
            const { id, planeId, areaId } = await readRequestBody(request)

            console.log("aaa", id, await player.getProfileData())
            if (player.rid === id) {
                return json( await player.getProfileData() );
            } else {
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
            }
        })
        // Get Icon (Writable Icon)
        // Loaded from /image/541b03cf44aff03338610fce.png for some reason?
        router.get("/j/u/gi/:userId", async ({ params, json }) => {
          return json({
            "iconId": "541b03cf44aff03338610fce"
          });
        })
        // Player Status
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
          const randomAvatars = ["00000000000000000000056e","00000000000000000000087f","00000000000000000000074e","00000000000000000000105e","00000000000000000000023e","00000000000000000000007e","00000000000000000000052e","00000000000000000000101e","00000000000000000000029e","00000000000000000000022e","00000000000000000000141e","00000000000000000000084e","00000000000000000000097e","00000000000000000000053e","00000000000000000000119e","00000000000000000000106e","00000000000000000000043e","00000000000000000000002f","00000000000000000000003e","00000000000000000000117f","00000000000000000000092f","00000000000000000000111e","00000000000000000000042e","00000000000000000000065e","00000000000000000000046e","00000000000000000000018f","00000000000000000000029f","00000000000000000000010f","00000000000000000000058e","00000000000000000000048f","00000000000000000000034e","00000000000000000000048e","00000000000000000000054e","00000000000000000000118e","00000000000000000000098e","00000000000000000000138e","00000000000000000000089e","00000000000000000000055f","00000000000000000000130f","00000000000000000000025f","00000000000000000000047f","00000000000000000000098f","00000000000000000000087e","00000000000000000000130e","00000000000000000000043f","00000000000000000000065f","00000000000000000000006e","00000000000000000000124f","00000000000000000000139f","00000000000000000000054f","00000000000000000000127f","00000000000000000000131e","00000000000000000000066e","00000000000000000000026f","00000000000000000000097f","00000000000000000000090e","00000000000000000000059f","00000000000000000000131f","00000000000000000000089f","00000000000000000000135f","00000000000000000000035f","00000000000000000000107e","00000000000000000000134f","00000000000000000000076e","00000000000000000000027e","00000000000000000000133f","00000000000000000000114e","00000000000000000000100e","00000000000000000000109e","00000000000000000000129e","00000000000000000000135e","00000000000000000000009e","00000000000000000000068f","00000000000000000000041e","00000000000000000000033e","00000000000000000000080e","00000000000000000000034f","00000000000000000000139e","00000000000000000000122e","00000000000000000000075e","00000000000000000000031e","00000000000000000000116e","00000000000000000000002e","00000000000000000000080f","00000000000000000000005e","00000000000000000000108e","00000000000000000000104f","00000000000000000000050e","00000000000000000000071f","00000000000000000000031f","00000000000000000000078e","00000000000000000000083e","00000000000000000000024f","00000000000000000000113e","00000000000000000000137e","00000000000000000000021e","00000000000000000000108f","00000000000000000000063e","00000000000000000000057e","00000000000000000000125e","00000000000000000000025e","00000000000000000000112f","00000000000000000000076f","00000000000000000000115f","00000000000000000000045f","00000000000000000000007f","00000000000000000000049f","00000000000000000000016e","00000000000000000000004f","00000000000000000000000e","00000000000000000000132f","00000000000000000000099e","00000000000000000000075f","00000000000000000000030f","00000000000000000000069e","00000000000000000000024e","00000000000000000000014f","00000000000000000000060f","00000000000000000000085e","00000000000000000000066f","00000000000000000000124e","00000000000000000000058f","00000000000000000000128e","00000000000000000000114f","00000000000000000000094e","00000000000000000000035e","00000000000000000000073f","00000000000000000000067e","00000000000000000000020e","00000000000000000000078f","00000000000000000000057f","00000000000000000000040f","00000000000000000000141f","00000000000000000000001f","00000000000000000000028e","00000000000000000000095f","00000000000000000000127e","00000000000000000000047e","00000000000000000000013e","00000000000000000000074f","00000000000000000000004e","00000000000000000000011f","00000000000000000000119f","00000000000000000000095e","00000000000000000000070f","00000000000000000000042f","00000000000000000000133e","00000000000000000000019f","00000000000000000000052f","00000000000000000000070e","00000000000000000000137f","00000000000000000000067f","00000000000000000000053f","00000000000000000000110e","00000000000000000000117e","00000000000000000000104e","00000000000000000000006f","00000000000000000000001e","00000000000000000000022f","00000000000000000000113f","00000000000000000000106f","00000000000000000000032e","00000000000000000000060e","00000000000000000000100f","00000000000000000000096e","00000000000000000000009f","00000000000000000000061e","00000000000000000000129f","00000000000000000000086e","00000000000000000000103e","00000000000000000000091f","00000000000000000000134e","00000000000000000000010e","00000000000000000000033f","00000000000000000000102f","00000000000000000000073e","00000000000000000000041f","00000000000000000000044f","00000000000000000000055e","00000000000000000000084f","00000000000000000000120f","00000000000000000000110f","00000000000000000000101f","00000000000000000000013f","00000000000000000000091e","00000000000000000000094f","00000000000000000000136f","00000000000000000000044e","00000000000000000000079f","00000000000000000000062f","00000000000000000000059e","00000000000000000000079e","00000000000000000000028f","00000000000000000000077e","00000000000000000000128f","00000000000000000000093e","00000000000000000000088f","00000000000000000000105f","00000000000000000000069f","00000000000000000000088e","00000000000000000000023f","00000000000000000000107f","00000000000000000000138f","00000000000000000000123e","00000000000000000000017e","00000000000000000000083f","00000000000000000000068e","00000000000000000000012f","00000000000000000000000f","00000000000000000000056f","00000000000000000000071e","00000000000000000000118f","00000000000000000000021f","00000000000000000000026e","00000000000000000000121e","00000000000000000000008f","00000000000000000000093f","00000000000000000000077f","00000000000000000000049e","00000000000000000000050f","00000000000000000000140f","00000000000000000000122f","00000000000000000000037f","00000000000000000000011e","00000000000000000000111f","00000000000000000000064f","00000000000000000000064e","00000000000000000000039e","00000000000000000000036f","00000000000000000000115e","00000000000000000000096f","00000000000000000000017f","00000000000000000000012e","00000000000000000000109f","00000000000000000000019e","00000000000000000000085f","00000000000000000000140e","00000000000000000000125f","00000000000000000000046f","00000000000000000000132e","00000000000000000000120e","00000000000000000000036e","00000000000000000000103f","00000000000000000000082e","00000000000000000000051f","00000000000000000000003f","00000000000000000000020f","00000000000000000000040e","00000000000000000000123f","00000000000000000000015e","00000000000000000000018e","00000000000000000000016f","00000000000000000000039f","00000000000000000000121f","00000000000000000000008e","00000000000000000000051e","00000000000000000000027f","00000000000000000000061f","00000000000000000000030e","00000000000000000000045e","00000000000000000000063f","00000000000000000000092e","00000000000000000000099f","00000000000000000000090f","00000000000000000000102e","00000000000000000000081e","00000000000000000000136e","00000000000000000000072f","00000000000000000000038e","00000000000000000000014e","00000000000000000000082f","00000000000000000000037e","00000000000000000000015f","00000000000000000000126f","00000000000000000000126e","00000000000000000000062e","00000000000000000000032f","00000000000000000000081f","00000000000000000000072e","00000000000000000000005f","00000000000000000000086f","00000000000000000000038f","00000000000000000000116f","00000000000000000000112e"].sort(() => Math.random() - 0.5).slice(0, params.count);
          
          return json(randomAvatars);
        })

        // TopCreatedR
        router.get("/j/i/tcr/:playerId", async ({ params, json }) => {
            return json([]);
        });

        // SetUserSetting this is a amogus refernece
        router.post("/j/u/sus/", async ({ json, request, player }) => {
            const settingNamesEnum = z.enum([
                "doPlaySound",
                "showMainUI",
                "fullscreen",
                "alwaysOnTop",
                "travelHolderId",
                "shortcutWritableId",
                "shortcutWearableId",
                "panelColor",
                "collectedTabItemId",
                "createdTabItemId",
                "searchTabItemId",
                "hideInFriendsList",
                "onlyFriendsCanPingUs",
                "blockImagePastes",
                "blockVideoPastes",
                "keyboardCountry",
                "disallowSandboxItemsByOthers",
                "hidePainterBack",
                "usePanelColorForOtherDialogs",
                "showBlockedPeopleSpeech",
                "photosensitiveGuard",
                "guardToTeleports",
                "glueWearable",
                "glueHoldable",
                "glueMountable",
                "wearablePlusFollows",
            ]);
            const schema = z.object({ name: settingNamesEnum, value: z.string(), }).required();
            const data = schema.parse(await readRequestBody(request));


            await db.player_setSetting(player.rid, data.name, data.value)

            return json({ ok: true });
        })

        // #endregion User


        // #region Writable
        
        router.post("/j/f/ge", async ({ request, json }) => {
          const { forumId, startDate, endDate } = await readRequestBody(request)
          return json({ events: [] });
        });
        
        // Get Settings (for Forum)
        router.post("/j/f/gs", async ({ request, json }) => {
          const { id } = await readRequestBody(request)
          const writableConfig = {
            name: "Todo Writable",
            areaGroupId: "544fe6976e52f57f4d85702b", // stockpile
            rgbBackground: "6,85,53",
            rgbText: "176,176,176",
            onlyEditorsCanRead: false,
            onlyEditorsCanAddComments: false,
            onlyEditorsCanAddThreads: false,
            isBannedFromAssociatedArea: false,
            isEditorOfAssociatedArea: false,
            postKeyRequired: false
          }
          return json(writableConfig);
        });
        // Get Forum
        router.post("/j/f/gf", async ({ request, json }) => {
          const { id } = await readRequestBody(request)
          const threads = {
            threads: [
              {
                _id: "651a84b50fa36061e9e6b488",
                userId: "5003d713a0b60c386b0000a1",
                userName: "philipp",
                title: "STATUS UPDATE: BUDGET ISSUES",
                firstCommentId: "651a84b50fa36061e9e6b489",
                sticky: true,
                locked: false,
                hasEvent: false,
                lastComment: {
                  content: null,
                  userName: "username",
                  userId: generateObjectId(),
                  ts: "2023-11-01T06:44:47.796Z",
                  id: "6541f3df633fc2043f3dd143"
                },
                ts: "2023-10-02T08:52:05.814Z"
              },
              {
                _id: generateObjectId(),
                userId: "000000000000000000000000",
                userName: "ToDo",
                title: "ToDo",
                firstCommentId: generateObjectId(),
                sticky: false,
                locked: false,
                hasEvent: false,
                lastComment: {
                  content: null,
                  userName: "Todo",
                  userId: "000000000000000000000000",
                  ts: new Date().toISOString(),
                  id: generateObjectId()
                },
                ts: new Date().toISOString()
              }
            ],
            time: new Date().toISOString()
          }
          return json(threads);
        });
        // Get Contents
        router.post("/j/f/gc", async ({ request, json }) => {
          const { id } = await readRequestBody(request)
          const contents = {
            comments: [
              {
                _id: "651a84b50fa36061e9e6b489",
                userId: "5003d713a0b60c386b0000a1",
                userName: "philipp",
                content: "Hi all! This is just a recap that we're facing budget issues. It's been a longstanding issue, but this year, our server provider Linode upped the prices quite a bit again. So at the moment, we're deep in the minus every month.\n\nThe main revenue stream right now are ad views, which depend on how many people there are, mostly. Minfinity does not make up a relevant portion of revenues, and we don't believe we can grow that part much at the current situation (though thanks to those who get Minfinity).\n\nWhile we had many discussions in the past of how to resolve the revenues issue, this post was mainly meant as a status update so you are all informed. Thanks everyone and much love!",
                newestLikes: [
                  {
                    n: "todo",
                    id: "000000000000000000000000",
                  }
                ],
                oldestLikes: [
                  {
                    n: "Another Player",
                    id: generateObjectId()
                  }
                ],
                totalLikes: 1,
                items: [
                  ""
                ],
                ts: "2023-10-02T08:52:05.822Z"
              },
              {
                _id: generateObjectId(),
                userId: "000000000000000000000000",
                userName: "todo",
                content: "hello, world!",
                newestLikes: [],
                oldestLikes: [
                  {
                    n: "philipp",
                    id: "5003d713a0b60c386b0000a1"
                  }
                ],
                totalLikes: 3,
                items: [],
                ts: "2023-10-02T09:36:31.764Z"
              }
            ],
            time: "2023-11-12T02:31:00.506Z"
          }
          return json(contents);
        });
        
        // #endregion Writable


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
        router.post("/j/i/c/", async ({ player, request, json }) => {
            const { itemData } = await readRequestBody(request)
            const { itemId } = await saveCreation(player, itemData, cache)

            return json( { itemId: itemId });
        });

        // Delete
        router.post("/j/i/d/", async ({ player, request, json }) => {
            const { itemId } = await readRequestBody(request)

            await player.inv_delCreated(itemId);

            return json( { ok: true } );
        });

        // Motions
        router.get("/j/i/mo/:creationId", async ({ params, json }) => {
            const { creationId } = params;
            const inDb = await db.creation_getMotionData(creationId)

            if (inDb) { return json(inDb); }
            else { return json({ ids: [], midpoint: 0 }); }
        });

        // Statistics
        router.get("/j/i/st/:creationId", async ({ params, json }) => {
            const { creationId } = params;
            const inDb = await db.creation_getStats(creationId)

            if (inDb) { return json(inDb); }
            else { return json({ timesCd: 19, timesPd: 19 }); }
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

        // Painter data
        router.get("/j/i/datp/", async ({ params, json }) => {
            const { creationId } = params;
            const inDb = await db.creation_getPainterData(creationId)

            if (inDb) { return json(inDb); }
            else { return Response.error(); }
        });
        // #endregion Items

        // #region holders
        // Get Content
        router.get("/j/h/gc/:creationId", async ({ params, json }) => {
            const { creationId } = params;
            const inDb = await db.creation_getHolderContent(creationId)

            if (inDb) { return json(inDb); }
            else { return Response.error(); }
        });

        // Set Content
        // calls to this endpoint are batched per-page, and the entire page is sent at once for both add and delete
        router.get("/j/h/sc/", async ({ request, player, json }) => {
            const schema = z.object({
                holderId: z.string(),
                pageNo: z.coerce.number(),
                contents: z.object({
                    itemId: z.string(),
                    x: z.coerce.number(),
                    y: z.coerce.number(),
                    z: z.coerce.number(),
                    pageNo: z.coerce.number(),
                }).array()
            }).required();

            const data = schema.parse(await readRequestBody(request))

            const content = await db.creation_getHolderContent(data.holderId);

            // TODO
            return Response.error();
        });
        // #endregion holders

        // #region multis
        router.get("/j/t/gt/:creationId", async ({ params, json }) => {
            const { creationId } = params;
            const inDb = await db.creation_getMultiData(creationId)

            if (inDb) { return json(inDb); }
            else { return Response.error(); }
        });
        // #endregion holders



        // #region Collections
        // Get collected
        router.get("/j/c/r/:start/:end", async ({ player, params, json }) => {
            const data = await player.inv_getCollectedPage(Number(params.start), Number(params.end))
            return json(data)
        });

        // Collect
        router.post("/j/c/c", async ({ player, request, json }) => {
            const data = await readRequestBody(request)

            const { alreadyExisted } = await player.inv_collect(data.itemId, data.index)

            return json({
                alreadyExisted: alreadyExisted,
                actionWasBlocked: false,
            });
        });

        // Delete
        router.post("/j/c/d", async ({ player, request, json }) => {
            const { itemId } = await readRequestBody(request)

            await player.inv_delCollect(itemId)

            // TODO: what does the server actually returns?
            return json( true );
        });

        // Check if Collected
        router.get("/j/c/check/:itemId/", async ({ player, params, json }) => {
            return json( (await player.inv_getAllCollects()).includes(params.itemId) )
        });

        // Check if I Flagged Item (always returns false for now)
        router.get("/j/i/chkf/:itemId", ({ json }) => json( false ));


        // Get Created
        router.get("/j/i/gcr/:start/:end", async ({ player, params, json }) => {
            const data = await player.inv_getCreatedPage(Number(params.start), Number(params.end))
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
        
        router.post("/j/mf/grm/", async ({ player, request, json }) => {
          const body = await readRequestBody(request)
          
          var miftData = {
            results: [{
              _id: generateObjectId(),
              fromId: generateObjectId(),
              fromName: "TODO",
              toId: player.rid,
              itemId: "57286c91b19fff08136aa4a5",
              text: "TODO",
              deliverySeenByRecipient: false,
              ts: new Date().toISOString()
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
            const schema = z.object({ s: z.string(), a: z.coerce.string(), p: z.coerce.number() })
            const body = schema.parse(await readRequestBody(request))

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

        // #region boosts
        // Get Association
        router.post("/j/bo/ga/", async ({ json, player }) => {
            return json({ associations: await db.player_getBoostAssociations(player.rid) })
        });
        // Set Association
        router.post("/j/bo/sa/", async ({ json, player, request }) => {
            const schema = z.object({ name: z.string(), id: z.string(), }).required();
            const data = schema.parse(await readRequestBody(request));

            await db.player_setBoostAssociation(player.rid, data.name, data.id);

            return json({ ok: true })
        });
        // #endregion boosts


        // Catch-all
        router.get("/j/:splat+", ({ event }) => {
            console.log("FETCH no match for", event.request.url)
            return new Response("Not found or not implemented", { status: 404 })
        })
        router.post("/j/:splat+", ({ event }) => {
            console.log("FETCH no match for", event.request.url)
            return new Response("Not found or not implemented", { status: 404 })
        })

    // #endregion routes

    const handle = async (method: "GET" | "POST", pathname: string, event: FetchEvent, player: PlayerDataManager) => {
        console.log("FakeAPI.handle()", method, pathname, event);
        return await router.matchRoute(method, pathname, event, player);
    }

    return handle;
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
const fakeAPIPromise = makeFakeAPI(areaManagerMgr, areaPossessionsMgr);

/***
 *     ██████   ██████  ██    ██ ████████ ██ ███    ██  ██████  
 *     ██   ██ ██    ██ ██    ██    ██    ██ ████   ██ ██       
 *     ██████  ██    ██ ██    ██    ██    ██ ██ ██  ██ ██   ███ 
 *     ██   ██ ██    ██ ██    ██    ██    ██ ██  ██ ██ ██    ██ 
 *     ██   ██  ██████   ██████     ██    ██ ██   ████  ██████  
 */
//#region main_routing

const handleFetchEvent = async (event: FetchEvent): Promise<Response> => {
    try {
        const url = new URL(event.request.url);
        console.log("FETCH", event.clientId, event.request.url, { event })

        if (url.host === originUrl.host || ["static.manyland.com"].includes(url.hostname)) {
            // TODO: properly handle cache, following best practices. Cache the .html pages, and set up a mechanism to properly update them when they change + reload the client

            if (url.pathname === "/") {
                // TODO: why is this cached??
                const res = await fetch("/index.html?cachebust=" + Date.now());
                console.log("asked for mainscreen, sending", await res.clone().text())
                return res;
            }
            if (url.pathname === "/exporter" || url.pathname === "/exporter.html") {
                const res = await fetch("/exporter.html?cachebust=" + Date.now());
                return res;
            }
            if (url.pathname.startsWith("/_code/")) return fetch(event.request);
            // TODO: rename this, since there's an area named "static" lol
            if (url.pathname.startsWith("/static/data/area-thumbnails/")) return cache.getAreaThumbRes(event.request);
            if (url.pathname.startsWith("/static/")) return cache.getOrSetFromCache(CACHE_NAME, event.request);
            if (url.pathname.startsWith("/image/")){
              const creationId = url.pathname.slice(1)
              return await cache.getCreationSpriteRes(creationId)
            }
            // Why is the painter fetched at /media/painter/spritesheet.png instead of using window.staticroot...?
            // Oops, my fault, if the mlenv is set to test, it tries to load the painter from /media/painter instead of //static.manyland.com!
            if (url.pathname === "/media/painter/spritesheet.png") return cache.getOrSetFromCache(CACHE_NAME, new Request(self.origin + "/static/media/painter/spritesheet.png"));
            if (url.pathname === "/media/painter/cursor_floodFill.png") return cache.getOrSetFromCache(CACHE_NAME, new Request(self.origin + "/static/media/painter/cursor_floodFill.png"));
            if (url.pathname === "/media/painter/cursor_pickColor.png") return cache.getOrSetFromCache(CACHE_NAME, new Request(self.origin + "/static/media/painter/cursor_pickColor.png"));

            if (url.pathname.startsWith("/j/")) {
                const db = await dbPromise;
                const fakeAPI_handle = await fakeAPIPromise;
                // TODO: do we want to handle different player ids for different clients? Let's just keep things simple for now
                const player = await PlayerDataManager.make(idbKeyval, db);
                const method = event.request.method as Method;

                return await fakeAPI_handle(method, url.pathname, event, player)
            }

            if (url.pathname.startsWith("/sct/")) {
                const maptilesCache = await caches.open("MAP_TILES_V1");
                return await maptilesCache.match(url);
            }





            // TODO get this from a file (and update it)
            // TODO: the file should be "curated areas" and all these areas are static files on a CDN.
            // For online.offlineland.io, the list of areas would come from the server so that the creator can update it?
            if (url.pathname === "/_mlspinternal_/getdata") {
                return Response.json(await getAvailableAreas());
            }

            if (url.pathname === "/_mlspinternal_/getversion") {
                return Response.json(SW_VERSION);
            }

            // TODO: use events instead?
            if (url.pathname === "/_mlspinternal_/dlArea") {
                const areaName = url.searchParams.get("area");
                return await makeBundledAreaAvailableOffline(areaName);
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
            return await cache.getCreationSpriteRes(creationId)
        }
        // With the current settings, the game should query /def instead of the CDN
        if (url.hostname === cache.CLOUDFRONT_ROOT_ITEMDEFS) {
            const creationId = url.pathname.slice(1);

            return await cache.getCreationDefRes(creationId)
        }

        return new Response("No rules match this request!", { status: 404 })
    } catch(e) {
        console.error("Error handling request", e)
        return Response.error()
    }
};

//#endregion main_routing



const handleDataImport = async (file: File, key, client: Client) => {
    if (file.type !== "application/zip") {
        console.warn("file is not a zip")
        client.postMessage({ m: "IMPORT_ERROR", data: { key, error: "This file is not a zip! How did you get this thing in here!" } })
        return;
    }

    try {
        console.log("loading zip");
        client.postMessage({ m: "IMPORT_STARTED", data: { key } })
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        console.log("loading zip ok", zip);

        const db = await dbPromise;

        if (zip.file("profile.json")) {
            try {
                const profile = await importPlayerData(zip, db, cache);
                client.postMessage({ m: "IMPORT_COMPLETE", data: { key, message: `Sucessfully imported player data. Welcome to Offlineland, ${profile.screenName}!` } })
            }
            catch(e) {
                client.postMessage({ m: "IMPORT_ERROR", data: { key, error: "Error importing player data: " + e.message } })

            }
        }
        else if (zip.file("area_settings.json")) {
            const data = await importAreaData(zip, db, cache);
            client.postMessage({ m: "IMPORT_COMPLETE", data: { key, message: `Sucessfully imported area data "${data.arn}"!` } })
        }
        else {
            client.postMessage({ m: "IMPORT_ERROR", data: { key, error: `This "${file.name}" file does not look like a manyland export.` } })
        }
    } catch(e) {
        console.error("error processing data!", e);
    }
}



const handleClientMessage = async (event: ExtendableMessageEvent) => {
    try {
        const message = event.data;
        const client = event.source as Client;
        const db = await dbPromise;

        //console.log("MSG", client.id, message, { event })
        if (message.m === "WSMSG") {
            const { areaId } = message.data;
            const amgr = await areaManagerMgr.getByAreaId(areaId)
            const player = await PlayerDataManager.make(idbKeyval, db);

            await amgr.onWsMessage(player, client, message.data.msg)
        }
        else if (message.m === "PLS_OPEN_WS") {
            console.log("client sent PLS_OPEN_WS!", message)

            const wsUrl = new URL(message.data.wsUrl);
            const amgr = await areaManagerMgr.getByWSSUrl(wsUrl.host)
            const player = await PlayerDataManager.make(idbKeyval, db);

            await amgr.onWsConnection(player, client)
        }
        else if (message.m === "DATA_IMPORT") {
            console.log("client sent DATA_IMPORT!", message);

            event.waitUntil(handleDataImport(message.data.file, message.data.key, client));
        }
        else {
            console.warn("Unhandled event", message)
        }
    } catch(e) {
        console.error("MSG: error processing message!", { message: event.data, error: e })
    }
};

//#endregion main



// #region boilerplate


const onInstall = async (/** @type {ExtendableEvent} */ event) => {
    try {
        console.log("service worker install event")

        // TODO: create cache for sounds and other static assets
        // TODO: create cache for code, update it on load
        await makeBundledAreaAvailableOffline("chronology");
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
)

// #endregion boilerplate
