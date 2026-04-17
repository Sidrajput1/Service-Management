import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import CustomDash from '@/components/customer/CustomDash';
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation';
import React from 'react'

async function page() {

  const session = await getServerSession(authOptions);

  if(!session){
    redirect('/signin');
  }
  return (
    <CustomDash session={session}/>
  )
}

export default page