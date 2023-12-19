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
Contributions are welcome! However, please first check through the roadmap in the [issues](https://github.com/offlineland/OfflineLand/issues) - in order to stay on-tracks and simplify managing the project, we won't accept pull requests that fall outside of the roadmap!

If you'd like to work or see something but couldn't find it on the roadmap, please come discuss on the #archive-effort channel of the [Anyland discord server](https://discord.gg/ahAs7U3)!

By contributing, you must also abide by the Code of Conduct.


### How Offlineland works
It's mostly just a big [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) intercepting all fetch requests and pretending to be the server, but serving local data instead.

If you've seen this "[Reverse emulating the nes to give it superpowers](https://www.youtube.com/watch?v=ar9WRwCiSr0)" video by tom7, it's a bit like that except instead of a raspberry pi inside the cartridge talking to the NES, it's a Service Worker inside the browser talking to manyland.js!


### What happens where:
- `manyland.js` is v3568, completely untouched
- `index.html` is the "main page" with area selection and all
- `game.html` is the game, mostly untouched except:
    - the yolla, sentry, gtag scripts were removed
    - it overrides `window.WebSocket` with a class that pretends to be a WS but actually sends and receives messages to/from the Service Worker
- `service-worker.ts` is where everything else is. There are 3 interesting places:
    - the `handleFetchEvent` function, which does top-level "routing"
    - the `FakeAPI` class which implements a basic express-like router and pretend to be ML's `/j/` endpoint
    - the `ArchivedAreaManager` class which handles all the area data (loads data from zip, serves sector data, replies to WS messages)
- `_code/service-worker/` is where the rest of the service worker lives. I might split the above 3 places into their own files eventually
- `_code/libs/` is for bundled-in third-party libs as UMD modules like it's 2012.

### Running it locally
- Run a simple webserver that serves this folder (eg., `python -m http.server`)
- `bun install` (or `npm install`, or `yarn`)
- `bun run tsc:w` and `bun run tailwind:w` in two different terminals (or `npm run ...` or `yarn run ...`, you know it)
- The game needs to run in a "Safe origin", make sure that either:
    - your devserver does https (Caddy!),
    - you use `127.0.0.1` or `localhost`,
    - or you configure your browser to assume your dev host is a safe origin.

------
The offlineland project is not affiliated with manyland.com or its developers.
