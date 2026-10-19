<div align="center">

# 🎓 EduEval AI

### Évaluer les projets à l'ère de l'IA générative

Deux grilles complémentaires pour évaluer la maîtrise technique, la qualité du projet,
l'engagement des étudiant·es et l'usage réfléchi de l'intelligence artificielle.

[![Démo en ligne](https://img.shields.io/badge/démo-GitHub%20Pages-blue?logo=github)](https://ayarii.github.io/Project-Evaluation-Meets-Generative-AI/index.html)
![Statut](https://img.shields.io/badge/statut-actif-brightgreen)
<!-- Ajoutez votre licence : ![Licence](https://img.shields.io/badge/licence-MIT-lightgrey) -->

[**🌐 Voir la démo**](https://ayarii.github.io/Project-Evaluation-Meets-Generative-AI/index.html) ·
[**📊 Grille pondérée**](https://ayarii.github.io/Project-Evaluation-Meets-Generative-AI/grille.html) ·
[**🧩 Grille par compétences**](https://ayarii.github.io/Project-Evaluation-Meets-Generative-AI/grille-competences.html)

</div>

---

## 🎯 Contexte et objectif

L'IA générative transforme la façon dont les étudiant·es conçoivent, codent et rédigent.
**EduEval AI** aide les enseignant·es à rester exigeant·es sur les **compétences réelles**
tout en **reconnaissant et en questionnant** l'usage des outils d'IA.

Le projet propose un cadre d'évaluation reposant sur trois principes :

1. **Critères explicites** : chaque axe se décline en indicateurs observables, preuves attendues et niveaux de la taxonomie de Bloom.
2. **Usage de l'IA traçable** : une échelle N1–N5 distingue l'absence d'IA de l'exploration créative, étayée par des preuves concrètes.
3. **Deux modes d'évaluation** : une grille chiffrée sur 100 points ou une grille par compétences A–D avec saisie manuelle des notes.

---

## ✨ Fonctionnalités

- ✅ Grille pondérée sur **100 points** avec calcul automatique du total
- ✅ Conversion approximative **/20** affichée en temps réel
- ✅ Grille par **compétences (niveaux A–D)** pour une évaluation critériée
- ✅ Note saisie par l'évaluateur pour chaque critère ; les intervalles associés aux niveaux restent indicatifs
- ✅ Totaux partiels et fourchettes par critère, axe et grille
- ✅ Échelle d'usage de l'IA **N1–N5**
- ✅ **Export PDF, Excel, CSV et JSON**
- ✅ **Sauvegarde automatique dans le navigateur** : reprise d'une évaluation à tout moment
- ✅ Migration locale des grilles par compétences v1/v2 → v3 ; niveaux et observations sont conservés, les notes doivent être ressaisies
- ✅ Réinitialisation du formulaire après chaque soumission, avec confirmation explicite
- ✅ Aucune dépendance externe requise pour l'usage de base ; le CSV sert de repli si la bibliothèque Excel en ligne n'est pas disponible

---

## 📐 Les deux grilles

### 1. Grille pondérée (100 pts)

Saisie d'un score par critère, calcul automatique du total et conversion sur 20.
Adaptée au bulletin et au suivi chiffré.

| Axe | Points | Critères | Niveaux de Bloom |
|---|:---:|---|---|
| **Maîtrise technique** | 40 | Fonctionnalités attendues (30) · Compréhension & architecture (10) | Appliquer → Analyser |
| **Performance & qualité** | 30 | Qualité du code et stabilité (15) · Expérience utilisateur UX/UI (15) | Analyser → Créer |
| **Engagement & processus** | 20 | Collaboration Git/GitHub (8) · Autonomie & initiative (6) · Organisation & planification (6) | Appliquer → Évaluer |
| **Usage de l'IA générative** | 10 | Cohérence du niveau d'usage (4) · Justification de l'usage (3) · Esprit critique face à l'IA (3) | Comprendre → Évaluer |
| **Total** | **100** | | |

### 2. Grille par compétences (A–D)

Évaluation critériée par **niveaux de maîtrise observables**.
Pour chaque critère, l'évaluateur choisit un niveau et saisit séparément la note en points. Le niveau n'invente ni ne préremplit une note ; son intervalle est affiché à titre indicatif. La note finale sur 20 apparaît uniquement lorsque niveau et note sont renseignés pour tous les critères.

Les anciennes évaluations conservent leurs niveaux et observations, mais leurs notes calculées automatiquement sont supprimées lors de la migration : les notes doivent être saisies à nouveau.

---

## 🤖 Échelle d'usage de l'IA (N1 → N5)

Inspirée de l'*AI Assessment Scale*, chaque niveau doit être étayé par des **comportements
observables**, et pas seulement par une déclaration de l'étudiant·e.

| Niveau | Intitulé | Description |
|:---:|---|---|
| **N1** | Sans IA | Travail basé sur la documentation, les ressources humaines et la réflexion personnelle |
| **N2** | Préparation avec IA | Idéation, recherche, brainstorming, puis réécriture avec ses propres mots |
| **N3** | Collaboration avec IA | Assistant pour le code ou le texte, avec relecture et corrections systématiques |
| **N4** | Intégration complète | IA orchestrée à chaque étape, avec choix de modèles et évaluation des limites |
| **N5** | Exploration créative | Usage innovant et réflexif, avec questionnement des biais et expérimentations documentées |

---

## 🚀 Utilisation

1. **Renseigner les informations du projet** : nom, étudiant·e(s), lien GitHub, périmètre individuel ou collectif.
2. **Évaluer critère par critère** : attribuer un score (grille pondérée) ou un niveau A–D et une note manuelle (grille par compétences), puis documenter les observations.
3. **Vérifier l'usage de l'IA** : contrôler la cohérence entre le niveau déclaré, les preuves et la soutenance orale.
4. **Soumettre et exporter** : export PDF, Excel ou JSON.

> 💡 Les grilles s'enregistrent automatiquement dans le navigateur. Les données restent donc
> sur votre poste tant que vous ne les exportez pas.

---

## 🤝 Contribuer

Les contributions sont les bienvenues (corrections, nouveaux indicateurs, traductions, accessibilité).

1. Forkez le dépôt
2. Créez une branche : `git checkout -b feature/ma-contribution`
3. Committez vos changements : `git commit -m "feat: description courte"`
4. Poussez la branche : `git push origin feature/ma-contribution`
5. Ouvrez une **Pull Request**

Convention de commits suggérée : [Conventional Commits](https://www.conventionalcommits.org/fr/) (`feat:`, `fix:`, `docs:`, `refactor:`…).

---

## 📚 Références

- [AI Assessment Scale](https://aiassessmentscale.com/) : cadre dont l'échelle N1–N5 est inspirée
- [Journal of University Teaching & Learning Practice (JUTLP)](https://open-publishing.org/journals/index.php/jutlp/article/view/810) : article cité sur le site du projet

<!-- Ajoutez ici la citation exacte (auteurs, année, titre) après vérification de la source. -->

---

## 📄 Licence

<!-- Choisissez une licence (MIT, CC BY 4.0, etc.) et ajoutez un fichier LICENSE. -->
Licence à définir. Voir le fichier [`LICENSE`](LICENSE) une fois ajouté.

---

## 👩‍🏫 Auteur·e

Projet développé par **[ayarii](https://github.com/ayarii)**.

Pour toute question ou suggestion, ouvrez une [issue](../../issues).
