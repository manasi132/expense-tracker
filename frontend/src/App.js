import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import axios from 'axios';
// This CSS is already loaded in your public/index.html, so we don't need to import it here.
// import 'bootstrap/dist/css/bootstrap.min.css';
// import './App.css'; // This line imports the App.css file from the same folder - Commented out to resolve build error

// Define the API base URL
const API_URL = 'http://localhost:3001/api/transactions';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    description: '',
    transactionType: 'expense',
    date: new Date().toISOString().split('T')[0], // Default to today
  });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  // --- Data Fetching ---
  const fetchTransactions = async () => {
    try {
      setError(null);
      const response = await axios.get(API_URL);
      setTransactions(response.data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      // FIX: Add more specific error message for Network Error
      if (err.message === 'Network Error') {
        setError("Failed to load transactions. Cannot connect to the backend. Please make sure your backend server is running on http://localhost:3001.");
      } else {
        setError("Failed to load transactions. Is the backend server running?");
      }
    }
  };

  // Fetch transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  // --- Form Handling ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.title || !formData.amount || !formData.category || !formData.date || !formData.description) {
      setError("Please fill out all fields.");
      return;
    }

    try {
      const newTransaction = {
        ...formData,
        amount: parseFloat(formData.amount),
        // user: null // We'll add user logic later
      };

      const response = await axios.post(API_URL, newTransaction);
      setTransactions([response.data, ...transactions]); // Add new transaction to the top
      setFormData({ // Reset form
        title: '',
        amount: '',
        category: '',
        description: '',
        transactionType: 'expense',
        date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false); // Hide form
    } catch (err) {
      console.error("Error adding transaction:", err);
      // FIX: Add more specific error message for Network Error
      if (err.message === 'Network Error') {
        setError("Failed to add transaction. Cannot connect to the backend. Please make sure your backend server is running.");
      } else {
        setError(err.response?.data?.message || "Failed to add transaction.");
      }
    }
  };

  // --- Deletion ---
  const deleteTransaction = async (id) => {
    try {
      setError(null);
      await axios.delete(`${API_URL}/${id}`);
      setTransactions(transactions.filter((t) => t._id !== id));
    } catch (err) {
      console.error("Error deleting transaction:", err);
      // FIX: Add more specific error message for Network Error
      if (err.message === 'Network Error') {
        setError("Failed to delete transaction. Cannot connect to the backend. Please make sure your backend server is running.");
      } else {
        setError("Failed to delete transaction.");
      }
    }
  };

  // --- Calculations ---
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      if (t.transactionType === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });
    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
    };
  }, [transactions]);

  // --- Currency Formatter ---
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    // We add the 'App-container' class here for our custom CSS
    <div className="container App-container">
      <header className="my-4">
        <h1 className="text-primary text-center">Expense Tracker</h1>
      </header>

      {/* --- Summary Cards --- */}
      <div className="row text-center g-3 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-success">Total Income</h5>
              <h3>{formatCurrency(totalIncome)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-danger">Total Expense</h5>
              <h3>{formatCurrency(totalExpense)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-primary">Balance</h5>
              <h3 className={balance < 0 ? 'text-danger' : 'text-success'}>
                {formatCurrency(balance)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* --- Error Display --- */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* --- Add Transaction Button/Form --- */}
      <div className="text-center mb-4">
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add New Transaction'}
        </button>
      </div>

      {showForm && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h3 className="card-title text-center mb-3">New Transaction</h3>
            <form onSubmit={handleAddTransaction}>
              <div className="row g-3">
                {/* Title */}
                <div className="col-md-6">
                  <label htmlFor="title" className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-control"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Amount */}
                <div className="col-md-6">
                  <label htmlFor="amount" className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Type */}
                <div className="col-md-6">
                  <label htmlFor="transactionType" className="form-label">Type</label>
                  <select
                    className="form-select"
                    id="transactionType"
                    name="transactionType"
                    value={formData.transactionType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                {/* Category */}
                <div className="col-md-6">
                  <label htmlFor="category" className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-control"
                    id="category"
                    name="category"
                    placeholder="e.g., Food, Salary"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                {/* Date */}
                <div className="col-md-6">
                  <label htmlFor="date" className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Description */}
                <div className="col-md-6">
                  <label htmlFor="description" className="form-label">Description</label>
                   <input
                    type="text"
                    className="form-control"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="text-center mt-3">
                <button type="submit" className="btn btn-success">
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Transaction List --- */}
      <h2 className="text-center mb-3">Transaction History</h2>
      <div className="list-group">
        {transactions.length === 0 ? (
          <p className="text-center text-muted">No transactions yet.</p>
        ) : (
          transactions.map((t) => (
            <div
              key={t._id}
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center shadow-sm mb-2"
            >
              <div>
                <h5 className="mb-1">{t.title}</h5>
                <small className="text-muted">
                  {new Date(t.date).toLocaleDateString('en-IN')} | {t.category}
                </small>
                <p className="mb-1">{t.description}</p>
              </div>
              <div className="text-end">
                <span className={`fw-bold fs-5 ${
                  t.transactionType === 'income' ? 'text-success' : 'text-danger'
                }`}>
                  {t.transactionType === 'income' ? '+' : '-'}
                  {formatCurrency(t.amount)}
                </span>
                <button
                  className="btn btn-sm btn-outline-danger ms-2"
                  onClick={() => deleteTransaction(t._id)}
                >
                  X
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;

