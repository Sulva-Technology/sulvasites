"use client";

import { useState } from "react";

import ImageField from "@/components/page-editor/ImageField";
import { btnCls, btnGhostCls, inputCls } from "@/components/shop-admin/common";
import type { KindDef, FieldDef } from "@/lib/businessData/kinds";
import type { BusinessItemInput, BusinessKind } from "@/lib/businessData/types";
import { parseItemForm, type RawItemForm } from "@/lib/businessData/validate";

type Props = {
  kind: BusinessKind;
  templateKey: string;
  def: KindDef;
  initial: RawItemForm;
  saving: boolean;
  submitLabel: string;
  onSubmit: (value: BusinessItemInput) => void;
  onCancel: () => void;
};

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-700">{msg}</p> : null;
}

export default function ItemForm({ kind, templateKey, def, initial, saving, submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<RawItemForm>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (key: string, v: string | string[]) =>
    setForm((f) => ({ ...f, fields: { ...f.fields, [key]: v } }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = parseItemForm(kind, templateKey, form, def);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    onSubmit(r.value);
  }

  function renderField(f: FieldDef) {
    const v = form.fields[f.key];
    const id = `bf-${f.key}`;
    const label = (
      <label htmlFor={id} className="text-sm font-medium text-gray-800">
        {f.label}
        {f.required ? <span className="text-red-600"> *</span> : null}
      </label>
    );
    switch (f.type) {
      case "text":
        return (
          <div key={f.key}>
            {label}
            <input id={id} className={inputCls} maxLength={f.max} placeholder={f.placeholder} value={typeof v === "string" ? v : ""} onChange={(e) => setField(f.key, e.target.value)} />
            {f.help ? <p className="mt-1 text-xs text-gray-500">{f.help}</p> : null}
            <Err msg={errors[f.key]} />
          </div>
        );
      case "textarea":
        return (
          <div key={f.key}>
            {label}
            <textarea id={id} rows={3} className={inputCls} maxLength={f.max} placeholder={f.placeholder} value={typeof v === "string" ? v : ""} onChange={(e) => setField(f.key, e.target.value)} />
            {f.max ? <p className="mt-1 text-right text-[11px] text-gray-400">{(typeof v === "string" ? v : "").length}/{f.max}</p> : null}
            <Err msg={errors[f.key]} />
          </div>
        );
      case "select":
        return (
          <div key={f.key}>
            {label}
            <select id={id} className={inputCls} value={typeof v === "string" ? v : ""} onChange={(e) => setField(f.key, e.target.value)}>
              <option value="">{f.required ? "Choose…" : "Not set"}</option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Err msg={errors[f.key]} />
          </div>
        );
      case "time":
        return (
          <div key={f.key}>
            {label}
            <input id={id} type="time" className={inputCls} value={typeof v === "string" ? v : ""} onChange={(e) => setField(f.key, e.target.value)} />
            <Err msg={errors[f.key]} />
          </div>
        );
      case "image":
        return (
          <div key={f.key}>
            <ImageField label={f.label} value={typeof v === "string" ? v : ""} onChange={(url) => setField(f.key, url)} />
            <Err msg={errors[f.key]} />
          </div>
        );
      case "images": {
        const list = Array.isArray(v) ? v : [];
        const max = f.maxItems ?? 6;
        return (
          <div key={f.key} className="space-y-3">
            <div className="text-sm font-medium text-gray-800">{f.label} <span className="font-normal text-gray-500">(up to {max})</span></div>
            {list.map((url, i) => (
              <div key={i} className="rounded border border-gray-200 p-2">
                <ImageField label={`Photo ${i + 1}`} value={url} onChange={(u) => setField(f.key, list.map((x, j) => (j === i ? u : x)))} />
                <button type="button" className="mt-2 text-xs text-red-700 underline" onClick={() => setField(f.key, list.filter((_, j) => j !== i))}>
                  Remove photo
                </button>
              </div>
            ))}
            {list.length < max ? (
              <button type="button" className={btnGhostCls} onClick={() => setField(f.key, [...list, ""])}>
                Add photo
              </button>
            ) : null}
            <Err msg={errors[f.key]} />
          </div>
        );
      }
      case "tags": {
        const list = Array.isArray(v) ? v : [];
        return (
          <fieldset key={f.key}>
            <legend className="text-sm font-medium text-gray-800">{f.label}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {f.options?.map((o) => {
                const on = list.includes(o.value);
                return (
                  <label key={o.value} className={`cursor-pointer rounded-full px-3 py-1 text-xs ring-1 ${on ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-700 ring-gray-300"}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => setField(f.key, on ? list.filter((t) => t !== o.value) : [...list, o.value])} />
                    {o.label}
                  </label>
                );
              })}
            </div>
            <Err msg={errors[f.key]} />
          </fieldset>
        );
      }
    }
  }

  // Short fields (day/time) sit side by side.
  const compact = def.fields.filter((f) => f.type === "select" || f.type === "time");
  const rest = def.fields.filter((f) => !compact.includes(f));

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm" noValidate>
      <div>
        <label htmlFor="bf-name" className="text-sm font-medium text-gray-800">
          {def.nameLabel} <span className="text-red-600">*</span>
        </label>
        <input id="bf-name" className={inputCls} maxLength={120} placeholder={def.namePlaceholder} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
        <Err msg={errors.name} />
      </div>

      {def.priceLabel ? (
        <div>
          <label htmlFor="bf-price" className="text-sm font-medium text-gray-800">{def.priceLabel}</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">₦</span>
            <input id="bf-price" inputMode="decimal" className={`${inputCls} pl-7`} placeholder="3,500" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </div>
          <Err msg={errors.price} />
        </div>
      ) : null}

      {compact.length ? <div className="grid gap-4 sm:grid-cols-3">{compact.map(renderField)}</div> : null}
      {rest.map(renderField)}

      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
        {def.activeLabel}
      </label>

      <div className="flex gap-2">
        <button type="submit" className={btnCls} disabled={saving}>{saving ? "Saving…" : submitLabel}</button>
        <button type="button" className={btnGhostCls} onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}
