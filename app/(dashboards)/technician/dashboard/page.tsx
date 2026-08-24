import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import NewTechDash from '@/components/technicians/NewTechDash';
import TechDash from '@/components/technicians/TechDash';
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation';
import React from 'react'

export default async function page() {

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/signin");
  }
  return (
    // <TechDash session={session}/>
    <NewTechDash session={session}/>
  )
}

