"use client";
import { useSession } from "next-auth/react";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import InternalNotificationCenter from "@/components/notifications/InternalNotificationCenter";
import { CustomerNotificationsView } from "@/components/customer/CustomerNotificationsView";
export default function Page() {
  const { data } = useSession();
  return (
    <>
      <PushNotificationSettings />
      {data?.user.role === "customer" ? (
        <CustomerNotificationsView />
      ) : (
        <InternalNotificationCenter />
      )}
    </>
  );
}
