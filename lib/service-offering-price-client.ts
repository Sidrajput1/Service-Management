export function calculateOfferingPrice(
  price: number,
  offerEnabled: boolean,
  discountType?: "percentage" | "flat",
  discountValue = 0
) {
  const basePrice = Math.max(
    0,
    Number(price) || 0
  );

  if (!offerEnabled) {
    return {
      basePrice,
      discountAmount: 0,
      finalPrice: basePrice,
    };
  }

  const discount = Math.max(
    0,
    Number(discountValue) || 0
  );

  let discountAmount = 0;

  if (discountType === "percentage") {
    discountAmount =
      (basePrice * discount) / 100;
  }

  if (discountType === "flat") {
    discountAmount = discount;
  }

  discountAmount = Math.min(
    discountAmount,
    basePrice
  );

  return {
    basePrice,
    discountAmount,
    finalPrice:
      basePrice - discountAmount,
  };
}