export interface Address {
  location?: { type: "Point"; coordinates: [number, number] };
  locationConfirmed?: boolean;
  label?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  locality?: string;
  pincode?: string;
}
export interface Pro {
  _id: string;
  userId?: { _id: string; name?: string; phone?: string };
  skills?: string[];
  status?: string;
}
export interface BookingSummary {
  _id: string;
  serviceType: string;
  status: string;
  customerStatus: string;
  provider?: { companyName: string };
  serviceOffering?: { name: string };
  scheduledAt?: string;
  address?: Address;
  pricing?: { finalPrice?: number };
  estimatedPrice?: number;
  createdAt: string;
  updatedAt?: string;
  job?: JobSummary;
}
export interface JobSummary {
  _id: string;
  status: string;
  technicianId?: Pro;
  scheduledAt?: string;
  updatedAt?: string;
  invoiceId?: string;
  paymentStatus?: string;
  otp?: string;
  otpExpiresAt?: string;
}
export interface TimelineEntry {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}
export interface CustomerIdentity {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}
export interface InvoiceSummary {
  _id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  bookingId?: string | { _id: string; serviceType?: string };
  jobId?: string;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  issuedAt?: string;
  createdAt: string;
  dueDate?: string;
}
export interface InvoiceDetail extends InvoiceSummary {
  items: {
    description: string;
    qty: number;
    unitPrice: number;
    amount: number;
  }[];
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  notes?: string;
  paymentMethod?: string;
  paymentReceivedAt?: string;
}
export interface BookingDetail {
  booking: BookingSummary;
  provider?: { companyName: string; phone?: string };
  service?: { name: string; description?: string };
  technician?: Pro;
  job?: JobSummary;
  invoice?: InvoiceSummary;
  tracking?: { label: string; description: string; key: string };
  timeline: TimelineEntry[];
  customer: CustomerIdentity;
}
export interface ServiceRequestSummary {
  _id: string;
  serviceName: string;
  status: string;
  preferredDate?: string;
  createdAt: string;
  pricing: { finalPrice: number };
  serviceProviderId?: { companyName: string };
  address?: Address;
}
export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
}
export interface CustomerProfile {
  customer: {
    name: string;
    email?: string;
    phone?: string;
    addresses: Address[];
  };
  user: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
}
export function money(value: number | undefined, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
export function dateTime(value?: string) {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "To be confirmed";
}
export function proCopy(value: string) {
  return value.replace(/technicians/gi, "Pros").replace(/technician/gi, "Pro");
}
