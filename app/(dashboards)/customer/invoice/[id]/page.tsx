import { CustomerInvoiceView } from "@/components/customer/CustomerInvoicesView";
export default async function Page({params}:{params:Promise<{id:string}>}) { return <CustomerInvoiceView id={(await params).id}/>; }
