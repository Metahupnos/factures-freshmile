// ==========================================
// SCRIPT GOOGLE APPS SCRIPT - FACTURES FRESHMILE (VERSION CORRIGÉE)
// ==========================================
//
// CORRECTIF : Pattern amélioré pour détecter le montant TTC
// dans les nouvelles factures Freshmile (format "Total TTC 10,12 €")
//
// IMPORTANT : Comment lancer le script
// 1. DEPUIS GOOGLE SHEETS : Utiliser le menu "📧 Factures Freshmile"
// 2. DEPUIS L'ÉDITEUR : Exécuter directement les fonctions
// ==========================================

// Start - Configuration globale
const CONFIG = {
  // Nom du dossier principal dans Google Drive
  DRIVE_FOLDER_NAME: "Factures_Freshmile",

  // Requête de recherche Gmail
  SEARCH_QUERY: "from:support@freshmile.com subject:Facture payée has:attachment",

  // Patterns de recherche dans le texte OCR
  PATTERNS: {
    numeroFacture: /BEFA\d{13}/,
    dateFacturation: /BEFA\d{13}\s+(\d{2}\/\d{2}\/\d{4})/,

    // PATTERN CORRIGÉ pour le montant TTC
    // Supporte les formats :
    // - "Total TTC 10,12 €"
    // - "Total TTC : 10,12 €"
    // - "Total TTC€10,12"
    // - "Total TTC: €10,12"
    montantTTC: /Total[\s\u00A0]+TTC[\s\u00A0:]*[\s\u00A0]*[€]?[\s\u00A0]*([\d]+[,.][\d]{2})[\s\u00A0]*€?/i
  }
};
// End - Configuration globale

// ==========================================
// FONCTION PRINCIPALE
// ==========================================

function traiterFacturesFreshmile() {
  try {
    Logger.log("🚀 Début du traitement des factures Freshmile");

    const folder = getOrCreateFolder(CONFIG.DRIVE_FOLDER_NAME);
    initialiserTableau();

    const fichiersDejaTraites = getFichiersDejaTraites();
    Logger.log(`📋 ${fichiersDejaTraites.size} fichier(s) déjà traité(s)`);

    const threads = GmailApp.search(CONFIG.SEARCH_QUERY, 0, 50);

    if (threads.length === 0) {
      Logger.log("⚠️ Aucune facture Freshmile trouvée.");
      afficherMessage("Aucune facture", "Aucune facture Freshmile trouvée.");
      return;
    }

    let nbNouvellesFactures = 0;
    let nbDejaTraites = 0;

    for (const thread of threads) {
      const messages = thread.getMessages();

      for (const message of messages) {
        const attachments = message.getAttachments();

        for (const attachment of attachments) {
          const fileName = attachment.getName();

          if (fileName.toLowerCase().endsWith('.pdf')) {
            if (fichiersDejaTraites.has(fileName)) {
              Logger.log(`⏭️ Fichier déjà traité : ${fileName}`);
              nbDejaTraites++;
              continue;
            }

            Logger.log(`📄 Nouveau fichier à traiter : ${fileName}`);

            const resultat = processFacture(attachment, folder, message);

            if (resultat) {
              ajouterLigneAuTableau(resultat);
              nbNouvellesFactures++;
              Logger.log(`📊 Ligne ajoutée au tableau : ${fileName}`);
            }
          }
        }
      }
    }

    mettreAJourTotal();

    if (nbNouvellesFactures > 0) {
      const message = `${nbNouvellesFactures} nouvelle(s) facture(s) traitée(s) et ajoutée(s) au tableau.\n${nbDejaTraites} facture(s) déjà présente(s) dans le tableau.`;
      Logger.log(`✅ ${message}`);
      afficherMessage("Traitement terminé", message);
    } else if (nbDejaTraites > 0) {
      const message = `Toutes les factures (${nbDejaTraites}) sont déjà dans le tableau.`;
      Logger.log(`ℹ️ ${message}`);
      afficherMessage("Pas de nouvelles factures", message);
    }

    Logger.log(`✅ Traitement terminé : ${nbNouvellesFactures} nouvelle(s) facture(s)`);

  } catch (error) {
    Logger.log(`❌ Erreur : ${error.toString()}`);
    afficherMessage("Erreur", `Une erreur s'est produite : ${error.toString()}`);
  }
}

