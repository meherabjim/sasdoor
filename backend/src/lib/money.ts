// Money helpers. Prisma returns Decimal; we convert to number for math and round to 2 decimals.
export type Num = number | string | { toString(): string } | null | undefined;

export const n = (v: Num): number => (v === null || v === undefined ? 0 : Number(v.toString()));
export const r2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;
export const r3 = (v: number): number => Math.round((v + Number.EPSILON) * 1000) / 1000;

/** sell = cost + cost * profit% */
export const sellFrom = (cost: number, profitPercent: number) => r2(cost * (1 + profitPercent / 100));

/** profit% from cost & sell (0 when cost is 0) */
export const profitFrom = (cost: number, sell: number) => (cost > 0 ? r2(((sell - cost) / cost) * 100) : 0);

/**
 * Resolve a priced item (single/double cost + profit% + optional manual sell).
 * - If sell values are sent, profit% is derived from the single price.
 * - Otherwise sell is computed from cost and profit%.
 */
export function resolvePrice(input: {
  costSingle: number; costDouble: number; profitPercent: number;
  sellSingle?: number; sellDouble?: number;
}) {
  const { costSingle, costDouble } = input;
  if (input.sellSingle !== undefined && input.sellDouble !== undefined) {
    return {
      costSingle, costDouble,
      sellSingle: r2(input.sellSingle), sellDouble: r2(input.sellDouble),
      profitPercent: profitFrom(costSingle, input.sellSingle),
    };
  }
  return {
    costSingle, costDouble, profitPercent: input.profitPercent,
    sellSingle: sellFrom(costSingle, input.profitPercent),
    sellDouble: sellFrom(costDouble, input.profitPercent),
  };
}
