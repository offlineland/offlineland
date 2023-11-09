// Avoid crashing when running `bun run service-worker.js` or `deno run service-worker.js`. This allows me to check for syntax errors
if (typeof importScripts === "undefined") {
    globalThis.importScripts = () => {};
}
if (typeof URL === "undefined") {
    class URL {}
}
let originUrl = new URL("http://localhost")
if (self.origin) originUrl = new URL(self.origin)


//                              bbbbbbbb                            
// LLLLLLLLLLL              iiiib::::::b                            
// L:::::::::L             i::::b::::::b                            
// L:::::::::L              iiiib::::::b                            
// LL:::::::LL                   b:::::b                            
//   L:::::L              iiiiiiib:::::bbbbbbbbb       ssssssssss   
//   L:::::L              i:::::ib::::::::::::::bb   ss::::::::::s  
//   L:::::L               i::::ib::::::::::::::::bss:::::::::::::s 
//   L:::::L               i::::ib:::::bbbbb:::::::s::::::ssss:::::s
//   L:::::L               i::::ib:::::b    b::::::bs:::::s  ssssss 
//   L:::::L               i::::ib:::::b     b:::::b  s::::::s      
//   L:::::L               i::::ib:::::b     b:::::b     s::::::s   
//   L:::::L         LLLLLLi::::ib:::::b     b:::::ssssss   s:::::s 
// LL:::::::LLLLLLLLL:::::i::::::b:::::bbbbbb::::::s:::::ssss::::::s
// L::::::::::::::::::::::i::::::b::::::::::::::::bs::::::::::::::s 
// L::::::::::::::::::::::i::::::b:::::::::::::::b  s:::::::::::ss  
// LLLLLLLLLLLLLLLLLLLLLLLiiiiiiibbbbbbbbbbbbbbbb    sssssssssss    
// #region libs


/*
Firefox does not handle ES import/export syntax in service workers (see https://bugzilla.mozilla.org/show_bug.cgi?id=1360870).
The only thing available is `importScripts`, which syncronously runs a separate script.
I could make classes in separate files and use them here, but then my editor would lose track of them and their types.
*/



// ██████   █████  ████████ ██   ██       ████████  ██████        ██████  ███████  ██████  ███████ ██   ██ ██████  
// ██   ██ ██   ██    ██    ██   ██          ██    ██    ██       ██   ██ ██      ██       ██       ██ ██  ██   ██ 
// ██████  ███████    ██    ███████ █████    ██    ██    ██ █████ ██████  █████   ██   ███ █████     ███   ██████  
// ██      ██   ██    ██    ██   ██          ██    ██    ██       ██   ██ ██      ██    ██ ██       ██ ██  ██      
// ██      ██   ██    ██    ██   ██          ██     ██████        ██   ██ ███████  ██████  ███████ ██   ██ ██      
// #region lib_path-to-regexp
// https://www.npmjs.com/package/path-to-regexp?activeTab=code

/**
 * Tokenize input string.
 */
function lexer(str) {
    var tokens = [];
    var i = 0;
    while (i < str.length) {
        var char = str[i];
        if (char === "*" || char === "+" || char === "?") {
            tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
            continue;
        }
        if (char === "\\") {
            tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
            continue;
        }
        if (char === "{") {
            tokens.push({ type: "OPEN", index: i, value: str[i++] });
            continue;
        }
        if (char === "}") {
            tokens.push({ type: "CLOSE", index: i, value: str[i++] });
            continue;
        }
        if (char === ":") {
            var name = "";
            var j = i + 1;
            while (j < str.length) {
                var code = str.charCodeAt(j);
                if (
                // `0-9`
                (code >= 48 && code <= 57) ||
                    // `A-Z`
                    (code >= 65 && code <= 90) ||
                    // `a-z`
                    (code >= 97 && code <= 122) ||
                    // `_`
                    code === 95) {
                    name += str[j++];
                    continue;
                }
                break;
            }
            if (!name)
                throw new TypeError("Missing parameter name at ".concat(i));
            tokens.push({ type: "NAME", index: i, value: name });
            i = j;
            continue;
        }
        if (char === "(") {
            var count = 1;
            var pattern = "";
            var j = i + 1;
            if (str[j] === "?") {
                throw new TypeError("Pattern cannot start with \"?\" at ".concat(j));
            }
            while (j < str.length) {
                if (str[j] === "\\") {
                    pattern += str[j++] + str[j++];
                    continue;
                }
                if (str[j] === ")") {
                    count--;
                    if (count === 0) {
                        j++;
                        break;
                    }
                }
                else if (str[j] === "(") {
                    count++;
                    if (str[j + 1] !== "?") {
                        throw new TypeError("Capturing groups are not allowed at ".concat(j));
                    }
                }
                pattern += str[j++];
            }
            if (count)
                throw new TypeError("Unbalanced pattern at ".concat(i));
            if (!pattern)
                throw new TypeError("Missing pattern at ".concat(i));
            tokens.push({ type: "PATTERN", index: i, value: pattern });
            i = j;
            continue;
        }
        tokens.push({ type: "CHAR", index: i, value: str[i++] });
    }
    tokens.push({ type: "END", index: i, value: "" });
    return tokens;
}
/**
 * Parse a string for the raw tokens.
 */
