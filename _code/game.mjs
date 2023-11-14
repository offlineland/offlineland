import { registerServiceWorker } from "/_code/register-service-worker.js"
// Noop until replaced in main()
let postMessage_ = () => {}
/** @type { FakeWebSocket | null } */
let lastWsInstance = null;

// Relay messages from Service Worker to the FakeWebSocket instance
navigator.serviceWorker?.addEventListener("message", (ev) => {
    const msg = ev.data;
    console.log("SW msg:", msg, lastWsInstance)

    if (msg.m === "WS_MSG") {
        if (!lastWsInstance) {
            console.error("Received WS_MSG event but there is no FakeWebSocket in lastWsInstance!")
            return;
        }

        lastWsInstance.onmessage({ data: msg.data })
    }
    else if (msg.m === "WS_OPEN") {
        console.info("SW sent WS_OPEN")
        const { areaId } = msg.data;

        if (!lastWsInstance) {
            console.error("Received WS_OPEN event but there is no FakeWebSocket in lastWsInstance!")
            return;
        }

        lastWsInstance.__setAreaId(areaId)
        lastWsInstance.onopen()
    }
    else if (msg.m === "NAVIGATE_TO_MAINSCREEN") {
        window.location = "/";
    }
})


// Keep the real WebSocket just in case...
window._WebSocket = window.WebSocket;

// Make a FakeWebSocket that relays messages to the ServiceWorker
class FakeWebSocket {
    static OPEN = _WebSocket.OPEN;
    readyState = _WebSocket.OPEN;
    onopen = () => {};
    onclose = () => {};
    onmessage = () => {};

    constructor(url) {
        this.url = url;
        lastWsInstance = this;

        console.info("FakeWebSocket instantiated! Sending PLS_OPEN_WS to service worker...")
        postMessage_({
            m: "PLS_OPEN_WS",
            data: {
                wsUrl: this.url,
                areaId: this.areaId, // We don't have this yet, so the SW will use wsUrl
            }})
    }

    __setAreaId(areaId) {
        this.areaId = areaId;
    }

    send(msg) {
        postMessage_({
            m: "WSMSG",
            data: {
                wsUrl: this.url, // Used by the SW to figure out which AreaManager to route this message to
                areaId: this.areaId, // Ditto
                msg: msg,
            } })
    }

    close(closeCode) {
        this.onclose(closeCode)
    }
};


// ... Then trick the game into loading our FakeWebSocket
window.WebSocket = FakeWebSocket;



const startGame = () => jQuery(ig.module('initgame').requires('game.main').defines(function(){ MLand.start();}))

const main = async () => {
    const { registration } = await registerServiceWorker()

    postMessage_ = (data) => registration.active.postMessage(data)

    postMessage_({ m: "STARTING_GAME" })
    startGame();
}


main();