// ==========================================
// AJOUT D'UNE FONCTION D'ARRÊT DU SCRIPT
// ==========================================
//
// À ajouter à votre script existant
// ==========================================

// Variable globale pour gérer l'arrêt
var STOP_EXECUTION = false;

// Fonction pour arrêter le script
function arreterScript() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Arrêter le traitement',
    'Voulez-vous vraiment arrêter le traitement en cours ?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    STOP_EXECUTION = true;

    // Créer une note visible dans le sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Factures_Freshmile");

    if (sheet) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 2, 1).setValue("⚠️ TRAITEMENT INTERROMPU PAR L'UTILISATEUR");
      sheet.getRange(lastRow + 2, 1).setFontColor("red").setFontWeight("bold");
    }

    ui.alert('Arrêt demandé', 'Le script s\'arrêtera après le traitement de la facture en cours.', ui.ButtonSet.OK);
    Logger.log("🛑 Arrêt du script demandé par l'utilisateur");
  }
}

// Fonction pour réinitialiser le flag d'arrêt
function reinitialiserArret() {
  STOP_EXECUTION = false;
  Logger.log("🔄 Flag d'arrêt réinitialisé");
}

// MODIFIEZ LE MENU onOpen POUR AJOUTER L'OPTION D'ARRÊT :
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📧 Factures Freshmile')
    .addItem('🚀 Traiter les nouvelles factures', 'traiterFacturesFreshmile')
    .addItem('🔄 Retraiter TOUTES les factures', 'retraiterToutesFactures')
    .addSeparator()
    .addItem('🛑 ARRÊTER le traitement en cours', 'arreterScript')  // NOUVEAU
    .addSeparator()
    .addItem('📊 Créer tableau depuis Drive', 'creerTableauDepuisDrive')
    .addItem('🧪 Tester sur une facture', 'testUneFacture')
    .addToUi();
}

// MODIFIEZ LA FONCTION traiterFacturesFreshmile POUR AJOUTER LA VÉRIFICATION D'ARRÊT :
function traiterFacturesFreshmile() {
  try {
    // Réinitialiser le flag au début
    STOP_EXECUTION = false;

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

    // Boucle principale avec vérification d'arrêt
    threadLoop:
    for (const thread of threads) {
      // VÉRIFIER SI L'ARRÊT A ÉTÉ DEMANDÉ
      if (STOP_EXECUTION) {
        Logger.log("🛑 Arrêt du script demandé - interruption");
        afficherMessage("Script arrêté", `Traitement interrompu.\n${nbNouvellesFactures} facture(s) traitée(s) avant l'arrêt.`);
        break threadLoop;
      }

      const messages = thread.getMessages();

      for (const message of messages) {
        // VÉRIFIER À NOUVEAU AVANT CHAQUE MESSAGE
        if (STOP_EXECUTION) {
          Logger.log("🛑 Arrêt du script demandé - interruption");
          break threadLoop;
        }

        const attachments = message.getAttachments();

        for (const attachment of attachments) {
          // VÉRIFIER AVANT CHAQUE PIÈCE JOINTE
          if (STOP_EXECUTION) {
            Logger.log("🛑 Arrêt du script demandé - interruption");
            break threadLoop;
          }

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

    // Si le script n'a pas été arrêté, mettre à jour le total
    if (!STOP_EXECUTION) {
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
    } else {
      // Script arrêté - mettre à jour le total quand même
      mettreAJourTotal();
    }

    Logger.log(`✅ Traitement terminé : ${nbNouvellesFactures} nouvelle(s) facture(s)`);

  } catch (error) {
    Logger.log(`❌ Erreur : ${error.toString()}`);
    afficherMessage("Erreur", `Une erreur s'est produite : ${error.toString()}`);
  } finally {
    // Réinitialiser le flag à la fin
    STOP_EXECUTION = false;
  }
}
