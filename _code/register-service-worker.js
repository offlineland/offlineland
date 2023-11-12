export const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator === false) {
        throw new Error("Your browser does not seem to support Service Workers. Please update your browser. (If you're a dev, maybe you are not accessing this page from a secure context (https or localhost)?)")
    }

    const currRegistration = await navigator.serviceWorker.getRegistration()
    console.log("currRegistration", currRegistration)
    //if (currRegistration) {
    //    console.log("existing SW, unregistering...")
    //    const res = await currRegistration.unregister()
    //    console.log("existing SW, unregistering... done, res:", res)
    //}

    const regPromise = navigator.serviceWorker.register('/service-worker.js', { scope: "/", type: "classic" })
    console.log("registering service worker...", { regPromise })
    const swRegistration = await regPromise;
    console.log("registering service worker... done", { regPromise, swRegistration })


    swRegistration.addEventListener("updatefound", (event) => {
        const newWorker = swRegistration.installing;
        console.log("updatefound", { event, newWorker })

        swRegistration.installing?.addEventListener("statechange", (event) => console.log("New service worker state", newWorker?.state, { event, newWorker}))
        swRegistration.installing?.addEventListener("error", (event) => console.log("New service worker state", newWorker?.state, { event, newWorker }))
    })

    const updatePromise = swRegistration.update()
    console.log("updating service worker...", { updatePromise })
    const upResult = await updatePromise;
    console.log("updating service worker... done", { updatePromise, upResult })

    //console.log("ready to start game", { upResult })

    return { 
        registration: swRegistration,
    }
}