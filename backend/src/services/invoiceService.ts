import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import { supabase } from '../database/supabase';

const BRAND = rgb(0.169, 0.094, 0.125); // deep purple #2B1820
const GOLD = rgb(0.753, 0.619, 0.353); // #C09E5A
const GREY = rgb(0.42, 0.42, 0.42);
const WHITE = rgb(1, 1, 1);

const money = (value: any) => `Rs. ${Number(value || 0).toFixed(2)}`;

const SELLER = {
  name: 'MeruVeda Wellness',
  line1: 'Keharsh Enterprises (Sole Proprietorship)',
  line2: 'S/N. 12, Viru City Gym Road, Inside Jalori Gate,',
  line3: 'Jodhpur - 342001, Rajasthan, India',
  gstin: process.env.GSTIN || '08BFPPS7045C1Z4',
  email: 'customercare@meruvedawellness.com',
  website: process.env.FRONTEND_URL || 'https://meruvedawellness.com',
};

/** Load an order with items + buyer details, shaped for invoicing. */
export async function getOrderForInvoice(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), users(email, first_name, last_name, phone)')
    .eq('id', orderId)
    .single();

  if (error || !data) {
    const err = new Error('Order not found');
    (err as any).status = 404;
    throw err;
  }
  return data;
}

function drawHeader(page: PDFPage, width: number, orderNumber: string, createdAt: string) {
  page.drawRectangle({ x: 0, y: 762, width, height: 80, color: BRAND });
  page.drawText(SELLER.name, { x: 40, y: 806, size: 22, color: WHITE });
  page.drawText('Ayurvedic Wellness', { x: 40, y: 788, size: 10, color: GOLD });
  page.drawText('TAX INVOICE', { x: width - 140, y: 806, size: 16, color: WHITE });
  page.drawText(`#${orderNumber}`, { x: width - 140, y: 788, size: 11, color: GOLD });
  page.drawText(createdAt, { x: width - 140, y: 772, size: 9, color: WHITE });
}

/**
 * Render the ordered items into a printable A4 invoice PDF.
 * Uses only the standard Helvetica fonts so it needs no font assets at runtime.
 */
