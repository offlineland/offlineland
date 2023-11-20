import { registerServiceWorker } from "./register-service-worker.js"
const { z } = /** @type { import('zod' )} */ (globalThis.Zod);
const { el, text, mount, setChildren, setAttr, } = /**@type { import('redom' )} */ (globalThis.redom);


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

const importData = () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file to upload');
        return;
    }

    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ m: "DATA_IMPORT", data: { file } });
    } else {
        alert('Service worker controller not available');
    }
}

const versionText = text("loading...")
fetch("/_mlspinternal_/getversion").then(r => r.json()).then(v => versionText.textContent = v);
const importBtn = el("button", { disabled: true, onclick: importData, }, "import");
const onFileInputChange = () => setAttr(importBtn, { disabled: false });


const main = el("main", [
    el("div", [
        el("h1", "Offlineland"),
        el("p", "An interactive monument to Manyland."),
        el("p", ["SW version: ", versionText, " | page version: ", 1]),
    ]),
    el("div", [
        el("h2", "Available areas"),
        areaListEl,
    ]),
    el("div", [
        el("h2", "Data import"),
        el("p", "You can import areas from areabackup.com or the exporter here. Everything stays on your device."),
        el("input#fileInput", { type: "file", accept: ".zip", onchange: onFileInputChange } ),
        importBtn,
    ]),
    el("div", [
        el("h2", "Data viewer"),
        el("p", "Once you've imported your data from the exporter, you can view it's content here."),
        el("div", [
            el("h3", "Snaps"),
            el("div", [

            ]),
        ]),
        el("div", [
            el("h3", "Creations"),
            el("div", [

            ]),
        ]),
        el("div", [
            el("h3", "Mifts"),
            el("div", [

            ]),
        ]),
    ]),
])

mount(document.body, main);

// TODO: use indexedDB instead?
const dataRes = await fetch("/_mlspinternal_/getdata");
data = await dataRes.json();
updateAreaList(data);