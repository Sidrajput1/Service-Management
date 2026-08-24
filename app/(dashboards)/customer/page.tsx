import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import CustomDash from '@/components/customer/CustomDash';
import CustomerDashboardPage from '@/components/customer/CustomerDashboard';
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation';
import React from 'react'

async function page() {

  const session = await getServerSession(authOptions);

  if(!session){
    redirect('/signin');
  }
  return (
    // <CustomDash session={session}/>
    <CustomerDashboardPage session={session}/>
  )
}

export default page