import { formatMoney } from "@/lib/trade/api";

type PriceTextProps = Readonly<{
  value: number | null | undefined;
  currency?: string;
  size?: "sm" | "md" | "lg";
}>;

export function PriceText({ value, currency = "MYR", size = "md" }: PriceTextProps) {
  const sizeClass =
    size === "lg" ? "text-3xl sm:text-4xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <p className={`${sizeClass} font-bold tracking-normal text-emerald-800`}>
      {formatMoney(value, currency)}
    </p>
  );
}
