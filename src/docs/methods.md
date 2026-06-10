# Méthodes de calcul

Cette page documente les formules utilisées par l'app. Toutes les valeurs sont arrondies à 1 décimale dans les résultats affichés.

---

## 1. Baker's percentage → grammage

Chaque ingrédient est exprimé en pourcentage du **poids total de farine** (la farine = 100%).

**Formule :**

$$
\text{ingredient}_{g} = \text{totalFlour}_{g} \times \frac{\text{pct}}{100}
$$

Pour une farine composée (plusieurs farines mélangées), $\text{totalFlour}_{g}$ est la **somme** des poids de chaque composant.

**Exemple — Template Napoletana à 60% hydratation, 2.8% sel, 0.3% levure fraîche, pour 500 g de farine :**

- Eau : $500 \times 0{,}60 = 300\ \text{g}$
- Sel : $500 \times 0{,}028 = 14\ \text{g}$
- Levure : $500 \times 0{,}003 = 1{,}5\ \text{g}$

---

## 2. Conversion entre types de levure

Les facteurs de conversion utilisés sont basés sur la matière sèche et le pouvoir levant relatif.

| De \ Vers | Fraîche | Sèche active | Sèche instantanée |
|---|---|---|---|
| Fraîche       | $\times 1$    | $\times 0{,}40$ | $\times 0{,}33$ |
| Sèche active  | $\times 2{,}50$ | $\times 1$    | $\times 0{,}825$ |
| Sèche inst.   | $\times 3{,}03$ | $\times 1{,}212$ | $\times 1$ |

**Formule générale** (avec $f_t$ le facteur du type $t$ par rapport à la fraîche, $f_{\text{fresh}} = 1$, $f_{\text{active-dry}} = 0{,}40$, $f_{\text{instant-dry}} = 0{,}33$) :

$$
\text{grams}_{\text{vers}} = \frac{\text{grams}_{\text{de}}}{f_{\text{de}}} \times f_{\text{vers}}
$$

**Exemple — recette à 3 g de levure fraîche :**

- En sèche active : $3 \times 0{,}40 = 1{,}2\ \text{g}$
- En sèche instantanée : $3 \times 0{,}33 = 0{,}99\ \text{g}$

**Exemple inverse — recette à 1.2 g de sèche active :**

- En fraîche : $1{,}2 / 0{,}40 = 3\ \text{g}$
- En sèche instantanée : $1{,}2 / 0{,}40 \times 0{,}33 = 0{,}99\ \text{g}$

Quand tu changes le type de levure dans un champ rempli, l'app applique automatiquement cette conversion.

---

## 3. Biga (preferment à 45% hydratation)

La biga est un preferment **toujours à 45% d'hydratation** dans cette app. Le sel, le sucre, l'huile et les ingrédients personnalisés sont **toujours placés dans le rafraîchis**, jamais dans le preferment.

