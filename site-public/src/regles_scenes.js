/* Scènes des règles AFC.
   Chaque étape = une phrase de voix off (id chXX_sYY) + l'état animé du terrain.
   Temps en secondes depuis le début de l'étape. Coordonnées : viewBox 1000 × 580. */

const G = { X0: 40, X1: 960, Y0: 60, Y1: 520, MX: 500, MY: 290, SD: 120, SH: 200, PEN: 175 };
const SURF_L = 40 + 120, SURF_R = 960 - 120;          // lignes avant des surfaces
const PEN_L = 40 + 175, PEN_R = 960 - 175;             // points de penalty
const GOAL_L = 24, GOAL_R = 976;                        // fond des buts

// 6 contre 6 : bleus à gauche (attaquent vers la droite), rouges à droite
const BL = [[205, 165], [205, 415], [300, 290], [385, 150], [385, 430], [445, 290]];
const RD = BL.map(([x, y]) => [1000 - x, y]);

const at = (x, y) => [[0, x, y]];
function team(prefix, c, pos, skip = []) {
  return pos.map((p, i) => ({ id: prefix + i, c, k: at(p[0], p[1]) })).filter((a) => !skip.includes(a.id));
}
const sixVsix = (skipB = [], skipR = []) => [...team("b", "b", BL, skipB), ...team("r", "r", RD, skipR)];

// File d'arrivée et groupes d'équipes (chapitre « séance »)
const SLOT = (n) => [95 + (n - 1) * 70, 468];
const GRP = (cx) => [[cx, 140], [cx - 62, 215], [cx + 62, 215], [cx - 62, 295], [cx + 62, 295], [cx, 370]];
const T1 = GRP(240), T2 = GRP(760), T3 = GRP(500);
const T1_IDS = [1, 3, 5, 7, 9, 11], T2_IDS = [2, 4, 6, 8, 10, 12];
function arrivals(from, to, t0 = 0.3, gap = 0.22) {
  const out = [];
  for (let n = from; n <= to; n++) {
    const [x, y] = SLOT(n), t = t0 + (n - from) * gap;
    out.push({ id: "p" + n, c: "n", l: String(n), k: [[0, 1060, y], [t, 1060, y], [t + 0.9, x, y]] });
  }
  return out;
}
function picked(final = false, t0 = 0.4) {
  // Les capitaines 1 et 2 sortent de la file, puis choisissent chacun à leur tour
  const out = [];
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  order.forEach((n, i) => {
    const team1 = T1_IDS.includes(n);
    const slot = (team1 ? T1 : T2)[(team1 ? T1_IDS : T2_IDS).indexOf(n)];
    const [sx, sy] = SLOT(n);
    const t = final ? 0 : t0 + i * 0.45;
    out.push({
      id: "p" + n, l: String(n),
      c: final ? (team1 ? "b" : "r") : [[0, "n"], [t, team1 ? "b" : "r"]],
      k: final ? at(slot[0], slot[1]) : [[0, sx, sy], [t, sx, sy], [t + 0.8, slot[0], slot[1]]],
      cap: n <= 2,
    });
  });
  return out;
}

