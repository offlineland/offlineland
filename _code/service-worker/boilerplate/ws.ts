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


    let expanded = str;

    for (const short in mapping) {
        const long = mapping[short];
        expanded = replaceAll(expanded, short, long);
    }

    console.log("expanded: {" + expanded)
    return JSON.parse("{" + expanded);
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
