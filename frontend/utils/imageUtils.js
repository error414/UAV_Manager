/**
 * Image helpers for aircraft pictures.
 *
 * Pictures are kept in the database as base64 data URIs, so the browser does
 * the scaling: every stored image is a square 256x256 thumbnail.
 */

export const UAV_IMAGE_SIZE = 256;

// PNG keeps transparency but blows up on photos; fall back to JPEG past this.
const PNG_SIZE_LIMIT = 120 * 1024;

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Failed to read the image file'));
  reader.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Failed to load the image file'));
  img.src = src;
});

/**
 * Scales an image file to a square data URI of `size` pixels.
 * The source is cover-cropped so the picture is never distorted.
 *
 * @param {File} file - image file picked by the user
 * @param {number} size - edge length of the result in pixels
 * @returns {Promise<string>} base64 data URI
 */
export const resizeImageToDataUrl = async (file, size = UAV_IMAGE_SIZE) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  const sourceUrl = await readFileAsDataUrl(file);
  const img = await loadImage(sourceUrl);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Cover-crop: take the largest centered square of the source
  const edge = Math.min(img.width, img.height);
  const sx = (img.width - edge) / 2;
  const sy = (img.height - edge) / 2;
  ctx.drawImage(img, sx, sy, edge, edge, 0, 0, size, size);

  const png = canvas.toDataURL('image/png');
  if (png.length <= PNG_SIZE_LIMIT) return png;

  // Photos: re-draw on white so transparency doesn't turn black in JPEG
  const opaque = document.createElement('canvas');
  opaque.width = size;
  opaque.height = size;
  const opaqueCtx = opaque.getContext('2d');
  opaqueCtx.fillStyle = '#ffffff';
  opaqueCtx.fillRect(0, 0, size, size);
  opaqueCtx.drawImage(canvas, 0, 0);

  return opaque.toDataURL('image/jpeg', 0.85);
};
