import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './App.css';

// Useful currency symbols map (add more as needed)
const currency_symbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  RUB: '₽',
  // Add more as needed
};

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [email, setEmail] = useState('');
  const [income, setIncome] = useState('');
  const [continent, setContinent] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [physiologicalExpenses, setPhysiologicalExpenses] = useState('');
  const [safetyExpenses, setSafetyExpenses] = useState('');
  const [socialExpenses, setSocialExpenses] = useState('');
  const [esteemExpenses, setEsteemExpenses] = useState('');
  const [selfActualizationExpenses, setSelfActualizationExpenses] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [continents, setContinents] = useState([]);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  // Fetch continents on component mount
  useEffect(() => {
    const fetchContinents = async () => {
      try {
        const response = await requestWithRetry(
          () => axios.get('https://wealthsync-backend3.onrender.com/api/continents', { timeout: 30000 }),
          5,
          10000
        );
        setContinents(response.data);
      } catch (error) {
        console.error('Error fetching continents:', error);
        alert('Error fetching continents. Please try refreshing the page.');
      }
    };
    fetchContinents();
  }, []);

  // Fetch countries when continent changes
  useEffect(() => {
    if (!continent) {
      setCountries([]);
      setCities([]);
      setCountry('');
      setCity('');
      setCurrency('USD');
      return;
    }
    const fetchCountries = async () => {
      try {
        const response = await requestWithRetry(
          () => axios.get(`https://wealthsync-backend3.onrender.com/api/countries/${continent}`, { timeout: 30000 }),
          5,
          10000
        );
        setCountries(response.data);
        setCities([]);
        setCountry('');
        setCity('');
        setCurrency('USD');
      } catch (error) {
        console.error('Error fetching countries:', error);
        alert('Error fetching countries. Please try again.');
      }
    };
    fetchCountries();
  }, [continent]);

  // Fetch cities when country changes
  useEffect(() => {
    if (!continent || !country) {
      setCities([]);
      setCity('');
      return;
    }
    const fetchCities = async () => {
      try {
        const response = await requestWithRetry(
          () => axios.get(`https://wealthsync-backend3.onrender.com/api/cities/${continent}/${country}`, { timeout: 30000 }),
          5,
          10000
        );
        setCities(response.data);
        setCity('');
      } catch (error) {
        console.error('Error fetching cities:', error);
        alert('Error fetching cities. Please try again.');
      }
    };
    fetchCities();
  }, [continent, country]);

  // Update currency when country changes
  useEffect(() => {
    const selectedCountry = countries.find(c => c.name.toLowerCase() === country.toLowerCase());
    if (selectedCountry) {
      setCurrency(selectedCountry.currency);
    }
  }, [country, countries]);

  // Update currency symbol when currency changes or result is updated
  useEffect(() => {
    if (result && result.currency_symbol) {
      setCurrencySymbol(result.currency_symbol);
    } else if (currency && currency_symbols[currency]) {
      setCurrencySymbol(currency_symbols[currency]);
    } else {
      setCurrencySymbol('$');
    }
  }, [result, currency]);

  const totalExpenses = (
    parseFloat(physiologicalExpenses || 0) +
    parseFloat(safetyExpenses || 0) +
    parseFloat(socialExpenses || 0) +
    parseFloat(esteemExpenses || 0) +
    parseFloat(selfActualizationExpenses || 0)
  ).toFixed(2);

  const requestWithRetry = async (requestFn, retries = 3, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const handleSubmit = async () => {
    if (!continent || !country) {
      alert('Please select a continent and country.');
      return;
    }
    setLoading(true);
    try {
      const response = await requestWithRetry(() =>
        axios.post('https://wealthsync-backend3.onrender.com/api/budget', {
          email,
          income,
          expenses: totalExpenses,
          savings_goal: savingsGoal,
          continent,
          country,
          city,
          currency,
          expense_categories: {
            physiological: parseFloat(physiologicalExpenses || 0),
            safety: parseFloat(safetyExpenses || 0),
            social: parseFloat(socialExpenses || 0),
            esteem: parseFloat(esteemExpenses || 0),
            self_actualization: parseFloat(selfActualizationExpenses || 0),
          }
        }, { timeout: 30000 })
      );
      setResult(response.data);
      fetchHistory();
    } catch (error) {
      alert('Error calculating budget. The backend might be waking up—please try again in a few seconds.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await requestWithRetry(() =>
        axios.post('https://wealthsync-backend3.onrender.com/api/budget/history', {
          email
        }, { timeout: 30000 })
      );
      setHistory(response.data);
    } catch (error) {
      alert('Error fetching budget history. The backend might be waking up—please try again in a few seconds.');
    }
  };

  const chartData = result ? {
    labels: ['Physiological', 'Safety', 'Social', 'Esteem', 'Self-Actualization', 'Savings', 'Recommended Savings'],
    datasets: [
      {
        label: 'Budget Breakdown',
        data: [
          result.expense_categories.physiological || 0,
          result.expense_categories.safety || 0,
          result.expense_categories.social || 0,
          result.expense_categories.esteem || 0,
          result.expense_categories.self_actualization || 0,
          result.savings || 0,
          result.recommended_savings || 0
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(199, 199, 199, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
        ],
        borderWidth: 1,
      },
    ],
  } : null;

  return (
    <div className="App">
      <h2>WealthSync Budget Planner</h2>
      <div className="form-container">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your Email"
        />
        <select
          value={continent}
          onChange={(e) => setContinent(e.target.value)}
        >
          <option value="">Select Your Continent</option>
          {continents.map((cont) => (
            <option key={cont.name.toLowerCase()} value={cont.name.toLowerCase()}>
              {cont.name}
            </option>
          ))}
        </select>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={!continent}
        >
          <option value="">Select Your Country</option>
          {countries.map((country) => (
            <option key={country.name.toLowerCase()} value={country.name.toLowerCase()}>
              {country.name}
            </option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={!country}
        >
          <option value="">Select Your City (Optional)</option>
          {cities.map((city) => (
            <option key={city.name.toLowerCase()} value={city.name.toLowerCase()}>
              {city.name}
            </option>
          ))}
        </select>
        <p className="currency-info">Selected Currency: {currency} ({currencySymbol})</p>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder={`Monthly Income (${currencySymbol})`}
        />
        <h3>Break Down Your Expenses</h3>
        <div className="input-with-tooltip">
          <input
            type="number"
            value={physiologicalExpenses}
            onChange={(e) => setPhysiologicalExpenses(e.target.value)}
            placeholder={`Physiological Expenses (${currencySymbol})`}
          />
          <span className="tooltip">e.g., food, rent, utilities</span>
        </div>
        <div className="input-with-tooltip">
          <input
            type="number"
            value={safetyExpenses}
            onChange={(e) => setSafetyExpenses(e.target.value)}
            placeholder={`Safety Expenses (${currencySymbol})`}
          />
          <span className="tooltip">e.g., insurance, emergency savings</span>
        </div>
        <div className="input-with-tooltip">
          <input
            type="number"
            value={socialExpenses}
            onChange={(e) => setSocialExpenses(e.target.value)}
            placeholder={`Social Expenses (${currencySymbol})`}
          />
          <span className="tooltip">e.g., outings, gifts</span>
        </div>
        <div className="input-with-tooltip">
          <input
            type="number"
            value={esteemExpenses}
            onChange={(e) => setEsteemExpenses(e.target.value)}
            placeholder={`Esteem Expenses (${currencySymbol})`}
          />
          <span className="tooltip">e.g., education, personal achievements</span>
        </div>
        <div className="input-with-tooltip">
          <input
            type="number"
            value={selfActualizationExpenses}
            onChange={(e) => setSelfActualizationExpenses(e.target.value)}
            placeholder={`Self-Actualization Expenses (${currencySymbol})`}
          />
          <span className="tooltip">e.g., hobbies, personal growth</span>
        </div>
        <p>Total Expenses: {currencySymbol}{totalExpenses}</p>
        <input
          type="number"
          value={savingsGoal}
          onChange={(e) => setSavingsGoal(e.target.value)}
          placeholder={`Savings Goal (${currencySymbol})`}
        />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Loading...' : 'Plan My Budget'}
        </button>
      </div>
      {result && (
        <div className="result-container">
          <p>Your Savings: {currencySymbol}{result.savings.toFixed(2)}</p>
          <p>Adjusted Savings (after cost of living): {currencySymbol}{result.adjusted_savings.toFixed(2)}</p>
          <p>Recommended Savings: {currencySymbol}{result.recommended_savings.toFixed(2)}</p>
          <div className="info-with-tooltip">
            <p>Inflation Rate in Your Area: {result.inflation}%</p>
            <span className="tooltip">This is the annual inflation rate for your location, affecting your savings goal.</span>
          </div>
          <div className="info-with-tooltip">
            <p>Cost of Living Index: {result.cost_of_living_index}</p>
            <span className="tooltip">A higher index means a more expensive location (baseline = 50).</span>
          </div>
          <p>{result.message}</p>
          <div className="recommendations">
            <h3>Personalized Tips</h3>
            <ul>
              {result.recommendations.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          {chartData && (
            <div className="chart-container">
              <h3>Budget Breakdown</h3>
              <Pie data={chartData} />
            </div>
          )}
        </div>
      )}
      <div className="history-container">
        <h3>Your Budget History</h3>
        {email ? (
          <button onClick={fetchHistory} disabled={loading}>
            {loading ? 'Loading...' : 'View Budget History'}
          </button>
        ) : (
          <p>Please enter your email to view history.</p>
        )}
        {history.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>Savings</th>
                <th>Recommended Savings</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td>{currency_symbols[entry.currency] || '$'}{entry.income.toFixed(2)}</td>
                  <td>{currency_symbols[entry.currency] || '$'}{entry.expenses.toFixed(2)}</td>
                  <td>{currency_symbols[entry.currency] || '$'}{entry.savings.toFixed(2)}</td>
                  <td>{currency_symbols[entry.currency] || '$'}{entry.recommended_savings.toFixed(2)}</td>
                  <td>{entry.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          email && <p>No budget history found for this email.</p>
        )}
      </div>
    </div>
  );
}

export default App;