// ==========================================
// TRAITEMENT D'UNE FACTURE (AMÉLIORÉ)
// ==========================================

function processFacture(attachment, folder, message) {
  try {
    const fileName = attachment.getName();
    const blob = attachment.copyBlob();

    const texteOCR = performOCR(blob, fileName);

    const donnees = {
      nomFichier: fileName,
      dateFacturation: "",
      montantTTC: 0
    };

    // Extraire la date
    const matchDate = texteOCR.match(CONFIG.PATTERNS.dateFacturation);
    if (matchDate) {
      donnees.dateFacturation = matchDate[1];
    }

    // EXTRACTION AMÉLIORÉE DU MONTANT TTC
    const matchMontant = texteOCR.match(CONFIG.PATTERNS.montantTTC);
    if (matchMontant) {
      // Remplacer virgule par point pour parseFloat
      const montantStr = matchMontant[1].replace(',', '.');
      donnees.montantTTC = parseFloat(montantStr) || 0;
      Logger.log(`💰 Montant TTC trouvé : ${donnees.montantTTC} € (brut: "${matchMontant[1]}")`);
    } else {
      Logger.log(`⚠️ Montant TTC non trouvé dans ${fileName}`);
      // Logger une partie du texte pour debug
      Logger.log(`📝 Extrait OCR : ${texteOCR.substring(0, 500)}`);
    }

    // Créer le dossier mensuel
    let dossierMensuel = folder;

    if (donnees.dateFacturation) {
      const parties = donnees.dateFacturation.split('/');
      if (parties.length === 3) {
        const annee = parties[2];
        const mois = parties[1];
        const nomDossierMensuel = annee + mois;

        const sousDossiers = folder.getFoldersByName(nomDossierMensuel);
        if (sousDossiers.hasNext()) {
          dossierMensuel = sousDossiers.next();
        } else {
          dossierMensuel = folder.createFolder(nomDossierMensuel);
          Logger.log(`📁 Nouveau dossier créé : ${nomDossierMensuel}`);
        }
      }
    }

    blob.setName(fileName);
    const file = dossierMensuel.createFile(blob);
    donnees.lienDrive = file.getUrl();

    Logger.log(`✅ Facture sauvegardée dans ${dossierMensuel.getName()} : ${fileName}`);

    return donnees;

  } catch (error) {
    Logger.log(`❌ Erreur traitement facture : ${error.toString()}`);
    return null;
  }
}

// ==========================================
// OCR DU PDF
// ==========================================

function performOCR(pdfBlob, fileName) {
  try {
    const tempFile = DriveApp.createFile(pdfBlob);
    tempFile.setName("TEMP_" + fileName);

    const fileId = tempFile.getId();

    const resource = {
      title: "OCR_" + fileName,
      mimeType: MimeType.GOOGLE_DOCS
    };

    const ocrFile = Drive.Files.copy(resource, fileId, {
      ocr: true,
      ocrLanguage: "fr"
    });

    const doc = DocumentApp.openById(ocrFile.id);
    const text = doc.getBody().getText();

    DriveApp.getFileById(fileId).setTrashed(true);
    DriveApp.getFileById(ocrFile.id).setTrashed(true);

    return text;

  } catch (error) {
    Logger.log(`❌ Erreur OCR : ${error.toString()}`);
    throw error;
  }
}

// ==========================================
// GESTION DU TABLEAU
// ==========================================

function initialiserTableau() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName("Factures_Freshmile");

    if (!sheet) {
      sheet = spreadsheet.insertSheet("Factures_Freshmile");

      sheet.getRange(1, 1, 1, 4).setValues([[
        "Nom Fichier", "Date Facture", "Montant TTC (€)", "Lien Drive"
      ]]);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
      sheet.getRange("C:C").setNumberFormat("#,##0.00 €");

      Logger.log("📊 Nouveau tableau créé avec en-têtes");
    }

  } catch (error) {
    Logger.log(`❌ Erreur initialisation tableau : ${error.toString()}`);
  }
}

