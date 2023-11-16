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


const dlAreaResSchema = z.object({ ok: z.boolean() })
const triggerAreaDownload = async (areaUrlName) => {
    console.log("a")
    // TODO: trigger fancy animations here

    const res = await fetch(`/_mlspinternal_/dlArea?area=${areaUrlName}`)
    const json = await res.json()
    const { ok } = dlAreaResSchema.parse(json)

    if (ok) {
        data.areasStoredLocally.push(areaUrlName)
        updateAreaList()
    }
    else {
        // TODO: fancy UI
        console.error("Service Worker couldn't download area! Are you sure the .zip file exists (for all subareas too)?")
    }
}

const areaEl = (areaUrlName, isAvailableLocally) => {
    if (isAvailableLocally) {
        return el("li", [
            el("a", { href: "/" + areaUrlName}, areaUrlName),
        ])
    }
    else {
        return el("li", [
            el("span", areaUrlName),
            el("button", "download area", { onclick: () => triggerAreaDownload(areaUrlName) })
        ])
    }
}

const updateAreaList = () => {
    setChildren(areaListEl, [
        el("li", [ el("a", { href: "/offlineland"}, "offlineland") ]),
        data.availableAreas.map((areaUrlName) => (
            el("li", [ areaEl(areaUrlName, data.areasStoredLocally.includes(areaUrlName) ) ])
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