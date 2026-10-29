/** Only the existing customer discovery route may be resumed after authentication. */
export function safeBookingDestination(
  value: string | null | undefined,
): string | null {
  if (!value || !value.startsWith("/") || /[\\\s\u0000-\u001f]/.test(value))
    return null;

  try {
    const url = new URL(value, "https://servizato.invalid");
    if (
      url.origin !== "https://servizato.invalid" ||
      url.pathname !== "/customer/services"
    )
      return null;

    const params = new URLSearchParams();
    for (const key of ["serviceId", "offeringId", "repeatBookingId"]) {
      const id = url.searchParams.get(key);
      if (id !== null) {
        if (!/^[a-f\d]{24}$/i.test(id)) return null;
        params.set(key, id);
      }
    }
    if (params.has("offeringId") && !params.has("serviceId")) return null;
    for (const key of ["city", "locality", "pincode"]) {
      const raw = url.searchParams.get(key);
      if (raw !== null) {
        const location = raw.trim().replace(/\s+/g, " ");
        if (
          location.length > 100 ||
          (key === "pincode" && location && !/^[1-9]\d{5}$/.test(location))
        )
          return null;
        if (location) params.set(key, location);
      }
    }
    return `/customer/services${params.size ? `?${params}` : ""}`;
  } catch {
    return null;
  }
}

export function bookingDestination(
  serviceId: string,
  offeringId?: string,
): string {
  const params = new URLSearchParams({ serviceId });
  if (offeringId) params.set("offeringId", offeringId);
  return (
    safeBookingDestination(`/customer/services?${params}`) ||
    "/customer/services"
  );
}

export function authHref(
  page: "/signin" | "/signup",
  destination?: string | null,
): string {
  const safe = safeCustomerDestination(destination);
  const params = new URLSearchParams();
  if (page === "/signup") params.set("role", "customer");
  if (safe) params.set("callbackUrl", safe);
  return `${page}${params.size ? `?${params}` : ""}`;
}

export function profileCompletionHref(destination?: string | null): string {
  const safe = safeCustomerDestination(destination);
  return safe
    ? `/profile/complete?${new URLSearchParams({ callbackUrl: safe })}`
    : "/profile/complete";
}

export function safeCustomerDestination(value?: string | null): string | null {
  const booking = safeBookingDestination(value);
  if (booking) return booking;
  if (!value || /[\\\s\u0000-\u001f?#]/.test(value)) return null;
  if (
    [
      "/customer",
      "/customer/bookings",
      "/customer/messages",
      "/customer/invoice",
      "/customer/profile",
      "/notifications",
    ].includes(value)
  )
    return value;
  return /^\/customer\/(bookings|jobs|invoice|invoices)\/[a-f\d]{24}$/i.test(
    value,
  )
    ? value
    : null;
}
