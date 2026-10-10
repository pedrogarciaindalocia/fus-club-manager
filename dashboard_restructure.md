# Restructuration du Dashboard

Ce document décrit les nouvelles règles métier et l'architecture pour la gestion des rôles et des affectations de clubs dans le dashboard.

## 1. Rôles et Permissions

### Super Admin
* **Gestion des Administrateurs** : Peut créer, modifier et gérer les administrateurs.
* **Gestion des Clubs** : Peut créer de nouveaux clubs.
* **Affectation** : Est responsable d'affecter les clubs aux administrateurs.

### Administrateur (Admin)
* **Gestion des Clubs** : Peut gérer les autres clubs qui lui ont été affectés par le Super Admin.

## 2. Processus d'Affectation (Stepper)

Lorsqu'un Super Admin affecte un club à un Administrateur, le processus doit se faire via un **Stepper** contenant les étapes suivantes :

1. **Choix du continent** : Le Super Admin sélectionne le continent concerné.
2. **Choix du pays** : Le Super Admin sélectionne un pays (filtré en fonction du continent choisi à l'étape 1).
3. **Choix du club** : Le Super Admin sélectionne un ou plusieurs clubs (filtrés en fonction du pays choisi à l'étape 2).

## 3. Règle du Club Principal ("Mon Club")

* Lors de la sélection du club (à l'étape 3 du stepper), le Super Admin peut définir le statut du club sur **"mon club"**.
* **Règle d'automatisation** : Lorsque le statut d'un club est défini sur "mon club", celui-ci devient **automatiquement le club principal** de cet administrateur.