function ajouterLigneAuTableau(resultat) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Factures_Freshmile");

    if (!sheet) {
      Logger.log("❌ Feuille 'Factures_Freshmile' non trouvée");
      return;
    }

    let lastRow = sheet.getLastRow();

    // Supprimer temporairement la ligne TOTAL si elle existe
    if (lastRow > 1) {
      const derniereLigne = sheet.getRange(lastRow, 1).getValue();
      if (derniereLigne === "TOTAL") {
        sheet.deleteRow(lastRow);
        lastRow--;
      }
    }

    const nouvelleLigne = [
      resultat.nomFichier,
      resultat.dateFacturation,
      resultat.montantTTC,
      resultat.lienDrive
    ];

    sheet.getRange(lastRow + 1, 1, 1, 4).setValues([nouvelleLigne]);
    SpreadsheetApp.flush();

    Logger.log(`📊 Ligne ajoutée au tableau : ${resultat.nomFichier}`);

  } catch (error) {
    Logger.log(`❌ Erreur ajout ligne : ${error.toString()}`);
  }
}

function mettreAJourTotal() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Factures_Freshmile");

    if (!sheet) return;

    const lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      const derniereLigne = sheet.getRange(lastRow, 1).getValue();
      if (derniereLigne === "TOTAL") {
        sheet.getRange(lastRow, 3).setFormula(`=SUM(C2:C${lastRow - 1})`);
        return;
      }
    }

    const totalRow = lastRow + 1;
    sheet.getRange(totalRow, 1).setValue("TOTAL");
    sheet.getRange(totalRow, 1).setFontWeight("bold");
    sheet.getRange(totalRow, 3).setFormula(`=SUM(C2:C${lastRow})`);
    sheet.getRange(totalRow, 3).setFontWeight("bold");

    SpreadsheetApp.flush();

    Logger.log("📊 Ligne de total mise à jour");

  } catch (error) {
    Logger.log(`❌ Erreur mise à jour total : ${error.toString()}`);
  }
}

function getFichiersDejaTraites() {
  const fichiersTraites = new Set();

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Factures_Freshmile");

    if (!sheet) {
      return fichiersTraites;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const nomsFichiers = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

      nomsFichiers.forEach(row => {
        if (row[0] && row[0] !== "TOTAL") {
          fichiersTraites.add(row[0]);
        }
      });
    }

    return fichiersTraites;

  } catch (error) {
    Logger.log(`⚠️ Erreur récupération fichiers traités : ${error.toString()}`);
    return fichiersTraites;
  }
}

// ==========================================
// FONCTION DE CRÉATION DEPUIS DRIVE
// ==========================================

function creerTableauDepuisDrive() {
  try {
    Logger.log("📊 Création du tableau depuis les fichiers Drive");

    const folders = DriveApp.getFoldersByName("Factures_Freshmile");
    if (!folders.hasNext()) {
      afficherMessage("Erreur", "Dossier 'Factures_Freshmile' non trouvé");
      return;
    }

    initialiserTableau();

    const mainFolder = folders.next();
    let nbFichiersAjoutes = 0;

    const subFolders = mainFolder.getFolders();
    while (subFolders.hasNext()) {
      const subFolder = subFolders.next();
      const folderName = subFolder.getName();

      if (/^\d{6}$/.test(folderName)) {
        Logger.log(`📁 Traitement du dossier : ${folderName}`);

        const files = subFolder.getFiles();
        while (files.hasNext()) {
          const file = files.next();
          const fileName = file.getName();

          if (fileName.toLowerCase().endsWith('.pdf')) {
            const annee = folderName.substring(0, 4);
            const mois = folderName.substring(4, 6);
            const dateApproximative = `01/${mois}/${annee}`;

            const resultat = {
              nomFichier: fileName,
              dateFacturation: dateApproximative,
              montantTTC: 0,
              lienDrive: file.getUrl()
            };

            ajouterLigneAuTableau(resultat);
            nbFichiersAjoutes++;

            Logger.log(`✅ Fichier ajouté au tableau : ${fileName}`);
          }
        }
      }
    }

    mettreAJourTotal();

    if (nbFichiersAjoutes > 0) {
      const message = `${nbFichiersAjoutes} facture(s) ajoutée(s) au tableau.\nLes montants sont à 0€ - vous pouvez les remplir manuellement si nécessaire.`;
      Logger.log(`✅ ${message}`);
      afficherMessage("Tableau créé", message);
    } else {
      afficherMessage("Aucun fichier", "Aucun fichier PDF trouvé dans les dossiers");
    }

  } catch (error) {
    Logger.log(`❌ Erreur : ${error.toString()}`);
    afficherMessage("Erreur", error.toString());
  }
}

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
}

