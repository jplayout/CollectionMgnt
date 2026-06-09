# Contributing To CollectionMgnt

> Français en premier. English version below.

---

# Français

## Workflow Git

La branche `main` est protégée. Aucun commit direct sur `main` ne doit être effectué.

Pour contribuer, créez une branche dédiée depuis l'état courant :

```bash
git checkout -b feature/nom-feature
```

Workflow attendu :

- développer la modification ;
- exécuter les vérifications minimales ;
- mettre à jour la documentation si nécessaire ;
- créer un commit ;
- pousser la branche ;
- ouvrir une Pull Request vers `main`.

## Vérifications Minimales

Backend :

```bash
node --check <fichier>
```

Frontend :

```bash
npm exec vite build
```

Git :

```bash
git diff --check
```

Adaptez ces commandes au dossier concerné. Par exemple, lancez le build frontend depuis `frontend/`.

## Documentation

Toute modification fonctionnelle doit mettre à jour :

- `docs/current-state.md`
- `docs/roadmap.md`

Mettez aussi à jour toute documentation spécialisée concernée, par exemple administration, export/import, sauvegarde ZIP, audit média, cleanup média, schéma de base ou API plugins.

## Données Interdites Dans Git

Ne jamais committer :

- `.env`
- `frontend/.env`
- bases SQLite
- fichiers SQLite WAL/SHM
- uploads utilisateur
- backups ZIP
- secrets
- tokens
- credentials externes
- logs

## Conventions De Commit

Préfixes recommandés :

- `feat:` pour une fonctionnalité
- `fix:` pour une correction
- `docs:` pour la documentation
- `chore:` pour la maintenance

## Licence

En contribuant, vous acceptez que vos contributions soient soumises à la licence du projet. Consultez `LICENSE` avant d'ouvrir une Pull Request.

---

# English

## Git Workflow

The `main` branch is protected. Do not commit directly to `main`.

To contribute, create a dedicated branch from the current state:

```bash
git checkout -b feature/feature-name
```

Expected workflow:

- develop the change;
- run the minimal checks;
- update documentation when needed;
- create a commit;
- push the branch;
- open a Pull Request targeting `main`.

## Minimal Checks

Backend:

```bash
node --check <file>
```

Frontend:

```bash
npm exec vite build
```

Git:

```bash
git diff --check
```

Run these commands from the relevant directory. For example, run the frontend build from `frontend/`.

## Documentation

Every functional change should update:

- `docs/current-state.md`
- `docs/roadmap.md`

Also update any specialized documentation affected by the change, such as administration, export/import, ZIP backup, media audit, media cleanup, database schema or plugin API docs.

## Data Forbidden In Git

Never commit:

- `.env`
- `frontend/.env`
- SQLite databases
- SQLite WAL/SHM files
- user uploads
- ZIP backups
- secrets
- tokens
- external credentials
- logs

## Commit Conventions

Recommended prefixes:

- `feat:` for a feature
- `fix:` for a bug fix
- `docs:` for documentation
- `chore:` for maintenance

## License

By contributing, you agree that your contributions are submitted under the project license. Read `LICENSE` before opening a Pull Request.
