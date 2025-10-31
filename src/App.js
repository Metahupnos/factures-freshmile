import React, { useState, useEffect } from 'react';
import './App.css';
import FacturesTable from './components/FacturesTable';
import ConsommationChart from './components/ConsommationChart';
import googleSheetsServicePublic from './services/googleSheetsServicePublic';
import { GOOGLE_CONFIG } from './config/config';

function App() {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    initializeGoogleAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeGoogleAPI = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialiser le service avec la configuration
      googleSheetsServicePublic.init(GOOGLE_CONFIG);

      // Charger directement les factures (pas besoin de connexion)
      await loadFactures();
    } catch (err) {
      console.error('Erreur initialisation:', err);
      setError(
        'Erreur de configuration. Vérifiez que vous avez bien configuré le fichier src/config/config.js avec votre API Key.'
      );
      setLoading(false);
    }
  };

  const loadFactures = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await googleSheetsServicePublic.getFactures();
      setFactures(data);
      setIsSignedIn(true); // Simuler la connexion pour l'UI
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement factures:', err);
      setError(
        'Impossible de charger les factures. Vérifiez que le Google Sheet est partagé publiquement et que votre API Key est correcte.'
      );
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    // Plus besoin de connexion avec l'accès public
    await loadFactures();
  };

  const handleSignOut = async () => {
    // Pas de vraie déconnexion nécessaire
    setIsSignedIn(false);
    setFactures([]);
  };

  const handleRefresh = () => {
    loadFactures();
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>Gestion des Factures Freshmile</h1>
          <div className="header-actions">
            {isSignedIn ? (
              <>
                <button onClick={handleRefresh} className="btn btn-primary">
                  🔄 Actualiser
                </button>
                <button onClick={handleSignOut} className="btn btn-secondary">
                  Se déconnecter
                </button>
              </>
            ) : (
              <button onClick={handleSignIn} className="btn btn-primary">
                Se connecter avec Google
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {!isSignedIn && !loading ? (
          <div className="welcome-message">
            <h2>Bienvenue</h2>
            <p>Connectez-vous avec votre compte Google pour consulter vos factures Freshmile.</p>
            <button onClick={handleSignIn} className="btn btn-primary btn-large">
              Se connecter avec Google
            </button>
          </div>
        ) : (
          <>
            <ConsommationChart factures={factures} />
            <FacturesTable factures={factures} loading={loading} error={error} />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Application de gestion des factures Freshmile - Données synchronisées avec Google Sheets</p>
      </footer>
    </div>
  );
}

export default App;
