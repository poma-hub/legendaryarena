# Explication du site
Le but est de faire un site web représentant de manière plus agréable les informations sur le Google Sheet suivant : https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI qui documente les combats faits en utilisant 1 seul personnage contre les Legendary Arena de Pokémon Masters
La librairie google api a déjà été installée via npm install googleapis

La route de base est /legendaryarena, et propose des boutons pour chaque legendary arena, ainsi que des crédits
Les crédits sont les suivants, obtenables dans la cellule A2 (fusion A2:J3) de la page README gid 1461363018: Document originally made by Maelmc and currently maintained by Naomi. Credits to u/Sages and Sync Pair Icons for the sync pair assets. Special thanks to StDk for PoMaTools and miscellaneous fixes to the sheet
Chaque arena a sa page /legendaryarena/{legendary}
Chaque page propose une barre de recherche qui permet de filtrer par nom (champ de texte, recherche du nom en anglais ou japonais) et par difficulté (cases à cocher avec toutes les difficultés). Chaque page affiche aussi le nom du légendaire, son icone, le compte total de solos (attention : compte de personnages uniques, par exemple actuellement latios a 1583 lignes documentant des solos à différent investissements, mais un compte réel de 635 personnages pouvant le faire)
Le site web est intégralement en anglais

Liste de Legendary: gid
Azelf: 264507450
Cobalion: 1922313200
Cresselia: 457679049
Entei: 1068670487
Latias: 1691684799
Latios: 0
Moltres: 1380605510
Raikou: 509690471
Regirock: 179961838
Registeel: 689476776
Tapu Bulu: 224035199
Terrakion: 640814143
Tornadus: 683345424
Uxie: 1824130640

Chaque page de la sheet a les colonnes suivantes, dans l'ordre:
- icone du personnage, obtenue via une formule qui la récupère dans la page Icons (gid 1702849061)
  - colonnes A-G: les personnages
    - nom du personnage en anglais
    - en japonais
    - icone de base
    - 3★ (si existe)
    - 4★ (si existe)
    - 5★
    - EX
  - colonnes I-J: les légendaires
    - nom du légendaire
    - icone du légendaire, avec sa couleur associée en fond de cellule
- nom du personnage en anglais
- nom du personnage en japonais
- move level & upgrades
  - {move level} {étoiles} {promotion} {ex role} {énergie supplémentaire}
    - move level = un nombre entre 1 et 10
    - étoiles = si renseigné, 3★ ou 4★ (les 5★ et EX ne l'affichent pas)
    - promotion = si renseigné, soit {un nombre entre 1 et 20}/20, soit EX
    - ex role = si renseigné, R
    - énergie supplémentaire = si renseigné, +{2, 4, 6, 8 ou 10}
- level
- grid (souvent, contient un lien intégré via ctrl+k)
- lucky skill
- source (nom de l'utilisateur + lien intégré)
- icone(s) représentant la difficulté
- détails ou conseils

Les filtres de difficulté et les flags supplémentaires sont les suivants (en anglais)
Legend									
Difficulty					Flags				
🔰	Beginner Difficulty: Beginners can easily do these solos, boils down to being incredibly consistent, or you literally just spam a single move without much strategy				🕗	Time Consuming: These solos are quite long battles that you must be prepared to endure			
✔️	Normal Difficulty: Generally requires minimal strategy, but usually consistent runs with minimal RNG likely required				🔁	Reset Heavy: Expect to be resetting a lot for good procs, dodges, MPRs, any multiple overall RNG based luck that is necessary to win. Prepare to reset a lot...			
⚠️	Moderate Difficulty: Usually will take a bit of practice, but these solos can be done pretty consistently when you understand the general strategy and get decent luck				⚙️	Skill Gear Required: Solos that were likely only completable due to specific Skill Gear, likely Skill Gear with high stat values or possibly good passives (please always show your gears when uploading runs, even when they are regular gears!)			
⛔	Difficult/RNG Heavy/Precise: Be prepared to attempt these solos multiple times. Usually these solos use an unconventional strategy or you must be tight with certain timings. Tread with caution				🪽	Dodge Reliant: Runs where the main strategy is to rely on key or frequent misses from the enemy due to either self Evasion Buffing or enemy Accuracy Debuffing, or both, or Dodging from moves such as Fly or Phantom Force. Dodging Fire Spin on Entei or Toxic on Tornadus is also a common use case.			
🚫	Not Recommended: Solos that are too troublesome to be worthwhile in a LG setting				💦💤🧊❓⚡	Frequent Disables Required: Runs that employ and rely on constant use of Disables such as Flinch💦, Sleep💤, and Freeze🧊 in order to either stay alive or stall for success. ❓for Confusion based runs, and ⚡for Paralysis based runs			
					🥠	Special Cookie Required: Solos that use a unique Personal Lucky Cookie from an Event (ELS), Pasio Tower (TLS), or Gym Event (GLS)			

# Détail d'architecture
Le client est en Vue.JS (déjà initialisé)
Pas de serveur pour le moment
Sépare bien les composants de manière à pouvoir facilement les réutiliser
Utilise Tailwind CSS pour le CSS