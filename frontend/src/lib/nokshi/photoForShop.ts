/**
 * The customer's photo, made small enough to send with their request.
 *
 * The shop needs to see the carving, not count the pores in the wood: 1600 px on the long
 * side is plenty to price it and cut it from, and as a JPEG it comes to a few hundred KB
 * instead of the 5-12 MB a phone takes. Drawing it through a canvas also bakes the phone's
 * rotation into the pixels, so it arrives the right way up, and drops the camera's
 * metadata - the GPS position of somebody's front door included.
 */
export async function photoForShop(file: File, max = 1600, quality = 0.85): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("That image could not be read"));
      el.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#fff";                     // a transparent PNG would turn black as a JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return cv.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
