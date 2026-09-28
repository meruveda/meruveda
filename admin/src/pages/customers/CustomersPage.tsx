import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Search, ShieldAlert, Trash2, Eye, RefreshCw, Download } from 'lucide-react'
import { customerService } from '../../services/customerService'
import { Customer } from '../../types'
import { formatCurrency, formatDate } from '@meruveda/shared'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../components/ui/Modal'
import toast from 'react-hot-toast'

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search & Filters
  const [search, setSearch] = useState('')

  // Modals state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [blockId, setBlockId] = useState<string | null>(null)

  const fetchCustomers = async () => {
    setIsLoading(true)
    try {
      const data = await customerService.getCustomers({ search })
      setCustomers(data)
    } catch (err) {
      toast.error('Failed to load customers')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [search])

  const handleBlockToggle = async () => {
    if (!blockId) return
    try {
      const updated = await customerService.toggleBlockCustomer(blockId)
      toast.success(updated.isBlocked ? 'Customer blocked' : 'Customer unblocked')
      fetchCustomers()
    } catch (err) {
      toast.error('Failed to update customer block status')
    } finally {
      setBlockId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await customerService.deleteCustomer(deleteId)
      toast.success('Customer deleted successfully')
      fetchCustomers()
    } catch (err) {
      toast.error('Failed to delete customer')
    } finally {
      setDeleteId(null)
    }
  }

  const csvCell = (value: unknown) => {
    const raw = value === null || value === undefined ? '' : String(value)
    return `"${raw.replace(/"/g, '""')}"`
  }

  const handleExport = () => {
    if (customers.length === 0) {
      toast.error('There are no customers to export')
      return
    }

    const header = [
      'Name',
      'Email',
      'Phone',
      'Orders Count',
      'Lifetime Spend (INR)',
      'Last Activity',
      'Status',
    ]

    const rows = customers.map((c) =>
      [
        c.name,
        c.email,
        c.phone || '',
        c.totalOrders,
        c.lifetimeSpend,
        c.lastLogin ? formatDate(c.lastLogin) : '',
        c.isBlocked ? 'Blocked' : 'Active',
      ]
        .map(csvCell)
        .join(',')
    )

    // BOM keeps Excel (Windows) reading UTF-8 correctly.
    const csv = [header.map(csvCell).join(','), ...rows].join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `meruveda-customers-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${customers.length} customers`)
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="page-title">Customers Directory</h1>
        <p className="text-sm text-slate-500">Monitor client metrics, spend volumes, profiles, and blocks.</p>
      </div>

      {/* Toolbar filter */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-85 text-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email..."
            className="input pl-9"
          />
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV / Excel
        </button>
      </div>

      {/* Customers Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 text-slate-500 text-xs font-semibold">
                <th className="p-4">Customer Details</th>
                <th className="p-4">Orders Count</th>
                <th className="p-4">Lifetime Spend</th>
                <th className="p-4">Last Activity</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-350" />
                    Loading directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    No customers found matching queries.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                          alt={c.name}
                          className="h-9 w-9 rounded-full object-cover border"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.email}</p>
                          {c.phone && <p className="text-[10px] text-slate-400">{c.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold">{c.totalOrders} orders</td>
                    <td className="p-4 font-bold text-slate-950 dark:text-slate-100">
                      {formatCurrency(c.lifetimeSpend)}
                    </td>
                    <td className="p-4 text-xs text-slate-500">{formatDate(c.lastLogin)}</td>
                    <td className="p-4">
                      <StatusBadge status={c.isBlocked ? 'cancelled' : 'active'} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link
                          to={`/customers/${c.id}`}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-primary-600"
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setBlockId(c.id)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-amber-500"
                          title={c.isBlocked ? 'Unblock Customer' : 'Block Customer'}
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-500"
                          title="Delete Customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Deletion */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Customer Account"
        message="Are you sure you want to permanently delete this customer account? This clears their profile details and address configurations."
        isDestructive
      />

      {/* Confirm Block */}
      <ConfirmDialog
        isOpen={!!blockId}
        onClose={() => setBlockId(null)}
        onConfirm={handleBlockToggle}
        title="Toggle Customer Block status"
        message="Are you sure you want to update this customer block status? Blocked customers cannot login or checkout from storefronts."
      />
    </div>
  )
}
export default CustomersPage
