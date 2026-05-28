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

Soient $F$ le total de farine de la recette, $W$ le total d'eau, $Y$ le total de levure, $p$ le pourcentage de farine en biga (entré par l'utilisateur), $y_p$ le pourcentage de la levure totale qui passe dans la biga.

**Formules :**

$$
\begin{aligned}
\text{biga}_{\text{flour}} &= F \times \frac{p}{100} \\
\text{biga}_{\text{water}} &= \text{biga}_{\text{flour}} \times 0{,}45 \\
\text{biga}_{\text{yeast}} &= Y \times \frac{y_p}{100} \\[6pt]
\text{refresh}_{\text{flour}} &= F - \text{biga}_{\text{flour}} \\
\text{refresh}_{\text{water}} &= W - \text{biga}_{\text{water}} \\
\text{refresh}_{\text{yeast}} &= Y - \text{biga}_{\text{yeast}}
\end{aligned}
$$

**Exemple — Napoletana, 500 g de farine, 65% hydratation (325 g d'eau), 1.5 g de levure fraîche, 12.5 g de sel, biga à 50% de farine avec 10% de la levure dans la biga :**

- $\text{biga}_{\text{flour}} = 500 \times 0{,}50 = 250\ \text{g}$
- $\text{biga}_{\text{water}} = 250 \times 0{,}45 = 112{,}5\ \text{g}$
- $\text{biga}_{\text{yeast}} = 1{,}5 \times 0{,}10 = 0{,}15\ \text{g}$ (arrondi 0.2 g)
- $\text{refresh}_{\text{flour}} = 250\ \text{g}$
- $\text{refresh}_{\text{water}} = 325 - 112{,}5 = 212{,}5\ \text{g}$
- $\text{refresh}_{\text{yeast}} = 1{,}5 - 0{,}15 = 1{,}35\ \text{g}$ (arrondi 1.4 g)
- $\text{refresh}_{\text{salt}} = 12{,}5\ \text{g}$

---

## 4. Poolish (preferment à 100% hydratation)

Le poolish est un preferment **toujours à 100% d'hydratation** dans cette app, c'est-à-dire autant d'eau que de farine en masse. Les autres règles sont identiques à la biga.

**Formules** (mêmes notations que pour la biga) :

$$
\begin{aligned}
\text{poolish}_{\text{flour}} &= F \times \frac{p}{100} \\
\text{poolish}_{\text{water}} &= \text{poolish}_{\text{flour}} \times 1{,}00 \\
\text{poolish}_{\text{yeast}} &= Y \times \frac{y_p}{100} \\[6pt]
\text{refresh}_{\text{flour}} &= F - \text{poolish}_{\text{flour}} \\
\text{refresh}_{\text{water}} &= W - \text{poolish}_{\text{water}} \\
\text{refresh}_{\text{yeast}} &= Y - \text{poolish}_{\text{yeast}}
\end{aligned}
$$

**Exemple — même recette de base (500 g farine, 325 g eau, 1.5 g levure fraîche, 12.5 g sel), poolish à 30% de farine avec 20% de la levure dans le poolish :**

- $\text{poolish}_{\text{flour}} = 500 \times 0{,}30 = 150\ \text{g}$
- $\text{poolish}_{\text{water}} = 150 \times 1{,}00 = 150\ \text{g}$
- $\text{poolish}_{\text{yeast}} = 1{,}5 \times 0{,}20 = 0{,}3\ \text{g}$
- $\text{refresh}_{\text{flour}} = 350\ \text{g}$
- $\text{refresh}_{\text{water}} = 325 - 150 = 175\ \text{g}$
- $\text{refresh}_{\text{yeast}} = 1{,}5 - 0{,}3 = 1{,}2\ \text{g}$
- $\text{refresh}_{\text{salt}} = 12{,}5\ \text{g}$

---

## 5. Garde-fous

L'app refuse une combinaison de preferment **si l'eau requise par le preferment dépasse l'eau totale de la recette** :

$$
\text{prefermentWater} > W \quad\Longrightarrow\quad \text{erreur}
$$

C'est le cas typique d'un poolish à 60% de farine sur une recette à 50% d'hydratation : $300 > 250\ \text{g}$ → impossible.

Dans ce cas, baisse le pourcentage de farine en preferment ou augmente l'hydratation totale de la recette.

---

## 6. Arrondis

Toutes les valeurs affichées sont arrondies à **1 chiffre après la virgule** pour les grammes, et à **3 chiffres après la virgule** pour les conversions de levure. Les calculs internes utilisent la précision flottante complète avant arrondi final.
