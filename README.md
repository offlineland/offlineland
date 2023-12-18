# [Offlineland.io](https://offlineland.io)
An interactive monument to [Manyland](https://manyland.com)


## Features
Offlineland allows you to:
- Play Manyland areas entirely offline
- Import your account's data or an area as a .zip
- Create things locally

Eventually, the goal is to also allow:
- Building existing and new areas
- Sharing areas and creations on the companion site [online.offlineland.io](https://online.offlineland.io)
- And more!!



## Contributing
Contributions are welcome! However, please first check through the [issues](https://github.com/offlineland/OfflineLand/issues) for what we want to priorize.
If you have an idea for something that you don't see in the issues, you can also discuss it with us on the #archive-effort channel of the [Anyland discord server](https://discord.gg/ahAs7U3)!

By contributing, you must also abide by the Code of Conduct.


### How Offlineland works
TODO reformat the post I wrote on the board about it

### What happens where:
- `manyland.js` is v3568, completely untouched
- `index.html` is the "main page" with area selection and all
- `game.html` is the game
    - it overrides `window.WebSocket` with a class that pretends to be a WS but actually sends and receives messages to/from the Service Worker
- `service-worker.ts` is where everything else is. There are 3 interesting places:
    - the `handleFetchEvent` function, which does top-level "routing"
    - the `FakeAPI` class which implements a basic express-like router and pretend to be ML's `/j/` endpoint
    - the `ArchivedAreaManager` class which handles all the area data (loads data from zip, serves sector data, replies to WS messages)
- `_code/service-worker/` is where the rest of the service worker lives. I might split the above 3 places into their own files eventually
- `_code/libs/` is for bundled-in third-party libs as UMD modules like it's 2012.

### Dev setup
- Run a webserver that serves this folder (eg., `python -m http.server`)
- `bun install`
- `bun run tsc:w` and `bun run tailwind:w` in two terminals
- The game needs to run in a "Safe origin", make sure that either:
    - your devserver does https (Caddy!),
    - you use `127.0.0.1` or `localhost`,
    - or you configure your browser to assume your dev host is a safe origin.
