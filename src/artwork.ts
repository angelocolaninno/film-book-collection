const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_EDGE = 1800;
const MAX_OPTIMIZED_BYTES = 1.2 * 1024 * 1024;

function loadImage(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened. Try a JPEG, PNG, or WebP image."));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("This image could not be prepared. Try another file.")),
      type,
      quality,
    );
  });
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("This image could not be saved."));
    reader.onerror = () => reject(new Error("This image could not be saved."));
    reader.readAsDataURL(blob);
  });
}

/** Shrink local artwork before keeping it in IndexedDB and the portable JSON backup. */
export async function prepareArtwork(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file for the cover or poster.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Choose an image smaller than 15 MB.");
  }

  const { image, url } = await loadImage(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("This image could not be prepared. Try another file.");

    context.fillStyle = "#f7f6f2";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let blob = await canvasToBlob(canvas, "image/webp", 0.82);
    if (!blob.type.includes("webp")) {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.82);
    }
    if (blob.size > MAX_OPTIMIZED_BYTES) {
      blob = await canvasToBlob(canvas, blob.type, 0.68);
    }
    if (blob.size > MAX_OPTIMIZED_BYTES) {
      throw new Error("This image is still too large after resizing. Choose a smaller image.");
    }
    return await readAsDataUrl(blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}
