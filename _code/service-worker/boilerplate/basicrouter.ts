const makeRouter = (matchPath) => {
    const GET = "GET";
    const POST = "POST";

    type RouteHandlersBagOfTricks = {
        params: any;
        event: FetchEvent;
        request: Request;
        clientId: string;
        json: (json: any) => Response;
    }


    type route = {
        method: "GET" | "POST",
        matcher: (path: string) => Record<string, string> | false,
        handler: (ctx: RouteHandlersBagOfTricks) => Promise<Response>
    }

    const routes = new Set<route>();



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
