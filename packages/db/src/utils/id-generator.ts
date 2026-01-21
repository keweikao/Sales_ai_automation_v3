/**
 * ID Generation Utilities
 * Generates case numbers for conversations
 */

export type ProductLine = "ichef" | "beauty";

/**
 * Get the prefix for a product line
 * @param productLine - The product line
 * @returns The prefix (IC for iChef, BT for Beauty)
 */
export function getProductLinePrefix(productLine: ProductLine): string {
  const prefixes: Record<ProductLine, string> = {
    ichef: "IC",
    beauty: "BT",
  };
  return prefixes[productLine] || "IC";
}

/**
 * Generate a case number for a conversation
 * Format: YYYYMM-{PREFIX}{sequence}
 * Example: "202601-IC046" (iChef), "202601-BT002" (Beauty)
 *
 * @param yearMonth - The year and month in YYYYMM format (e.g., "202601")
 * @param sequence - The sequence number within that month
 * @param productLine - The product line (ichef or beauty), defaults to ichef
 * @returns The formatted case number
 */
export function generateCaseNumber(
  yearMonth: string,
  sequence: number,
  productLine: ProductLine = "ichef"
): string {
  const prefix = getProductLinePrefix(productLine);
  return `${yearMonth}-${prefix}${sequence.toString().padStart(3, "0")}`;
}

/**
 * Generate a case number using the current date
 * @param sequence - The sequence number within the current month
 * @param productLine - The product line (ichef or beauty), defaults to ichef
 * @returns The formatted case number with current year-month
 */
export function generateCaseNumberFromDate(
  sequence: number,
  productLine: ProductLine = "ichef"
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const yearMonth = `${year}${month}`;
  return generateCaseNumber(yearMonth, sequence, productLine);
}

/**
 * Parse a case number to extract its components
 * @param caseNumber - The case number to parse (e.g., "202601-IC046" or "202601-BT002")
 * @returns The parsed components or null if invalid
 */
export function parseCaseNumber(caseNumber: string): {
  yearMonth: string;
  sequence: number;
  productLine: ProductLine;
} | null {
  const match = caseNumber.match(/^(\d{6})-(IC|BT)(\d{3})$/);
  if (!(match?.[1] && match[2] && match[3])) {
    return null;
  }

  const prefixToProductLine: Record<string, ProductLine> = {
    IC: "ichef",
    BT: "beauty",
  };

  return {
    yearMonth: match[1],
    sequence: Number.parseInt(match[3], 10),
    productLine: prefixToProductLine[match[2]] || "ichef",
  };
}
