/**
 * Capture d'écran jointe à un signalement (socle 1.19.0), côté navigateur : l'image choisie est
 * redessinée dans un canevas puis réenregistrée. Seuls les pixels repartent : les métadonnées du
 * fichier d'origine (lieu, appareil, date) sont perdues en route, et un fichier qui n'est pas une
 * vraie image est refusé au décodage. Le plus grand côté est ramené à 2000 pixels, le poids sous 2 Mo.
 */
import { CAPTURE_TAILLE_MAX, CAPTURE_TYPES, dimensionsReduites } from "@/lib/captures";

const ESSAIS: Array<[string, number]> = [
  ["image/webp", 0.85],
  ["image/webp", 0.7],
  ["image/jpeg", 0.8],
  ["image/jpeg", 0.6],
];

export class CaptureIllisible extends Error {}

/** Image prête à l'envoi : WebP ou JPEG, 2 Mo au plus. Lève CaptureIllisible sinon. */
export async function preparerCapture(fichier: Blob): Promise<Blob> {
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(fichier);
  } catch {
    throw new CaptureIllisible("Cette image ne peut pas être lue. Essayez une autre capture.");
  }
  const { largeur, hauteur } = dimensionsReduites(image.width, image.height);
  const canevas = document.createElement("canvas");
  canevas.width = largeur;
  canevas.height = hauteur;
  const contexte = canevas.getContext("2d");
  if (!contexte) {
    image.close();
    throw new CaptureIllisible("Votre navigateur ne peut pas préparer cette image.");
  }
  contexte.drawImage(image, 0, 0, largeur, hauteur);
  image.close();
  for (const [type, qualite] of ESSAIS) {
    const blob = await new Promise<Blob | null>((fin) => canevas.toBlob(fin, type, qualite));
    if (
      blob &&
      (CAPTURE_TYPES as readonly string[]).includes(blob.type) &&
      blob.size <= CAPTURE_TAILLE_MAX
    ) {
      return blob;
    }
  }
  throw new CaptureIllisible("Cette image reste trop lourde. Recadrez-la sur la zone utile.");
}