Soient $F$ le total de farine de la recette, $W$ le total d'eau, $Y$ le total de levure, $p$ le pourcentage de farine en biga (entré par l'utilisateur), $y$ le pourcentage **de la levure totale** qui va dans la biga (entré par l'utilisateur, entre 0 et 100).

**Formules :**

$$
\begin{aligned}
\text{biga}_{\text{flour}} &= F \times \frac{p}{100} \\
\text{biga}_{\text{water}} &= \text{biga}_{\text{flour}} \times 0{,}45 \\
\text{biga}_{\text{yeast}} &= Y \times \frac{y}{100} \\[6pt]
\text{refresh}_{\text{flour}} &= F - \text{biga}_{\text{flour}} \\
\text{refresh}_{\text{water}} &= W - \text{biga}_{\text{water}} \\
\text{refresh}_{\text{yeast}} &= Y - \text{biga}_{\text{yeast}}
\end{aligned}
$$

Comme $y \in [0, 100]$, $\text{biga}_{\text{yeast}}$ ne peut jamais dépasser $Y$. L'app affiche aussi l'équivalent en pourcentage sur la farine du préferment, $y_{\text{eq}} = \frac{\text{biga}_{\text{yeast}}}{\text{biga}_{\text{flour}}} \times 100$, pour comparer avec les sources qui utilisent cette convention.

**Exemple — Napoletana, 500 g de farine, 65% hydratation (325 g d'eau), 1.5 g de levure fraîche, 12.5 g de sel, biga à 50% de farine avec 50% de la levure totale :**

- $\text{biga}_{\text{flour}} = 500 \times 0{,}50 = 250\ \text{g}$
- $\text{biga}_{\text{water}} = 250 \times 0{,}45 = 112{,}5\ \text{g}$
- $\text{biga}_{\text{yeast}} = 1{,}5 \times 0{,}50 = 0{,}75\ \text{g}$ (arrondi 0.8 g)
- $\text{refresh}_{\text{flour}} = 250\ \text{g}$
- $\text{refresh}_{\text{water}} = 325 - 112{,}5 = 212{,}5\ \text{g}$
- $\text{refresh}_{\text{yeast}} = 1{,}5 - 0{,}75 = 0{,}75\ \text{g}$ (arrondi 0.8 g)
- $\text{refresh}_{\text{salt}} = 12{,}5\ \text{g}$
- Équivalent affiché : $\frac{0{,}75}{250} \times 100 = 0{,}3\%$ sur la farine de la biga

---

## 4. Poolish (preferment à 100% hydratation)

Le poolish est un preferment **toujours à 100% d'hydratation** dans cette app, c'est-à-dire autant d'eau que de farine en masse. Les autres règles sont identiques à la biga.

**Formules** (mêmes notations que pour la biga) :

$$
\begin{aligned}
\text{poolish}_{\text{flour}} &= F \times \frac{p}{100} \\
\text{poolish}_{\text{water}} &= \text{poolish}_{\text{flour}} \times 1{,}00 \\
\text{poolish}_{\text{yeast}} &= Y \times \frac{y}{100} \\[6pt]
\text{refresh}_{\text{flour}} &= F - \text{poolish}_{\text{flour}} \\
\text{refresh}_{\text{water}} &= W - \text{poolish}_{\text{water}} \\
\text{refresh}_{\text{yeast}} &= Y - \text{poolish}_{\text{yeast}}
\end{aligned}
$$

**Exemple — même recette de base (500 g farine, 325 g eau, 1.5 g levure fraîche, 12.5 g sel), poolish à 30% de farine avec 25% de la levure totale :**

- $\text{poolish}_{\text{flour}} = 500 \times 0{,}30 = 150\ \text{g}$
- $\text{poolish}_{\text{water}} = 150 \times 1{,}00 = 150\ \text{g}$
- $\text{poolish}_{\text{yeast}} = 1{,}5 \times 0{,}25 = 0{,}375\ \text{g}$ (arrondi 0.4 g)
- $\text{refresh}_{\text{flour}} = 350\ \text{g}$
- $\text{refresh}_{\text{water}} = 325 - 150 = 175\ \text{g}$
- $\text{refresh}_{\text{yeast}} = 1{,}5 - 0{,}375 = 1{,}125\ \text{g}$ (arrondi 1.1 g)
- $\text{refresh}_{\text{salt}} = 12{,}5\ \text{g}$
- Équivalent affiché : $\frac{0{,}375}{150} \times 100 = 0{,}25\%$ sur la farine du poolish

---

## 5. Garde-fous

L'app refuse une combinaison de preferment **si l'eau requise par le preferment dépasse l'eau totale de la recette** :

$$
\text{prefermentWater} > W \quad\Longrightarrow\quad \text{erreur}
$$

C'est le cas typique d'un poolish à 60% de farine sur une recette à 50% d'hydratation : $300 > 250\ \text{g}$ → impossible.

Dans ce cas, baisse le pourcentage de farine en preferment ou augmente l'hydratation totale de la recette.

Pour la levure, comme l'input est un pourcentage de la levure totale (borné 0 à 100), il n'y a aucun garde-fou nécessaire : le rafraîchis aura toujours une quantité positive ou nulle.

---

## 6. Arrondis

Toutes les valeurs affichées sont arrondies à **1 chiffre après la virgule** pour les grammes, et à **3 chiffres après la virgule** pour les conversions de levure. Les calculs internes utilisent la précision flottante complète avant arrondi final.

---

## 7. Protocole de fermentation (modèle TXCraig1)

En mode « protocole », l'app dérive la quantité de levure à partir de tes **phases de fermentation** (chacune : une température et une durée). Elle s'appuie sur la table de prédiction de **TXCraig1** (pizzamaking.com). Le fichier source est téléchargeable en bas de cette page si tu veux vérifier.

### La table

Chaque case `F(température, levure)` donne le **nombre d'heures jusqu'à ce que la pâte soit prête** (100 % fermentée) à une température et une quantité de levure données. Les lignes vont de 1.7 °C (35 °F) à 35 °C (95 °F). Les colonnes couvrent les 3 types de levure (fraîche CY, sèche active ADY, sèche instantanée IDY), alignés : CY 0.1 % = ADY 0.042 % = IDY 0.032 %. (Au-dessus de 26.7 °C, seules les faibles quantités de levure — jusqu'à 1 % — sont couvertes.)

### La loi unique : un réservoir à remplir à 100 %

Chaque phase remplit une **fraction** du réservoir :

$$
\text{fraction}_i = \frac{\text{durée}_i}{F(\text{temp}_i,\ \text{levure})}
$$

La pâte est prête quand la somme vaut 1 :

$$
\sum_i \frac{\text{durée}_i}{F(\text{temp}_i,\ \text{levure})} = 1
$$

- **Mode template** : l'app cherche le **% de levure** qui fait somme = 1.
- **Mode recette directe** : ce % est ensuite converti en **grammes** (`% × farine totale / 100`).
- La **part de chaque phase** affichée est exactement `fraction_i`.

L'app lit la table par **interpolation** (température sur la grille fine au °F, puis levure au point où la somme croise 1).

### Exemple 1 — trouver la durée au frigo (levure connue)

0.3 % de levure fraîche. Phase 1 : 3 h à 22 °C (72 °F). Phase 2 : frigo à 4 °C (40 °F).

- Phase 1 : table = 7 h pour finir → fraction = 3 / 7 = **43 %**.
- Reste 57 %. Au frigo, table = 97 h pour finir → durée = 0,57 × 97 ≈ **55 h**.
- Total : 3 h + 55 h.

### Exemple 2 — trouver la levure (cas principal)

Voulu : 4 h à 22 °C (72 °F), puis 48 h à 4 °C (40 °F). Quelle levure ?

- À 0.2 % : 4/9 + 48/130 = 0,44 + 0,37 = **0,81** → pas assez (ajouter de la levure).
- À 0.3 % : 4/7 + 48/97 = 0,57 + 0,49 = **1,06** → trop (réduire).
- Réponse ≈ **0,28 % de levure fraîche** (la somme tombe à 1).

### Garde-fous et limites

- Si une température est hors de la table (hors 1.7–35 °C / 35–95 °F), l'app le signale.
- Si le protocole **sur-fermente** même avec très peu de levure (trop long / trop chaud) ou **sous-fermente** même avec beaucoup de levure (trop court / trop froid), l'app refuse et l'explique.
- La table donne un **point de départ**, pas une précision à l'heure près. La pâte ne change pas de température instantanément (passer de 4 °C à 22 °C prend du temps) ; plus une phase est courte, plus cet effet compte. Surveille les 8–12 dernières heures et ajuste.
- En cas de doute, mieux vaut légèrement sur-fermenter que sous-fermenter.

## 8. Préferment + protocole (deux entités)

Tu peux piloter la levure d'un préferment par son **propre protocole** (ex. poolish 12 h à 20 °C) au lieu d'un simple pourcentage. Le calcul suit la convention établie : le préferment et la pâte finale sont **deux entités distinctes**, avec des horloges qui ne se chevauchent pas — l'horloge de la pâte finale démarre **au pétrissage**. Un préferment reposé 12 h ajouté à une pâte finale qui fermente 2 h donne « 2 h pour la pâte finale », pas 14 h. Il n'y a donc **pas de double comptage**.

- **Levure du préferment** : la loi unique (§7) appliquée à l'horaire du préferment, sur **la farine du préferment** seule (c'est une mini-pâte sans sel).
- **Levure totale** : dérivée du protocole de la pâte finale sur **la farine totale** (comme §7).
- **Levure du rafraîchis** $= \text{totale} - \text{préferment}$. Si le préferment fournit déjà plus que le total, l'app le refuse (baisse la part de farine, allonge le repos ou baisse la température).

Le préferment fermente **sans sel** : il va un peu plus vite que ne le prédit la table (calée sur une pâte salée). Comme toujours, c'est un point de départ — surveille et ajuste.
