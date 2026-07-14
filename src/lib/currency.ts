/**
 * Ensure a price string includes a leading `$` when it doesn't already
 * start with a currency symbol.
 */
export function ensureCurrencyPrice(price: string | null | undefined): string {
  const trimmed = (price ?? '').trim()
  if (!trimmed) {
    return trimmed
  }

  if (/^[$€£¥]/.test(trimmed)) {
    return trimmed
  }

  return `$${trimmed}`
}