const SCENES = [
  // ───────────────────────── 1. LA SÉANCE ─────────────────────────
  {
    id: "seance", title: "La séance", short: "Séance",
    text: [
      "La liste de match est ouverte le matin du match. Dès 12 inscrits, la séance a lieu ; en dessous, elle peut être reportée.",
      "Un inscrit qui ne vient pas paie 2 000 F, sauf s'il prévient avant 19 h.",
      "L'ordre d'arrivée sur le terrain fait foi. Les 2 premiers sont capitaines et choisissent tour à tour parmi les 12 premiers. Un invité ou un intermittent ne peut pas être dans les 12 premiers s'il y a un membre actif dehors.",
      "Avec 3 équipes, les 13e à 18e forment la 3e équipe (le 13e est capitaine). Ensuite, les arrivants sont répartis chacun leur tour : 19e → équipe 1, 20e → équipe 2, 21e → équipe 3…",
      "Remplacements libres, par une seule entrée. Un seul arbitre ; s'il est absent, on désigne un remplaçant.",
    ],
    steps: [
      { say: "Avant de jouer, il y a la liste de match. Elle est ouverte le matin du match.",
        zones: ["dim"],
        cards: [{ t: 0.3, x: 300, y: 150, w: 400, h: 250, title: "Liste du jour", big: "12 / 12", lines: ["inscrits : la séance a lieu"], tone: "ok" }] },
      { say: "Dès que douze joueurs sont inscrits, la séance a lieu. En dessous de douze, elle peut être reportée.",
        zones: ["dim"],
        cards: [
          { t: 0.2, x: 120, y: 160, w: 360, h: 230, title: "12 inscrits ou plus", big: "On joue", lines: ["la séance est confirmée"], tone: "ok" },
          { t: 1.6, x: 520, y: 160, w: 360, h: 230, title: "Moins de 12", big: "Report", lines: ["la séance peut être reportée"], tone: "no" },
        ] },
      { say: "Un inscrit qui ne vient pas paie deux mille francs, sauf s'il prévient avant dix-neuf heures.",
        zones: ["dim"],
        cards: [
          { t: 0.2, x: 300, y: 160, w: 400, h: 230, title: "Absent sans prévenir", big: "2 000 F", lines: ["sauf s'il prévient avant 19 h"], tone: "no" },
        ] },
      { say: "Sur le terrain, c'est l'ordre d'arrivée qui compte. Les douze premiers arrivés jouent. Un invité ou un intermittent ne peut pas être dans les douze premiers s'il y a un membre actif dehors.",
        actors: arrivals(1, 12),
        labels: [{ t: 3.4, x: 500, y: 420, text: "Ordre d'arrivée : les 12 premiers jouent" }, { t: 6.0, x: 500, y: 460, text: "Invité ou intermittent : après les membres actifs", tone: "info" }] },
      { say: "Les deux premiers sont les capitaines. Ils choisissent leurs joueurs chacun à leur tour, et le premier arrivé choisit en premier.",
        actors: picked(false),
        labels: [{ t: 0.6, x: 240, y: 92, text: "Capitaine 1", tone: "info" }, { t: 1.0, x: 760, y: 92, text: "Capitaine 2", tone: "info" }] },
      { say: "Avec trois équipes, les joueurs arrivés du treizième au dix-huitième forment la troisième équipe. Le treizième en est le capitaine.",
        actors: [...picked(true), ...[13, 14, 15, 16, 17, 18].map((n, i) => ({ id: "p" + n, l: String(n), c: "g", cap: n === 13, k: [[0, 1060, 468], [0.3 + i * 0.35, 1060, 468], [1.2 + i * 0.35, T3[i][0], T3[i][1]]] }))],
        labels: [{ t: 2.8, x: 500, y: 92, text: "Équipe 3", tone: "info" }] },
      { say: "Les suivants vont chacun leur tour dans une équipe : le dix-neuvième dans l'équipe un, le vingtième dans l'équipe deux, le vingt et unième dans l'équipe trois, et ainsi de suite.",
        actors: [...picked(true), ...[13, 14, 15, 16, 17, 18].map((n, i) => ({ id: "p" + n, l: String(n), c: "g", cap: n === 13, k: at(T3[i][0], T3[i][1]) })),
          { id: "p19", l: "19", c: "b", sub: true, k: [[0, 1060, 468], [0.5, 1060, 468], [1.8, 240, 462]] },
          { id: "p20", l: "20", c: "r", sub: true, k: [[0, 1060, 468], [2.2, 1060, 468], [3.4, 760, 462]] },
          { id: "p21", l: "21", c: "g", sub: true, k: [[0, 1060, 468], [3.9, 1060, 468], [5.0, 500, 462]] }],
        labels: [{ t: 5.6, x: 500, y: 525, text: "Remplaçants, répartis chacun leur tour" }] },
      { say: "Les remplacements sont libres, par une seule entrée. Un seul arbitre dirige le match. S'il est absent, on désigne un remplaçant.",
        zones: ["entry"],
        actors: [...sixVsix(["b2"]),
          { id: "b2", c: "b", k: [[0, 300, 290], [1.0, 300, 290], [2.4, 470, 540]] },
          { id: "s1", c: "b", k: [[0, 530, 560], [1.2, 530, 560], [2.8, 300, 290]] },
          { id: "ref", c: "ref", k: [[0, 560, 210], [5, 600, 230]] }],
        labels: [{ t: 0.4, x: 500, y: 498, text: "Entrée unique", tone: "info" }, { t: 4.2, x: 640, y: 175, text: "Un seul arbitre" }] },
    ],
  },

  // ───────────────────────── 2. LES FORMATS ─────────────────────────
  {
    id: "formats", title: "Équipes et durée", short: "Formats",
    text: [
      "12 à 17 joueurs : 2 équipes. 18 : on décide avant de commencer. Plus de 18 : 3 équipes, jamais 4.",
      "2 équipes : un match d'1 h 30 avec une pause de 10 minutes.",
      "3 équipes : mini-tournoi aller-retour, 6 matchs de 10 minutes, chaque équipe en joue 4.",
      "Nul après 10 minutes : tirs au but, 2 tireurs par équipe puis un chacun jusqu'au vainqueur.",
      "Points : victoire 3, victoire aux tirs au but 2, défaite aux tirs au but 1, défaite 0.",
      "Égalité de points : confrontations directes, puis différence de buts, puis buts marqués.",
    ],
    steps: [
      { say: "De douze à dix-sept joueurs, on fait deux équipes. À dix-huit, on décide avant de commencer. Au-delà, trois équipes, et jamais quatre.",
        zones: ["dim"],
        cards: [
          { t: 0.2, x: 60, y: 165, w: 280, h: 220, title: "12 à 17 joueurs", big: "2", lines: ["équipes + remplaçants"] },
          { t: 2.6, x: 360, y: 165, w: 280, h: 220, title: "18 joueurs", big: "2 ou 3", lines: ["on décide avant"] },
          { t: 4.6, x: 660, y: 165, w: 280, h: 220, title: "Plus de 18", big: "3", lines: ["jamais 4 équipes"] },
        ] },
      { say: "Avec deux équipes, on joue un seul match d'une heure trente, avec une pause de dix minutes.",
        zones: ["dim"],
        raw: [{ t: 0.2, svg: timeline2() }] },
      { say: "Avec trois équipes, on joue un mini-tournoi aller-retour : six matchs de dix minutes, et chaque équipe en joue quatre.",
        zones: ["dim"],
        raw: [{ t: 0.2, svg: tournoi() }] },
      { say: "En cas de match nul après dix minutes : tirs au but. Deux tireurs par équipe, puis un tireur chacun, jusqu'à ce qu'il y ait un vainqueur.",
        zones: ["dim"],
        cards: [
          { t: 0.2, x: 150, y: 165, w: 320, h: 220, title: "Nul après 10 min", big: "2 tirs", lines: ["par équipe"] },
          { t: 3.0, x: 530, y: 165, w: 320, h: 220, title: "Toujours égalité", big: "1 contre 1", lines: ["jusqu'au vainqueur"] },
        ] },
      { say: "Le barème : trois points pour une victoire dans le temps de jeu, deux points pour une victoire aux tirs au but, un point pour une défaite aux tirs au but, et zéro pour une défaite.",
        zones: ["dim"],
        raw: [{ t: 0.2, svg: bareme() }] },
      { say: "En cas d'égalité de points au classement, on regarde d'abord les confrontations directes, puis la différence de buts, puis le nombre de buts marqués.",
        zones: ["dim"],
        cards: [
          { t: 0.2, x: 60, y: 165, w: 280, h: 220, title: "Critère 1", big: "Face-à-face", lines: ["confrontations directes"] },
          { t: 2.8, x: 360, y: 165, w: 280, h: 220, title: "Critère 2", big: "+ / –", lines: ["différence de buts"] },
          { t: 4.4, x: 660, y: 165, w: 280, h: 220, title: "Critère 3", big: "Buts", lines: ["buts marqués"] },
        ] },
    ],
  },

  // ───────────────────────── 3. LE TERRAIN ─────────────────────────
  {
    id: "terrain", title: "Le terrain", short: "Terrain",
    text: [
      "Terrain de five, avec des murs sur les côtés. 6 contre 6, sans gardien, personne ne joue à la main.",
      "Pas de touche : le ballon qui touche le mur ou le filet reste en jeu. Coincé dans le filet : relance libre pour l'adversaire de celui qui l'a touché en dernier.",
      "La surface rectangulaire est la surface de but. Le point de penalty remplace la ligne des 9 m.",
      "Les couloirs : la ligne avant de la surface, prolongée jusqu'aux murs, délimite deux couloirs de chaque côté.",
      "Des lots de chasubles, une tenue de football correcte, chaussures synthétiques sans crampons.",
    ],
    steps: [
      { say: "On joue au Maracana sur un terrain de five : six contre six, sans gardien, et personne ne joue le ballon à la main.",
        actors: sixVsix(), ball: at(500, 290),
        labels: [{ t: 0.8, x: 500, y: 92, text: "6 contre 6, sans gardien" }] },
      { say: "Sur les côtés, il y a des murs. Le ballon qui les touche reste en jeu : il n'y a pas de touche.",
        zones: ["walls"],
        actors: sixVsix(), ball: [[0, 430, 250], [0.6, 430, 250], [1.6, 540, 66], [2.6, 640, 230]],
        marks: [{ t: 1.6, x: 540, y: 66, type: "v" }],
        labels: [{ t: 1.9, x: 540, y: 112, text: "Le jeu continue", tone: "ok" }] },
      { say: "Si le ballon reste coincé dans le filet, l'équipe adverse de celle qui l'a touché en dernier obtient une relance libre.",
        zones: ["walls"],
        actors: sixVsix(), ball: [[0, 385, 430], [0.8, 385, 430], [1.8, 470, 526]],
        marks: [{ t: 1.9, x: 470, y: 526, type: "x" }],
        labels: [{ t: 2.2, x: 470, y: 470, text: "Coincé : relance libre pour les rouges", tone: "warn" }] },
      { say: "La surface rectangulaire est la surface de but. Le point de penalty remplace la ligne des neuf mètres.",
        zones: ["surfL", "surfR", "penL", "penR"],
        labels: [{ t: 0.4, x: 100, y: 300, text: "Surface", tone: "info", size: 15 }, { t: 0.4, x: 900, y: 300, text: "Surface", tone: "info", size: 15 },
          { t: 2.8, x: PEN_L + 30, y: 245, text: "Point de penalty = 9 m", size: 15 }, { t: 2.8, x: PEN_R - 30, y: 245, text: "Point de penalty = 9 m", size: 15 }] },
      { say: "En prolongeant la ligne avant de la surface jusqu'aux murs, on obtient deux couloirs de chaque côté. Ils servent pour la relance et pour le corner.",
        zones: ["surfL", "surfR", "extL", "extR", "corL", "corR"],
        labels: [{ t: 1.4, x: 100, y: 125, text: "Couloir", tone: "gold", size: 15 }, { t: 1.4, x: 100, y: 455, text: "Couloir", tone: "gold", size: 15 },
          { t: 1.4, x: 900, y: 125, text: "Couloir", tone: "gold", size: 15 }, { t: 1.4, x: 900, y: 455, text: "Couloir", tone: "gold", size: 15 }] },
      { say: "Côté équipement : des lots de chasubles, une tenue de football correcte, et des chaussures synthétiques sans crampons.",
        zones: ["dim"],
        cards: [
          { t: 0.2, x: 150, y: 165, w: 320, h: 220, title: "Tenue", big: "Football", lines: ["lots de chasubles, tenue correcte"] },
          { t: 2.6, x: 530, y: 165, w: 320, h: 220, title: "Chaussures", big: "Synthétiques", lines: ["sans crampons"] },
        ] },
    ],
  },

  // ───────────────────────── 4. LE BUT ─────────────────────────
  {
    id: "but", title: "Le but", short: "But",
    text: ["Un but ne compte que s'il est marqué depuis la surface de but. Dès qu'un attaquant touche le ballon, le but est validé. Un tir de l'extérieur ne compte pas, même s'il entre. Un défenseur qui met le ballon dans son propre but sans contact d'un attaquant adverse dans la surface donne un corner."],
    steps: [
      { say: "Un but ne compte que s'il est marqué depuis la surface. Dès qu'il y a contact d'un attaquant avec le ballon, le but est validé. Un défenseur qui met le ballon dans son propre but, sans contact d'un attaquant adverse dans la surface, donne un corner.",
        zones: ["surfR"],
        actors: [...team("r", "r", [[880, 200], [700, 380], [640, 180], [760, 300]]), { id: "b0", c: "b", k: [[0, 760, 240], [1.0, 880, 300]] }],
        ball: [[0, 768, 252], [1.0, 892, 300], [1.4, 892, 300], [2.0, GOAL_R, 300]],
        labels: [{ t: 2.2, x: 820, y: 410, text: "But valable", tone: "ok" }], marks: [{ t: 2.1, x: 948, y: 260, type: "v" }] },
      { say: "Un tir depuis l'extérieur de la surface ne compte pas, même s'il entre dans le but.",
        zones: ["surfR"],
        actors: [...team("r", "r", [[880, 200], [880, 390], [640, 180], [760, 400]]), { id: "b0", c: "b", k: [[0, 650, 290], [0.8, 720, 290]] }],
        ball: [[0, 662, 290], [0.8, 732, 290], [1.2, 732, 290], [2.0, GOAL_R, 298]],
        arrows: [{ t: 1.2, a: [735, 290], b: [955, 296], s: "shot" }],
        labels: [{ t: 2.2, x: 700, y: 410, text: "Tiré hors de la surface : pas de but", tone: "no" }], marks: [{ t: 2.1, x: 948, y: 260, type: "x" }] },
    ],
  },

  // ───────────────────────── 5. LE COUP D'ENVOI ─────────────────────────
  {
    id: "envoi", title: "Le coup d'envoi", short: "Coup d'envoi",
    text: [
      "Au tout début du match : passe obligatoire à l'adversaire le plus proche, qui rend le ballon correctement. S'il le rend mal : 2 minutes dehors.",
      "Après un but et en 2e période : passe libre, on peut jouer directement avec un coéquipier. Après un but, l'équipe qui a encaissé engage.",
    ],
    steps: [
      { say: "Au tout début du match, le joueur passe obligatoirement le ballon à l'adversaire le plus proche, qui le lui rend correctement.",
        zones: ["centre"],
        actors: [...sixVsix(["b5"], ["r5"]), { id: "b5", c: "b", k: at(485, 290) }, { id: "r5", c: "r", k: at(585, 260) }],
        ball: [[0, 500, 290], [1.0, 500, 290], [1.8, 570, 266], [3.0, 570, 266], [3.8, 500, 290]],
        arrows: [{ t: 1.0, a: [505, 288], b: [565, 268], s: "pass" }, { t: 3.0, a: [565, 272], b: [505, 292], s: "pass" }],
        labels: [{ t: 1.6, x: 640, y: 210, text: "1. Passe à l'adversaire" }, { t: 3.6, x: 640, y: 340, text: "2. Il rend le ballon", tone: "ok" }] },
      { say: "S'il rend mal le ballon, c'est deux minutes dehors.",
        zones: ["centre"],
        actors: [...sixVsix(["b5"], ["r5"]), { id: "b5", c: "b", k: at(485, 290) }, { id: "r5", c: "r", k: [[0, 585, 260], [2.0, 585, 260], [3.4, 620, 545]] }],
        ball: [[0, 570, 266], [0.6, 570, 266], [1.4, 300, 470]],
        labels: [{ t: 1.4, x: 610, y: 470, text: "Rendu de travers : 2 min dehors", tone: "no" }] },
      { say: "Après un but, et en deuxième période, la passe est libre : on peut jouer directement avec un coéquipier. Après un but, c'est l'équipe qui a encaissé qui engage.",
        zones: ["centre"],
        actors: [...sixVsix(["b5"]), { id: "b5", c: "b", k: at(485, 290) }],
        ball: [[0, 500, 290], [1.2, 500, 290], [2.2, 395, 160]],
        arrows: [{ t: 1.2, a: [495, 285], b: [400, 166], s: "pass" }],
        labels: [{ t: 2.0, x: 330, y: 92, text: "Passe libre à un coéquipier", tone: "ok" }] },
    ],
  },

  // ───────────────────────── 6. LA RELANCE ─────────────────────────
  {
    id: "relance", title: "La relance depuis la surface", short: "Relance 6 m",
    text: [
      "Le joueur qui relance est seul dans sa surface.",
      "Un coéquipier peut se placer dans chaque couloir ; la passe va obligatoirement vers l'un d'eux, au choix du joueur qui relance.",
      "6 secondes pour relancer.",
      "Un adversaire peut se trouver dans un couloir, même celui du receveur. S'il y est au moment de la passe, il est hors de l'action : il ne presse pas, même après le contrôle. Il redevient actif quand l'équipe qui relance perd le ballon.",
      "Les autres adversaires ne pressent qu'après le contrôle du receveur. Pressing trop tôt : on recommence la relance.",
    ],
    steps: [
      { say: "La relance depuis la surface, le six mètres. Le joueur qui relance doit être seul dans sa surface.",
        zones: ["surfL", "corL", "extL"],
        actors: [{ id: "R", c: "b", l: "R", k: at(95, 320) }, { id: "C", c: "b", l: "C", k: at(110, 300) }, ...team("r", "r", [[300, 160], [330, 410], [420, 290]])],
        ball: at(108, 334),
        labels: [{ t: 0.6, x: 270, y: 330, text: "R seul dans la surface", tone: "info" }] },
      { say: "Un coéquipier peut se placer dans chaque couloir. Le joueur qui relance choisit à qui il passe, mais la passe va obligatoirement vers un couloir.",
        zones: ["surfL", "corL", "extL"],
        actors: [{ id: "R", c: "b", l: "R", k: at(95, 320) }, { id: "C", c: "b", l: "C", k: [[0, 110, 300], [1.2, 100, 120]] }, { id: "C2", c: "b", l: "C", k: [[0, 230, 420], [1.4, 100, 455]] }, ...team("r", "r", [[300, 160], [330, 410], [420, 290]])],
        ball: [[0, 108, 334], [3.2, 108, 334], [4.2, 100, 140]],
        arrows: [{ t: 3.2, a: [105, 312], b: [101, 146], s: "pass" }],
        labels: [{ t: 1.4, x: 255, y: 110, text: "Un coéquipier par couloir", tone: "gold" }, { t: 3.4, x: 290, y: 300, text: "R choisit", tone: "info" }] },
      { say: "Il a six secondes pour relancer.",
        zones: ["surfL", "corL", "extL"],
        actors: [{ id: "R", c: "b", l: "R", k: at(95, 320) }, { id: "C", c: "b", l: "C", k: at(100, 120) }, { id: "C2", c: "b", l: "C", k: at(100, 455) }, ...team("r", "r", [[300, 160], [330, 410], [420, 290]])],
        ball: at(108, 334), timer: { t: 0, from: 6 }, minDur: 7 },
      { say: "Un adversaire peut se trouver dans un couloir, même celui du receveur. Mais s'il y est au moment de la passe, il est hors de l'action : il ne peut pas presser, même après le contrôle. Il redevient actif quand l'équipe qui relance perd le ballon.",
        zones: ["surfL", "corL", "extL"],
        actors: [{ id: "R", c: "b", l: "R", k: at(95, 320) }, { id: "C", c: "b", l: "C", k: at(100, 120) }, { id: "C2", c: "b", l: "C", k: at(100, 455) },
          { id: "A1", c: "r", l: "A", k: at(130, 168), out: [[0, false], [1.6, true]] }, ...team("r", "r", [[330, 160], [420, 290]])],
        ball: [[0, 108, 334], [1.8, 108, 334], [2.8, 100, 140]],
        arrows: [{ t: 1.8, a: [105, 312], b: [101, 146], s: "pass" }],
        labels: [{ t: 1.6, x: 330, y: 225, text: "Même couloir que C : hors de l'action", tone: "no" }] },
      { say: "Les adversaires qui sont hors du couloir ne peuvent presser qu'après le contrôle du receveur.",
        zones: ["surfL", "corL", "extL"],
        actors: [{ id: "R", c: "b", l: "R", k: at(95, 320) }, { id: "C", c: "b", l: "C", k: at(100, 120) },
          { id: "C2", c: "b", l: "C", k: at(100, 455) }, { id: "A1", c: "r", l: "A", k: at(130, 168), out: true }, { id: "A2", c: "r", l: "A", k: [[0, 300, 170], [2.2, 300, 170], [3.2, 170, 110]] }, ...team("r", "r", [[420, 290]])],
        ball: [[0, 108, 334], [0.6, 108, 334], [1.6, 100, 140]],
        arrows: [{ t: 0.6, a: [105, 312], b: [101, 146], s: "pass" }, { t: 2.2, a: [290, 166], b: [182, 114], s: "press" }],
        labels: [{ t: 1.8, x: 330, y: 230, text: "Contrôle de C, puis pressing", tone: "ok" }] },
      { say: "Si un adversaire presse trop tôt, on recommence la relance.",
        zones: ["surfL", "corL", "extL"],
        actors: [{ id: "R", c: "b", l: "R", k: at(95, 320) }, { id: "C", c: "b", l: "C", k: at(100, 120) },
          { id: "C2", c: "b", l: "C", k: at(100, 455) }, { id: "A2", c: "r", l: "A", k: [[0, 300, 170], [0.3, 300, 170], [1.4, 150, 128]] }, ...team("r", "r", [[420, 290]])],
        ball: [[0, 108, 334], [0.8, 108, 334], [1.8, 100, 140]],
        arrows: [{ t: 0.3, a: [290, 165], b: [155, 130], s: "press" }],
        marks: [{ t: 1.6, x: 175, y: 105, type: "x" }],
        labels: [{ t: 2.0, x: 330, y: 230, text: "Trop tôt : on recommence", tone: "no" }] },
    ],
  },

  // ───────────────────────── 7. LA RELANCE LIBRE ─────────────────────────
  {
    id: "libre", title: "La relance libre", short: "Relance libre",
    text: [
      "Relance libre = relance depuis sa propre surface, comme un coup franc : la passe peut aller n'importe où.",
      "Elle est accordée à l'adversaire quand la relance est irrégulière (relanceur pas seul dans la surface, plus de 6 secondes).",
      "Aussi quand le ballon reste coincé dans le filet (adversaire du dernier à l'avoir touché) ou touche l'arbitre (équipe du dernier joueur à l'avoir touché avant lui).",
      "Une relance mal faite n'est jamais sanctionnée de 2 minutes.",
    ],
    steps: [
      { say: "Si le joueur qui relance n'est pas seul dans sa surface, ou s'il dépasse les six secondes, le ballon passe à l'adversaire.",
        zones: ["surfL", "corL"],
        actors: [{ id: "R", c: "b", l: "R", k: at(95, 320) }, { id: "C", c: "b", l: "C", k: [[0, 210, 300], [1.0, 135, 260]] }, ...team("r", "r", [[330, 160], [420, 290], [900, 290]])],
        ball: at(108, 334),
        marks: [{ t: 1.3, x: 150, y: 232, type: "x" }],
        labels: [{ t: 1.4, x: 300, y: 240, text: "Deux joueurs dans la surface", tone: "no" }] },
      { say: "L'adversaire fait alors une relance libre depuis sa propre surface, comme un coup franc : la passe peut aller n'importe où sur le terrain.",
        zones: ["surfR"],
        actors: [...team("r", "r", [[900, 290], [620, 160], [560, 420]]), ...team("b", "b", [[330, 160], [420, 290]])],
        ball: [[0, 888, 290], [1.4, 888, 290], [2.6, 572, 410]],
        arrows: [{ t: 1.4, a: [880, 292], b: [580, 405], s: "pass" }],
        labels: [{ t: 2.4, x: 720, y: 470, text: "Passe libre, n'importe où", tone: "ok" }] },
      { say: "Il y a aussi relance libre quand le ballon touche l'arbitre. Elle revient à l'équipe du dernier joueur qui l'a touché avant lui.",
        actors: [...sixVsix(), { id: "ref", c: "ref", k: at(560, 220) }],
        ball: [[0, 445, 290], [0.8, 445, 290], [1.6, 550, 226], [2.2, 520, 250]],
        marks: [{ t: 1.6, x: 590, y: 195, type: "x" }],
        labels: [{ t: 2.2, x: 620, y: 150, text: "Touche l'arbitre : relance libre bleue", tone: "warn" }] },
      { say: "Une relance mal faite n'est jamais sanctionnée de deux minutes.",
        zones: ["dim"],
        cards: [{ t: 0.2, x: 300, y: 165, w: 400, h: 220, title: "Relance mal faite", big: "Pas de 2 min", lines: ["seulement la perte du ballon"], tone: "ok" }] },
    ],
  },

  // ───────────────────────── 8. CORNER ET COUPS FRANCS ─────────────────────────
  {
    id: "corner", title: "Corner et coups francs", short: "Corner",
    text: [
      "Corner : le défenseur qui barre se place sur la ligne de sa surface, face au ballon. S'il n'y est pas : 2 minutes. Les attaquants peuvent aussi entrer dans la surface.",
      "Coup franc au point de penalty : les défenseurs se placent sur la ligne de leur surface.",
      "Autres coups francs : les adversaires à 3 m du ballon.",
    ],
    steps: [
      { say: "Sur un corner, le défenseur qui barre se place sur la ligne de sa surface, face au ballon. Les attaquants peuvent aussi entrer dans la surface.",
        zones: ["surfR"],
        actors: [{ id: "b0", c: "b", k: at(948, 72) },
          { id: "r0", c: "r", k: [[0, 760, 140], [1.6, 905, 190]] }, { id: "r1", c: "r", k: at(880, 260) }, { id: "r2", c: "r", k: at(905, 340) }, { id: "r3", c: "r", k: at(790, 400) },
          { id: "b1", c: "b", k: [[0, 720, 260], [3.6, 870, 300]] }, { id: "b2", c: "b", k: at(730, 360) }],
        ball: at(955, 66),
        labels: [{ t: 1.8, x: 720, y: 140, text: "Sur la ligne de la surface, face au ballon", tone: "info" }, { t: 4.0, x: 700, y: 470, text: "Les attaquants peuvent entrer dans la surface", tone: "info" }] },
      { say: "S'il n'est pas sur la ligne, c'est deux minutes dehors.",
        zones: ["surfR", "corR"],
        actors: [{ id: "b0", c: "b", k: at(948, 72) },
          { id: "r0", c: "r", k: [[0, 905, 190], [0.6, 905, 190], [1.6, 905, 140]] }, { id: "r1", c: "r", k: at(880, 260) }, { id: "r2", c: "r", k: at(905, 340) }, { id: "r3", c: "r", k: at(790, 400) },
          { id: "b1", c: "b", k: at(870, 300) }, { id: "b2", c: "b", k: at(730, 360) }],
        ball: at(955, 66),
        marks: [{ t: 1.8, x: 935, y: 112, type: "x" }],
        labels: [{ t: 2.0, x: 720, y: 140, text: "Pas sur la ligne : 2 min dehors", tone: "no" }] },
      { say: "Pour un coup franc tiré au point de penalty, l'ancienne ligne des neuf mètres, les défenseurs se placent sur la ligne de leur surface.",
        zones: ["surfR", "penR"],
        actors: [...team("r", "r", [[SURF_R, 205], [SURF_R, 255], [SURF_R, 325], [SURF_R, 375]]), { id: "b0", c: "b", k: at(PEN_R - 30, 300) }],
        ball: at(PEN_R, 290),
        labels: [{ t: 0.8, x: 640, y: 200, text: "Coup franc au point de penalty", tone: "info" }] },
      { say: "Pour les autres coups francs, les adversaires se placent à trois mètres du ballon.",
        actors: [{ id: "b0", c: "b", k: at(455, 300) }, ...team("r", "r", [[560, 240], [560, 345], [600, 292]])],
        ball: at(470, 290), zones: ["ring3"],
        labels: [{ t: 0.8, x: 470, y: 160, text: "3 m", tone: "info" }] },
    ],
  },

  // ───────────────────────── 9. LE PENALTY ─────────────────────────
  {
    id: "penalty", title: "Le penalty", short: "Penalty",
    text: [
      "Sanctionne une main d'un défenseur dans sa surface.",
      "Tiré du centre du terrain. Tous les autres joueurs derrière la ligne médiane : règle à respecter désormais.",
      "Le ballon doit entrer directement, sans toucher le sol. S'il rebondit avant la ligne de but, le penalty est annulé.",
      "Après le penalty, le ballon revient à l'équipe qui défendait : coup d'envoi au centre s'il y a but, relance depuis sa surface sinon.",
    ],
    steps: [
      { say: "Le penalty sanctionne une main d'un défenseur dans sa surface.",
        zones: ["surfR"],
        actors: [{ id: "r0", c: "r", k: at(900, 270) }, { id: "b0", c: "b", k: at(780, 250) }],
        ball: [[0, 790, 262], [0.6, 790, 262], [1.4, 890, 268]],
        marks: [{ t: 1.5, x: 925, y: 240, type: "x" }],
        labels: [{ t: 1.6, x: 820, y: 400, text: "Main dans la surface : penalty", tone: "no" }] },
      { say: "Il se tire du centre du terrain. Tous les autres joueurs se placent derrière la ligne médiane. Cette règle est souvent oubliée : elle doit désormais être respectée.",
        zones: ["centre", "halfL"],
        actors: [{ id: "t", c: "b", l: "T", k: at(480, 290) },
          ...team("b", "b", [[200, 165], [200, 415], [330, 215], [330, 365], [410, 175]]).map((a, i) => ({ ...a, k: [[0, 560 + i * 40, 150 + i * 60], [1.2, a.k[0][1], a.k[0][2]]] })),
          ...team("r", "r", [[260, 290], [370, 470], [455, 110], [290, 110], [130, 290], [445, 420]]).map((a, i) => ({ ...a, k: [[0, 700 + (i % 3) * 70, 160 + i * 50], [1.4, a.k[0][1], a.k[0][2]]] }))],
        ball: at(500, 290),
        labels: [{ t: 2.2, x: 740, y: 200, text: "← Tous derrière la ligne médiane", tone: "info" }] },
      { say: "Le ballon doit entrer directement dans le but, sans toucher le sol.",
        zones: ["centre"],
        actors: [{ id: "t", c: "b", l: "T", k: at(480, 290) }],
        ball: [[0, 500, 290], [0.6, 500, 290], [2.0, GOAL_R, 285]], ballArc: { t0: 0.6, t1: 2.0, h: 70 },
        marks: [{ t: 2.1, x: 948, y: 250, type: "v" }],
        labels: [{ t: 2.2, x: 720, y: 190, text: "Direct, sans rebond : but", tone: "ok" }] },
      { say: "S'il rebondit avant la ligne de but, le penalty est annulé.",
        zones: ["centre"],
        actors: [{ id: "t", c: "b", l: "T", k: at(480, 290) }],
        ball: [[0, 500, 290], [0.6, 500, 290], [1.5, 860, 288], [2.2, GOAL_R, 286]], ballArc: { t0: 0.6, t1: 1.5, h: 60 },
        marks: [{ t: 1.5, x: 860, y: 300, type: "bounce" }, { t: 2.3, x: 948, y: 250, type: "x" }],
        labels: [{ t: 2.4, x: 720, y: 190, text: "Un rebond : penalty annulé", tone: "no" }] },
      { say: "Après le penalty, le ballon revient à l'équipe qui défendait. S'il y a but, elle fait le coup d'envoi au centre. Sinon, elle relance depuis sa surface.",
        zones: ["centre", "surfR"],
        actors: [{ id: "r0", c: "r", k: [[0, 900, 290], [0.4, 900, 290], [1.4, 520, 290], [3.4, 520, 290], [4.4, 900, 300]] }],
        ball: [[0, 500, 290], [3.4, 500, 290], [4.4, 888, 312]],
        labels: [{ t: 1.2, x: 520, y: 200, text: "But : coup d'envoi rouge", tone: "info" }, { t: 4.2, x: 790, y: 420, text: "Pas de but : relance rouge", tone: "info" }] },
    ],
  },

  // ───────────────────────── 10. FAUTES ET SANCTIONS ─────────────────────────
  {
    id: "fautes", title: "Fautes et sanctions", short: "Fautes",
    text: [
      "Pas de contact appuyé ; tout contact par derrière est sifflé. Faute normale : coup franc. Main ordinaire hors surface : faute normale.",
      "Dans la surface : faute → coup franc au point de penalty ; main → penalty.",
      "Faute volontaire, anti-fair-play : 2 minutes (« carton jaune »). D'office 2 minutes : ballon non rendu, coup franc gêné, perte de temps, coup d'envoi mal rendu.",
      "Faute très grave, propos désobligeants : 5 ou 10 minutes (« carton rouge »), au choix de l'arbitre.",
      "L'équipe joue à 5, sans remplaçant. L'exclusion se compte en temps de jeu ; pas de retour si le match se termine avant.",
      "Injure : le bureau ajoute 2 000 ou 5 000 F selon la gravité. Ni cartons physiques, ni décompte des fautes, ni couperet.",
    ],
    steps: [
      { say: "Pas de contact appuyé, et tout contact par derrière est sifflé. Une faute normale donne un simple coup franc.",
        actors: [{ id: "b0", c: "b", k: [[0, 420, 300], [1.4, 520, 300]] }, { id: "r0", c: "r", k: [[0, 360, 300], [1.4, 500, 300]] }],
        ball: [[0, 434, 300], [1.4, 534, 300]],
        marks: [{ t: 1.6, x: 510, y: 262, type: "whistle" }],
        labels: [{ t: 1.8, x: 500, y: 200, text: "Contact par derrière : coup franc", tone: "warn" }] },
      { say: "Dans la surface, une faute donne un coup franc au point de penalty, et une main donne un penalty.",
        zones: ["surfR", "penR", "centre"],
        labels: [{ t: 0.4, x: PEN_R - 40, y: 235, text: "Faute : coup franc ici", tone: "warn", size: 15 }, { t: 2.6, x: 500, y: 235, text: "Main : penalty du centre", tone: "no", size: 15 }] },
      { say: "Une faute volontaire, ou un geste anti-fair-play, c'est deux minutes dehors : le carton jaune, annoncé de vive voix.",
        actors: [...sixVsix(["b3"]), { id: "b3", c: "b", k: [[0, 385, 150], [1.0, 385, 150], [2.6, 360, 548]] }],
        timer: { t: 2.6, from: 120 }, cards: [{ t: 0.6, x: 600, y: 40, w: 300, h: 120, title: "Carton jaune", big: "2 min", tone: "warn", compact: true }] },
      { say: "C'est aussi deux minutes d'office pour : ne pas rendre le ballon, gêner un coup franc, retarder le jeu, ou mal rendre le ballon au premier coup d'envoi.",
        zones: ["dim"],
        cards: [
          { t: 0.2, x: 70, y: 120, w: 420, h: 150, title: "2 min d'office", big: "Ballon non rendu", compact: true, tone: "warn" },
          { t: 1.6, x: 510, y: 120, w: 420, h: 150, title: "2 min d'office", big: "Coup franc gêné", compact: true, tone: "warn" },
          { t: 3.0, x: 70, y: 300, w: 420, h: 150, title: "2 min d'office", big: "Perte de temps", compact: true, tone: "warn" },
          { t: 4.4, x: 510, y: 300, w: 420, h: 150, title: "2 min d'office", big: "Coup d'envoi mal rendu", compact: true, tone: "warn" },
        ] },
      { say: "Une faute très grave, ou des propos désobligeants envers un joueur ou l'arbitre, c'est cinq ou dix minutes, au choix de l'arbitre : le carton rouge.",
        zones: ["dim"],
        cards: [{ t: 0.2, x: 280, y: 150, w: 440, h: 250, title: "Carton rouge", big: "5 ou 10 min", lines: ["au choix de l'arbitre"], tone: "no" }] },
      { say: "Pendant l'exclusion, l'équipe joue à cinq, sans remplaçant. Le temps se compte en temps de jeu : sanctionné à la deuxième minute pour cinq minutes, le joueur revient à la septième. Si le match se termine avant, il ne revient pas.",
        zones: ["dim"],
        raw: [{ t: 0.2, svg: frise() }] },
      { say: "En cas d'injure, le bureau ajoute une sanction disciplinaire de deux mille ou cinq mille francs, selon la gravité.",
        zones: ["dim"],
        cards: [{ t: 0.2, x: 280, y: 150, w: 440, h: 250, title: "Sanction du bureau", big: "2 000 ou 5 000 F", lines: ["en plus de l'exclusion"], tone: "no" }] },
      { say: "Enfin, il n'y a ni cartons physiques, ni décompte des fautes, ni couperet.",
        zones: ["dim"],
        cards: [
          { t: 0.2, x: 60, y: 165, w: 280, h: 220, title: "Cartons", big: "À l'oral", lines: ["annoncés par l'arbitre"] },
          { t: 1.6, x: 360, y: 165, w: 280, h: 220, title: "Décompte", big: "Aucun", lines: ["des fautes"] },
          { t: 2.8, x: 660, y: 165, w: 280, h: 220, title: "Couperet", big: "Aucun", lines: ["pas appliqué à l'AFC"] },
        ] },
      { say: "Pour tout ce qui n'est pas précisé ici, on applique les lois officielles du Maracana. Bon match à tous !",
        actors: sixVsix(), ball: at(500, 290),
        cards: [{ t: 0.3, x: 250, y: 380, w: 500, h: 110, title: "Pour le reste", big: "Lois officielles", compact: true, tone: "info" }] },
    ],
  },

];

