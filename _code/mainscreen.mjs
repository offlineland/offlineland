import { registerServiceWorker } from "./register-service-worker.js"
import * as FilePond from "./libs/filepond.esm.min.js"
import Toastify from "./libs/toastify-es.js"
const { z } = /** @type { import('zod' )} */ (globalThis.Zod);
const { el, text, mount, setChildren, setAttr, } = /**@type { import('redom' )} */ (globalThis.redom);


const swRegP = registerServiceWorker()
const areaListEl = el("ul", [
    el("li", [ el("a", { href: "/offlineland"}, "offlineland") ]),
    el("li", "loading..."),
])

let availableAreas = [];
let areasStoredLocally = [];


const dlAreaResSchema = z.object({ ok: z.boolean() })
const triggerAreaDownload = async (areaUrlName) => {
    // TODO: trigger fancy animations here

    const res = await fetch(`/_mlspinternal_/dlArea?area=${areaUrlName}`)
    const json = await res.json()
    const { ok } = dlAreaResSchema.parse(json)

    if (ok) {
        areasStoredLocally.push(areaUrlName)
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
        availableAreas.map((areaUrlName) => (
            el("li", [ areaEl(areaUrlName, areasStoredLocally.includes(areaUrlName) ) ])
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
const importInput = el("input#fileInput", { type: "file", accept: ".zip" } );


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
        importInput,
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



// TODO: toastify-js accepts an `avatar` option... Might be able to do something funny
const TOAST_SETTINGS = { duration: 5000, position: "right" };
const toastError =   (msg) => Toastify({ ...TOAST_SETTINGS, style: { background: "linear-gradient(to right, #e46161, #d32424)" }, text: msg }).showToast();
const toastSuccess = (msg) => Toastify({ ...TOAST_SETTINGS, style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }, text: msg }).showToast();
class ImportMgr {
    constructor() {
        this.files = new Map();

        navigator.serviceWorker.addEventListener("message", (ev) => {
            const msg = ev.data;

            if (msg.m === "IMPORT_STARTED") {
                const callbacks = this.files.get(msg.data.key);
                callbacks?.progress(false);
            }
            else if (msg.m === "IMPORT_COMPLETE") {
                const callbacks = this.files.get(msg.data.key);
                callbacks?.load("ok");
                toastSuccess(msg.data.message);
            }
            else if (msg.m === "IMPORT_ERROR") {
                const callbacks = this.files.get(msg.data.key);
                callbacks?.error(msg.data.error);
                toastError( msg.data.error );
            }
        })
    }

    addFile(file, callbacks) {
        const key = Date.now();
        this.files.set(key, callbacks);
        navigator.serviceWorker.controller.postMessage({ m: "DATA_IMPORT", data: { file, key: key } });
    }

}
const importMgr = new ImportMgr();


mount(document.body, main);
const pond = FilePond.create(importInput, {
    allowMultiple: true,
    allowRevert: false,
    acceptedFileTypes: [ "application/zip" ],
    labelFileProcessing: "Importing",
    labelFileProcessingComplete: "Import complete",
    labelFileProcessingError: "Error during import",
    server: {
        process: async (fieldName, file, metadata, load, error, progress, abort, transfer, options) => {
            importMgr.addFile(file, { progress, load, error });
        }
    }
});
pond.on("processfile", (err, file) => {
    console.log("processfile", err, file);
    setTimeout(() => pond.removeFile(file.id), 1500);
})




await swRegP;
await new Promise(r => setTimeout(r, 50))
fetch("/_mlspinternal_/getversion").then(r => r.json()).then(v => versionText.textContent = v);
fetch("/_mlspinternal_/getdata").then(r => r.json()).then(data => {
    availableAreas = data.availableAreas;
    areasStoredLocally = data.areasStoredLocally;
    updateAreaList(data);
})
