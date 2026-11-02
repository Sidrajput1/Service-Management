type BusinessContactInput = { email?: string; phone?: string };

// Approved for general enquiries only, not legal operator or grievance disclosures.
export const approvedPublicBusinessContact = {
  email: "servizato.in@gmail.com",
  phone: "+919189299370",
} as const;

/** Explicit inputs are validated without defaults, including legal disclosure inputs. */
export function getPublicBusinessContact(
  input: BusinessContactInput = {
    email:
      process.env.NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL?.trim() ||
      approvedPublicBusinessContact.email,
    phone:
      process.env.NEXT_PUBLIC_BUSINESS_CONTACT_PHONE?.trim() ||
      approvedPublicBusinessContact.phone,
  },
): BusinessContactInput {
  const email = input.email?.trim();
  const phone = input.phone?.trim();
  return {
    email:
      email &&
      email.length <= 254 &&
      /^[a-z\d]+(?:[._+-][a-z\d]+)*@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,63}$/i.test(
        email,
      )
        ? email
        : undefined,
    phone: phone && /^\+[1-9]\d{7,14}$/.test(phone) ? phone : undefined,
  };
}

export function formatPublicPhone(phone: string): string {
  return /^\+91\d{10}$/.test(phone) ? phone.slice(3) : phone;
}