// ───────── Graphiques composés (SVG brut, couleurs par jetons CSS) ─────────
function svgCard(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" style="fill:var(--card);stroke:var(--rule)" stroke-width="1.5"/>`;
}
function svgText(x, y, s, size, o = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${o.anchor || "middle"}" style="fill:${o.fill || "var(--ink)"};font-family:${o.font || "var(--f-body)"}" font-size="${size}" font-weight="${o.weight || 600}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${s}</text>`;
}
function timeline2() {
  const x0 = 120, x1 = 880, y = 300, mid = (x0 + x1) / 2;
  return svgCard(80, 150, 840, 260) +
    svgText(500, 200, "2 ÉQUIPES : UN SEUL MATCH", 16, { fill: "var(--accent)", weight: 700, ls: 1.5 }) +
    `<rect x="${x0}" y="${y - 22}" width="${mid - x0 - 20}" height="44" rx="8" style="fill:var(--team-b)"/>` +
    `<rect x="${mid + 20}" y="${y - 22}" width="${x1 - mid - 20}" height="44" rx="8" style="fill:var(--team-b)"/>` +
    `<rect x="${mid - 16}" y="${y - 22}" width="32" height="44" rx="6" style="fill:var(--gold)"/>` +
    svgText((x0 + mid) / 2, y + 7, "1re période", 18, { fill: "#fff" }) + svgText((mid + x1) / 2, y + 7, "2e période", 18, { fill: "#fff" }) +
    svgText(mid, y + 62, "pause 10 min", 16, { fill: "var(--muted)" }) +
    svgText(x0, y + 62, "0", 16, { fill: "var(--muted)", anchor: "start" }) + svgText(x1, y + 62, "1 h 30", 16, { fill: "var(--muted)", anchor: "end" });
}
function tournoi() {
  const m = [["1", "2"], ["1", "3"], ["2", "3"], ["2", "1"], ["3", "1"], ["3", "2"]];
  const col = { 1: "var(--team-b)", 2: "var(--team-r)", 3: "var(--team-g)" };
  let s = svgCard(80, 110, 840, 360) + svgText(500, 155, "3 ÉQUIPES : MINI-TOURNOI ALLER-RETOUR", 16, { fill: "var(--accent)", weight: 700, ls: 1.5 });
  m.forEach(([a, b], i) => {
    const x = 170 + (i % 3) * 230, y = 210 + Math.floor(i / 3) * 120;
    s += `<circle cx="${x}" cy="${y + 20}" r="24" style="fill:${col[a]}"/>` + svgText(x, y + 27, a, 20, { fill: "#fff", weight: 700 }) +
      svgText(x + 50, y + 27, "contre", 15, { fill: "var(--muted)" }) +
      `<circle cx="${x + 100}" cy="${y + 20}" r="24" style="fill:${col[b]}"/>` + svgText(x + 100, y + 27, b, 20, { fill: "#fff", weight: 700 }) +
      svgText(x + 50, y + 72, `Match ${i + 1} · 10 min`, 14, { fill: "var(--muted)" });
  });
  return s + svgText(500, 452, "6 matchs · chaque équipe en joue 4", 17, { weight: 700 });
}
function bareme() {
  const rows = [["Victoire", "dans le temps de jeu", "3"], ["Victoire", "aux tirs au but", "2"], ["Défaite", "aux tirs au but", "1"], ["Défaite", "dans le temps de jeu", "0"]];
  let s = svgCard(170, 100, 660, 380) + svgText(500, 145, "BARÈME DU MINI-TOURNOI", 16, { fill: "var(--accent)", weight: 700, ls: 1.5 });
  rows.forEach(([a, b, p], i) => {
    const y = 195 + i * 70;
    s += `<rect x="210" y="${y - 30}" width="580" height="54" rx="8" style="fill:var(--wash)"/>` +
      svgText(240, y + 4, a, 20, { anchor: "start", weight: 700 }) + svgText(360, y + 4, b, 18, { anchor: "start", fill: "var(--muted)", weight: 500 }) +
      svgText(750, y + 9, p, 34, { font: "var(--f-display)", weight: 700, fill: "var(--accent)" }) + svgText(775, y + 4, "pt" + (p > 1 ? "s" : ""), 14, { anchor: "start", fill: "var(--muted)" });
  });
  return s;
}
function frise() {
  const x0 = 190, x1 = 900, w = (x1 - x0) / 10;
  const bar = (y, from, len, label, back) => {
    const end = Math.min(10, from + len);
    let s = `<rect x="${x0}" y="${y - 14}" width="${x1 - x0}" height="28" rx="6" style="fill:var(--wash)"/>` +
      `<rect x="${x0 + from * w}" y="${y - 14}" width="${(end - from) * w}" height="28" rx="6" style="fill:var(--team-r)"/>` +
      svgText(x0 - 12, y + 6, label, 16, { anchor: "end", weight: 700 });
    s += svgText(x0 + end * w + (back ? 10 : -10), y + 6, back ? `retour à la ${end}e min` : "pas de retour", 15, { anchor: back ? "start" : "end", fill: back ? "var(--ok)" : "#fff", weight: 700 });
    return s;
  };
  let s = svgCard(30, 110, 940, 370) + svgText(500, 152, "EXCLUSION DANS UN MATCH DE 10 MINUTES", 16, { fill: "var(--accent)", weight: 700, ls: 1.5 });
  for (let i = 0; i <= 10; i++) s += svgText(x0 + i * w, 192, String(i), 13, { fill: "var(--muted)" });
  s += bar(240, 2, 5, "5 min à la 2e", true) + bar(320, 6, 5, "5 min à la 6e", false) + bar(400, 1, 10, "10 min", false);
  return s + svgText(500, 458, "L'équipe joue à 5 pendant l'exclusion, sans remplaçant", 15, { fill: "var(--muted)" });
}

if (typeof module !== "undefined") module.exports = { SCENES };
