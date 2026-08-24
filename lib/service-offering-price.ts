export function calculateOfferingPrice(
  price: number,
  discountType?: "percentage" | "flat",
  discountValue: number = 0
) {
  const basePrice = Math.max(
    0,
    Number(price) || 0
  );

  const value = Math.max(
    0,
    Number(discountValue) || 0
  );

  let discountAmount = 0;

  if (
    discountType === "percentage"
  ) {
    discountAmount =
      (basePrice * value) / 100;
  }

  if (discountType === "flat") {
    discountAmount = value;
  }

  discountAmount = Math.min(
    discountAmount,
    basePrice
  );

  const finalPrice =
    basePrice - discountAmount;

  return {
    basePrice,
    discountAmount,
    finalPrice,
  };
}