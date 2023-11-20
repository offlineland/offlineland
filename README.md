## Dev setup:
- Run a webserver that serves this folder (eg., `python -m http.server`)
- `bun install`
- `bun run tsc:w`
- The game needs to run in a "Safe origin", make sure that either:
    - your devserver does https (Caddy!),
    - you use `127.0.0.1` or `localhost`,
    - or you configure your browser to assume your dev host is a safe origin.


## What happens where:
- `index.html` is the "loading screen"
- `game.html` is the game
    - it overrides `window.WebSocket` with a class that pretends to be a WS but actually sends and receives messages to/from the Service Worker
- `service-worker.ts` is where everything else is. There are 3 interesting places:
    - the `handleFetchEvent` function, which does top-level "routing"
    - the `FakeAPI` class which implements a basic express-like router and pretend to be ML's `/j/` endpoint
    - the `ArchivedAreaManager` class which handles all the area data (loads data from zip, serves sector data, replies to WS messages)
- `_code/service-worker/` is where the rest of the service worker lives. I might split the above 3 places into their own files, but for now it's mostly boilerplate.


## TODO:
### Service Worker:
- make the service worker registration/update asynchronous, display a little loading spinner and auto-refresh on update
- do proper caching and update of static assets
- make all the where-does-data-comes-from logic more explicit and configurable (CDN, origin's server, another url...)

### Game:
- teleport redirects to / for some reason. Figure out a way to handle this properly
- store numbers (figure out how they are saved, then do the same thing as possessions)

### Further features:
- interface at `/` to list available areas
    - make the "download area" button actually work (make a fetch for the SW to intercept, SW dls and caches area, add fancy UI animations when done)
    - also list snaps for that area? And buttons to teleport to it. The SW can handle placing people anywhere
        - hand-picked snaps?
        - same thing for placenames?
    - list subareas? only subareas that one has visited?
    - allow to join as explorer, non-editor and editor? (set config to url query, send to SW on open event?)
    - display the area thumbnail on the card, and also the area's creator (get avatar from boards), manyunity-style

- Room-based multiplayer via libfabric?
    - Allow to "copy" an area and use it as a LocalArea, then save all changes as a CRDT log or something

- Bundle as an Electron app? -> Steam store?
- Add a manifest to go full PWA and allow Android/iOS to "install" the app (re: fix caching and sw registration)

### Museum:
- different "exhibits" that showcase one specific content, that you can deeplink (eg. offlineland.io/snaps/shortcode, offlineland.io/creations/id...)
- ideas:
    - mifts
        - mift graph?
    - snap
    - snaps in an area
- if we have a "central database node" in multiplayer mode, maybe the "museum" can display the new content too? (eg. people making new mifts, new creations...)

### Data Reification (Tanako's worlds):
- a world with all of your creations
- a world with all of your collections

### online.offlineland.io:
- Do like manyunity: allow people to register with username+password, ask them to post a token on a board, link account to poster account
- figure out what to do with it later (offlineland forums? Meh?)

### For later: Monetization
- If Philipp hosts it on the same domain or another he controls, adds back the yolla ads?
    - How to handle ads if used offline? Simply disable them? Only allow "offline install" if you've bought minfinity? (is this possible?)
- Integrate with Patreon's API to allow players to still buy minfinity? Potentially also gate more features (max 10 players in a room? custom room code à la Discord?)
- libfabric node or actual HTTP server acting as the "mifts server" where people can list their mifts, and add new ones (if they pay, or if they have minfinity)

