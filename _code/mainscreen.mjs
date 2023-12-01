import { registerServiceWorker } from "./register-service-worker.js"
import * as FilePond from "./libs/filepond.esm.min.js"
import Toastify from "./libs/toastify-es.js"
const { z } = /** @type { import('zod' )} */ (globalThis.Zod);
const { el, text, mount, setChildren, setAttr, list } = /**@type { import('redom' )} */ (globalThis.redom);


const dlAreaResSchema = z.object({ ok: z.boolean() })

class AreaCard {
    constructor() {
        this.el = el("div.w-56.m-1.my-3.rounded.overflow-hidden.shadow-lg", [
            this.cardThumb = el("img.w-full.rounded.cursor-pointer", {
                alt: "Image Description",
                onclick: () => this.onBtnClick(),
            }),
            el("div.p-2.text-center.break-words", [
                el("div.font-bold.text-xl.mb-2.h-12", this.cardTitle = text())

            ]),
            this.btnSpot = el("div.flex.justify-center.pb-4")
        ])
    }

    async triggerAreaDownload() {
        const res = await fetch(`/_mlspinternal_/dlArea?area=${this.areaUrlName}`)
        const json = await res.json()
        const { ok } = dlAreaResSchema.parse(json)

        if (ok) {
            this.update({areaUrlName: this.areaUrlName, areaRealName: this.areaRealName, status: "DOWNLOADED"})
        }
        else {
            // TODO: fancy UI
            console.error("Service Worker couldn't download area! Are you sure the .zip file exists (for all subareas too)?")
            this.update({areaUrlName: this.areaUrlName, areaRealName: this.areaRealName, status: "DOWNLOAD_ERROR"})
        }

    }

    onBtnClick() {
        switch (this.status) {
            case "DOWNLOADED": {
                window.location.href = "/" + this.areaUrlName;
                break;
            }
            case "DOWNLOADABLE":
            case "DOWNLOAD_ERROR": {
                this.triggerAreaDownload();
                this.update({areaUrlName: this.areaUrlName, areaRealName: this.areaRealName, status: "DOWNLOADING"})
                break;
            }
            case "DOWNLOADING": {
                break;
            }
        }
    }

    update({ areaUrlName, areaRealName, status }) {
        console.log("update", areaUrlName, areaRealName)
        this.areaUrlName = areaUrlName
        this.areaRealName = areaRealName
        this.status = status


        if (status === "DOWNLOADED") {
            const btn = el("a.w-36.h-10.text-center.bg-blue-500.hover:bg-blue-700.text-white.font-bold.py-2.px-4.rounded", { href: "/" + areaUrlName }, "Play")
            this.cardThumb.src = "";
            this.cardThumb.src = `/static/data/area-thumbnails/${this.areaUrlName}.png`;
            setChildren(this.btnSpot, [ btn ])
        }
        else if (status === "DOWNLOADING") {
            const btn = el(
                "button.w-36.h-10.bg-blue-700.text-white.font-bold.py-2.px-4.rounded.flex.flex-row.justify-center.justify-items-center",
                { disabled: true },
                [
                    "Loading",
                    el("div.flex.justify-center.items-center.p-2", [
                        el("div.animate-spin.rounded-full.h-4.w-4.border-b-2.border-white")
                    ])

                ],
            )

            setChildren(this.btnSpot, [ btn ])
        }
        else if (status === "DOWNLOAD_ERROR") {
            const btn = el(
                "button.w-36.h-10.bg-red-500.hover:bg-red-700.active:bg-red-600.text-white.font-bold.py-2.px-4.rounded.flex.flex-row.justify-center",
                { onclick: () => this.onBtnClick() },
                "Retry",
            )
            setChildren(this.btnSpot, [ btn ])
        }
        else {
            const btn = el(
                "button.w-36.h-10.bg-blue-500.hover:bg-blue-700.active:bg-blue-600.text-white.font-bold.py-2.px-4.rounded.flex.flex-row.justify-center",
                { onclick: () => this.onBtnClick() },
                "Load",
            )
            setChildren(this.btnSpot, [ btn ])
            this.cardThumb.src = `/static/data/area-thumbnails/3.png`;
        }

        this.cardTitle.textContent = this.areaRealName
    }
}



class Modal {
    constructor(titleEls, textEls) {
        this.el = el("dialog.modal", [
            el('div.modal-box', [
                el('h3.font-bold.text-lg', titleEls),
                textEls
            ]),
        ])
    }

    showModal() {
        this.el.showModal();
    }
}

class MainInterface {
    constructor() {
        this.areaListEl = list("div.flex.flex-row.flex-wrap.justify-around.justify-items-center", AreaCard)
        this.el = el("div.flex.justify-center", [
            el("span.loading.loading-spinner.loading-lg.pt-52"),
        ])
    }

