/** Riduce la foto (max 1600px, JPEG) prima di inviarla: più veloce e meno dati. Solo browser. */
export async function preparaFoto(file: File, lato = 1600): Promise<{ mediaType: "image/jpeg"; data: string; anteprima: string }> {
  const bitmap = await createImageBitmap(file);
  const scala = Math.min(1, lato / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scala);
  canvas.height = Math.round(bitmap.height * scala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { mediaType: "image/jpeg", data: url.split(",")[1], anteprima: url };
}
