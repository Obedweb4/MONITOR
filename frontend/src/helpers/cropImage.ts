type PixelCrop = { x: number; y: number; width: number; height: number };

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    // Do NOT set crossOrigin for blob: URLs — it causes canvas security errors on mobile
    if (!url.startsWith("blob:")) {
      img.setAttribute("crossOrigin", "anonymous");
    }
    img.src = url;
  });
}

export default async function getCroppedImg(imageSrc: string, pixelCrop: PixelCrop): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  // Cap output at 400 px to avoid mobile out-of-memory errors on high-DPR screens
  const MAX_SIZE = 400;
  const size = Math.min(Math.min(pixelCrop.width, pixelCrop.height), MAX_SIZE);
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  return canvas.toDataURL("image/jpeg", 0.85);
}
