import { registerServiceWorker } from "./register-service-worker.js"
const { z } = /** @type { import('zod' )} */ (globalThis.Zod);
const { el, mount, setChildren } = /**@type { import('redom' )} */ (globalThis.redom);


await registerServiceWorker()
const areaListEl = el("ul", [
    el("li", [ el("a", { href: "/offlineland"}, "offlineland") ]),
    el("li", "loading..."),
])

let data = {
    availableAreas: [],
    areasStoredLocally: [],
}

const triggerAreaDownload = async (areaUrlName) => {
    console.log("a")
    // TODO: trigger fancy animations here
    await fetch(`/_mlspinternal_/dlArea?area=${areaUrlName}`)

    data.areasStoredLocally.push(areaUrlName)
    updateAreaList()
}

const updateAreaList = () => {
    setChildren(areaListEl, [
        el("li", [ el("a", { href: "/offlineland"}, "offlineland") ]),
        data.availableAreas.map((areaUrlName) => (
            el("li", [
                el("a", { href: "/" + areaUrlName}, areaUrlName),
                data.areasStoredLocally.includes(areaUrlName) || el("button", "download area", { onclick: () => triggerAreaDownload(areaUrlName) })
            ])
        ))
    ])
}

const main = el("main", [
    el("h1", "Hello world!"),
    el("div", [
        el("h2", "available areas"),
        areaListEl,
    ]),
])

mount(document.body, main);

// TODO: use indexedDB instead?
const dataRes = await fetch("/_mlspinternal_/getdata");
data = await dataRes.json();
updateAreaList(data);