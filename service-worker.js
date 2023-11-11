// Avoid crashing when running `bun run service-worker.js` or `deno run service-worker.js`. This allows me to check for syntax errors
if (typeof importScripts === "undefined") {
    globalThis.importScripts = () => {};
}
if (typeof URL === "undefined") {
    class URL {}
}
let originUrl = new URL("http://localhost")
if (self.origin) originUrl = new URL(self.origin)


// #region libs


/*
Firefox does not handle ES import/export syntax in service workers (see https://bugzilla.mozilla.org/show_bug.cgi?id=1360870).
The only thing available is `importScripts`, which syncronously runs a separate script.
I could make classes in separate files and use them here, but then my editor would lose track of them and their types.
*/



importScripts("/static/libs/path-to-regexp.js");

/**
 * @global
 * @name Qs
*/
// This thing is fine to import directly because browserify bundles it in an UMD snippet. It becomes avaiable as `Qs` globally.
// TODO: bundle the other things the same way? Or use an AMD loader?
importScripts("/static/libs/qs.js");


/**
 * @global
 * @name JSZip
*/
importScripts("/static/libs/jszip.js");

// #endregion libs













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

const ringAreas = ["0", "1", "2", "3", "4", "5", "6", "7", "8"]

const bundledAreasFile = {
    //"test2": {
    //    areaId: "53ed27dfb3f6f9c3205157e1",
    //},
    //"chronology": {
    //    areaId: "56ed2214c94d7b0e132538b9",
    //},
    "gemcastle": {
        areaId: "541b035c44aff03338610fca",
    },
    //"sandcastle": {
    //    areaId: "5522c6f01c963d1308f12e0a",
    //    subareas: {
    //        "the castle": "5523f96cab0f5a3e0c353aab",
    //    },
    //},
}

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
    }

    getInitData_http() {
        return {
            "rid": this.rid,
            "age": this.isBacker,
            "ifa": this.isFullAccount,
            "lma": this.leftMinfinityAmount,
            "isb": this.isBacker,
            "bbl": this.boostsLeft,
            "hmf": this.hasMinfinity,
        }
    }

    getInitData_ws() {
        return {
            "rid": this.rid,
            "snm": this.name,
            "aid":"80-1-1-f",
            "att":{
                "b":"00000000000000000000074f",
                "w":null,
                "m":null,
                "h":"00000000000000000000074f",
                "br":null
            },
            "r":10,
            "pos":{"x":288,"y":288},
            "ani":"idle",
            "flp":false,
            "wof":{
                "w":{"x":0,"y":0},"h":{"x":0,"y":0},"wp":{"x":0,"y":0}
            },
            "shs":{}
        }
    }
}


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

    getInitData(player, urlName) {
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

    onWsConnection(client) {
        const player = getPlayerForClient(client.id);

        client.postMessage({ m: "WS_OPEN" });
        const initDataMsg = JSON.stringify({
            "m":"on",
            "data":{
                ...player.getInitData_ws(),

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
            // TODO the de-minification is a bit more complex!
            // TODO actually handle messages
            console.log("onWsMessage()", minificationMappingClientToServer(msg))
        else {
            // TODO read binary messages
            console.log("onWsMessage() binary", msg)
        }
    }
}



class ArchivedAreaManager {
    clients = new Set();

    constructor(wssUrl, areaId, data, zip) {
        this.zip = zip;
        this.wssUrl = wssUrl;
        this.areaId = areaId;

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

    static async make(wssUrl, areaId) {
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

        // TODO: load creation data to cache
        // TODO: load sector data to database?

        return new ArchivedAreaManager(wssUrl, areaId, data, zip)
    }

    getInitData(player, urlName) {
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
                // AreaPossessions TODO
                aps: { ids: null, values: null }, 

                axx: this.isLocked,
                aul: this.isUnlisted,
                spe: this.isSinglePlayerExperience,
                ece: this.explorerChatAllowed,
                mpv: this.mpvr,
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

    onWsConnection(client) {
        const player = getPlayerForClient(client.id);

        client.postMessage({ m: "WS_OPEN" });
        const initDataMsg = JSON.stringify({
            "m":"on",
            "data":{
                ...player.getInitData_ws(),

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

    onWsMessage(client, msg) {
        if (typeof msg === "string")
            // TODO the de-minification is a bit more complex!
            // TODO actually handle messages
            console.log("onWsMessage()", minificationMappingClientToServer(msg))
        else {
            // TODO read binary messages
            console.log("onWsMessage() binary", msg)
        }
    }
}

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

    async makeAreaManager(areaId) {
        console.log("AreaManagerManager: makeAreaManager()", areaId)
        const wssUrl = `ws191919x${String(this.wssCount++)}.ws.manyland.local`;

        const amClass = getAreaManagerClassForAreaId(areaId)
        const am = await amClass.make(wssUrl, areaId)

        this.areaManagerByWSSUrl.set(wssUrl, am)
        this.areaManagerByAreaId.set(areaId, am)

        return am;
    }

    async getByWSSUrl(wssUrl) {
        console.log("amm: getByWssUrl", wssUrl)
        const am = this.areaManagerByWSSUrl.get(wssUrl);
        if (am) return am;
        else return await this.makeAreaManager("shouldnthappen_" + String(Date.now()));
    }

    async getByAreaId(areaId) {
        const am = this.areaManagerByAreaId.get(areaId);
        if (am) return am;
        else return await this.makeAreaManager(areaId);
    }
}





const generateObjectId_ = (timestamp, machineId, processId, counter) => {
  const hexTimestamp = Math.floor(timestamp / 1000).toString(16).padStart(8, '0');
  const hexMachineId = machineId.toString(16).padStart(6, '0');
  const hexProcessId = processId.toString(16).padStart(4, '0');
  const hexCounter = counter.toString(16).padStart(6, '0');

  return hexTimestamp + hexMachineId + hexProcessId + hexCounter;
}
let objIdCounter = 0;
const generateObjectId = () => generateObjectId_(Date.now(), 0, 0, objIdCounter++)




const areaManagerMgr = new AreaManagerManager();

// TODO
const defaultPlayer = new Player({ name: "explorer 123" });
const getPlayerForClient = (clientId) => defaultPlayer;
// TODO
const getAreaIdForAreaName = (areaUrlName) => {
    const areaData = bundledAreasFile[areaUrlName]

    if (areaData) return areaData.areaId;
    else return generateObjectId();
}
// TODO
const getAreaManagerFor = async (clientId, areaUrlName) => {
    // TODO: handle subareas eventually (maybe via url?)
    const areaId = getAreaIdForAreaName(areaUrlName);
    return await areaManagerMgr.getByAreaId(areaId)
}









// #endregion State




//  WWWWWWWW                           WWWWWWWW    SSSSSSSSSSSSSSS 
//  W::::::W                           W::::::W  SS:::::::::::::::S
//  W::::::W                           W::::::W S:::::SSSSSS::::::S
//  W::::::W                           W::::::W S:::::S     SSSSSSS
//   W:::::W           WWWWW           W:::::W  S:::::S            
//    W:::::W         W:::::W         W:::::W   S:::::S            
//     W:::::W       W:::::::W       W:::::W     S::::SSSS         
//      W:::::W     W:::::::::W     W:::::W       SS::::::SSSSS    
//       W:::::W   W:::::W:::::W   W:::::W          SSS::::::::SS  
//        W:::::W W:::::W W:::::W W:::::W              SSSSSS::::S 
//         W:::::W:::::W   W:::::W:::::W                    S:::::S
//          W:::::::::W     W:::::::::W                     S:::::S
//           W:::::::W       W:::::::W          SSSSSSS     S:::::S
//            W:::::W         W:::::W           S::::::SSSSSS:::::S
//             W:::W           W:::W            S:::::::::::::::SS 
//              WWW             WWW              SSSSSSSSSSSSSSS   
// #region WS

function minificationMappingClientToServer(string){
    var a = {"A" : '"vel":{"x":0,"y":0},"acl":{"x":0,"y":0},"ani":"idle","flp":false,"g":',"B" : '"vel":{"x":0,"y":0},"acl":{"x":0,"y":0},"ani":"idle","flp":true,"g":',"J" : '"m":"st","data":{"pos":{"x":',"C" : '"m":"sh","data":{"key":"_c',"D" : '","rotation":0,"flip":0},"',"&" : '"m":"rq","data":null}',"E" : '"m":"rm","data":null}',"F" : ',"def":null,"rId":"',"G" : '"vel":{"x":0,"y":0}',"H" : '"acl":{"x":0,"y":0}',"K" : '"m":"me","data":{',"~" : '"ani":"swimming',"L" : ',"def":{"tid":"',"M" : '"ani":"idle"',"N" : '"ani":"jump"',"O" : '"ani":"fall"',"P" : '"ani":"afk"',"Q" : '"ani":"run"',"R" : '"flp":false',"W" : '"pos":{"x":',"X" : '"acl":{"x":',"V" : '"vel":{"x":',"S" : '"flp":true',"T" : '"m":"hb"}',"U" : ',"data":{',"!" : '"act":',"@" : '"g":',"Y" : '"x":',"Z" : '"y":',"?" : '"}}',"%" : "}}","^" : "},","*" : '",',"=" : "1",";" : "2","<" : "3",">" : "4","(" : "0",")" : "5"};
    for(var i in a){
        string = replaceAll(string, i, a[i]);
    }
    return "{" + string;
}

function minificationMappingServerToClient(string){
    var a = {"A" : '"vel":{"x":0,"y":0},"acl":{"x":0,"y":0},',"B" : '"m":"mu","data":{"loc":{"x":',"C" : '"m":"st","data":{"rid":"',"/" : '"m":"sh","data":{"rid":"',"D" : '"m":"np","data":{',"E" : '"flp":false,"g":',"F" : '"flp":true,"g":',"G" : '"ani":"idle"',"H" : '"ani":"jump"',"J" : '"ani":"fall"',"O" : '"flp":false,',"K" : '"ani":"afk"',"L" : '"pos":{"x":',"M" : '"vel":{"x":',"N" : '"acl":{"x":',"P" : '"ani":"run"',"Q" : '"flp":true,',"R" : '"map":{"p":',"@" : '","data":{',"T" : '},"sta":0',"U" : '},"sta":1',"?" : '"key":"_',"V" : '"ach":"',"W" : '"rid":"',"X" : '"aid":"',"Y" : '"snm":"',"S" : '"wid":',"Z" : '"r":',"!" : '"x":',"#" : '"y":',">" : '"}}',"%" : "}}","^" : "},","*" : '",',"=" : "1",";" : "2","<" : "3","(" : "0",")" : "5"};
    for(var i in a){
        string = replaceAll(string, a[i], i);
    }
    if (string.substring(0, 1) == '{') { 
        string = string.substring(1);
    }
    return string;
}

function replaceAll(str, find, replace) {
    return str.toString().replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function escapeRegExp(str) {
    return str.toString().replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

// #endregion WS












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
// #region HTTP

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
 * @returns {any}
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
const routes = new Set();


/**
 * @typedef {Object} RouteHandlersBagOfTricks
 * @property {Object} params - Parameters for the path
 * @property {Event} event
 * @property {Request} request
 * @property {string} clientId
 * @property {(*) => Response} json
 */
/**
 * 
 * @param {"GET" | "POST"} method 
 * @param {string} matcher 
 * @param {(ctx: RouteHandlersBagOfTricks) => Response | Promise<Response>} handler 
 * @returns 
 */
const addRouteHandler = (method, matcher, handler) => routes.add({ method, matcher: matchPath(matcher), handler });

/**
 * 
 * @param {"GET" | "POST"} method 
 * @param {string} pathname 
 * @param {Event} event 
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
}


// #endregion basicrouterboilerplate



//  ██████   ██████  ██    ██ ████████ ███████ ███████ 
//  ██   ██ ██    ██ ██    ██    ██    ██      ██      
//  ██████  ██    ██ ██    ██    ██    █████   ███████ 
//  ██   ██ ██    ██ ██    ██    ██    ██           ██ 
//  ██   ██  ██████   ██████     ██    ███████ ███████ 
// #region routes

// Area init
addRouteHandler(POST, "/j/i/", async ({ json, request, clientId, }) => {
    const data = await readRequestBody(request)
    
    console.log("getting area manager for area", data)

    const areaManager = await getAreaManagerFor(clientId, data.urlName);
    const player = getPlayerForClient(clientId);
    const areaData = areaManager.getInitData(player, data.urlName);

    //clientIdToAreas.set(clientId, data.urlName)

    console.log("sending area data", { areaData, areaManager })
    
    return json(areaData)
});



// #region User
// Friends And Blocked
addRouteHandler(GET, "/j/u/fab/", ({ json }) => json({ "friends":[],"blocked":[] }) );
// GetFreshRank
addRouteHandler(POST, "/j/u/gfr/", ({ json }) => json( 10 ) );
// Achievement
addRouteHandler(POST, "/j/u/a/", async ({ json, request, clientId }) => {
    const { id } = await readRequestBody(request)
    return json({ ok: true, message: "I don't know how the real server answers but the client looks for a 200 so this is fine"});
})
// PlayerInfo
addRouteHandler(POST, "/j/u/pi/", async ({ json, request, clientId }) => {
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
// TopCreatedR
addRouteHandler(GET, "/j/i/tcr/:playerId", async ({ params, json }) => {
    return json([]);
});
// #endregion User




// #region Items
// ItemDef
const itemDefRoot_CDN  = "d2h9in11vauk68.cloudfront.net/"
addRouteHandler(GET, "/j/i/def/:creationId", ({ params, json }) => {
    if (typeof params.creationId === "string" && params.creationId.length === 24) {
        return fetch("https://" + itemDefRoot_CDN + params.creationId);
    }
    else return Response.error();
});
// Motions
addRouteHandler(GET, "/j/i/mo/:creationId", ({ params, json }) => json({ ids: [], midpoint: 0 }) );
// Statistics
addRouteHandler(GET, "/j/i/st/:creationId", async ({ params, json }) => {
    return json({ timesCd: 191919, timesPd: 191919 });
});
// CreatorInfoNaame
addRouteHandler(GET, "/j/i/cin/:creationId", async ({ params, json }) => {
    const creatorId = generateObjectId();
    return json({ id: creatorId, name: "todo" });
});
// Collectors
addRouteHandler(GET, "/j/i/cols/:creationId", async ({ params, json }) => {
    return json({
        collectors: [
            { _id: generateObjectId(), name: "todo" },
            { _id: generateObjectId(), name: "todo" },
            { _id: generateObjectId(), name: "todo" },
        ],
        lastCollector: { _id: generateObjectId(), name: "todo" },
    });
});
// GetUnlisted
addRouteHandler(POST, "/j/i/gu/", async ({ request, json }) => {
    const { id } = await readRequestBody(request)
    return json({ unlisted: false });
});
// #endregion Items



// #region Collections
// TODO proper inventory
// inventory - Collections
const inventory = [ groundId ]
// Get collected
addRouteHandler(GET, "/j/c/r/:start/:end", ({ params, json }) => json({ items: inventory, itemCount: 1 }) );
// Collect
addRouteHandler(POST, "/j/c/c", async ({ request, json }) => {
    const data = await readRequestBody(request)

    const alreadyExisted = inventory.includes(data.itemId);
    inventory.splice(data.index, 0, [ data.itemId ])

    return json({
        alreadyExisted: alreadyExisted,
        actionWasBlocked: false,
    });
});
// Get Created
addRouteHandler(GET, "/j/i/gcr/:start/:end", ({ params, json }) => json({ items: [ groundId ], itemCount: 1 }) );
// #endregion Collections



// #region Search
// Search Item
addRouteHandler(POST, "/j/s/i/", ({ json }) => json({ items: [ groundId ], more: false }) );
// #endregion Search



// #region News
// GetUnreadCount
addRouteHandler(GET, "/j/n/guc/", ({ json }) => json( 319 ) );
// GetLatestNews
addRouteHandler(GET, "/j/n/gln/", ({ json }) => json( [
    { _id: generateObjectId(), text: "TODO", isImportant: false, date: new Date().toISOString(), unread: true },
    { _id: generateObjectId(), text: "TODO", isImportant: false, date: new Date().toISOString(), unread: true },
    { _id: generateObjectId(), text: "TODO", isImportant: false, date: new Date().toISOString(), unread: true },
    { _id: generateObjectId(), text: "TODO", isImportant: false, date: new Date().toISOString(), unread: true },
    { _id: generateObjectId(), text: "TODO", isImportant: false, date: new Date().toISOString(), unread: true },
] ) );
// #endregion News



// #region Mifts
// GetUnseenMifts
addRouteHandler(GET, "/j/mf/umc/", ({ json }) => json( { count: 0 } ) );
// #endregion Mifts



// #region Map
// CreatedMapVersion(?) TODO
addRouteHandler(POST, "/j/m/cmv/", ({ json }) => json({ v: 1 }) );
// SectorPlus
addRouteHandler(GET, "/j/m/sp/:x/:y/:ap/:aid", async ({ params, json }) => {
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
addRouteHandler(GET, "/j/m/spl/:x/:y/:ap/:aid", async ({ params, json }) => {
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
addRouteHandler(POST, "/j/m/s/", async ({ request, json }) => {
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
addRouteHandler(POST, "/j/m/dmss/", async ({ json, request }) => {
    console.log("TESTDEBUG deletionmarker request body:", await readRequestBody(request))

    return json([]);
})
// placer
addRouteHandler(GET, "/j/m/placer/:x/:y/:areaPlane/:areaId", ({ params, json }) => {
    const placerId = generateObjectId();
    return json({
        id: placerId,
        name: "todo",
        ts: new Date().toISOString(),
    })
})


// AreaPossessions
addRouteHandler(POST, "/j/aps/s/", async ({ request, json }) => {
    const body = await readRequestBody(request)

    const { areaGroupId, ids } = schema_aps_s.parse(body.areaGroupId);
    // TODO just add zod... ids can be undefined!


    // TODO

    return json({ ok: true })
});
// #endregion Map



// Catch-all
addRouteHandler(GET, "/j/:splat+", ({ event }) => {
    console.log("FETCH no match for", event.request.url)
    return new Response("Not found or not implemented", { status: 404 })
})
addRouteHandler(POST, "/j/:splat+", ({ event }) => {
    console.log("FETCH no match for", event.request.url)
    return new Response("Not found or not implemented", { status: 404 })
})


// #endregion routes
// #endregion HTTP








//  MMMMMMMM               MMMMMMMM    iiii                                       
//  M:::::::M             M:::::::M   i::::i                                      
//  M::::::::M           M::::::::M    iiii                                       
//  M:::::::::M         M:::::::::M                                               
//  M::::::::::M       M::::::::::M  iiiiiii       ssssssssss         cccccccccccccccc
//  M:::::::::::M     M:::::::::::M  i:::::i     ss::::::::::s      cc:::::::::::::::c
//  M:::::::M::::M   M::::M:::::::M   i::::i   ss:::::::::::::s    c:::::::::::::::::c
//  M::::::M M::::M M::::M M::::::M   i::::i   s::::::ssss:::::s  c:::::::cccccc:::::c
//  M::::::M  M::::M::::M  M::::::M   i::::i    s:::::s  ssssss   c::::::c     ccccccc
//  M::::::M   M:::::::M   M::::::M   i::::i      s::::::s        c:::::c             
//  M::::::M    M:::::M    M::::::M   i::::i         s::::::s     c:::::c             
//  M::::::M     MMMMM     M::::::M   i::::i   ssssss   s:::::s   c::::::c     ccccccc
//  M::::::M               M::::::M  i::::::i  s:::::ssss::::::s  c:::::::cccccc:::::c
//  M::::::M               M::::::M  i::::::i  s::::::::::::::s    c:::::::::::::::::c
//  M::::::M               M::::::M  i::::::i   s:::::::::::ss      cc:::::::::::::::c
//  MMMMMMMM               MMMMMMMM  iiiiiiii    sssssssssss          cccccccccccccccc
// #region Misc

//
//  ██████   ██████  ██ ██      ███████ ██████  ██████  ██       █████  ████████ ███████ 
//  ██   ██ ██    ██ ██ ██      ██      ██   ██ ██   ██ ██      ██   ██    ██    ██      
//  ██████  ██    ██ ██ ██      █████   ██████  ██████  ██      ███████    ██    █████   
//  ██   ██ ██    ██ ██ ██      ██      ██   ██ ██      ██      ██   ██    ██    ██      
//  ██████   ██████  ██ ███████ ███████ ██   ██ ██      ███████ ██   ██    ██    ███████ 
// #region boilerplate

console.log("Hi from service worker global context")


const CACHE_NAME = 'cache-v1';
const cloudfrontHosts = "d3t4ge0nw63pin d3sru0o8c0d5ho d39pmjr4vi5228 djaii3xne87ak d1qx0qjm5p9x4n d1ow0r77w7e182 d12j1ps7u12kjc dzc91kz5kvpo5 d3jldpr15f31k5 d2r3yza02m5b0q dxye1tpo9csvz"
    .split(" ").map(s => s + ".cloudfront.net")




const getOrSetFromCache = async (/** @type {Request} */ request) => {
    const cache = await self.caches.open(CACHE_NAME);

    const cacheMatch = await cache.match(request)

    if (cacheMatch) return cacheMatch;



    const fetchRes = await fetch(request.clone());
    if (fetchRes.ok) {
        cache.put(request, fetchRes.clone())
    }

    return fetchRes;
}


const getAreaList = async () => {
    // TODO get the file
    return Object.keys(bundledAreasFile)
}

const CACHE_AREAS_V2 = "cache_areas_v2"





/***
 *    ███    ███  █████  ██ ███    ██     ██████   ██████  ██    ██ ████████ ██ ███    ██  ██████  
 *    ████  ████ ██   ██ ██ ████   ██     ██   ██ ██    ██ ██    ██    ██    ██ ████   ██ ██       
 *    ██ ████ ██ ███████ ██ ██ ██  ██     ██████  ██    ██ ██    ██    ██    ██ ██ ██  ██ ██   ███ 
 *    ██  ██  ██ ██   ██ ██ ██  ██ ██     ██   ██ ██    ██ ██    ██    ██    ██ ██  ██ ██ ██    ██ 
 *    ██      ██ ██   ██ ██ ██   ████     ██   ██  ██████   ██████     ██    ██ ██   ████  ██████  
 *                                                                                                 
 *                                                                                                 
 */

/**
 * @param {Event} event 
 * @returns { Promise<Response> }
 */
const handleFetchEvent = async (event) => {
    try {
        const url = new URL(event.request.url);
        console.log("FETCH", event.clientId, url.pathname, { event })

        if (url.host === originUrl.host) {
            if (url.pathname === "/") return fetch("/mainscreen.html");
            if (url.pathname.startsWith("/_code/")) return fetch(event.request);
            // TODO: rename this, since there's an area named "static" lol
            if (url.pathname.startsWith("/static/")) return getOrSetFromCache(event.request);
            if (url.pathname.startsWith("/j/")) return await matchRoute(event.request.method, url.pathname, event)

            // TODO get this from a file (and update it)
            if (url.pathname === "/_mlspinternal_/getdata") {
                const availableAreas = await getAreaList()
                const areasv2cache = await caches.open(CACHE_AREAS_V2);
                const areasStoredLocally = []
                for (const areaUrlName of availableAreas) {
                    if (await areasv2cache.match(new URL(self.origin + `/static/data/v2/${getAreaIdForAreaName(areaUrlName)}.zip`))) {
                        areasStoredLocally.push(areaUrlName)
                    }
                }

                return Response.json({ areasStoredLocally, availableAreas });
            }

            // Special pages
            if ( url.pathname.startsWith("/info")
            || url.pathname.startsWith("/support")
            || url.pathname.startsWith("/intermission")
            ) {
                return new Response("Not implemented sorry", { status: 500 })
            }

            // If nothing else matches, we assume it's trying to load an area's index.html (TODO: would request headers indicate client only accepts html?)
            // TODO: move /mainscreen.html to /index.html so that it's the first file loaded. Current /index.html can become /game.html or something
            // TODO: check if area is available locally. If not, display an error page and/or redirect to /
            return fetch("/index.html")
        }

        // Serve ground on all cloudfront reqs
        if (cloudfrontHosts.includes(url.hostname)) {
            console.log("FETCH matched cloudfront hostname", url.href)
            //return new Response(SpriteGroundBlob)
            return getOrSetFromCache(event.request);
        }

        return new Response("No rules match this request!", { status: 404 })
    } catch(e) {
        console.error("Error handling request", e)
        return Response.error()
    }
};

/**
 * @param {EventMessage} event 
 */
const handleClientMessage = async (event) => {
    try {
        const message = event.data;
        const client = event.source;

        console.log("MSG", client.id, message, { event })
        if (message.m === "WSMSG") {
            const [host, port] = message.data.wsUrl.slice(5).split(':');
            const amgr = await areaManagerMgr.getByWSSUrl(host)

            amgr.onWsMessage(client, message.data.msg)
        }
        else if (message.m === "PLS_OPEN_WS") {
            const [host, port] = message.data.wsUrl.slice(5).split(':');
            const amgr = await areaManagerMgr.getByWSSUrl(host)

            amgr.onWsConnection(client)
        }
    } catch(e) {
        console.error("MSG: error processing message!", e)
    }
};

const deleteCachesNotIn = async (/** @type {string[]} */ cacheWhitelist) => {
    const cacheKeys = await self.caches.keys();

    const deletePromises = cacheKeys.map(cacheKey => {
        if (cacheWhitelist.includes(cacheKey) === false) {
            return caches.delete(cacheKey);
        }
    });

    await Promise.all(deletePromises);
}


const onInstall = async (/** @type {Event} */ event) => {
    try {
        console.log("service worker install event")

        // TODO: create cache for sounds and other static assets
        // This cache is for the v1 area archive storage and will probably be deleted later
        const areasv2cache = await caches.open(CACHE_AREAS_V2);
        await areasv2cache.addAll([
        new URL(self.origin + `/static/data/v2/${getAreaIdForAreaName("chronology")}.zip`)
        ]);
    } catch(e) {
        console.error("onInstall error!", e)
    }

    self.skipWaiting();
}

self.addEventListener("error", (event) => console.error("error event", event))
self.addEventListener("unhandledrejection", (event) => console.error("unhandledrejection event", event))


// Utils

const sendWsMessageToClient = async (clientId, msg) => {
    /** @type { WindowClient } */
    const client = await self.clients.get(clientId)

    if (client) {
        client.postMessage(msg);
    }
}

const makeGetOrCreate = (map, ctor) => {
    return (key) => {
        const value = map.get(key);
        if (value) return value;

        const newValue = ctor(key)
        map.set(key, newValue)
        return newValue;
    }
}



// Listeners

self.addEventListener('install', event => event.waitUntil(onInstall()) );

// Update and take over as soon as possible
self.addEventListener('activate', event => {
    console.log("service worker activate event")
    event.waitUntil(clients.claim()) 
});

self.addEventListener('fetch', event => event.respondWith(handleFetchEvent(event)))
self.addEventListener('message', handleClientMessage)



// #endregion boilerplate
// #endregion Misc
