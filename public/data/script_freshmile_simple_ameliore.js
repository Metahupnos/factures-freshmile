// ==========================================
// SCRIPT GOOGLE APPS SCRIPT - FACTURES FRESHMILE
// VERSION AMÉLIORÉE SIMPLE
// ==========================================
//
// AJOUTS : Consommation (kWh) + Station de recharge
//
// ==========================================

// Start - Configuration globale
const CONFIG = {
  DRIVE_FOLDER_NAME: "Factures_Freshmile",
  SEARCH_QUERY: "from:support@freshmile.com subject:Facture payée has:attachment",

  PATTERNS: {
    numeroFacture: /BEFA\d{13}/,
    dateFacturation: /BEFA\d{13}\s+(\d{2}\/\d{2}\/\d{4})/,
    montantTTC: /Total[\s\u00A0]+TTC[\s\u00A0:]*[\s\u00A0]*[€]?[\s\u00A0]*([\d]+[,.][\d]{2})[\s\u00A0]*€?/i,

    // NOUVEAUX PATTERNS
    consommation: /Consommation[\s\u00A0:]+([0-9]+[.,][0-9]+)[\s\u00A0]*kWh/i,
    station: /Station[\s\u00A0]*:[\s\u00A0]*(.+?)(?:\n|- Point)/i
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
      montantTTC: 0,
      consommation: 0,     // NOUVEAU
      station: ""          // NOUVEAU
    };

    // Extraire la date
    const matchDate = texteOCR.match(CONFIG.PATTERNS.dateFacturation);
    if (matchDate) {
      donnees.dateFacturation = matchDate[1];
    }

    // Extraire le montant TTC
    const matchMontant = texteOCR.match(CONFIG.PATTERNS.montantTTC);
    if (matchMontant) {
      const montantStr = matchMontant[1].replace(',', '.');
      donnees.montantTTC = parseFloat(montantStr) || 0;
      Logger.log(`💰 Montant TTC trouvé : ${donnees.montantTTC} €`);
    } else {
      Logger.log(`⚠️ Montant TTC non trouvé dans ${fileName}`);
    }

    // NOUVEAU : Extraire la consommation
    const matchConso = texteOCR.match(CONFIG.PATTERNS.consommation);
    if (matchConso) {
      donnees.consommation = parseFloat(matchConso[1].replace(',', '.')) || 0;
      Logger.log(`⚡ Consommation : ${donnees.consommation} kWh`);
    } else {
      Logger.log(`⚠️ Consommation non trouvée dans ${fileName}`);
    }

    // NOUVEAU : Extraire la station
    const matchStation = texteOCR.match(CONFIG.PATTERNS.station);
    if (matchStation) {
      donnees.station = matchStation[1].trim();
      Logger.log(`📍 Station : ${donnees.station}`);
    } else {
      Logger.log(`⚠️ Station non trouvée dans ${fileName}`);
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
// GESTION DU TABLEAU (6 COLONNES)
// ==========================================

function initialiserTableau() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName("Factures_Freshmile");

    if (!sheet) {
      sheet = spreadsheet.insertSheet("Factures_Freshmile");

      // En-têtes avec 2 colonnes supplémentaires
      sheet.getRange(1, 1, 1, 6).setValues([[
        "Nom Fichier", "Date Facture", "kWh", "Station", "Montant TTC (€)", "Lien Drive"
      ]]);

      sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
      sheet.getRange(1, 1, 1, 6).setBackground("#00b8d4");
      sheet.getRange(1, 1, 1, 6).setFontColor("white");

      // Formater les colonnes
      sheet.getRange("C:C").setNumberFormat("#,##0.00"); // kWh
      sheet.getRange("E:E").setNumberFormat("#,##0.00 €"); // Montant

      // Ajuster les largeurs
      sheet.setColumnWidth(1, 200); // Nom fichier
      sheet.setColumnWidth(2, 100); // Date
      sheet.setColumnWidth(3, 80);  // kWh
      sheet.setColumnWidth(4, 300); // Station
      sheet.setColumnWidth(5, 110); // Montant TTC
      sheet.setColumnWidth(6, 100); // Lien Drive

      Logger.log("📊 Nouveau tableau créé avec colonnes kWh et Station");
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

    // Supprimer temporairement la ligne TOTAL
    if (lastRow > 1) {
      const derniereLigne = sheet.getRange(lastRow, 1).getValue();
      if (derniereLigne === "TOTAL") {
        sheet.deleteRow(lastRow);
        lastRow--;
      }
    }

    // Ajouter la nouvelle ligne avec 6 colonnes
    const nouvelleLigne = [
      resultat.nomFichier,
      resultat.dateFacturation,
      resultat.consommation,    // NOUVEAU
      resultat.station,         // NOUVEAU
      resultat.montantTTC,
      resultat.lienDrive
    ];

    sheet.getRange(lastRow + 1, 1, 1, 6).setValues([nouvelleLigne]);

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
        // Mettre à jour les formules
        sheet.getRange(lastRow, 3).setFormula(`=SUM(C2:C${lastRow - 1})`); // Total kWh
        sheet.getRange(lastRow, 5).setFormula(`=SUM(E2:E${lastRow - 1})`); // Total €
        return;
      }
    }

    // Ajouter une nouvelle ligne de total
    const totalRow = lastRow + 1;
    sheet.getRange(totalRow, 1).setValue("TOTAL");
    sheet.getRange(totalRow, 1, 1, 2).merge(); // Fusionner colonnes 1 et 2
    sheet.getRange(totalRow, 1).setFontWeight("bold");
    sheet.getRange(totalRow, 1).setBackground("#e0f7fa");

    // Formules de total
    sheet.getRange(totalRow, 3).setFormula(`=SUM(C2:C${lastRow})`); // Total kWh
    sheet.getRange(totalRow, 3).setFontWeight("bold");
    sheet.getRange(totalRow, 3).setBackground("#e0f7fa");

    sheet.getRange(totalRow, 4).setValue(""); // Station vide

    sheet.getRange(totalRow, 5).setFormula(`=SUM(E2:E${lastRow})`); // Total €
    sheet.getRange(totalRow, 5).setFontWeight("bold");
    sheet.getRange(totalRow, 5).setBackground("#e0f7fa");

    SpreadsheetApp.flush();

    Logger.log("📊 Ligne de total mise à jour");

  } catch (error) {
    Logger.log(`❌ Erreur mise à jour total : ${error.toString()}`);
  }
}

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

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
    .addItem('🧪 Tester sur une facture', 'testUneFacture')
    .addToUi();
}

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
        let consommation = "Non trouvée";
        let station = "Non trouvée";

        const matchDate = texte.match(CONFIG.PATTERNS.dateFacturation);
        if (matchDate) dateFacture = matchDate[1];

        const matchMontant = texte.match(CONFIG.PATTERNS.montantTTC);
        if (matchMontant) {
          const montantStr = matchMontant[1].replace(',', '.');
          montantTTC = parseFloat(montantStr).toFixed(2) + " €";
        }

        const matchConso = texte.match(CONFIG.PATTERNS.consommation);
        if (matchConso) {
          consommation = matchConso[1] + " kWh";
        }

        const matchStation = texte.match(CONFIG.PATTERNS.station);
        if (matchStation) {
          station = matchStation[1].trim();
        }

        const resultatTest = `Fichier : ${attachment.getName()}\n\nDate : ${dateFacture}\nMontant TTC : ${montantTTC}\n\n⚡ Consommation : ${consommation}\n📍 Station : ${station}`;

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
