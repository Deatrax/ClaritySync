"use client";
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  ArrowUpDown,
  ChevronRight,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import ModuleDisabled from '@/components/ModuleDisabled';
import { useCurrency } from '@/app/utils/currency';

interface Contact {
  contact_id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  contact_type: string;
  account_balance: number;
}

function ContactsPageContent() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [moduleStatus, setModuleStatus] = useState<boolean | null>(null);

  const { format: formatC } = useCurrency();

  useEffect(() => {
    const checkModule = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/settings/modules', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mod = data.find((m: any) => m.module_name === 'CONTACTS');
          setModuleStatus(mod?.is_enabled ?? true);
        } else {
          setModuleStatus(true);
        }
      } catch (error) {
        setModuleStatus(true);
      }
    };
    checkModule();
  }, []);

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/contacts?search=${searchTerm}&sort=${sortBy}`);
        if (res.ok) {
          const data = await res.json();
          setContacts(data);
        }
      } catch (error) {
        console.error("Failed to fetch contacts", error);
      } finally {
        setLoading(false);
      }
    }

    const delayDebounceFn = setTimeout(() => {
      fetchContacts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, sortBy]);

  if (moduleStatus === false) {
    return (
      <div className="p-8 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-xl w-full">
          <ModuleDisabled moduleName="Contacts" />
        </div>
      </div>
    );
  }

  if (moduleStatus === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <span>Contacts</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Contact Directory
              </h1>
            </div>

            <Link
              href="/contacts/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Contact
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            >
              <option value="newest">Newest First</option>
              <option value="balance_desc">Highest Due (Owe Us)</option>
              <option value="balance_asc">Highest Payable (We Owe)</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <Users className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-900">No contacts found</p>
              <p className="text-sm mt-1">Try adjusting your search or add a new contact.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Name & Details</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <tr key={contact.contact_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link href={`/contacts/${contact.contact_id}`} className="text-gray-900 font-semibold hover:text-blue-600 text-base">
                          {contact.name}
                        </Link>
                        <div className="flex items-center gap-4 mt-1 text-xs">
                          {contact.phone && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Phone className="w-3 h-3" /> {contact.phone}
                            </span>
                          )}
                          {contact.email && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Mail className="w-3 h-3" /> {contact.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${contact.contact_type === 'CUSTOMER' ? 'bg-green-100 text-green-800' :
                          contact.contact_type === 'SUPPLIER' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'}`}>
                        {contact.contact_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`font-bold ${parseFloat(String(contact.account_balance)) > 0 ? 'text-red-600' : parseFloat(String(contact.account_balance)) < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {parseFloat(String(contact.account_balance)) > 0 ? 'Receivable: ' : parseFloat(String(contact.account_balance)) < 0 ? 'Payable: ' : ''}
                        {formatC(Math.abs(contact.account_balance))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/contacts/${contact.contact_id}`} className="text-blue-600 hover:text-blue-800 p-2 inline-block rounded-full hover:bg-blue-50">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


export default function ContactsPage(props: any) {
  return (
    <ProtectedRoute>
      <ContactsPageContent  />
    </ProtectedRoute>
  );
}
