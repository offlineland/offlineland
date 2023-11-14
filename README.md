## Dev setup:
- Run a webserver that serves this folder (eg., `python -m http.server`)
- The game needs to run in a "Safe origin", make sure that either:
    - your devserver does https (Caddy!),
    - you use `127.0.0.1` or `localhost`,
    - or you configure your browser to assume your dev host is a safe origin.
- If you want to actually code on it, run `bun install` to get types
- Type checking works on my machine:TM: (VSCode), but if it doesn't for you you can use `bun run tsc:w` to get typechecking in the terminal


## What happens where:
- `index.html` is the "loading screen"
- `game.html` is the game
    - it overrides `window.WebSocket` with a class that pretends to be a WS but actually sends and receives messages to/from the Service Worker
- `service-worker.js` is where everything else is. There are 3 interesting places:
    - the `handleFetchEvent` function, which does top-level "routing"
    - the `FakeAPI` class which implements a basic express-like router and pretend to be ML's `/j/` endpoint
    - the `ArchivedAreaManager` class which handles all the area data (loads data from zip, serves sector data, replies to WS messages)

The rest is mostly boilerplate. You're invited to abuse code folding on the `#region ` markers and the code minimap and "go to definition" / search, and potentially to install the `Region Viewer` vscode extension to get around.

### Why is it all in one big file?
Because Firefox does not handle ES module imports in Service Workers, but tsc doesn't handle `importScripts`. There's probably an arcane tool to do it, but I hate setting up tooling so we're stuck with this for now. Since there's basically only 3 code regions where stuff happens, I got used to it.

There's one branch where I tried to set up require.js since all the libs are UMD modules, but then backed out because tsc lost type inference across files. There's also one branch where I set up tsc but then backed out because using tsc in `checkJs` mode + jsdocs isn't that bad, and I didn't want to add another build tool (also tsc type inference needs too much handholding and it got on my nerves).


## TODO:
- map-teleport redirects to / for some reason. Is the game doing that?
- make the service worker registration/update asynchronous, display a little loading spinner and auto-refresh on update
- do proper caching and update of static assets
- interface at `/` to list available areas
    - make the "download area" button actually work (make a fetch for the SW to intercept, SW dls and caches area, add fancy UI animations when done)
    - also list snaps for that area? And buttons to teleport to it. The SW can handle placing people anywhere
        - hand-picked snaps?
        - same thing for placenames?
    - list subareas? only subareas that one has visited?
    - allow to join as explorer, non-editor and editor? (set config to url query, send to SW on open event?)
    - display the area thumbnail on the card, and also the area's creator (get avatar from boards), manyunity-style

- store numbers (figure out how they are saved, then do the same thing as possessions)

- make all the where-does-data-comes-from logic more explicit and configurable (CDN, origin's server, another url...)

- upload on github pages?

- Room-based multiplayer?
    - Allow to "copy" an area and use it as a LocalArea, then save all changes as a CRDT log or something

- allow to create things?
