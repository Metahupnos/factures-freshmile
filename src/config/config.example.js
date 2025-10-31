// INSTRUCTIONS DE CONFIGURATION
// ===============================
//
// 1. Créer un projet dans Google Cloud Console
//    https://console.cloud.google.com/
//
// 2. Activer l'API Google Sheets
//    https://console.cloud.google.com/apis/library/sheets.googleapis.com
//
// 3. Créer des credentials OAuth 2.0
//    - Aller dans "Credentials"
//    - Cliquer sur "Create Credentials" > "OAuth client ID"
//    - Choisir "Web application"
//    - Ajouter http://localhost:3000 dans "Authorized JavaScript origins"
//    - Copier le Client ID
//
// 4. Créer une clé API
//    - Cliquer sur "Create Credentials" > "API key"
//    - Copier la clé
//
// 5. Obtenir l'ID de votre Google Sheet
//    - Ouvrir votre Google Sheet
//    - L'ID est dans l'URL: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
//
// 6. Rendre votre Google Sheet accessible
//    - Ouvrir votre Google Sheet
//    - Cliquer sur "Partager"
//    - Modifier en "Tous les utilisateurs ayant le lien peuvent consulter"
//    OU ajouter votre adresse email Google
//
// 7. Copier ce fichier en config.js et remplir les valeurs
//    cp src/config/config.example.js src/config/config.js

export const GOOGLE_CONFIG = {
  apiKey: 'VOTRE_API_KEY_ICI',
  clientId: 'VOTRE_CLIENT_ID_ICI.apps.googleusercontent.com',
  spreadsheetId: 'VOTRE_SPREADSHEET_ID_ICI',
  sheetName: 'Factures_Freshmile',
  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  scope: 'https://www.googleapis.com/auth/spreadsheets.readonly'
};
