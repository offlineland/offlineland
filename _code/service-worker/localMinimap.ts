const makeMinimapGenerator = (dbPromise: Promise<LocalMLDatabase>, cache_getCreationSprite) => {
const getPixelsFor = async (blob: Blob) => {
    const imageBitmap = await self.createImageBitmap(blob)

    const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const context = offscreenCanvas.getContext('2d');
    context.drawImage(imageBitmap, 0, 0);
    const imageData = context.getImageData(0, 0, imageBitmap.width, imageBitmap.height);

    return imageData.data;
}

const getMostUsedColor = (pixels: Uint8ClampedArray) => {
  const colorCount = new Map();
  let maxCount = 0;
  let mostUsedColor = null;

  for (let i = 0; i < pixels.length; i += 4) {
    // Get the color as a string in the format "r,g,b,a"
    const color = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`;

    // Update the count for this color
    const count = (colorCount.get(color) || 0) + 1;
    colorCount.set(color, count);

    // Update the most used color if this color has a higher count
    if (count > maxCount) {
      maxCount = count;
      mostUsedColor = color;
    }
  }

  // Return the most used color as an array [r, g, b]
  return mostUsedColor ? `rgba(${mostUsedColor})` : null;

}

/** @param {[number, number, [ number, number, number, number]][]} xyc */
const generateMinimapTile = async (xyc) => {
    const size = 32;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');

    xyc.forEach(item => {
        const [x, y, color] = item;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1); // Fill in one pixel at the specified position
    });

    return await canvas.convertToBlob();
}

const getMapPixelColorFor = async (creationId: string) => {
    console.log("getMapPixelColorFor", creationId)
    const db = await dbPromise;

    const fromDb = await db.creation_getMinimapColor(creationId)
    if (fromDb) return fromDb;


    const creationRes = await cache_getCreationSprite(creationId)

    if (!creationRes) {
        console.error("getMapColorFor(): creation does not exist in cache!", creationId)
        // Note: this means that it will generate *and cache* the minimap tile with this red pixel!
        // This is probably alright, since the map is just there to get around
        return [255, 0, 0, 1];
    }

    const blob = await creationRes.blob();
    const pixels = await getPixelsFor(blob);
    // TODO: this isn't exactly how ML picks it's colors, but we don't have access to creation palette here.
    const mostUsedColor = getMostUsedColor(pixels)

    await db.creation_setMinimapColor(creationId, mostUsedColor)

    return mostUsedColor;
}


return { getMapPixelColorFor, generateMinimapTile }
}