export async function generateInvoicePdf(order: any): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const width = 595;
  const height = 842;
  const page = doc.addPage([width, height]);

  const orderNumber = order.order_number || 'MV-000000';
  const created = new Date(order.created_at).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  drawHeader(page, width, orderNumber, created);

  // ---- Seller / buyer blocks ----
  // Fixed template: header + From / Bill To / Ship To + items + totals.
  let y = 730;
  page.drawText('From', { x: 40, y, size: 9, font: bold, color: GREY });
  y -= 14;
  [SELLER.name, SELLER.line1, SELLER.line2, SELLER.line3, `GSTIN: ${SELLER.gstin}`, SELLER.email, SELLER.website].forEach((line) => {
    page.drawText(line, { x: 40, y, size: 10, font: helv, color: BRAND });
    y -= 13;
  });

  const bill = order.billing_address || {};
  const ship = order.shipping_address || {};
  const hasSeparateShipping = Boolean(order.shipping_address) && JSON.stringify(bill) !== JSON.stringify(ship);
  const buyer = {
    fullName: bill.fullName || ship.fullName || 'Customer',
    addressLine: bill.addressLine || ship.addressLine || '',
    city: bill.city || ship.city || '',
    state: bill.state || ship.state || '',
    zipCode: bill.zipCode || ship.zipCode || '',
    phone: bill.phone || ship.phone || '',
  };
  const buyerLines = [
    buyer.fullName,
    buyer.addressLine,
    `${buyer.city}${buyer.state ? ', ' + buyer.state : ''}${buyer.zipCode ? ' - ' + buyer.zipCode : ''}`,
    buyer.phone ? `Phone: ${buyer.phone}` : '',
    order.users?.email ? `Email: ${order.users.email}` : '',
  ].filter(Boolean);

  let by = 730;
  page.drawText('Bill To', { x: 300, y: by, size: 9, font: bold, color: GREY });
  by -= 14;
  buyerLines.forEach((line) => {
    page.drawText(String(line).slice(0, 60), { x: 300, y: by, size: 10, font: helv, color: BRAND });
    by -= 13;
  });
  if (hasSeparateShipping) {
    by -= 4;
    page.drawText('Ship To', { x: 300, y: by, size: 9, font: bold, color: GREY });
    by -= 14;
    const shipLines = [
      ship.fullName || '',
      ship.addressLine || '',
      `${ship.city || ''}${ship.state ? ', ' + ship.state : ''}${ship.zipCode ? ' - ' + ship.zipCode : ''}`,
      ship.phone ? `Phone: ${ship.phone}` : '',
    ].filter(Boolean);
    shipLines.forEach((line) => {
      page.drawText(String(line).slice(0, 60), { x: 300, y: by, size: 10, font: helv, color: BRAND });
      by -= 13;
    });
  }

  // ---- Items table ----
  y = Math.min(y, by) - 24;
  page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 22, color: GOLD });
  const cols = { name: 48, qty: 330, rate: 390, amount: 470 };
  page.drawText('Item', { x: cols.name, y: y + 3, size: 10, font: bold, color: WHITE });
  page.drawText('Qty', { x: cols.qty, y: y + 3, size: 10, font: bold, color: WHITE });
  page.drawText('Rate', { x: cols.rate, y: y + 3, size: 10, font: bold, color: WHITE });
  page.drawText('Amount', { x: cols.amount, y: y + 3, size: 10, font: bold, color: WHITE });

  y -= 24;
  const items: any[] = order.order_items || [];
  items.forEach((item) => {
    const label = (item.product_name || 'Item').slice(0, 42);
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    page.drawText(label, { x: cols.name, y, size: 10, font: helv, color: BRAND });
    page.drawText(String(qty), { x: cols.qty, y, size: 10, font: helv, color: BRAND });
    page.drawText(money(price), { x: cols.rate, y, size: 10, font: helv, color: BRAND });
    page.drawText(money(Number(item.total) || qty * price), { x: cols.amount, y, size: 10, font: helv, color: BRAND });
    page.drawLine({
      start: { x: 40, y: y - 6 },
      end: { x: width - 40, y: y - 6 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
    y -= 22;
  });

  // ---- Totals ----
  y -= 12;
  const totals: Array<[string, string]> = [
    ['Subtotal', money(order.subtotal)],
    [`Discount${order.discount ? '' : ''}`, `- ${money(order.discount)}`],
    ['Tax (GST)', money(order.tax)],
    ['Shipping', Number(order.shipping_fee) === 0 ? 'FREE' : money(order.shipping_fee)],
  ];
  totals.forEach(([label, value]) => {
    page.drawText(label, { x: 340, y, size: 10, font: helv, color: GREY });
    page.drawText(value, { x: 455, y, size: 10, font: helv, color: BRAND });
    y -= 16;
  });

  y -= 4;
  page.drawRectangle({ x: 330, y: y - 8, width: 225, height: 26, color: BRAND });
  page.drawText('TOTAL', { x: 340, y: y, size: 12, font: bold, color: WHITE });
  page.drawText(money(order.total), { x: 455, y: y, size: 12, font: bold, color: GOLD });

  // ---- Payment / footer ----
  y -= 44;
  page.drawText(`Payment method: ${order.payment_method || '-'}`, {
    x: 40, y, size: 10, font: helv, color: BRAND,
  });
  y -= 14;
  page.drawText(`Payment status: ${(order.payment_status || 'pending').toUpperCase()}`, {
    x: 40, y, size: 10, font: helv, color: BRAND,
  });

  if (order.awb_code) {
    y -= 14;
    page.drawText(`Tracking (AWB): ${order.awb_code}${order.courier_name ? ` — ${order.courier_name}` : ''}`, {
      x: 40, y, size: 10, font: helv, color: BRAND,
    });
  }

  y -= 30;
  page.drawText('Thank you for shopping with MeruVeda.', { x: 40, y, size: 11, font: bold, color: GOLD });
  y -= 14;
  page.drawText(
    'This is a computer generated invoice and does not require a physical signature.',
    { x: 40, y, size: 8, font: helv, color: GREY }
  );

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export const invoiceService = {
  getOrderForInvoice,
  generateInvoicePdf,
};
