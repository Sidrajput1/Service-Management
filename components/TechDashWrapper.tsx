import TechnicianDashboard from '@/app/(dashboards)/technician/dashboard/page'
import React from 'react'

export default function TechDashWrapper({ session }: { session: any }) {

    if (!session) {
    return <div>No session found</div>;
  }
  return <TechnicianDashboard session={session}/>
  
}

 