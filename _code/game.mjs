import { registerServiceWorker } from "/_code/register-service-worker.js"
// Noop until replaced in main()
let postMessage_ = () => {}
/** @type { FakeWebSocket | null } */
let lastWsInstance = null;

// Relay messages from Service Worker to the FakeWebSocket instance
navigator.serviceWorker?.addEventListener("message", (ev) => {
    const msg = ev.data;
    console.log("SW msg:", msg)

    if (msg.m === "WS_MSG") {
        lastWsInstance?.onmessage({ data: msg.data })
    }
    else if (msg.m === "WS_OPEN") {
        lastWsInstance?.onopen()
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

        postMessage_({ m: "PLS_OPEN_WS", data: { wsUrl: this.url }})
    }

    send(msg) {
        // TODO: send areaname and/or id (have the sw send it to us?) instead of wsUrl; if the sw goes to sleep, it will lose it's memory of "areaMgrByWsUrl"
        postMessage_({ m: "WSMSG", data: { wsUrl: this.url, msg: msg } })
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