"use client";

import { useState } from "react";

import {
  buildVariantMatrix, countCombinations, MAX_VARIANTS, optionsFromVariants, variantLabel, type VariantRow,
} from "@/lib/shop/variantMatrix";
import { btnGhostCls, btnDangerCls, inputCls, NairaInput, Notice } from "./common";

type OptionDef = { name: string; values: string };

function toDefs(variants: VariantRow[]): OptionDef[] {
  return Object.entries(optionsFromVariants(variants)).map(([name, values]) => ({ name, values: values.join(", ") }));
}

function toMap(defs: OptionDef[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const d of defs) {
    const name = d.name.trim();
    if (!name || name in out) continue;
    out[name] = d.values.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return out;
}

export default function VariantTable({
  variants,
  onChange,
  basePriceKobo,
}: {
  variants: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
  basePriceKobo: number | null;
}) {
  const [defs, setDefs] = useState<OptionDef[]>(() => {
    const d = toDefs(variants);
    return d.length ? d : [];
  });

  const map = toMap(defs);
  const combos = countCombinations(map);

  function generate() {
    onChange(buildVariantMatrix(map, variants));
  }

  function patch(i: number, p: Partial<VariantRow>) {
    onChange(variants.map((v, j) => (j === i ? { ...v, ...p } : v)));
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-gray-800">Options</div>
        <p className="text-xs text-gray-500">
          Add options such as Size and Colour, list the values separated by commas, then generate the variants. Existing
          variants keep their price and stock when they still match. Stock is tracked per variant; products without
          variants do not track stock.
        </p>
        {defs.map((d, i) => (
          <div key={i} className="mt-2 flex flex-wrap items-center gap-2">
            <input
              aria-label={`Option ${i + 1} name`}
              className={`${inputCls} !mt-0 w-36`}
              placeholder="Size"
              value={d.name}
              onChange={(e) => setDefs(defs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <input
              aria-label={`Option ${i + 1} values`}
              className={`${inputCls} !mt-0 min-w-[14rem] flex-1`}
              placeholder="S, M, L"
              value={d.values}
              onChange={(e) => setDefs(defs.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))}
            />
            <button type="button" className={btnDangerCls} onClick={() => setDefs(defs.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btnGhostCls}
            disabled={defs.length >= 3}
            onClick={() => setDefs([...defs, { name: "", values: "" }])}
          >
            Add option
          </button>
          <button type="button" className={btnGhostCls} disabled={combos === 0} onClick={generate}>
            Generate variants{combos ? ` (${Math.min(combos, MAX_VARIANTS)})` : ""}
          </button>
        </div>
        {combos > MAX_VARIANTS ? (
          <div className="mt-2">
            <Notice kind="warn">
              That makes {combos} combinations; only the first {MAX_VARIANTS} will be created.
            </Notice>
          </div>
        ) : null}
      </div>

      {variants.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-1 pr-2">Variant</th>
                <th className="py-1 pr-2">Price override (₦)</th>
                <th className="py-1 pr-2">Stock</th>
                <th className="py-1 pr-2">SKU</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={v.id ?? `new-${variantLabel(v.options)}-${i}`} className="border-t border-gray-100 align-top">
                  <td className="py-2 pr-2 font-medium text-gray-900">{variantLabel(v.options) || "Default"}</td>
                  <td className="py-1 pr-2">
                    <NairaInput
                      aria-label={`Price override for ${variantLabel(v.options)}`}
                      valueKobo={v.price_kobo}
                      placeholder={basePriceKobo === null ? "Product price" : String(basePriceKobo / 100)}
                      onChange={(k) => patch(i, { price_kobo: k })}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      aria-label={`Stock for ${variantLabel(v.options)}`}
                      className={inputCls}
                      inputMode="numeric"
                      placeholder="Untracked"
                      value={v.stock === null ? "" : String(v.stock)}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        if (t === "") return patch(i, { stock: null });
                        if (/^\d{1,7}$/.test(t)) patch(i, { stock: Number(t) });
                      }}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      aria-label={`SKU for ${variantLabel(v.options)}`}
                      className={inputCls}
                      maxLength={60}
                      value={v.sku ?? ""}
                      onChange={(e) => patch(i, { sku: e.target.value || null })}
                    />
                  </td>
                  <td className="py-1">
                    <button
                      type="button"
                      className={btnDangerCls}
                      aria-label={`Remove ${variantLabel(v.options)}`}
                      onClick={() => onChange(variants.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
