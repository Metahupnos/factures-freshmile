// Service simplifié pour accès public à Google Sheets (sans OAuth)

const API_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

class GoogleSheetsServicePublic {
  constructor() {
    this.apiKey = null;
    this.spreadsheetId = null;
    this.sheetName = null;
  }

  // Initialiser avec la configuration
  init(config) {
    this.apiKey = config.apiKey;
    this.spreadsheetId = config.spreadsheetId;
    this.sheetName = config.sheetName;
  }

  // Récupérer les factures directement via l'API REST
  async getFactures() {
    try {
      if (!this.apiKey || !this.spreadsheetId) {
        throw new Error('Configuration manquante : API Key ou Spreadsheet ID');
      }

      // Construire l'URL de l'API
      const range = `${this.sheetName}!A2:F`; // Depuis A2 pour éviter les en-têtes (6 colonnes maintenant)
      const url = `${API_BASE_URL}/${this.spreadsheetId}/values/${encodeURIComponent(range)}?key=${this.apiKey}`;

      console.log('📡 Récupération des données depuis Google Sheets...');

      // Faire la requête
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur API:', errorData);
        throw new Error(`Erreur Google Sheets API: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const rows = data.values;

      if (!rows || rows.length === 0) {
        console.log('⚠️ Aucune donnée trouvée dans le sheet');
        return [];
      }

      // Transformer les données en objets
      const factures = rows
        .filter(row => row[0] && row[0] !== 'TOTAL') // Exclure la ligne TOTAL
        .map(row => ({
          nomFichier: row[0] || '',
          dateFacture: row[1] || '',
          consommation: row[2] || '0',
          station: row[3] || '',
          montantTTC: row[4] || '0',
          lienDrive: row[5] || ''
        }));

      console.log(`✅ ${factures.length} facture(s) récupérée(s)`);
      return factures;

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des factures:', error);
      throw error;
    }
  }

  // Vérifier que l'API est accessible
  async testConnection() {
    try {
      await this.getFactures();
      return true;
    } catch (error) {
      console.error('❌ Test de connexion échoué:', error);
      return false;
    }
  }
}

// Exporter une instance unique
const googleSheetsServicePublic = new GoogleSheetsServicePublic();
export default googleSheetsServicePublic;
