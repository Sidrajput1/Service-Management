"use client";
import { CustomerPageHeading } from "./CustomerUi";
import { SmartDiscovery } from "@/components/public/SmartDiscovery";
export function CustomerDiscoveryView() {
  return (
    <>
    // here , we return two components, CustomerPageHeading and SmartDiscovery. The CustomerPageHeading component is used to display a heading for the customer discovery view, with an eyebrow, title, and description. 
    //The SmartDiscovery component is used to display a search interface for customers to find service teams based on their preferences.
      <CustomerPageHeading
        eyebrow="FIND YOUR HELPING HAND"
        title="Find your service team"
        description="Search by service, business or location. Compare eligible offerings and request a visit at your preferred time."
      />
      <SmartDiscovery customer />
    </>
  );
}
