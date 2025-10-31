// ==========================================
// SCRIPT POUR PARTAGER TOUS LES FICHIERS PDF
// ==========================================
// Exécutez cette fonction UNE SEULE FOIS pour partager tous les fichiers existants
//
// INSTRUCTIONS:
// 1. Ouvrez votre Google Sheet
// 2. Extensions → Apps Script
// 3. Copiez cette fonction dans votre script
// 4. Exécutez "partagerTousFichiersFreshmile"
// 5. Autorisez l'accès si demandé
//
// ==========================================

function partagerTousFichiersFreshmile() {
  try {
    Logger.log("🚀 Début du partage des fichiers PDF");

    // ID du dossier depuis votre URL: https://drive.google.com/drive/folders/1YgWbN8xTJPpNNDb9e-g7_RJDI-g1I7TX
    const folderId = "1YgWbN8xTJPpNNDb9e-g7_RJDI-g1I7TX";
    const mainFolder = DriveApp.getFolderById(folderId);

    let compteur = 0;

    // Fonction récursive pour parcourir tous les sous-dossiers
    function partagerFichiersRecursif(folder) {
      Logger.log("📁 Traitement du dossier: " + folder.getName());

      // Partager tous les fichiers PDF du dossier actuel
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();

        if (file.getName().toLowerCase().endsWith('.pdf')) {
          try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            compteur++;
            Logger.log("✅ " + compteur + ". Partagé: " + file.getName());
          } catch (e) {
            Logger.log("⚠️ Erreur pour " + file.getName() + ": " + e.toString());
          }
        }
      }

      // Parcourir les sous-dossiers (202501, 202502, etc.)
      const subFolders = folder.getFolders();
      while (subFolders.hasNext()) {
        const subFolder = subFolders.next();
        partagerFichiersRecursif(subFolder);
      }
    }

    // Démarrer le traitement
    partagerFichiersRecursif(mainFolder);

    Logger.log("✅ Terminé! " + compteur + " fichier(s) PDF partagé(s) publiquement");
    SpreadsheetApp.getUi().alert(
      "Partage terminé",
      compteur + " fichier(s) PDF ont été partagés publiquement.\n\nTous les liens 'Voir PDF' de votre application fonctionnent maintenant!",
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    Logger.log("❌ Erreur: " + error.toString());
    SpreadsheetApp.getUi().alert(
      "Erreur",
      "Une erreur s'est produite: " + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

// ==========================================
// MODIFIER LE SCRIPT PRINCIPAL
// ==========================================
//
// Pour que les NOUVEAUX fichiers soient automatiquement partagés,
// modifiez la fonction savePdfToDrive dans votre script principal:
//
// AVANT (ligne 176-177):
//   const file = dossierMensuel.createFile(blob);
//   donnees.lienDrive = file.getUrl();
//
// APRÈS:
//   const file = dossierMensuel.createFile(blob);
//   file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
//   donnees.lienDrive = file.getUrl();
//
// ==========================================