function parse(str, options) {
    if (options === void 0) { options = {}; }
    var tokens = lexer(str);
    var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
    var defaultPattern = "[^".concat(escapeString(options.delimiter || "/#?"), "]+?");
    var result = [];
    var key = 0;
    var i = 0;
    var path = "";
    var tryConsume = function (type) {
        if (i < tokens.length && tokens[i].type === type)
            return tokens[i++].value;
    };
    var mustConsume = function (type) {
        var value = tryConsume(type);
        if (value !== undefined)
            return value;
        var _a = tokens[i], nextType = _a.type, index = _a.index;
        throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
    };
    var consumeText = function () {
        var result = "";
        var value;
        while ((value = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) {
            result += value;
        }
        return result;
    };
    while (i < tokens.length) {
        var char = tryConsume("CHAR");
        var name = tryConsume("NAME");
        var pattern = tryConsume("PATTERN");
        if (name || pattern) {
            var prefix = char || "";
            if (prefixes.indexOf(prefix) === -1) {
                path += prefix;
                prefix = "";
            }
            if (path) {
                result.push(path);
                path = "";
            }
            result.push({
                name: name || key++,
                prefix: prefix,
                suffix: "",
                pattern: pattern || defaultPattern,
                modifier: tryConsume("MODIFIER") || "",
            });
            continue;
        }
        var value = char || tryConsume("ESCAPED_CHAR");
        if (value) {
            path += value;
            continue;
        }
        if (path) {
            result.push(path);
            path = "";
        }
        var open = tryConsume("OPEN");
        if (open) {
            var prefix = consumeText();
            var name_1 = tryConsume("NAME") || "";
            var pattern_1 = tryConsume("PATTERN") || "";
            var suffix = consumeText();
            mustConsume("CLOSE");
            result.push({
                name: name_1 || (pattern_1 ? key++ : ""),
                pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
                prefix: prefix,
                suffix: suffix,
                modifier: tryConsume("MODIFIER") || "",
            });
            continue;
        }
        mustConsume("END");
    }
    return result;
}
/**
 * Create path match function from `path-to-regexp` spec.
 */
function matchPath(str, options) {
    var keys = [];
    var re = pathToRegexp(str, keys, options);
    return regexpToFunction(re, keys, options);
}
/**
 * Create a path match function from `path-to-regexp` output.
 */
function regexpToFunction(re, keys, options) {
    if (options === void 0) { options = {}; }
    var _a = options.decode, decode = _a === void 0 ? function (x) { return x; } : _a;
    return function (pathname) {
        var m = re.exec(pathname);
        if (!m)
            return false;
        var path = m[0], index = m.index;
        var params = Object.create(null);
        var _loop_1 = function (i) {
            if (m[i] === undefined)
                return "continue";
            var key = keys[i - 1];
            if (key.modifier === "*" || key.modifier === "+") {
                params[key.name] = m[i].split(key.prefix + key.suffix).map(function (value) {
                    return decode(value, key);
                });
            }
            else {
                params[key.name] = decode(m[i], key);
            }
        };
        for (var i = 1; i < m.length; i++) {
            _loop_1(i);
        }
        return { path: path, index: index, params: params };
    };
}
/**
 * Escape a regular expression string.
 */
function escapeString(str) {
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
/**
 * Get the flags for a regexp from the options.
 */
function flags(options) {
    return options && options.sensitive ? "" : "i";
}
/**
 * Pull out keys from a regexp.
 */
function regexpToRegexp(path, keys) {
    if (!keys)
        return path;
    var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
    var index = 0;
    var execResult = groupsRegex.exec(path.source);
    while (execResult) {
        keys.push({
            // Use parenthesized substring match if available, index otherwise
            name: execResult[1] || index++,
            prefix: "",
            suffix: "",
            modifier: "",
            pattern: "",
        });
        execResult = groupsRegex.exec(path.source);
    }
    return path;
}
/**
 * Transform an array into a regexp.
 */
function arrayToRegexp(paths, keys, options) {
    var parts = paths.map(function (path) { return pathToRegexp(path, keys, options).source; });
    return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
/**
 * Create a path regexp from string input.
 */
function stringToRegexp(path, keys, options) {
    return tokensToRegexp(parse(path, options), keys, options);
}
/**
 * Expose a function for taking tokens and returning a RegExp.
 */
function tokensToRegexp(tokens, keys, options) {
    if (options === void 0) { options = {}; }
    var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function (x) { return x; } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
    var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
    var delimiterRe = "[".concat(escapeString(delimiter), "]");
    var route = start ? "^" : "";
    // Iterate over the tokens and create our regexp string.
    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
        var token = tokens_1[_i];
        if (typeof token === "string") {
            route += escapeString(encode(token));
        }
        else {
            var prefix = escapeString(encode(token.prefix));
            var suffix = escapeString(encode(token.suffix));
            if (token.pattern) {
                if (keys)
                    keys.push(token);
                if (prefix || suffix) {
                    if (token.modifier === "+" || token.modifier === "*") {
                        var mod = token.modifier === "*" ? "?" : "";
                        route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
                    }
                    else {
                        route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
                    }
                }
                else {
                    if (token.modifier === "+" || token.modifier === "*") {
                        route += "((?:".concat(token.pattern, ")").concat(token.modifier, ")");
                    }
                    else {
                        route += "(".concat(token.pattern, ")").concat(token.modifier);
                    }
                }
            }
            else {
                route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
            }
        }
    }
    if (end) {
        if (!strict)
            route += "".concat(delimiterRe, "?");
        route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
    }
    else {
        var endToken = tokens[tokens.length - 1];
        var isEndDelimited = typeof endToken === "string"
            ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1
            : endToken === undefined;
        if (!strict) {
            route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
        }
        if (!isEndDelimited) {
            route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
        }
    }
    return new RegExp(route, flags(options));
}
/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 */
function pathToRegexp(path, keys, options) {
    if (path instanceof RegExp)
        return regexpToRegexp(path, keys);
    if (Array.isArray(path))
        return arrayToRegexp(path, keys, options);
    return stringToRegexp(path, keys, options);
}
// #endregion lib_path-to-regexp


/**
 * @global
 * @name Qs
*/
// This thing is fine to import directly because browserify bundles it in an UMD snippet. It becomes avaiable as `Qs` globally.
// TODO: bundle the other things the same way? Or use an AMD loader?
importScripts("/qs.js");


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


// TODO: ArchivedAreaManager
// TODO: store changes locally
// TODO: Networking?
class LocalAreaManager {
    clients = new Set();

    constructor(wssUrl, areaId) {
        this.wssUrl = wssUrl;
        this.areaId = areaId;

        this.isRingArea = areaId === "" || ringAreas.includes(areaId)
    }

    getInitData(player, urlName) {
        const playerData = player.getInitData_http();

        if (this.isRingArea) {
            return {
                ...playerData,

                "wsh": this.wssUrl,
                "wsp": 80,

                "ieh": true, // isEditorHere
                "ish": true, // isSuperHere

                "sub": false, // isSubarea
                "acl": { "x": 15, "y": 15 }, // areaCenterLocation

                "sha": true,  // ?
                "noi": true,  // no in-app purchases
                "fla": false, // flag warning
                "ise": false, // ?
            }
        }
        else {
            return {
                ...playerData,

                "wsh": "ws22x8.ws.manyland.local",
                "wsp": 80,

                "ieh": true, // isEditorHere
                "ish": true, // isSuperHere

                "sub": false, // isSubarea
                "acl": { "x": 15, "y": 15 }, // areaCenterLocation

                "sha": true,  // ?
                "noi": true,  // no in-app purchases
                "fla": false, // flag warning
                "ise": false, // ?

                aid: this.areaId,
                gid: this.areaId,
                arn: urlName,
                aun: urlName,
                agn: urlName,
                ard: "191919",

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
    getDataForSector(x, y) {}

    onWsConnection(client) {
        const player = getPlayerForClient(client.id);

        client.postMessage({ m: "WS_OPEN" });
        const initDataMsg = JSON.stringify({
            "m":"on",
            "data":{
                ...player.getInitData_ws(),

                "neo":true, // ?
                "map":{"p":0,"a":"3"},
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

class AreaManagerManager {
    wssCount = 0;
    areaManagerByWSSUrl = new Map();
    areaManagerByAreaId = new Map();

    makeAreaManager(areaId) {
        // TODO: allow to pass any kind of AreaManager
        const wssUrl = `ws191919x${String(this.wssCount++)}.ws.manyland.local`;
        const am = new LocalAreaManager(areaId, wssUrl)

        this.areaManagerByWSSUrl.set(wssUrl, am)
        this.areaManagerByAreaId.set(areaId, am)

        return am;
    }

    getByWSSUrl(wssUrl) {
        const am = this.areaManagerByWSSUrl.get(wssUrl);
        if (am) return am;
        else return this.makeAreaManager("shouldnthappen_" + String(Date.now()));
    }

    getByAreaId(areaId) {
        const am = this.areaManagerByAreaId.get(areaId);
        if (am) return am;
        else return this.makeAreaManager(areaId);
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
    return generateObjectId()
}
// TODO
const getAreaManagerFor = (clientId, areaUrlName) => {
    // TODO: handle subareas eventually (maybe via url?)
    const areaId = getAreaIdForAreaName(areaUrlName);
    return areaManagerMgr.getByAreaId(areaId)
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

// ██████   ██████  ██ ██      ███████ ██████  ██████  ██       █████  ████████ ███████ 
// ██   ██ ██    ██ ██ ██      ██      ██   ██ ██   ██ ██      ██   ██    ██    ██      
// ██████  ██    ██ ██ ██      █████   ██████  ██████  ██      ███████    ██    █████   
// ██   ██ ██    ██ ██ ██      ██      ██   ██ ██      ██      ██   ██    ██    ██      
// ██████   ██████  ██ ███████ ███████ ██   ██ ██      ███████ ██   ██    ██    ███████ 
// #region boilerplate

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

// #endregion boilerplate












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

//  ██████   ██████  ██ ██      ███████ ██████  ██████  ██       █████  ████████ ███████ 
//  ██   ██ ██    ██ ██ ██      ██      ██   ██ ██   ██ ██      ██   ██    ██    ██      
//  ██████  ██    ██ ██ ██      █████   ██████  ██████  ██      ███████    ██    █████   
//  ██   ██ ██    ██ ██ ██      ██      ██   ██ ██      ██      ██   ██    ██    ██      
//  ██████   ██████  ██ ███████ ███████ ██   ██ ██      ███████ ██   ██    ██    ███████ 
// #region boilerplate



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


// #endregion boilerplate

//  ██████   ██████  ██    ██ ████████ ███████ ███████ 
//  ██   ██ ██    ██ ██    ██    ██    ██      ██      
//  ██████  ██    ██ ██    ██    ██    █████   ███████ 
//  ██   ██ ██    ██ ██    ██    ██    ██           ██ 
//  ██   ██  ██████   ██████     ██    ███████ ███████ 
// #region routes

// Area init
addRouteHandler(POST, "/j/i/", async ({ json, request, clientId, }) => {
    const data = await readRequestBody(request)
    
    const areaManager = getAreaManagerFor(clientId, data.urlName);
    const player = getPlayerForClient(clientId);
    const areaData = areaManager.getInitData(player, data.urlName);

    //clientIdToAreas.set(clientId, data.urlName)
    
    return json(areaData)
});



// User
// Friends And Blocked
addRouteHandler(GET, "/j/u/fab/", ({ json }) => json({ "friends":[],"blocked":[] }) );
// GetFreshRank
addRouteHandler(POST, "/j/u/gfr/", ({ json }) => json( 10 ) );
// Achievement
addRouteHandler(POST, "/j/u/a/", async ({ json, request, clientId }) => {
    const { id } = await readRequestBody(request)
    return json({ ok: true, message: "I don't know how the real server answers but the client looks for a 200 so this is fine"});
})



// Items
// ItemDef
addRouteHandler(GET, "/j/i/def/:creationId", ({ params, json }) => {
    return json({"base":"SOLID","creator":"000000000000000000000000","id":params.creationId,"name":"creation info not available yet!"});
});
// Motions
addRouteHandler(GET, "/j/i/mo/:creationId", ({ params, json }) => json({ ids: [], midpoint: 0 }) );



// Collections
// TODO proper inventory
// inventory - Collections
const inventory = [ generateObjectId() ]
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
addRouteHandler(GET, "/j/i/gcr/:start/:end", ({ params, json }) => json({ items: [ generateObjectId() ], itemCount: 1 }) );



// Search Item
addRouteHandler(POST, "/j/s/i/", ({ json }) => json({ items: [ generateObjectId() ], more: false }) );



// NEWS
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



// Mifts
// GetUnseenMifts
addRouteHandler(GET, "/j/mf/umc/", ({ json }) => json( { count: 0 } ) );



// Map
// CreatedMapVersion(?)
addRouteHandler(POST, "/j/m/cmv/", ({ json }) => json({ v: 1 }) );
// SectorPlus
addRouteHandler(GET, "/j/m/sp/:x/:y/:ap/:aid", ({ params, json }) => {
    return json([
        {
            "iix": [ "50372a99f5d33dc56f000001" ],
            "ps": [
                [ 15, 17, 0, 0, 0, 0 ],
                [ 14, 17, 0, 0, 0, 0 ],
                [ 16, 17, 0, 0, 0, 0 ],
                [ 13, 17, 0, 0, 0, 0 ],
                [ 17, 17, 0, 0, 0, 0 ]
            ],
            "v": 5,
            "x": 0,
            "y": 0,
            "i": {
                "b": [ "SOLID" ],
                "p": [],
                "n": [ "ground" ],
                "dr": [ null ]
            }
        }
    ])
});
// SectorPlusLoading (not exactly sure what's different)
addRouteHandler(GET, "/j/m/spl/:x/:y/:ap/:aid", ({ params, json }) => {
    console.log("TESTDEBUG sectorPlusLoading params:", params)

    return json([
        {
            "iix": [ "50372a99f5d33dc56f000001" ],
            "ps": [
                [ 15, 17, 0, 0, 0, 0 ],
                [ 14, 17, 0, 0, 0, 0 ],
                [ 16, 17, 0, 0, 0, 0 ],
                [ 13, 17, 0, 0, 0, 0 ],
                [ 17, 17, 0, 0, 0, 0 ]
            ],
            "v": 5,
            "x": 0,
            "y": 0,
            "i": {
                "b": [ "SOLID" ],
                "p": [],
                "n": [ "ground" ],
                "dr": [ null ]
            }
        }
    ])
});
// DeletionMarkerForSectors
addRouteHandler(POST, "/j/m/dmss/", async ({ json, request }) => {
    console.log("TESTDEBUG deletionmarker request body:", await readRequestBody(request))

    return json([]);
})



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





/**
 * @param {Event} event 
 * @returns { Promise<Response> }
 */
const handleFetchEvent = async (event) => {
    try {
        const url = new URL(event.request.url);
        console.log("FETCH", event.clientId, url.pathname, { event })

        if (url.host === originUrl.host) {
            if (url.pathname === "/") return fetch(url);
            if (url.pathname.startsWith("/static/")) return fetch(url);
            if (url.pathname.startsWith("/j/")) return await matchRoute(event.request.method, url.pathname, event)

            // Special pages
            if ( url.pathname.startsWith("/info")
            || url.pathname.startsWith("/support")
            || url.pathname.startsWith("/intermission")
            ) {
                return new Response("Not implemented sorry", { status: 500 })
            }

            // If nothing else matches, we assume it's trying to load an area's index.html (TODO: would request headers indicate client only accepts html?)
            return fetch("/index.html")
        }

        // Serve ground on all cloudfront reqs
        if (cloudfrontHosts.includes(url.hostname)) {
            console.log("FETCH matched cloudfront hostname", url.href)
            return new Response(SpriteGroundBlob)
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
const handleClientMessage = (event) => {
    try {
        const message = event.data;
        const client = event.source;

        console.log("MSG", client.id, message, { event })
        if (message.m === "WSMSG") {
            const [host, port] = message.data.wsUrl.split(':');
            const amgr = areaManagerMgr.getByWSSUrl(host)

            amgr.onWsMessage(client, message.data.msg)
        }
        else if (message.m === "PLS_OPEN_WS") {
            const [host, port] = message.data.wsUrl.split(':');
            const amgr = areaManagerMgr.getByWSSUrl(host)

            amgr.onWsConnection(client)
        }
    } catch(e) {
        console.error("MSG: error processing message!", e)
    }
};



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

self.addEventListener('install', event => {
    console.log("service worker install event")
    event.waitUntil( caches.open(CACHE_NAME) );

    self.skipWaiting()
});

// Update and take over as soon as possible
self.addEventListener('activate', event => {
    console.log("service worker activate event")
    event.waitUntil(clients.claim()) 
});

self.addEventListener('fetch', event => event.respondWith(handleFetchEvent(event)))
self.addEventListener('message', handleClientMessage)



// #endregion boilerplate
// #endregion Misc

