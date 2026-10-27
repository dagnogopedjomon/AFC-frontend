"""Génère les fichiers src/voix/chXX_sYY.mp3 à partir de Script_voix_off_duo.txt.
Prérequis : pip install edge-tts   (connexion Internet nécessaire)
Usage     : python3 generer_voix.py            -> tous les fichiers
            python3 generer_voix.py ch05_s02   -> un seul fichier
"""
import asyncio, os, re, sys
import edge_tts

VOIX = {"Vivienne": "fr-FR-VivienneMultilingualNeural", "Rémy": "fr-FR-RemyMultilingualNeural"}
ICI = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(ICI, "Script_voix_off_duo.txt")
SORTIE = os.path.join(ICI, "..", "voix")

def segments(texte):
    """Découpe une ligne en [(voix, texte)], Vivienne par défaut."""
    morceaux, voix = [], "Vivienne"
    for part in re.split(r"\[(Vivienne|Rémy)\]", texte):
        if part in VOIX: voix = part; continue
        if part.strip(): morceaux.append((voix, part.strip()))
    return morceaux

async def synth(voix, texte):
    data = b""
    async for c in edge_tts.Communicate(texte, VOIX[voix]).stream():
        if c["type"] == "audio": data += c["data"]
    if not data: raise RuntimeError("audio vide : " + texte)
    return data

async def main(filtre):
    os.makedirs(SORTIE, exist_ok=True)
    lignes = [l.split("\t", 1) for l in open(SCRIPT, encoding="utf-8").read().splitlines()
              if re.match(r"^ch\d\d_s\d\d\.mp3\t", l)]
    for nom, texte in lignes:
        if filtre and not nom.startswith(filtre): continue
        audio = b"".join([await synth(v, t) for v, t in segments(texte)])  # même format MP3 : simple mise bout à bout
        open(os.path.join(SORTIE, nom), "wb").write(audio)
        print("ok", nom, "+".join(v for v, _ in segments(texte)))

asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else ""))