function afficherMessage(titre, message) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(titre, message, ui.ButtonSet.OK);
  } catch (error) {
    Logger.log(`${titre}: ${message}`);
    console.log(`${titre}: ${message}`);
  }
}

function demanderConfirmation(titre, message) {
  try {
    const ui = SpreadsheetApp.getUi();
    const reponse = ui.alert(titre, message, ui.ButtonSet.YES_NO);
    return reponse === ui.Button.YES;
  } catch (error) {
    Logger.log(`Confirmation demandée - ${titre}: ${message}`);
    Logger.log("⚠️ Confirmation automatique (UI non disponible)");
    return true;
  }
}

// ==========================================
// MENU
// ==========================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📧 Factures Freshmile')
    .addItem('🚀 Traiter les nouvelles factures', 'traiterFacturesFreshmile')
    .addItem('🔄 Retraiter TOUTES les factures', 'retraiterToutesFactures')
    .addSeparator()
    .addItem('📊 Créer tableau depuis Drive', 'creerTableauDepuisDrive')
    .addItem('🧪 Tester sur une facture', 'testUneFacture')
    .addToUi();
}

// ==========================================
// RETRAITEMENT COMPLET
// ==========================================

function retraiterToutesFactures() {
  const confirmation = demanderConfirmation(
    "Confirmation",
    "Cette action va effacer le tableau actuel et retraiter TOUTES les factures depuis le début.\n\nÊtes-vous sûr de vouloir continuer ?"
  );

  if (confirmation) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Factures_Freshmile");

    if (sheet) {
      spreadsheet.deleteSheet(sheet);
      Logger.log("🗑️ Ancienne feuille supprimée");
    }

    traiterFacturesFreshmile();
  } else {
    Logger.log("ℹ️ Retraitement annulé par l'utilisateur");
  }
}

// ==========================================
// FONCTION DE TEST (AMÉLIORÉE)
// ==========================================

function testUneFacture() {
  try {
    Logger.log("🧪 Test d'une facture");

    const threads = GmailApp.search("from:support@freshmile.com subject:Facture payée has:attachment", 0, 1);

    if (threads.length === 0) {
      afficherMessage("Test", "Aucun email trouvé pour le test");
      return;
    }

    const message = threads[0].getMessages()[0];
    const attachments = message.getAttachments();

    for (const attachment of attachments) {
      if (attachment.getName().toLowerCase().endsWith('.pdf')) {
        Logger.log(`🔍 Test de l'OCR sur : ${attachment.getName()}`);

        const blob = attachment.copyBlob();
        const texte = performOCR(blob, attachment.getName());

        // Extraire les données
        let dateFacture = "Non trouvée";
        let montantTTC = "Non trouvé";

        const matchDate = texte.match(CONFIG.PATTERNS.dateFacturation);
        if (matchDate) dateFacture = matchDate[1];

        const matchMontant = texte.match(CONFIG.PATTERNS.montantTTC);
        if (matchMontant) {
          const montantStr = matchMontant[1].replace(',', '.');
          montantTTC = parseFloat(montantStr).toFixed(2) + " €";
          Logger.log(`💰 Match trouvé : "${matchMontant[0]}" -> groupe capturé : "${matchMontant[1]}"`);
        } else {
          Logger.log(`⚠️ Pattern ne match pas. Extrait du texte :\n${texte.substring(0, 800)}`);
        }

        const resultatTest = `Fichier : ${attachment.getName()}\nDate : ${dateFacture}\nMontant TTC : ${montantTTC}`;

        Logger.log(`📊 Résultat du test :\n${resultatTest}`);
        afficherMessage("Test OCR - Résultat", resultatTest);

        break;
      }
    }
  } catch (error) {
    Logger.log(`❌ Erreur lors du test : ${error.toString()}`);
    afficherMessage("Erreur de test", error.toString());
  }
}
