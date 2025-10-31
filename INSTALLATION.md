# Guide d'installation détaillé

## Configuration Google Cloud Console

### Étape 1 : Créer un projet Google Cloud

1. Rendez-vous sur [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquez sur le sélecteur de projet en haut à gauche
3. Cliquez sur "Nouveau projet"
4. Donnez un nom à votre projet (ex: "Factures Freshmile")
5. Cliquez sur "Créer"

### Étape 2 : Activer l'API Google Sheets

1. Dans le menu de gauche, cliquez sur "APIs & Services" > "Bibliothèque"
2. Recherchez "Google Sheets API"
3. Cliquez sur le résultat "Google Sheets API"
4. Cliquez sur le bouton "Activer"

### Étape 3 : Configurer l'écran de consentement OAuth

1. Dans le menu de gauche, cliquez sur "APIs & Services" > "Écran de consentement OAuth"
2. Sélectionnez "Externe" comme type d'utilisateur
3. Cliquez sur "Créer"
4. Remplissez les informations requises :
   - **Nom de l'application** : Factures Freshmile
   - **E-mail d'assistance utilisateur** : Votre email
   - **Coordonnées du développeur** : Votre email
5. Cliquez sur "Enregistrer et continuer"
6. Sur la page "Champs d'application", cliquez sur "Enregistrer et continuer"
7. Sur la page "Utilisateurs de test", cliquez sur "Ajouter des utilisateurs"
8. Ajoutez votre adresse email Google
9. Cliquez sur "Enregistrer et continuer"
10. Cliquez sur "Retour au tableau de bord"

### Étape 4 : Créer des identifiants OAuth 2.0

1. Dans le menu de gauche, cliquez sur "APIs & Services" > "Identifiants"
2. Cliquez sur "Créer des identifiants" > "ID client OAuth"
3. Type d'application : Sélectionnez "Application Web"
4. Nom : "Client Web Factures Freshmile"
5. Dans "Origines JavaScript autorisées", cliquez sur "Ajouter une URI" :
   - Ajoutez : `http://localhost:3000`
6. Cliquez sur "Créer"
7. **IMPORTANT** : Une fenêtre s'ouvre avec votre Client ID
   - Copiez le "ID client" (format : `xxxxx-xxxxx.apps.googleusercontent.com`)
   - Vous pouvez fermer la fenêtre, les identifiants sont disponibles dans la liste

### Étape 5 : Créer une clé API

1. Toujours dans "Identifiants", cliquez sur "Créer des identifiants" > "Clé API"
2. Une fenêtre s'ouvre avec votre clé API
3. **IMPORTANT** : Copiez cette clé
4. (Optionnel mais recommandé) Cliquez sur "Restreindre la clé" :
   - Nom : "API Key Factures Freshmile"
   - Dans "Restrictions relatives à l'API", sélectionnez "Restreindre la clé"
   - Cochez "Google Sheets API"
   - Cliquez sur "Enregistrer"

## Configuration du Google Sheet

### Étape 1 : Récupérer l'ID du spreadsheet

1. Ouvrez votre Google Sheet contenant les factures Freshmile
2. Regardez l'URL dans votre navigateur :
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit#gid=0
   ```
3. Copiez la partie `[SPREADSHEET_ID]` (entre `/d/` et `/edit`)
   - Exemple : `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### Étape 2 : Vérifier la structure du sheet

Assurez-vous que votre feuille :
- S'appelle exactement "Factures_Freshmile" (sans espace avant/après)
- A les colonnes dans cet ordre exact :
  - **Colonne A** : Nom Fichier
  - **Colonne B** : Date Facture
  - **Colonne C** : Montant TTC (€)
  - **Colonne D** : Lien Drive

### Étape 3 : Partager le Google Sheet

**Option 1 (Recommandée)** : Partage avec votre compte
1. Cliquez sur le bouton "Partager" en haut à droite
2. Ajoutez votre adresse email Google (celle que vous utiliserez pour vous connecter à l'app)
3. Définissez les permissions sur "Lecteur"
4. Cliquez sur "Envoyer"

**Option 2** : Partage public en lecture seule
1. Cliquez sur le bouton "Partager" en haut à droite
2. Cliquez sur "Modifier" sous "Accès général"
3. Sélectionnez "Tous les utilisateurs ayant le lien"
4. Assurez-vous que le rôle est "Lecteur"
5. Cliquez sur "Terminé"

## Configuration de l'application React

### Étape 1 : Créer le fichier de configuration

Dans le terminal, à la racine du projet `home` :

```bash
# Windows
copy src\config\config.example.js src\config\config.js

# Mac/Linux
cp src/config/config.example.js src/config/config.js
```

### Étape 2 : Éditer le fichier de configuration

Ouvrez le fichier `src/config/config.js` avec votre éditeur de code et remplacez :

```javascript
export const GOOGLE_CONFIG = {
  // Remplacez par la clé API copiée à l'étape 5
  apiKey: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',

  // Remplacez par le Client ID copié à l'étape 4
  clientId: '123456789-abcdefghijk.apps.googleusercontent.com',

  // Remplacez par l'ID du spreadsheet copié plus haut
  spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',

  // Ne modifiez pas les lignes suivantes
  sheetName: 'Factures_Freshmile',
  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  scope: 'https://www.googleapis.com/auth/spreadsheets.readonly'
};
```

### Étape 3 : Sauvegarder et vérifier

1. Sauvegardez le fichier `config.js`
2. **IMPORTANT** : Ne partagez jamais ce fichier et ne le commitez pas sur Git
3. Le fichier est déjà dans `.gitignore` pour votre sécurité

## Lancer l'application

### Première fois

```bash
# Installer les dépendances
npm install

# Lancer l'application
npm start
```

### Les fois suivantes

```bash
npm start
```

L'application s'ouvrira automatiquement sur [http://localhost:3000](http://localhost:3000)

## Premier test

1. L'application devrait se charger
2. Cliquez sur "Se connecter avec Google"
3. Sélectionnez votre compte Google (celui ajouté dans les utilisateurs de test)
4. **IMPORTANT** : Vous verrez un avertissement "Cette application n'est pas vérifiée"
   - Cliquez sur "Paramètres avancés"
   - Cliquez sur "Accéder à Factures Freshmile (dangereux)"
   - C'est normal car votre app est en mode développement
5. Autorisez l'application à accéder à vos Google Sheets
6. Vous devriez voir vos factures s'afficher !

## Résolution des problèmes courants

### Erreur : "idpiframe_initialization_failed"

**Solution** :
- Vérifiez que `http://localhost:3000` est bien dans les "Origines JavaScript autorisées"
- Videz le cache de votre navigateur et réessayez

### Erreur : "Access denied"

**Solutions** :
1. Vérifiez que votre email est bien dans les "Utilisateurs de test" (Google Cloud Console)
2. Vérifiez que vous avez partagé le Google Sheet avec votre compte
3. Vérifiez que le `spreadsheetId` est correct dans `config.js`

### Erreur : "API key not valid"

**Solutions** :
1. Vérifiez que vous avez bien copié la clé API complète
2. Vérifiez qu'il n'y a pas d'espace avant/après la clé dans `config.js`
3. Si vous avez restreint la clé, vérifiez que "Google Sheets API" est bien cochée

### Les données ne s'affichent pas

**Solutions** :
1. Vérifiez que le nom de la feuille est exactement "Factures_Freshmile"
2. Vérifiez que les colonnes sont dans le bon ordre (A, B, C, D)
3. Ouvrez la console du navigateur (F12) pour voir les erreurs détaillées
4. Vérifiez que la feuille contient au moins une ligne de données (en plus des en-têtes)

### Erreur : "Missing required parameter: sendUpdates"

**Solution** :
- Cette erreur peut apparaître avec certaines versions de l'API
- Assurez-vous que vous utilisez le scope en lecture seule : `spreadsheets.readonly`

## Sécurité

- Le fichier `config.js` contient des informations sensibles
- Ne le partagez JAMAIS
- Ne le commitez JAMAIS sur Git (déjà dans .gitignore)
- Si vous partagez votre code, partagez uniquement `config.example.js`

## Support

Si vous rencontrez des problèmes :
1. Vérifiez la console du navigateur (F12 > Console)
2. Vérifiez les logs de la console de l'application
3. Relisez attentivement ce guide d'installation
4. Vérifiez que toutes les étapes ont été suivies dans l'ordre
