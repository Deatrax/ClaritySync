"use client";

import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Building2,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

interface BankAccount {
  account_id: number;
  account_name: string;
  bank_name: string;
  current_balance: number;
}

interface Transaction {
  transaction_id: number;
  transaction_type: string;
  amount: number;
  category_name: string;
  account_name: string;
  transaction_date: string;
  description: string;
}

export default function BankingPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        fetch('http://localhost:5000/api/accounts'),
        fetch('http://localhost:5000/api/transactions')
      ]);

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data);
        const total = data.reduce((sum: number, acc: BankAccount) => sum + acc.current_balance, 0);
        setTotalBalance(total);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setRecentTransactions(data.slice(0, 10));
        
        let income = 0, expense = 0;
        data.forEach((t: Transaction) => {
          if (['INCOME', 'RECEIVE', 'SALE', 'INVESTMENT', 'DEPOSIT'].includes(t.transaction_type)) {
            income += t.amount;
          } else {
            expense += t.amount;
          }
        });
        setTotalIncome(income);
        setTotalExpense(expense);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const isMoneyIn = (type: string) => ['INCOME', 'RECEIVE', 'SALE', 'INVESTMENT', 'DEPOSIT'].includes(type);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <span>Banking</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-blue-600" />
                Banking & Financials
              </h1>
            </div>
            <Link
              href="/banking/transaction/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 w-fit"
            >
              <Plus className="w-4 h-4" />
              New Transaction
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Balance */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Balance</p>
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              TK {totalBalance.toFixed(2)}
            </p>
          </div>

          {/* Total Income */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Inflow</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              TK {totalIncome.toFixed(2)}
            </p>
          </div>

          {/* Total Expense */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Outflow</p>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              TK {totalExpense.toFixed(2)}
            </p>
          </div>

          {/* Net Profit */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Net Cash Flow</p>
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
            <p className={`text-2xl font-bold ${
              totalIncome - totalExpense >= 0 ? 'text-purple-600' : 'text-red-600'
            }`}>
              TK {(totalIncome - totalExpense).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Accounts and Navigation */}
          <div className="lg:col-span-1">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/banking/accounts"
                  className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">Manage Accounts</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </Link>
                <Link
                  href="/banking/categories"
                  className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium">Manage Categories</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-600" />
                </Link>
                <Link
                  href="/banking/transaction/new"
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">Record Transaction</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-green-600" />
                </Link>
              </div>
            </div>

            {/* Bank Accounts List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Bank Accounts</h2>
              {accounts.length > 0 ? (
                <div className="space-y-3">
                  {accounts.map(account => (
                    <div key={account.account_id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">{account.account_name}</p>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{account.bank_name}</p>
                      <p className="text-lg font-bold text-blue-600">
                        TK {account.current_balance.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No accounts yet</p>
              )}
            </div>
          </div>

          {/* Right Column - Recent Transactions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Transactions</h2>
              {recentTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Date</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Account</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Category</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Type</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-900">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map(transaction => (
                        <tr key={transaction.transaction_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3 text-gray-600">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-gray-900">{transaction.account_name}</td>
                          <td className="py-3 px-3 text-gray-900">{transaction.category_name}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              isMoneyIn(transaction.transaction_type)
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.transaction_type}
                            </span>
                          </td>
                          <td className={`py-3 px-3 text-right font-semibold ${
                            isMoneyIn(transaction.transaction_type)
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {isMoneyIn(transaction.transaction_type) ? '+' : '-'}
                            TK {transaction.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No transactions yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
