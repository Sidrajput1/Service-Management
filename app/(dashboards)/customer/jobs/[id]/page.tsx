import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import CustomerJobDetails from '@/components/customer/CustomerJobDetails';
import { getServerSession } from 'next-auth'
import React from 'react'

async function page() {

  const session = await getServerSession(authOptions);
  if(!session){
    return <div>No session found</div>
  }
  return (
    <CustomerJobDetails session={session}/>
  )
}

export default page