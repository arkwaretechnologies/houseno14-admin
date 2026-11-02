"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

export type OpenPlayPaymentMethod = "cash" | "card" | "gcash" | "other";

export type OpenPlayPaymentResult = {
  method: OpenPlayPaymentMethod;
  amountTenderedCents?: number;
  changeCents?: number;
};

const METHOD_OPTIONS: { value: OpenPlayPaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "gcash", label: "GCash" },
  { value: "other", label: "Other" },
];

function pesosToCents(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function OpenPlayPaymentDialog({
  open,
  onOpenChange,
  playerName,
  feeCents,
  confirming = false,
  confirmLabel = "Confirm payment",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  feeCents: number;
  confirming?: boolean;
  confirmLabel?: string;
  onConfirm: (result: OpenPlayPaymentResult) => void | Promise<void>;
}) {
  const [method, setMethod] = useState<OpenPlayPaymentMethod>("cash");
  const [amountGivenPesos, setAmountGivenPesos] = useState("");

  const tenderedCents = pesosToCents(amountGivenPesos);
  const changeCents = tenderedCents - feeCents;
  const isCash = method === "cash";
  const canConfirm =
    feeCents <= 0 ||
    !isCash ||
    (amountGivenPesos.trim() !== "" && tenderedCents >= feeCents);

  const feeLabel = useMemo(() => formatCurrency(feeCents / 100), [feeCents]);

  function reset() {
    setMethod("cash");
    setAmountGivenPesos("");
  }

  async function handleConfirm() {
    if (!canConfirm || confirming) return;
    const result: OpenPlayPaymentResult = {
      method,
      amountTenderedCents: isCash ? tenderedCents : undefined,
      changeCents: isCash ? Math.max(0, changeCents) : undefined,
    };
    await onConfirm(result);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collect open play fee</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Player</p>
            <p className="font-medium">{playerName}</p>
          </div>

          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">Open play session fee</p>
            <p className="text-2xl font-semibold tabular-nums">{feeLabel}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-method">Payment method</Label>
            <select
              id="pay-method"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as OpenPlayPaymentMethod)
              }
            >
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {isCash ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="amount-given">Amount given (₱)</Label>
                <Input
                  id="amount-given"
                  type="number"
                  min={0}
                  step="1"
                  inputMode="decimal"
                  value={amountGivenPesos}
                  onChange={(e) => setAmountGivenPesos(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="rounded-xl border px-4 py-3">
                <p className="text-sm text-muted-foreground">Change</p>
                <p
                  className={`text-xl font-semibold tabular-nums ${
                    amountGivenPesos && changeCents < 0
                      ? "text-destructive"
                      : ""
                  }`}
                >
                  {amountGivenPesos.trim()
                    ? formatCurrency(Math.max(0, changeCents) / 100)
                    : "—"}
                </p>
                {amountGivenPesos.trim() && changeCents < 0 ? (
                  <p className="mt-1 text-xs text-destructive">
                    Amount given is less than the fee
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No change calculation for {METHOD_OPTIONS.find((m) => m.value === method)?.label}.
              Confirm to mark as paid.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!canConfirm || confirming}>
            {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
