"use client";

import { useCustomerInvoice } from '@/hooks/useCustomer';
import React from 'react'
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function CustomerInvoice() {

    const {data,isLoading} = useCustomerInvoice();
    const invoices = data?.invoices || [];
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6">
            <h1 className="text-3xl font-semibold tracking-tight">My Invoices</h1>
            <p className="mt-2 text-sm text-slate-300">
              View bills, payment status, and download or pay invoices.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Invoices list</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                No invoices yet.
              </div>
            ) : (
              invoices.map((invoice: any) => (
                <Link
                  key={invoice._id}
                  href={`/customer/invoices/${invoice._id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        ₹{invoice.grandTotal} • Due ₹{invoice.balanceDue}
                      </div>
                    </div>
                    <Badge>{invoice.status}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CustomerInvoice