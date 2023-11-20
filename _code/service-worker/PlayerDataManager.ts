// Note: Loading one big array to/from indexedDB will probably trash a lot if people start collecting everything they see. Not really a design goal though

const dateFromObjectId = (objectId: string) => new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
const daysSinceDate = (date: Date) => Math.floor((Date.now() - date.valueOf()) / (1000 * 60 * 60 * 24));



type ProfileData = {
    isFullAccount: boolean,
    hasMinfinity: boolean,
    isBacker: boolean,
    screenName: string,
    rank: number,
    stat_ItemsPlaced: number,
    unfindable: boolean,
    ageDays: number,

    profileItemIds?: Array<string | null>,
    profileColor?: number | null,
    profileBackId?: string | null,
    profileDynaId?: string | null,
}


type PlayerExtraData = {
    leftMinfinityAmount: number,
    boostsLeft: number,
}


const DEFAULT_PROFILE: ProfileData = {
    isFullAccount: true,
    hasMinfinity: true,
    isBacker: true,
    screenName: "explorer 123",
    rank: 10,
    stat_ItemsPlaced: 19,
    unfindable: true,
    ageDays: 191919,
}

const DEFAULT_PLAYER_DATA: PlayerExtraData = {
    leftMinfinityAmount: 19191919,
    boostsLeft: 19191919,
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
    rank: number;
    stat_ItemsPlaced: number;
    unfindable: boolean;
    profileItemIds: any;
    profileColor: any;
    profileBackId: any;
    profileDynaId: any;

    constructor( idbKeyval: idbKeyval, rid: string, profile: ProfileData, data: PlayerExtraData) {
        this.idbKeyval = idbKeyval;

        const { isFullAccount, isBacker, screenName, rank, stat_ItemsPlaced, unfindable, hasMinfinity, ageDays } = profile;
        const { leftMinfinityAmount, boostsLeft } = data;

        this.name = screenName;
        this.rid = rid;
        this.rank = rank;
        this.stat_ItemsPlaced = stat_ItemsPlaced;
        this.unfindable = unfindable;
        this.age = rid === "000000000000000000000000" ? 191919 : daysSinceDate(dateFromObjectId(rid));
        this.isFullAccount = isFullAccount;
        this.leftMinfinityAmount = leftMinfinityAmount;
        this.isBacker = isBacker;
        this.boostsLeft = boostsLeft;
        this.hasMinfinity = hasMinfinity;

        this.profileItemIds = profile.profileItemIds;
        this.profileColor = profile.profileColor;
        this.profileBackId = profile.profileBackId;
        this.profileDynaId = profile.profileDynaId;

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

        const playerProfile: ProfileData  = await idbKeyval.get(`playerData-p${playerId}`) || DEFAULT_PROFILE;
        const playerData: PlayerExtraData = DEFAULT_PLAYER_DATA; // TODO: load these from settings somehow?

        return new PlayerDataManager(idbKeyval, playerId, playerProfile, playerData)
    }

    static async import_setProfile(idbKeyval: idbKeyval, rid: string, playerData: ProfileData) {
        await idbKeyval.set(`our-player-id`, rid);
        await idbKeyval.set(`playerData-p${rid}`, playerData);
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

    getProfileData(): ProfileData {
        return {
            isFullAccount: this.isFullAccount,
            hasMinfinity: this.hasMinfinity,
            isBacker: this.isBacker,
            screenName: this.name,
            rank: this.rank,
            stat_ItemsPlaced: this.stat_ItemsPlaced,
            unfindable: this.unfindable,
            ageDays: this.age,
            profileItemIds: this.profileItemIds,
            profileColor: this.profileColor,
            profileBackId: this.profileBackId,
            profileDynaId: this.profileDynaId,
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



    async import_setProfile(itemIds: string[]) {
        await this.idbKeyval.set(`playerinventory-collected-p${this.rid}`, itemIds);
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