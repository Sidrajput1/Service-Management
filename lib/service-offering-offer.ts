export function isOfferCurrentlyActive(
  offering: {
    offerEnabled?: boolean;
    offerStartsAt?: Date | string;
    offerEndsAt?: Date | string;
  },
  now = new Date()
) {
  if (!offering.offerEnabled) {
    return false;
  }

  if (
    offering.offerStartsAt &&
    new Date(offering.offerStartsAt) > now
  ) {
    return false;
  }

  if (
    offering.offerEndsAt &&
    new Date(offering.offerEndsAt) < now
  ) {
    return false;
  }

  return true;
}