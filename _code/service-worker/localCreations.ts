const makeLocalCreations = (idbKeyval: idbKeyval) => {

// thank you chatGPT
const decompressAscii = (compressedString) => {
    const indexToCharMap = {};
    let currentIndex = 256, previousChar = "", currentChar, decompressedString = "";

    // Initialize the map with ASCII characters
    for (let i = 0; i < 256; i++) {
        indexToCharMap[i] = String.fromCharCode(i);
    }

    // Convert the input JSON string to an array
    const indexArray = JSON.parse(compressedString);

    // Iterate through the array to build the decompressed string
    for (let i = 0; i < indexArray.length; i++) {
        const index = indexArray[i];

        if (indexToCharMap[index]) {
            // If the index exists in the map, retrieve the character sequence
            currentChar = indexToCharMap[index];
        } else {
            // If the index does not exist, it must be the current sequence + its first character
            currentChar = previousChar + previousChar.charAt(0);
        }

        decompressedString += currentChar;

        // Add new sequences to the map
        if (previousChar !== "") {
            indexToCharMap[currentIndex++] = previousChar + currentChar.charAt(0);
        }

        previousChar = currentChar;
    }

    return decompressedString;
}

const tileWidthDefault = 19;
const tileHeightDefault = 19;


/**
 * @param {{r: number, g: number, b: number, alpha: number}[]} colors 
 * @param {number[][][]} cells - a 3D array for a x-y grid of palette indexes, wrapped into cells `cells[0][x][y]`
 */
const generateCreationSpriteFromPixels = async (colors, cells) => {
    // TODO: is this the right way to do it? (Taking the length of every cell)
    const width = cells.reduce((width, currentCell) => width + currentCell.length, 0)
    const height = cells[0][0].length

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const fillStyles = colors.map(({r, g, b, alpha}) => `rgba(${[r, g, b, alpha].join(',')})`)

    let currCellOffset = 0;
    for (const cellIndex in cells) {
        const cell = cells[cellIndex];

        for (const x in cell) {
            const row = cell[x];

            for (const y in row) {
                const paletteIndex = cell[x][y];
                ctx.fillStyle = fillStyles[paletteIndex];

                const spriteX = currCellOffset + Number(x);
                const spriteY = Number(y);
                ctx.fillRect(spriteX, spriteY, 1, 1); // Fill in one pixel at the specified position

            }
        }

        currCellOffset += cell.length;
    }

    return await canvas.convertToBlob();
}


const saveCreation = async (player: PlayerDataManager, itemData, db: LocalMLDatabase, cache: ReturnType<typeof makeCache>) => {
    console.log("client tried to create something!", itemData)

    const pixels = JSON.parse(decompressAscii(itemData.pixels));
    const spriteBlob = await generateCreationSpriteFromPixels(itemData.colors, pixels);

    // Magic numbers to get the id to end in "19191919"
    const itemId = generateObjectId_(Date.now(), 0, 25, 1644825)

    const itemDef = {
        id: itemId,
        name: itemData.name,
        base: itemData.type,
        creator: player.rid,
        prop: itemData.prop,
        // TODO: anything else?
    }

    await cache.setCreationSprite(itemId, spriteBlob);
    await cache.setCreationDef(itemId, JSON.stringify(itemDef));

    await player.addLocalCreation(itemId);
    await db.creation_setPainterData(itemId, {
        imageData: { pixels, colors: itemData.colors },
        name: itemData.name,
        base: itemData.type,
        creator: player.rid,
        prop: itemData.prop,
    });

    return {
        itemId: itemId,
    }
}


return { saveCreation }
}
