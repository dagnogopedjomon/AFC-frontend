/**
 * Lot 4 du module « Publications » : reconstruction du site public.
 *
 * Lance le générateur fourni par le designer (site-public/build.py) et recopie
 * son résultat dans public/, d'où Next l'exporte à la racine du site.
 *
 * Les contenus viennent de l'API publique de l'application quand AFC_API_URL
 * est défini (c'est le cas sur Vercel), sinon des fichiers de site-public/contenu.
 *
 * Si la reconstruction échoue — Python absent, application injoignable — on
 * garde les pages déjà présentes dans public/ : le site en ligne reste
 * inchangé, comme le demande la section 8 du cahier des charges, sans pour
 * autant bloquer le déploiement de l'application.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const generateur = join(racine, 'site-public');
const sortie = join(generateur, 'deploy_netlify');
const destination = join(racine, 'public');

function python() {
  for (const bin of ['python3', 'python']) {
    const essai = spawnSync(bin, ['--version'], { encoding: 'utf8' });
    if (essai.status === 0) return bin;
  }
  return null;
}

function abandonner(raison) {
  console.warn(`[site public] ${raison}`);
  console.warn('[site public] Les pages déjà présentes dans public/ sont conservées.');
  process.exit(0);
}

if (!existsSync(join(generateur, 'build.py'))) {
  abandonner('Générateur introuvable (site-public/build.py).');
}

const bin = python();
if (!bin) abandonner('Python introuvable sur cette machine.');

const api = process.env.AFC_API_URL?.trim();
console.log(
  api
    ? `[site public] Reconstruction depuis l'API : ${api}`
    : '[site public] Reconstruction depuis les fichiers de site-public/contenu (AFC_API_URL non défini).',
);

rmSync(sortie, { recursive: true, force: true });
const run = spawnSync(bin, ['build.py'], {
  cwd: generateur,
  encoding: 'utf8',
  env: { ...process.env, ...(api ? { AFC_API_URL: api } : {}) },
});

if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);

if (run.status !== 0 || !existsSync(join(sortie, 'index.html'))) {
  abandonner("La reconstruction a échoué (application injoignable ?).");
}

// On remplace chaque entrée au lieu de la fusionner : une page d'événement
// retiré de la publication doit disparaître à la reconstruction suivante
// (critère d'acceptation du cahier des charges).
for (const entree of readdirSync(sortie)) {
  rmSync(join(destination, entree), { recursive: true, force: true });
  cpSync(join(sortie, entree), join(destination, entree), { recursive: true, force: true });
}

// Variante « artefacts » produite par le générateur : inutile ici.
rmSync(join(generateur, 'build_artifacts'), { recursive: true, force: true });
rmSync(sortie, { recursive: true, force: true });

console.log('[site public] Pages publiques mises à jour dans public/.');
