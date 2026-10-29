"use client";
import { CustomerState } from "@/components/customer/CustomerUi";
export default function ErrorPage({ reset }: { reset: () => void }) { return <CustomerState error retry={reset} />; }