    update(data) {
        if (data.state === "LOADING") {

        }
        else if (data.state === "AREALIST") {
            setChildren(this.el, this.areaListEl);
            this.areaListEl.update(data.areas)
        }
        else if (data.state === "ERROR") {
            setChildren(this.el, [
                el("div.alert.alert-error", {role: alert}, [
                    el("svg.stroke-current.shrink-0.h-6.w-6", {
                        xmlns: "http://www.w3.org/2000/svg",
                        fill: "none",
                        viewBox: "0 0 24 24"
                    }
                    , el("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: "2",
                        d: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    })),
                    el("span", "Oops, seems like something broke! Try reloading I guess"),
                ])
            ])
        }
    }
}






const noServiceWorkerModal = new Modal("Error!", [
    el('p.py-4', [
        "It seems like your browser does not support Web Workers! Some reasons might be:",
        el("ul.list-disc.px-4.py-2", [
            el("li", "You are in incognito mode"),
            el("li", "You are not on the https:// verion of this page"),
            el("li", "You use a weird browser"),
        ]),
        "The safest bet is to try with another browser.",

    ])
]);
const mainInterface = new MainInterface();
mainInterface.update("LOADING");
const versionText = text("loading...")
const importInput = el("input#fileInput", { type: "file", accept: ".zip" } );



const main = el("main", [
    el("div.text-center.p-3.pb-8", [
        el("div", [
            el("h1.text-6xl.font-bold.p-1", "Offlineland"),
        ]),
        el("p.text-xl", [ "An interactive monument to ", el("a.link.link-primary", { href: "https://manyland.com" }, "Manyland") ]),
    ]),

    el("div.p-4.pb-8", [
        el("p", [
            "Offlineland allows you to browse Manyland areas offline. You can create stuff, but for now placements aren't saved."
        ]),
        el("p", [
            "Eventually, it will be possible to share and browse worlds on ",
            el("a.link.link-secondary", {href: "https://online.offlineland.com"}, "online.offlineland.com"),
            "."
        ]),
    ]),

    el("div.grid.grid-cols-5", [
        el("div.col-span-4", [
            el("h2.text-2xl.text-center", "Available areas"),
            mainInterface,
        ]),

        el("div.p-4", [
            el("div", [
                el("h2.text-2xl.text-center", "Data import"),
                el("p", [
                    "You can import areas from ",
                    el("a.link.link-secondary", {href: "https://areabackup.com"}, "areabackup.com"),
                    " or your account data from ",
                    el("a.link.link-secondary", {href: "/exporter"}, "the exporter"),
                    " here. Everything stays on your device."
                ]),
                el("div.p-4", [ importInput ])
            ]),
            el("div.border-b-1.border-black"),
            el("div.mt-6", [
                el("h2.text-2xl.text-center", "Search area"),
                el("p", "You can search for areas uploaded to online.offlineland.io (Coming soon!)"),
                el("div.p-4.join", [ 
                    el("input.input.input-bordered.w-full.max-w-xs.join-item", { type: "search", disabled: true } ),
                    el("button.btn.btn-disabled.join-item", { disabled: true }, "Search"),
                ])
            ])
        ]),
    ]),
    el("div", [
        el("h2.text-2xl", "Data viewer (Coming soon!)"),
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

    noServiceWorkerModal,
    el("footer.footer.footer-center.p-4.bg-neutral.text-neutral-content", [
        el("div.text-xs.opacity-80", [
            el("p", ["offlineland.io is not affiliated with manyland.com or it's developers."]),
            el("p", ["SW version: ", versionText, " | page version: ", 1]),
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


document.addEventListener("DOMContentLoaded", async () => {
    mount(document.getElementById("app"), main);

    if ('serviceWorker' in navigator === false) {
        noServiceWorkerModal.showModal()
        mainInterface.update({ state: "ERROR", error: "Cannot use Service Workers in this context. Check the modal" })
        return;
    }


    try { await registerServiceWorker() }
    catch(e) {
        // Will this error if we're offline??
        // TODO: split registering and updating. Failing to register is fatal, failing to update is fine
        console.error("Service worker error!")
        mainInterface.update({ state: "ERROR", error: "Unable to register or update the Service Worker." })
        throw e;
    }

    const importMgr = new ImportMgr();

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

    await new Promise(r => setTimeout(r, 50)) // Sleep 50ms to let the new service worker settle
    fetch("/_mlspinternal_/getversion").then(r => r.json())
        .then(v => versionText.textContent = v)
        .catch(e => {
            console.error("Unable to get version. If SW broke, the other fetch will fail too");
        })
    ;


    fetch("/_mlspinternal_/getdata").then(r => r.json())
        .then(data => mainInterface.update({state: "AREALIST", areas: data}) )
        .catch(e => {
            console.error(e);
            mainInterface.update({ state: "ERROR", error: "Unable to load area list." })
        })
    ;

})

document.addEventListener("unhandledrejection", (event) => {
    console.error("oops, error!", event);
    toastError(`Oops, something broke! ${String(event.error)}`)
})
document.addEventListener("error", (event) => {
    console.error("oops, error!", event);
    toastError(`Oops, something broke! ${String(event.error)}`)
})
