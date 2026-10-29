import { CustomerBookingsView } from "@/components/customer/CustomerBookingsView";
export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}) { const params=await searchParams; return <CustomerBookingsView initialView={params.view}/>; }
