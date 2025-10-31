import React, { useState } from 'react';
import './FacturesTable.css';

const FacturesTable = ({ factures, loading, error }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');

  // Fonction de tri
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Fonction de filtrage et tri des factures
  const getFilteredAndSortedFactures = () => {
    let filtered = [...factures];

    // Filtrage
    if (filterText) {
      filtered = filtered.filter(facture =>
        facture.nomFichier.toLowerCase().includes(filterText.toLowerCase()) ||
        facture.dateFacture.toLowerCase().includes(filterText.toLowerCase()) ||
        (facture.station && facture.station.toLowerCase().includes(filterText.toLowerCase()))
      );
    }

    // Tri
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Gestion spéciale pour les montants et consommation
        if (sortConfig.key === 'montantTTC' || sortConfig.key === 'consommation') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  };

  const facturesAffichees = getFilteredAndSortedFactures();

  // Calcul des totaux
  const totalMontant = facturesAffichees.reduce((sum, facture) => {
    return sum + (parseFloat(facture.montantTTC) || 0);
  }, 0);

  const totalKwh = facturesAffichees.reduce((sum, facture) => {
    return sum + (parseFloat(facture.consommation) || 0);
  }, 0);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des factures...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h3>Erreur de chargement</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="factures-container">
      <div className="factures-header">
        <h1>Factures Freshmile</h1>
        <div className="factures-stats">
          <div className="stat-box">
            <span className="stat-label">Total factures</span>
            <span className="stat-value">{facturesAffichees.length}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Total kWh</span>
            <span className="stat-value">{totalKwh.toFixed(2)} kWh</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Montant total</span>
            <span className="stat-value">{totalMontant.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Rechercher par nom, date ou station..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="search-input"
        />
        {filterText && (
          <button onClick={() => setFilterText('')} className="clear-button">
            ✕
          </button>
        )}
      </div>

      <div className="table-container">
        <table className="factures-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('nomFichier')} className="sortable">
                Nom Fichier
                {sortConfig.key === 'nomFichier' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('dateFacture')} className="sortable">
                Date
                {sortConfig.key === 'dateFacture' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('consommation')} className="sortable">
                kWh
                {sortConfig.key === 'consommation' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('station')} className="sortable">
                Station
                {sortConfig.key === 'station' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('montantTTC')} className="sortable">
                Montant (€)
                {sortConfig.key === 'montantTTC' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                  </span>
                )}
              </th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {facturesAffichees.map((facture, index) => (
              <tr key={index}>
                <td data-label="Nom Fichier">{facture.nomFichier}</td>
                <td data-label="Date">{facture.dateFacture}</td>
                <td data-label="kWh" className="consommation">{parseFloat(facture.consommation).toFixed(2)}</td>
                <td data-label="Station" className="station">{facture.station}</td>
                <td data-label="Montant" className="montant">{parseFloat(facture.montantTTC).toFixed(2)} €</td>
                <td data-label="PDF">
                  {facture.lienDrive && (
                    <a
                      href={facture.lienDrive}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="view-button"
                    >
                      📄 Voir
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan="2"><strong>TOTAL</strong></td>
              <td className="consommation"><strong>{totalKwh.toFixed(2)}</strong></td>
              <td></td>
              <td className="montant"><strong>{totalMontant.toFixed(2)} €</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {facturesAffichees.length === 0 && !loading && (
        <div className="no-data">
          <p>Aucune facture trouvée</p>
        </div>
      )}
    </div>
  );
};

export default FacturesTable;
