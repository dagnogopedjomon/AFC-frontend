/**
 * Couleurs de la charte graphique AFC utilisables là où une variable CSS ne
 * fonctionne pas : attributs SVG (recharts, icônes lucide avec `color=`).
 * Les valeurs sont des tons intermédiaires entre le thème clair et le thème
 * sombre de la charte, pour rester lisibles sur les deux fonds.
 */
export const CHARTE = {
  /** Bleu AFC — séries principales, « encaissé », états positifs. */
  primary: '#4C84C9',
  /** Bleu AFC du thème clair (texte, aplats). */
  primaryLight: '#2F68B1',
  /** Rouge terre — retard, sorties, suppression. */
  destructive: '#D06148',
  /** Bleu clair — série secondaire. */
  chart2: '#759FD7',
  /** Ocre — partiel, ouverte, à surveiller. */
  chart4: '#DDAC3C',
  /** Ocre foncé — seule version lisible en texte sur fond clair. */
  chart4Ink: '#98680F',
  /** Violet — exceptionnelle, bureau, avance. */
  chart5: '#8E76C3',
  /** Gris — neutre, inactif, prospect. */
  muted: '#8C939C',
} as const;

/** Séries des camemberts, dans l'ordre de la charte. */
export const PIE_COLORS = [CHARTE.primary, CHARTE.chart2, CHARTE.chart5, CHARTE.chart4];
