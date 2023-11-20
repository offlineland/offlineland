// Note: Loading one big array to/from indexedDB will probably trash a lot if people start collecting everything they see. Not really a design goal though

const DEFAULT_PLAYER_DATA = {
    name: "explorer 123",
    rid: "000000000000000000000000",
    age: 19191919,
    isFullAccount: true,
    leftMinfinityAmount: 19191919,
    isBacker: true,
    boostsLeft: 19191919,
    hasMinfinity: true,
}

class PlayerDataManager {
    idbKeyval: idbKeyval;
    rid: string;
    name: string;
    age: number;
    isFullAccount: boolean;
    leftMinfinityAmount: number;
    isBacker: boolean;
    boostsLeft: number;
    hasMinfinity: boolean;

    constructor(idbKeyval: idbKeyval, { name, rid, age, isFullAccount, leftMinfinityAmount, isBacker, boostsLeft, hasMinfinity }) {
        this.idbKeyval = idbKeyval;

        this.name = name || "explorer 123";
        this.rid = rid || "000000000000000000000000";
        this.age = age || 19191919;
        this.isFullAccount = isFullAccount || true;
        this.leftMinfinityAmount = leftMinfinityAmount || 19191919;
        this.isBacker = isBacker || true;
        this.boostsLeft = boostsLeft || 19191919;
        this.hasMinfinity = hasMinfinity || true;

        idbKeyval.update(`attachments-p${this.rid}`, (/** @type {Attachments | undefined} */ value) => {
            if (value) return value
            else return {
                // TODO: pick a random base body
                "b":"00000000000000000000074f",
                "w":null,
                "m":null,
                "h":null,
                "br":null
            }
        })
    }
    static async make(idbKeyval: idbKeyval) {
        const playerId = (await idbKeyval.get(`our-player-id`)) || "000000000000000000000000";
        const playerData = await idbKeyval.get(`playerData-p${playerId}`) || DEFAULT_PLAYER_DATA;

        return new PlayerDataManager(idbKeyval, playerData)
    }

    static async storePlayerData(idbKeyval: idbKeyval, playerData) {
        await idbKeyval.set(`our-player-id`, playerData.rid);
        await idbKeyval.set(`playerData-p${playerData.rid}`, playerData);
    }

    getInitData_http() {
        return {
            "rid": this.rid,
            "age": this.age,
            "ifa": this.isFullAccount,
            "lma": this.leftMinfinityAmount,
            "isb": this.isBacker,
            "bbl": this.boostsLeft,
            "hmf": this.hasMinfinity,
        }
    }

    async setAttachment(slot, id) {
        await this.idbKeyval.update(`attachments-p${this.rid}`, (value) => {
            const atts = (value || {});
            atts[slot] = id;
            return atts;
        })
    }

    async getAttachments() {
        return await this.idbKeyval.get(`attachments-p${this.rid}`)
    }

    async getInitData_ws() {
        return {
            "rid": this.rid,
            "snm": this.name,
            "aid":"80-1-1-f",
            "att": await this.getAttachments(),
            "r":10,
            "ani":"idle",
            "flp":false,
            "wof":{
                "w":{"x":0,"y":0},"h":{"x":0,"y":0},"wp":{"x":0,"y":0}
            },
            "shs":{}
        }
    }





    async inv_collect(itemId: string, atIndex: number) {
        let alreadyExisted = false;

        await this.idbKeyval.update(`playerinventory-collected-p${this.rid}`, (val: string[] | undefined) => {
            const inventory = (val || []);

            const indexIfAlreadyCollected = inventory.indexOf(itemId)
            if (indexIfAlreadyCollected > -1) {
                alreadyExisted = true;
                inventory.splice(indexIfAlreadyCollected, 1)
            }

            inventory.splice(atIndex, 0, itemId)

            return inventory;
        })

        return { alreadyExisted }
    }

    async inv_getAllCollects() {
        return await this.idbKeyval.get(`playerinventory-collected-p${this.rid}`) || [];
    }

    async inv_getCollectedPage (start, end) {
        const fullInventory = await this.inv_getAllCollects();

        return {
            items: fullInventory.slice(start, end),
            itemCount: fullInventory.length
        };
    }

    async inv_delCollect(itemId) {
        await this.idbKeyval.update(`playerinventory-collected-p${this.rid}`, (val: string[] | undefined) => {
            const inventory = (val || []);

            const indexIfAlreadyCollected = inventory.indexOf(itemId)
            if (indexIfAlreadyCollected > -1) {
                inventory.splice(indexIfAlreadyCollected, 1)
            }

            return inventory;
        })

    }


    // NOTE: local creations are saved under another key and merged with the "real" imported data so that we don't risk overwriting local creations.
    async addLocalCreation(itemId) {
        await this.idbKeyval.update(`playerinventory-created-LOCAL`, (val: string[] | undefined) => {
            const inventory = (val || []);
            inventory.unshift(itemId)
            return inventory;
        })

    }

    async inv_getAllCreated() {
        const localCreations : string[] =  await this.idbKeyval.get(`playerinventory-created-LOCAL`) || [];
        const playerCreations: string[] = await this.idbKeyval.get(`playerinventory-created-p${this.rid}`) || [];

        return localCreations.concat(playerCreations);
    }

    async inv_getCreatedPage(start, end) {
        const fullInventory = await this.inv_getAllCreated();
        
        return {
            items: fullInventory.slice(start, end),
            itemCount: fullInventory.length
        };
    }

    async inv_delCreated(itemId) {
        await this.idbKeyval.update(`playerinventory-created-p${this.rid}`, (val: string[] | undefined) => {
            const inventory = (val || []);

            const indexIfAlreadyCollected = inventory.indexOf(itemId)
            if (indexIfAlreadyCollected > -1) {
                inventory.splice(indexIfAlreadyCollected, 1)
            }

            return inventory;
        })
    }



    async import_setCollected(itemIds: string[]) {
        await this.idbKeyval.set(`playerinventory-collected-p${this.rid}`, itemIds);
    }

    async import_setCreated(itemIds: string[]) {
        await this.idbKeyval.set(`playerinventory-created-p${this.rid}`, itemIds);
    }

    async import_setSnaps(snaps: Snap[]) {
        await this.idbKeyval.set(`playersnaps-p${this.rid}`, snaps);
    }

    async import_setMifts(miftsPub: any[], miftsPriv: any[]) {
        await this.idbKeyval.set(`playermifts-public-p${this.rid}`, miftsPub);
        await this.idbKeyval.set(`playermifts-private-p${this.rid}`, miftsPriv);
    }
}