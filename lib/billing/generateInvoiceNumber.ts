export function generateInvoiceNumber(
  date = new Date(),
): string {
  const year = String(
    date.getFullYear(),
  ).slice(-2);

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  /*
   * 6 digit random suffix.
   *
   * Example:
   * INV-260821-483921
   */
  const randomPart = Math.floor(
    100000 +
      Math.random() * 900000,
  );

  return `INV-${year}${month}${day}-${randomPart}`;
}