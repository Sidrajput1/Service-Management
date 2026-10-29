import { CustomerBookingView } from "@/components/customer/CustomerBookingView";
export default async function Page({params}:{params:Promise<{id:string}>}) { return <CustomerBookingView id={(await params).id}/>; }
