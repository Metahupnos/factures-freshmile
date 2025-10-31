# Factures Freshmile - Application de Gestion

Application React pour consulter et visualiser vos factures Freshmile synchronisées depuis Google Sheets.

## Fonctionnalités

- 📊 **Graphiques de consommation** - Visualisation par jour ou par mois
- 📋 **Tableau interactif** - Tri, recherche et filtrage des factures
- 📱 **Design responsive** - Optimisé pour mobile et desktop
- 🔄 **Synchronisation automatique** - Données mises à jour depuis Google Sheets
- 🎨 **Branding Freshmile** - Interface aux couleurs de Freshmile

## Configuration

### 1. Installation

```bash
npm install
```

### 2. Créer une API Key Google

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet
3. Activez l'API Google Sheets
4. Créez une API Key

### 3. Configuration de l'application

```bash
cp src/config/config.example.js src/config/config.js
```

Éditez `src/config/config.js` avec vos informations.

### 4. Lancement

```bash
npm start
```

## Déploiement sur GitHub Pages

1. Modifiez `homepage` dans `package.json`
2. `npm run deploy`

Pour plus de détails, consultez la documentation complète.
