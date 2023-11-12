## Dev setup:
- Run a webserver that serves this folder (eg., `python -m http.server`)
- The game needs to run in a "Safe origin", make sure that either:
    - your devserver does https (Caddy!),
    - you use `127.0.0.1` or `localhost`,
    - or you configure your browser to assume your dev host is a safe origin.
- `bun install` for type inference
- Type checking works on my machine:TM: (VSCode), but if it doesn't for you you can use `bun run tsc`

## TODO:
- make the service worker registration/update asynchronous, display a little loading spinner and auto-refresh on update
- interface at `/` to list available areas
    - also list snaps for that area? And buttons to teleport to it. The SW can handle placing people anywhere
    - list subareas? only subareas that one has visited?
    - allow to join as explorer, non-editor and editor?
    - display the area thumbnail on the card, and also the area's creator (get avatar from boards), manyunity-style

- store inventory
- store numbers (figure out how they are saved, then do the same thing as possessions)

- make all the where-does-data-comes-from logic more explicit and configurable (CDN, origin's server, another url...)

- upload on github pages?

- Room-based multiplayer?
    - Allow to "copy" an area and use it as a LocalArea, then save all changes as a CRDT log or something

- allow to create things?