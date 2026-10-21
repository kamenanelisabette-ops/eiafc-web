# EIAFC — Système de maintenance automatique

## Ce qui est automatisé

- contrôle du site de production toutes les 15 minutes ;
- contrôle de l'endpoint de santé ;
- vérification de réponses HTTP et de quelques en-têtes de sécurité ;
- conservation d'un rapport de contrôle pendant 14 jours ;
- création d'une alerte GitHub en cas d'incident.

## Ce qui n'est volontairement PAS automatique

Le système ne supprime aucune donnée étudiant et ne déploie pas automatiquement une correction de code.
Une correction destructive ou une restauration de données doit rester sous contrôle humain.

## Déploiement

1. Fusionner cette branche uniquement après test.
2. Vérifier que GitHub Actions est activé dans le dépôt.
3. Vérifier que `https://eiafc-web.vercel.app/api/maintenance-health` répond.
4. Le workflow `EIAFC — Maintenance automatique` s'exécute ensuite toutes les 15 minutes.

## Prochaine couche possible

Pour une vraie sauvegarde serveur quotidienne des données Cloud, il faut connecter la maintenance à un secret serveur Supabase (jamais dans `index.html`).
