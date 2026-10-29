"use client";
import { CustomerPageHeading } from "./CustomerUi";
import { SmartDiscovery } from "@/components/public/SmartDiscovery";
export function CustomerDiscoveryView() {
  return (
    <>
      <CustomerPageHeading
        eyebrow="FIND YOUR HELPING HAND"
        title="Find your service team"
        description="Search by service, business or location. Compare eligible offerings and request a visit at your preferred time."
      />
      <SmartDiscovery customer />
    </>
  );
}
