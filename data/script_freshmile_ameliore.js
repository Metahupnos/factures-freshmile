// ==========================================
// SCRIPT GOOGLE APPS SCRIPT - FACTURES FRESHMILE (VERSION AMÉLIORÉE)
// ==========================================
//
// AMÉLIORATIONS :
// - Extraction de plus de données (HT, TVA, kWh, station, pays, durée)
// - Tableau enrichi avec toutes les informations
// - Patterns d'extraction améliorés
//
// ==========================================

// Start - Configuration globale
const CONFIG = {
  DRIVE_FOLDER_NAME: "Factures_Freshmile",
  SEARCH_QUERY: "from:support@freshmile.com subject:Facture payée has:attachment",

  // Patterns d'extraction améliorés
  PATTERNS: {
    numeroFacture: /BEFA\d{13}/,
    dateFacturation: /BEFA\d{13}\s+(\d{2}\/\d{2}\/\d{4})/,

    // Montants
    montantTTC: /Total[\s\u00A0]+TTC[\s\u00A0:]*[\s\u00A0]*[€]?[\s\u00A0]*([\d]+[,.][\d]{2})[\s\u00A0]*€?/i,
    montantHT: /Total[\s\u00A0]+HT[\s\u00A0:]*[\s\u00A0]*[€]?[\s\u00A0]*([\d]+[,.][\d]{2})[\s\u00A0]*€?/i,
    montantTVA: /Total[\s\u00A0]+TVA[\s\u00A0:]*[\s\u00A0]*[€]?[\s\u00A0]*([\d]+[,.][\d]{2})[\s\u00A0]*€?/i,

    // Données de recharge
    consommation: /Consommation[\s\u00A0:]+([0-9]+[.,][0-9]+)[\s\u00A0]*kWh/i,
    station: /Station[\s\u00A0]*:[\s\u00A0]*(.+?)(?:\n|- Point)/i,
    pays: /Pays[\s\u00A0]*:[\s\u00A0]*(.+?)(?:\n|-)/i,

    // Durée (début et fin)
    debut: /Début[\s\u00A0]*:[\s\u00A0]*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i,
    fin: /Fin[\s\u00A0]*:[\s\u00A0]*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i
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
// TRAITEMENT AMÉLIORÉ D'UNE FACTURE
// ==========================================

function processFacture(attachment, folder, message) {
  try {
    const fileName = attachment.getName();
    const blob = attachment.copyBlob();

    // OCR du PDF
    const texteOCR = performOCR(blob, fileName);

    // Extraire toutes les données
    const donnees = {
      nomFichier: fileName,
      dateFacturation: "",
      montantHT: 0,
      montantTVA: 0,
      montantTTC: 0,
      consommation: 0,
      station: "",
      pays: "",
      debut: "",
      fin: "",
      duree: ""
    };

    // Extraire la date
    const matchDate = texteOCR.match(CONFIG.PATTERNS.dateFacturation);
    if (matchDate) {
      donnees.dateFacturation = matchDate[1];
    }

    // Extraire les montants
    const matchHT = texteOCR.match(CONFIG.PATTERNS.montantHT);
    if (matchHT) {
      donnees.montantHT = parseFloat(matchHT[1].replace(',', '.')) || 0;
      Logger.log(`💶 Montant HT trouvé : ${donnees.montantHT} €`);
    }

    const matchTVA = texteOCR.match(CONFIG.PATTERNS.montantTVA);
    if (matchTVA) {
      donnees.montantTVA = parseFloat(matchTVA[1].replace(',', '.')) || 0;
      Logger.log(`💶 TVA trouvée : ${donnees.montantTVA} €`);
    }

    const matchTTC = texteOCR.match(CONFIG.PATTERNS.montantTTC);
    if (matchTTC) {
      donnees.montantTTC = parseFloat(matchTTC[1].replace(',', '.')) || 0;
      Logger.log(`💰 Montant TTC trouvé : ${donnees.montantTTC} €`);
    }

    // Extraire la consommation
    const matchConso = texteOCR.match(CONFIG.PATTERNS.consommation);
    if (matchConso) {
      donnees.consommation = parseFloat(matchConso[1].replace(',', '.')) || 0;
      Logger.log(`⚡ Consommation : ${donnees.consommation} kWh`);
    }

    // Extraire la station
    const matchStation = texteOCR.match(CONFIG.PATTERNS.station);
    if (matchStation) {
      donnees.station = matchStation[1].trim();
      Logger.log(`📍 Station : ${donnees.station}`);
    }

    // Extraire le pays
    const matchPays = texteOCR.match(CONFIG.PATTERNS.pays);
    if (matchPays) {
      donnees.pays = matchPays[1].trim();
      Logger.log(`🌍 Pays : ${donnees.pays}`);
    }

    // Extraire début et fin
    const matchDebut = texteOCR.match(CONFIG.PATTERNS.debut);
    if (matchDebut) {
      donnees.debut = matchDebut[1];
    }

    const matchFin = texteOCR.match(CONFIG.PATTERNS.fin);
    if (matchFin) {
      donnees.fin = matchFin[1];
    }

    // Calculer la durée si on a début et fin
    if (donnees.debut && donnees.fin) {
      try {
        const dateDebut = parseDate(donnees.debut);
        const dateFin = parseDate(donnees.fin);
        const dureeMinutes = Math.round((dateFin - dateDebut) / (1000 * 60));
        const heures = Math.floor(dureeMinutes / 60);
        const minutes = dureeMinutes % 60;
        donnees.duree = `${heures}h${minutes.toString().padStart(2, '0')}`;
        Logger.log(`⏱️ Durée : ${donnees.duree}`);
      } catch (e) {
        Logger.log(`⚠️ Erreur calcul durée : ${e.toString()}`);
      }
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

    // Sauvegarder le fichier
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

// Fonction helper pour parser les dates
function parseDate(dateStr) {
  // Format: "31/10/2025 08:08:28"
  const parts = dateStr.split(' ');
  const dateParts = parts[0].split('/');
  const timeParts = parts[1].split(':');

  return new Date(
    parseInt(dateParts[2]), // année
    parseInt(dateParts[1]) - 1, // mois (0-11)
    parseInt(dateParts[0]), // jour
    parseInt(timeParts[0]), // heure
    parseInt(timeParts[1]), // minute
    parseInt(timeParts[2])  // seconde
  );
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
// GESTION DU TABLEAU AMÉLIORÉ
// ==========================================

function initialiserTableau() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName("Factures_Freshmile");

    if (!sheet) {
      sheet = spreadsheet.insertSheet("Factures_Freshmile");

      // En-têtes enrichis
      sheet.getRange(1, 1, 1, 11).setValues([[
        "Nom Fichier", "Date", "Montant HT (€)", "TVA (€)", "Montant TTC (€)",
        "kWh", "Station", "Pays", "Durée", "Début", "Lien Drive"
      ]]);

      sheet.getRange(1, 1, 1, 11).setFontWeight("bold");
      sheet.getRange(1, 1, 1, 11).setBackground("#00b8d4");
      sheet.getRange(1, 1, 1, 11).setFontColor("white");

      // Formater les colonnes
      sheet.getRange("C:E").setNumberFormat("#,##0.00 €"); // Montants
      sheet.getRange("F:F").setNumberFormat("#,##0.00"); // kWh

      // Ajuster les largeurs de colonnes
      sheet.setColumnWidth(1, 200); // Nom fichier
      sheet.setColumnWidth(2, 100); // Date
      sheet.setColumnWidth(3, 100); // HT
      sheet.setColumnWidth(4, 80);  // TVA
      sheet.setColumnWidth(5, 100); // TTC
      sheet.setColumnWidth(6, 80);  // kWh
      sheet.setColumnWidth(7, 250); // Station
      sheet.setColumnWidth(8, 100); // Pays
      sheet.setColumnWidth(9, 80);  // Durée
      sheet.setColumnWidth(10, 150); // Début
      sheet.setColumnWidth(11, 100); // Lien

      Logger.log("📊 Nouveau tableau créé avec colonnes enrichies");
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

    // Ajouter la nouvelle ligne avec toutes les données
    const nouvelleLigne = [
      resultat.nomFichier,
      resultat.dateFacturation,
      resultat.montantHT,
      resultat.montantTVA,
      resultat.montantTTC,
      resultat.consommation,
      resultat.station,
      resultat.pays,
      resultat.duree,
      resultat.debut,
      resultat.lienDrive
    ];

    sheet.getRange(lastRow + 1, 1, 1, 11).setValues([nouvelleLigne]);

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
        sheet.getRange(lastRow, 3).setFormula(`=SUM(C2:C${lastRow - 1})`); // HT
        sheet.getRange(lastRow, 4).setFormula(`=SUM(D2:D${lastRow - 1})`); // TVA
        sheet.getRange(lastRow, 5).setFormula(`=SUM(E2:E${lastRow - 1})`); // TTC
        sheet.getRange(lastRow, 6).setFormula(`=SUM(F2:F${lastRow - 1})`); // kWh
        return;
      }
    }

    // Ajouter une nouvelle ligne de total
    const totalRow = lastRow + 1;
    sheet.getRange(totalRow, 1).setValue("TOTAL");
    sheet.getRange(totalRow, 1, 1, 2).merge();
    sheet.getRange(totalRow, 1).setFontWeight("bold");
    sheet.getRange(totalRow, 1).setBackground("#e0f7fa");

    // Formules de total
    sheet.getRange(totalRow, 3).setFormula(`=SUM(C2:C${lastRow})`); // HT
    sheet.getRange(totalRow, 4).setFormula(`=SUM(D2:D${lastRow})`); // TVA
    sheet.getRange(totalRow, 5).setFormula(`=SUM(E2:E${lastRow})`); // TTC
    sheet.getRange(totalRow, 6).setFormula(`=SUM(F2:F${lastRow})`); // kWh

    sheet.getRange(totalRow, 3, 1, 4).setFontWeight("bold");
    sheet.getRange(totalRow, 3, 1, 4).setBackground("#e0f7fa");

    SpreadsheetApp.flush();

    Logger.log("📊 Ligne de total mise à jour");

  } catch (error) {
    Logger.log(`❌ Erreur mise à jour total : ${error.toString()}`);
  }
}

// ==========================================
// FONCTIONS UTILITAIRES (identiques)
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

        // Extraire toutes les données
        let resultat = "📊 Résultat du test :\n\n";
        resultat += `Fichier : ${attachment.getName()}\n\n`;

        const matchDate = texte.match(CONFIG.PATTERNS.dateFacturation);
        resultat += `Date : ${matchDate ? matchDate[1] : "Non trouvée"}\n`;

        const matchTTC = texte.match(CONFIG.PATTERNS.montantTTC);
        resultat += `Montant TTC : ${matchTTC ? matchTTC[1] + " €" : "Non trouvé"}\n`;

        const matchHT = texte.match(CONFIG.PATTERNS.montantHT);
        resultat += `Montant HT : ${matchHT ? matchHT[1] + " €" : "Non trouvé"}\n`;

        const matchConso = texte.match(CONFIG.PATTERNS.consommation);
        resultat += `Consommation : ${matchConso ? matchConso[1] + " kWh" : "Non trouvée"}\n`;

        const matchStation = texte.match(CONFIG.PATTERNS.station);
        resultat += `Station : ${matchStation ? matchStation[1].trim() : "Non trouvée"}\n`;

        const matchPays = texte.match(CONFIG.PATTERNS.pays);
        resultat += `Pays : ${matchPays ? matchPays[1].trim() : "Non trouvé"}\n`;

        Logger.log(resultat);
        afficherMessage("Test OCR - Résultat", resultat);

        break;
      }
    }
  } catch (error) {
    Logger.log(`❌ Erreur lors du test : ${error.toString()}`);
    afficherMessage("Erreur de test", error.toString());
  }
}
