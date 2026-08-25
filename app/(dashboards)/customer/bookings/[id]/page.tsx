import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import React from 'react'
import CustomerBookingDetailPage from '@/components/customer/CustomerBookingDetails';

async function page() {
  console.log("Loading booking page..")
  const session = await getServerSession(authOptions);
    if(!session){
      return <div>No session found</div>
    };

    
  return (
    <CustomerBookingDetailPage session={session}/>
  )
}

export default page