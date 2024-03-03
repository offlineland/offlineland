const dataURLtoBlob = (dataUrl: string): Blob => {
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

const readRequestBody = async (request: Request): Promise<any> => {
    const text = await request.text();
    // By default, qs will not parse arrays using index notation (`a[19]=test`) beyond 20, to avoid cases where someone sends eg. `a[999]`.
    // See https://www.npmjs.com/package/qs#parsing-arrays
    // This might be why ML sends cells as an encoded string?
    const data = Qs.parse(text, {
        parameterLimit: 1000, // Default: 1000
        arrayLimit: 100, // Default: 20
        depth: 10, // Default: 5
    });

    return data;
}



type RouteHandlersBagOfTricks = {
    params: any;
    event: FetchEvent;
    request: Request;
    clientId: string;
    player: PlayerDataManager;
    json: (json: any) => Response;
}

type RouteHandler = (ctx: RouteHandlersBagOfTricks) => Response | Promise<Response>;

type Method = "GET" | "POST";

type route = {
    method: Method,
    matcher: (path: string) => Record<string, string> | false,
    handler: RouteHandler
}

const makeRouter = (matchPath) => {
    const GET = "GET";
    const POST = "POST";


    const routes = new Set<route>();



    const route = (method: Method, matcher: string, handler: RouteHandler) => routes.add({ method, matcher: matchPath(matcher), handler });
    const get = (matcher: string, handler: RouteHandler) => route(GET, matcher, handler);
    const post = (matcher: string, handler: RouteHandler) => route(POST, matcher, handler);

    /**
     * 
     * @param {"GET" | "POST"} method 
     * @param {string} pathname 
     * @param {FetchEvent} event
     * @returns 
     */
    const matchRoute = async (method, pathname, event, player: PlayerDataManager) => {
        for (const route of routes) {
            if (route.method !== method) continue;

            const matchRes = route.matcher(pathname);
            if (matchRes === false) continue;


            return await route.handler({
                params: matchRes.params,
                event: event,
                request: event.request,
                clientId: event.clientId,
                player,
                json: (data) => Response.json( data ),
            });
        }

        // If this happens, either it's because of an unhandled method (the client only sends GETs and POSTs though), or something is very wrong
        throw new Error("matchRoute: No match found!")
    }

    return { route, get, post, matchRoute }
}
