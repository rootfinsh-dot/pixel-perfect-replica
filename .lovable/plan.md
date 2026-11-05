# Fiabilisation de BATI DOC AI

Conserver le design et toutes les fonctionnalités actuelles.

1. Détection : priorité au nom de fichier, puis score de mots entiers dans le texte, avec tests de faux positifs.
2. Assistant : limiter à 10 documents, environ 20 Mo par fichier encodé (compatible avec les fichiers de 15 Mo), et 30 Mo par requête ; afficher les erreurs françaises précises.
3. Suppression : vérifier chaque étape du nettoyage, inclure les fichiers du dossier du projet, et conserver le projet si le stockage ne peut pas être nettoyé.
4. PDF : conserver les proportions, améliorer la pagination et vérifier un rapport avec tableau long.
5. Accessibilité : fenêtres avec focus contenu/restauré, Échap et navigation clavier ; dépôt utilisable avec Entrée et Espace.
6. Conversations : enregistrer questions et réponses dans Lovable Cloud, par projet et accessibles uniquement au propriétaire ; conserver le bouton Nouvelle conversation.
7. Mettre à jour la dépendance PDF vulnérable, exécuter les tests et documenter les résultats dans la roadmap.

## Détails techniques
- Validation partagée client/serveur et lecture bornée du corps HTTP avant JSON.
- Historique dans une table dédiée avec RLS propriétaire et suppression liée au projet.
- Fenêtres fondées sur les primitives Dialog existantes, sans changement visuel.
- Tests unitaires des règles et vérification réelle dans l’application connectée.