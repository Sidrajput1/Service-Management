import React from "react";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

type InvoiceItem = {
  itemType: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

type InvoiceData = {
  invoiceNumber: string;
  status: string;
  currency?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  job?: {
    serviceType?: string;
    scheduledAt?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  issuedAt?: string;
  dueDate?: string;
  notes?: string;
};

// type InvoicePdfProps = {
//   invoice: InvoiceData;
// };


const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    marginBottom: 16,
    borderBottom: "1 solid #E5E7EB",
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  box: {
    border: "1 solid #E5E7EB",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
  },
  table: {
    width: "100%",
    border: "1 solid #E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #E5E7EB",
  },
  tableHeader: {
    backgroundColor: "#F3F4F6",
    fontWeight: 700,
  },
  cell: {
    padding: 6,
    borderRight: "1 solid #E5E7EB",
  },
  lastCell: {
    padding: 6,
  },
  colType: { width: "12%" },
  colDesc: { width: "40%" },
  colQty: { width: "10%" },
  colUnit: { width: "18%" },
  colAmt: { width: "20%" },
  summary: {
    width: "42%",
    marginLeft: "auto",
    marginTop: 12,
    border: "1 solid #E5E7EB",
    borderRadius: 6,
    padding: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1 solid #E5E7EB",
    fontWeight: 700,
  },
  footer: {
    marginTop: 16,
    paddingTop: 10,
    borderTop: "1 solid #E5E7EB",
    fontSize: 9,
    color: "#6B7280",
  },
});

function money(v: number) {
  return `₹${Number(v || 0).toFixed(2)}`;
}


export default function InvoicePdf({ invoice }: { invoice: InvoiceData }) {

    return (
        <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
          <Text style={styles.subtitle}>Invoice No: {invoice.invoiceNumber}</Text>
          <Text style={styles.subtitle}>Status: {invoice.status}</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.box, { width: "49%" }]}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text>{invoice.customer?.name || "-"}</Text>
            <Text>{invoice.customer?.phone || "-"}</Text>
            <Text>{invoice.customer?.email || "-"}</Text>
            <Text>{invoice.customer?.address || "-"}</Text>
          </View>

          <View style={[styles.box, { width: "49%" }]}>
            <Text style={styles.sectionTitle}>Service Info</Text>
            <Text>Service: {invoice.job?.serviceType || "-"}</Text>
            <Text>Scheduled: {invoice.job?.scheduledAt || "-"}</Text>
            <Text>Issued At: {invoice.issuedAt || "-"}</Text>
            <Text>Due Date: {invoice.dueDate || "-"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.colType]}>Type</Text>
            <Text style={[styles.cell, styles.colDesc]}>Description</Text>
            <Text style={[styles.cell, styles.colQty]}>Qty</Text>
            <Text style={[styles.cell, styles.colUnit]}>Unit Price</Text>
            <Text style={[styles.lastCell, styles.colAmt]}>Amount</Text>
          </View>

          {invoice.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.cell, styles.colType]}>{item.itemType}</Text>
              <Text style={[styles.cell, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.cell, styles.colQty]}>{item.qty}</Text>
              <Text style={[styles.cell, styles.colUnit]}>{money(item.unitPrice)}</Text>
              <Text style={[styles.lastCell, styles.colAmt]}>{money(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text>Subtotal</Text>
            <Text>{money(invoice.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Discount</Text>
            <Text>{money(invoice.discountAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Tax ({invoice.taxPercent}%)</Text>
            <Text>{money(invoice.taxAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Grand Total</Text>
            <Text>{money(invoice.grandTotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Amount Paid</Text>
            <Text>{money(invoice.amountPaid)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Balance Due</Text>
            <Text>{money(invoice.balanceDue)}</Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={styles.box}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>Thank you for choosing our service.</Text>
        </View>
      </Page>
    </Document>
    )
}