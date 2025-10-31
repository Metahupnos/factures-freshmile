import { gapi } from 'gapi-script';

// Configuration par défaut
// Créez le fichier src/config/config.js pour personnaliser
const DEFAULT_CONFIG = {
  apiKey: 'VOTRE_API_KEY',
  clientId: 'VOTRE_CLIENT_ID',
  spreadsheetId: 'VOTRE_SPREADSHEET_ID',
  sheetName: 'Factures_Freshmile',
  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  scope: 'https://www.googleapis.com/auth/spreadsheets.readonly'
};

// Tentative d'import de la configuration personnalisée
let CONFIG = DEFAULT_CONFIG;

// La configuration sera importée dynamiquement si elle existe
const loadConfig = async () => {
  try {
    const configModule = await import('../config/config.js');
    CONFIG = configModule.GOOGLE_CONFIG;
    console.log('Configuration personnalisée chargée');
  } catch (error) {
    console.warn('Fichier config.js non trouvé. Utilisez config.example.js comme modèle.');
  }
};

class GoogleSheetsService {
  constructor() {
    this.isInitialized = false;
    this.isSignedIn = false;
  }

  // Initialiser l'API Google
  async initClient() {
    // Charger la configuration personnalisée si elle existe
    await loadConfig();

    return new Promise((resolve, reject) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey: CONFIG.apiKey,
            clientId: CONFIG.clientId,
            discoveryDocs: CONFIG.discoveryDocs,
            scope: CONFIG.scope,
          });

          this.isInitialized = true;

          // Écouter les changements d'état de connexion
          gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus.bind(this));

          // Vérifier l'état de connexion initial
          this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Mettre à jour l'état de connexion
  updateSigninStatus(isSignedIn) {
    this.isSignedIn = isSignedIn;
  }

  // Se connecter
  async signIn() {
    try {
      await gapi.auth2.getAuthInstance().signIn();
      this.isSignedIn = true;
      return true;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  }

  // Se déconnecter
  async signOut() {
    try {
      await gapi.auth2.getAuthInstance().signOut();
      this.isSignedIn = false;
      return true;
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  }

  // Récupérer les données de la feuille
  async getFactures() {
    try {
      if (!this.isInitialized) {
        throw new Error('API Google non initialisée');
      }

      if (!this.isSignedIn) {
        await this.signIn();
      }

      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: CONFIG.spreadsheetId,
        range: `${CONFIG.sheetName}!A2:D`, // A partir de la ligne 2 (après les en-têtes)
      });

      const rows = response.result.values;

      if (!rows || rows.length === 0) {
        return [];
      }

      // Transformer les données en objets
      const factures = rows
        .filter(row => row[0] && row[0] !== 'TOTAL') // Exclure la ligne TOTAL
        .map(row => ({
          nomFichier: row[0] || '',
          dateFacture: row[1] || '',
          montantTTC: row[2] || '0',
          lienDrive: row[3] || ''
        }));

      return factures;
    } catch (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      throw error;
    }
  }

  // Vérifier si l'utilisateur est connecté
  checkSignInStatus() {
    return this.isSignedIn;
  }
}

// Exporter une instance unique
const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;
