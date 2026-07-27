"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { registerInstagramSale } from "./actions";

type Plan = {
  id: number;
  name: string;
  price: number | null;
};

export function SaleForm({ plans }: { plans: Plan[] }) {
  const defaultPlan = plans[0] ?? null;
  const [selectedPlanId, setSelectedPlanId] = useState<number | "">(
    defaultPlan?.id ?? "",
  );
  const [amount, setAmount] = useState<string>(
    defaultPlan?.price != null ? String(defaultPlan.price) : "",
  );
  const formRef = useRef<HTMLFormElement>(null);

  function handlePlanChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value);
    setSelectedPlanId(id);
    const plan = plans.find((p) => p.id === id);
    if (plan?.price != null) setAmount(String(plan.price));
  }

  return (
    <form
      ref={formRef}
      action={registerInstagramSale}
      className="rounded-lg border border-border bg-surface p-5 shadow-sm"
    >
      <h2 className="mb-4 font-semibold text-ink">Registrar venta</h2>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Nombre del vendedor
          <input
            name="seller_name"
            type="text"
            required
            placeholder="Ej: María García"
            className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-azul-deep"
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Teléfono
            <input
              name="contact_phone"
              type="text"
              placeholder="Ej: 2616637057"
              className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-azul-deep"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Instagram
            <input
              name="contact_instagram"
              type="text"
              placeholder="Ej: @usuario"
              className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-azul-deep"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Email
            <input
              name="contact_email"
              type="email"
              placeholder="Ej: mail@ejemplo.com"
              className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-azul-deep"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Plan
            <select
              name="plan_id"
              value={selectedPlanId}
              onChange={handlePlanChange}
              required
              className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-azul-deep"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Monto cobrado ($)
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-azul-deep"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Notas{" "}
          <span className="font-normal text-ink-soft">(opcional)</span>
          <textarea
            name="notes"
            rows={2}
            placeholder="Ej: pagó en dos cuotas, pago pendiente..."
            className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-azul-deep"
          />
        </label>

        <Button type="submit" className="self-start">
          Registrar venta
        </Button>
      </div>
    </form>
  );
}
