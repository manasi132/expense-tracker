// src/App.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import App from './App';

jest.mock('axios');

afterEach(() => {
  jest.clearAllMocks();
});

function mockGet(data) {
  axios.get.mockResolvedValueOnce({ data });
}

test('renders the Expense Tracker heading and empty state', async () => {
  // App fetches on mount; return empty list
  mockGet([]);
  render(<App />);

  // Heading exists
  expect(screen.getByRole('heading', { name: /expense tracker/i })).toBeInTheDocument();

  // Empty state appears after the fetch resolves
  expect(await screen.findByText(/no transactions yet\./i)).toBeInTheDocument();

  // Summary cards are present
  expect(screen.getByRole('heading', { name: /total income/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /total expense/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /balance/i })).toBeInTheDocument();
});

test('shows a helpful error when the backend is unreachable', async () => {
  axios.get.mockRejectedValueOnce(new Error('Network Error'));
  render(<App />);

  // Alert appears with your custom message
  expect(
    await screen.findByText(/failed to load transactions\. cannot connect to the backend/i)
  ).toBeInTheDocument();
});

test('can add a new transaction through the form', async () => {
  // Initial fetch returns empty
  mockGet([]);
  render(<App />);

  // Open the form
  await userEvent.click(screen.getByRole('button', { name: /add new transaction/i }));

  // Fill the form
  await userEvent.type(screen.getByLabelText(/title/i), 'Groceries');
  await userEvent.type(screen.getByLabelText(/amount/i), '1200');
  await userEvent.selectOptions(screen.getByLabelText(/type/i), 'expense');
  await userEvent.type(screen.getByLabelText(/^category$/i), 'Food');
  await userEvent.type(screen.getByLabelText(/description/i), 'Weekly grocery shopping');

  // Set a stable date to avoid timezone surprises in CI
  const dateInput = screen.getByLabelText(/date/i);
  await userEvent.clear(dateInput);
  await userEvent.type(dateInput, '2025-01-15');

  // Mock POST response shape from your backend
  axios.post.mockResolvedValueOnce({
    data: {
      _id: 'tx1',
      title: 'Groceries',
      amount: 1200,
      transactionType: 'expense',
      category: 'Food',
      description: 'Weekly grocery shopping',
      date: '2025-01-15T00:00:00.000Z',
    },
  });

  // Submit
  await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));

  // New transaction appears in the list
  expect(await screen.findByText(/groceries/i)).toBeInTheDocument();
  expect(screen.getByText(/weekly grocery shopping/i)).toBeInTheDocument();

  // The form should be hidden after submit (button toggles back)
  expect(screen.getByRole('button', { name: /add new transaction/i })).toBeInTheDocument();
});

test('can delete an existing transaction', async () => {
  // App fetch returns a pre-existing item
  mockGet([
    {
      _id: 'tx2',
      title: 'Salary',
      amount: 50000,
      transactionType: 'income',
      category: 'Pay',
      description: 'Monthly salary',
      date: '2025-01-01T00:00:00.000Z',
    },
  ]);

  axios.delete.mockResolvedValueOnce({ status: 200 });

  render(<App />);

  // Transaction is shown
  expect(await screen.findByText(/salary/i)).toBeInTheDocument();

  // Click delete button labeled "X" next to it
  const deleteBtn = screen.getByRole('button', { name: /^x$/i });
  await userEvent.click(deleteBtn);

  // It should disappear from the list
  await waitFor(() => {
    expect(screen.queryByText(/salary/i)).not.toBeInTheDocument();
  });
});
