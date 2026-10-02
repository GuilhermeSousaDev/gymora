"use client";
import { useState, useTransition } from "react";
import { logBodyweight } from "@/app/actions/profile";
import { Button, Input } from "@/components/ui";

export function BodyweightForm({ label }: { label: string }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const kg = Number(value);
        if (!kg) return;
        start(async () => {
          await logBodyweight(kg);
          setValue("");
        });
      }}
    >
      <Input
        type="number"
        step="0.1"
        inputMode="decimal"
        placeholder="kg"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button type="submit" variant="secondary" loading={pending}>
        {label}
      </Button>
    </form>
  );
}
