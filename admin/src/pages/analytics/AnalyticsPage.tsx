// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, ShoppingBag, Users, Percent, Download, RefreshCw } from 'lucide-react'
import { analyticsService } from '../../services/analyticsService'
import { orderService } from '../../services/orderService'
import { AnalyticsSummary } from '../../types'
import { formatCurrency, formatNumber } from '@meruveda/shared'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [visitors, setVisitors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summary, visitorStats] = await Promise.all([
          analyticsService.getSummary(),
          analyticsService.getVisitorStats(),
        ])
        setData(summary)
        setVisitors(visitorStats)
      } catch (err) {
        toast.error('Failed to load reports')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B']

  const handleExportExcel = async () => {
    const toastId = toast.loading('Generating Excel audit report...')
    try {
      const orders = await orderService.getOrders({ includeItems: 'true', limit: 500 })
      
      // Build CSV lines
      const csvRows = []
      
      // Section 1: Title & metadata
      csvRows.push('MeruVeda Platform - Sales Audit Report')
      csvRows.push(`Export Date,${new Date().toLocaleString()}`)
      csvRows.push('')
      
      // Section 2: Order Line Items
      csvRows.push('ORDER LINE ITEMS')
      csvRows.push('Order Number,Order Date,Customer,SKU,Product Name,Quantity,Unit Price,Discount,Line Total,Payment Status,Payment Method')
      
      if (Array.isArray(orders)) {
        orders.forEach((order: any) => {
          const orderDate = new Date(order.createdAt || order.created_at).toLocaleDateString()
          const customerName = order.shippingAddress?.firstName 
            ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName || ''}`.trim()
            : order.customerName || 'Customer'
            
          if (order.orderItems && Array.isArray(order.orderItems)) {
            order.orderItems.forEach((item: any) => {
              const prod = item.products || {}
              const sku = prod.sku || 'N/A'
              const prodName = prod.name || 'N/A'
              const qty = item.quantity || 0
              const unitPrice = item.priceAtPurchase || item.price || 0
              const discount = order.discount || 0
              const lineTotal = qty * unitPrice
              const payStatus = order.status || 'Pending'
              const payMethod = order.paymentMethod || order.payment_method || 'N/A'
              
              // Escape values for CSV
              const escapedProdName = `"${prodName.replace(/"/g, '""')}"`
              const escapedCustName = `"${customerName.replace(/"/g, '""')}"`
              
              csvRows.push([
                order.orderNumber || order.order_number,
                orderDate,
                escapedCustName,
                sku,
                escapedProdName,
                qty,
                unitPrice,
                discount,
                lineTotal,
                payStatus,
                payMethod
              ].join(','))
            })
          }
        })
      }
      
      csvRows.push('')
      csvRows.push('')
      
      // Section 3: Summary Sheet (Aggregate product sales)
      csvRows.push('PRODUCT PERFORMANCE SUMMARY')
      csvRows.push('Product Name,SKU,Total Units Sold,Total Revenue')
      
      const productSummary: Record<string, { name: string; sku: string; qty: number; revenue: number }> = {}
      if (Array.isArray(orders)) {
        orders.forEach((order: any) => {
          if (order.orderItems && Array.isArray(order.orderItems)) {
            order.orderItems.forEach((item: any) => {
              const prod = item.products || {}
              const sku = prod.sku || 'N/A'
              const prodName = prod.name || 'N/A'
              const qty = item.quantity || 0
              const unitPrice = item.priceAtPurchase || item.price || 0
              const lineTotal = qty * unitPrice
              
              if (!productSummary[sku]) {
                productSummary[sku] = { name: prodName, sku, qty: 0, revenue: 0 }
              }
              productSummary[sku].qty += qty
              productSummary[sku].revenue += lineTotal
            })
          }
        })
      }
      
      Object.values(productSummary).forEach((summary) => {
        const escapedProdName = `"${summary.name.replace(/"/g, '""')}"`
        csvRows.push([
          escapedProdName,
          summary.sku,
          summary.qty,
          summary.revenue
        ].join(','))
      })

      // Convert to blob and download with UTF-8 BOM
      const csvString = csvRows.join('\n')
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `MeruVeda_Sales_Audit_Report_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.dismiss(toastId)
      toast.success('Excel Sheet audit report downloaded successfully!')
    } catch (error) {
      console.error(error)
      toast.dismiss(toastId)
      toast.error('Failed to generate Excel audit report')
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-350" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="page-title">Sales Analytics</h1>
          <p className="text-sm text-slate-500">Analyze storefront traffic, conversions, and best-selling products.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl shadow-glow"
          >
            <Download className="h-4 w-4" /> Export Audit Report (Excel)
          </button>
        </div>
      </div>

      {/* Analytics KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Sales Revenue</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(data.totalRevenue)}
            </h3>
            {data.revenueGrowth > 0 ? (
              <span className="text-xs text-green-500 font-medium inline-flex items-center gap-0.5">
                +{data.revenueGrowth}% vs last month
              </span>
            ) : (
              <span className="text-xs text-slate-400">No comparison data yet</span>
            )}
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-primary-600 rounded-2xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="card p-6 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Fulfillments count</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {data.totalOrders}
            </h3>
            {data.ordersGrowth > 0 ? (
              <span className="text-xs text-green-500 font-medium inline-flex items-center gap-0.5">
                +{data.ordersGrowth}% vs last month
              </span>
            ) : (
              <span className="text-xs text-slate-400">No comparison data yet</span>
            )}
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-2xl">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        <div className="card p-6 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Traffic Visitors</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {data.totalCustomers}
            </h3>
            {data.customersGrowth > 0 ? (
              <span className="text-xs text-green-500 font-medium inline-flex items-center gap-0.5">
                +{data.customersGrowth}% vs last month
              </span>
            ) : (
              <span className="text-xs text-slate-400">No comparison data yet</span>
            )}
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-2xl">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="card p-6 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Conversion Rate</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {data.conversionRate}%
            </h3>
            <span className="text-xs text-slate-400">Average Cart Checkout Success</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-2xl">
            <Percent className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visitor stats chart */}
        <div className="card p-6 lg:col-span-2 space-y-4">
          <h3 className="section-title">Unique Monthly Visitors</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitors} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                <XAxis dataKey="month" className="text-[10px] fill-slate-400" />
                <YAxis className="text-[10px] fill-slate-400" />
                <Tooltip />
                <Bar dataKey="visitors" fill="#7C3AED" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Sales donut */}
        <div className="card p-6 lg:col-span-1 space-y-4">
          <h3 className="section-title">Sales by Category</h3>
          <div className="h-[220px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.topCategories}
                  dataKey="sales"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {data.topCategories.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {data.topCategories.map((c, i) => (
              <div key={c.categoryName} className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate text-slate-500">{c.categoryName} ({c.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
export default AnalyticsPage
