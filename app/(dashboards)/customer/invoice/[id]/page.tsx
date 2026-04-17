"use client";

import CustomerPayBtn from '@/components/payments/CustomerPayBtn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerInvoiceById } from '@/hooks/useCustomer';

import { useParams } from 'next/navigation';
import React from 'react'

function CustomerInvoiceDetailsById() {

    const params = useParams();

    const id = params?.id as string;

    const {data , isLoading} = useCustomerInvoiceById(id);

    const invoice = data?.invoice;

    if(isLoading){
        <div className='flex justify-center items-center p-6 '>Loading....</div>
    }
    if(!invoice) return <div className='p-6'>Invoice not found</div>
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6">
            <h1 className="text-3xl font-semibold tracking-tight">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              View bill and pay online if due.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div>
              <strong>Status:</strong> <Badge className="ml-2">{invoice.status}</Badge>
            </div>
            <div>
              <strong>Total:</strong> ₹{invoice.grandTotal}
            </div>
            <div>
              <strong>Paid:</strong> ₹{invoice.amountPaid}
            </div>
            <div>
              <strong>Due:</strong> ₹{invoice.balanceDue}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoice.items?.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <div className="font-medium text-slate-900">{item.description}</div>
                  <div className="text-xs text-slate-500">
                    {item.itemType} × {item.qty}
                  </div>
                </div>
                <div className="font-medium">₹{item.amount}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.balanceDue > 0 ? (
              <CustomerPayBtn
                invoiceId={invoice._id}
                customerName={invoice.customerId?.name}
                customerPhone={invoice.customerId?.phone}
                customerEmail={invoice.customerId?.email}
              />
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                This invoice is already paid.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => window.open(`/api/invoices/${invoice._id}/pdf`, "_blank")}
            >
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Print
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CustomerInvoiceDetailsById