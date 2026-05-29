# Modèle de fermentation TXCraig1 — référence

Source : table de prédiction de levure de **TXCraig1** (pizzamaking.com, topics 26831 et 22649).
Données : `assets/bareme_fermentation_etendu_corrige.xlsx` (version corrigée fournie par l'utilisateur).
Cette analyse a été reconstruite en lisant les posts du forum (msg230690/692/693/694, msg396401, msg397445) — la méthodologie y est expliquée et confirmée mot pour mot par l'auteur.

## Structure de la table

- **Lignes** = température, de 1.7 °C / 35 °F à 26.7 °C / 80 °F (pas ~0.5–0.6 °C, °C et °F fournis).
- **Colonnes** = quantité de levure, données en 3 systèmes équivalents alignés colonne par colonne :
  - **CY** (fresh / fraîche) : 0.01 % → 3 %
  - **ADY** (active dry) : 0.004 % → 1.26 %
  - **IDY** (instant dry) : 0.003 % → 0.96 %
  - Équivalences (même colonne) : CY 0.1 % = ADY 0.042 % = IDY 0.032 % ; CY 0.3 % = ADY 0.126 % = IDY 0.096 %. En gros ADY ≈ CY × 0.42, IDY ≈ CY × 0.32.
- **Cases** = `F(temp, levure)` = nombre d'**heures jusqu'à pâte prête** (100 % fermentée) à cette température et cette quantité de levure.

Extrait réel (CY) pour les exemples :

```
              0.2%   0.3%   0.5%   1.0%
40°F (4.4°C)  130    97     67     40
60°F (15.6°C)  24    18     12      7
72°F (22.2°C)   9     7      5      3
80°F (26.7°C)   5     4      3      2
```

## La loi unique

Une **colonne = une quantité de levure fixe**. Tous les couples (temps, température) d'une même colonne mènent à une pâte **également prête** (citation TXCraig : *« every time-temp combination in a given column takes you to a dough that is ready to use »*).

Modèle « réservoir à remplir à 100 % » : chaque phase de fermentation remplit une fraction
`fraction = durée_phase / F(temp_phase, levure)`. La pâte est prête quand la somme des fractions vaut 1 :

```
Σ_i  durée_i / F(temp_i, levure)  =  1
```

- **Fraction d'une phase** = « % de la fermentation totale » accompli pendant cette phase.
- **Séparabilité** : la table est ≈ séparable, `F(temp, levure) ≈ g(temp) · h(levure)`. Vérifié sur les données : ratio F(40°F)/F(80°F) ≈ 20–26 et F(60°F)/F(72°F) ≈ 2.5 restent ~constants par colonne. C'est ce qui rend valide la méthode « slide de colonne » de Craig. (La séparabilité dérive un peu sur les très grands écarts de température — cohérent avec l'avertissement de Craig sur la précision.)

### Erreur classique à ne jamais commettre
Quand on « glisse » entre deux températures, on reste **dans la même colonne** (même % de levure). Mélanger les colonnes (lire X h dans la colonne A et l'additionner à Y h de la colonne B) est **faux** — explicitement corrigé par TXCraig dans msg397445.

## Les 3 directions de calcul (toutes la même équation)

1. **Durée manquante** (levure + autres phases connues) :
   `durée_manquante = (1 − Σ fractions des autres phases) × F(temp_manquante, levure)`
2. **Quantité de levure** (toutes les phases en temps + température connues — cas principal) :
   résoudre `Σ durée_i / F(temp_i, levure) = 1` pour la levure (dichotomie / interpolation entre colonnes).
3. **% de chaque phase dans la fermentation totale** :
   `fraction_i = durée_i / F(temp_i, levure)` ; la levure recommandée est celle qui fait Σ = 1.

## Exemples travaillés (données réelles de l'Excel)

### Ex. 1 — trouver la durée d'une phase (levure fixe)
0.3 % CY. Phase 1 : 3 h à 72 °F. Phase 2 : frigo à 40 °F. Combien au frigo ?
- Phase 1 : 3 / 7 = 43 % rempli.
- Reste 57 %. Au frigo : F(40°F, 0.3 %) = 97 h → 0.57 × 97 = **≈ 55 h**.
- Vérif : 43 % + 57 % = 100 %. Total 3 h + 55 h.

### Ex. 2 — trouver la levure (cas principal)
Voulu : 4 h à 72 °F, puis 48 h à 40 °F. Quelle levure (CY) ?
- 0.2 % : 4/9 + 48/130 = 0.44 + 0.37 = 0.81 → 81 %, pas assez (ajouter levure).
- 0.3 % : 4/7 + 48/97 = 0.57 + 0.49 = 1.06 → 106 %, trop (réduire).
- Réponse ≈ **0.28 % CY** (4/7.4 + 48/103 ≈ 0.54 + 0.46 = 1.00).

Méthode manuelle de Craig (même résultat) : partir de la fin (48 h à 40 °F → colonne 0.8 %), glisser dans cette colonne jusqu'à 72 °F (= 3 h), ajouter le vrai temps chaud (4 h + 3 h = 7 h), trouver la colonne où 72 °F = 7 h → 0.3 %.

## Avertissements de l'auteur (à refléter dans l'UI)
- La table donne un **point de départ**, pas une précision à l'heure près ; prévoir tests + ajustements.
- La pâte ne change pas de température instantanément (passer de 4 °C à 22 °C prend du temps) ; plus une phase est courte, plus cet effet compte. Surveiller les 8–12 dernières heures.
- En cas de doute, Craig préfère sur-fermenter légèrement que sous-fermenter.
- Le temps de « tempering » final (sortie du frigo) est souvent négligé dans le calcul.
