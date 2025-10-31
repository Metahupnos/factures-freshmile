import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './ConsommationChart.css';

const ConsommationChart = ({ factures }) => {
  const [viewMode, setViewMode] = useState('monthly'); // 'daily' ou 'monthly'

  // Fonction pour parser la date (format: DD/MM/YYYY)
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
  };

  // Agrégation des données
  const chartData = useMemo(() => {
    if (!factures || factures.length === 0) return [];

    const aggregated = {};

    factures.forEach((facture) => {
      const date = parseDate(facture.dateFacture);
      if (!date) return;

      let key;
      if (viewMode === 'monthly') {
        // Format: "Jan 2025"
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      } else {
        // Format: "DD/MM/YYYY"
        key = facture.dateFacture;
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          period: key,
          consommation: 0,
          montant: 0,
          count: 0,
          sortKey: date.getTime()
        };
      }

      aggregated[key].consommation += parseFloat(facture.consommation) || 0;
      aggregated[key].montant += parseFloat(facture.montantTTC) || 0;
      aggregated[key].count += 1;
    });

    // Convertir en tableau et trier
    return Object.values(aggregated)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(item => ({
        period: item.period,
        'Consommation (kWh)': parseFloat(item.consommation.toFixed(2)),
        'Montant (€)': parseFloat(item.montant.toFixed(2)),
        count: item.count
      }));
  }, [factures, viewMode]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-period">{payload[0].payload.period}</p>
          <p className="tooltip-count">Nombre de recharges: {payload[0].payload.count}</p>
          <p className="tooltip-kwh">
            Consommation: <strong>{payload[0].value} kWh</strong>
          </p>
          <p className="tooltip-amount">
            Montant: <strong>{payload[1].value} €</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!factures || factures.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h2>Graphique de consommation</h2>
        </div>
        <div className="no-data-chart">
          <p>Aucune donnée disponible pour afficher le graphique</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h2>Graphique de consommation</h2>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => setViewMode('daily')}
          >
            Par jour
          </button>
          <button
            className={`toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            Par mois
          </button>
        </div>
      </div>

      <div className="chart-content">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="period"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: '#666', fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#666', fontSize: 12 }}
              label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: '#00838f' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#666', fontSize: 12 }}
              label={{ value: '€', angle: 90, position: 'insideRight', fill: '#00838f' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="square"
            />
            <Bar
              yAxisId="left"
              dataKey="Consommation (kWh)"
              fill="#00b8d4"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="Montant (€)"
              fill="#00838f"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">Période affichée</span>
          <span className="summary-value">{viewMode === 'monthly' ? 'Par mois' : 'Par jour'}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Points de données</span>
          <span className="summary-value">{chartData.length}</span>
        </div>
      </div>
    </div>
  );
};

export default ConsommationChart;
