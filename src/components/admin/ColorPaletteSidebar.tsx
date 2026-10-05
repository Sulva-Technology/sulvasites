"use client";

import { useState, useEffect } from "react";
import {
  applyThemeColors,
  DARK_PREFIX,
  effectiveDarkColors,
  getTemplateThemeConfig,
  type ThemeSemanticColors,
} from "@/lib/templateTheme";

interface ColorPaletteSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  templateKey?: string;
  initialColors?: ThemeSemanticColors | null;
  getTargetRoot?: () => HTMLElement | null;
  onSaveColors?: (colors: ThemeSemanticColors) => Promise<void>;
}

export default function ColorPaletteSidebar({
  isOpen,
  onClose,
  templateKey = "t1",
  initialColors,
  getTargetRoot,
  onSaveColors,
}: ColorPaletteSidebarProps) {
  const config = getTemplateThemeConfig(templateKey) ?? getTemplateThemeConfig("t1")!;
  const storageKey = `template-${templateKey}-colors`;

  const [colors, setColors] = useState<ThemeSemanticColors>(() => {
    // Load once on first render (client-only component).
    const saved = localStorage.getItem(storageKey);
    const base: ThemeSemanticColors = { ...config.defaults };

    if (initialColors && typeof initialColors === "object") {
      for (const [k, v] of Object.entries(initialColors)) {
        if (typeof v === "string") base[k] = v;
      }
    }

    if (!saved) return base;
    try {
      const parsed = JSON.parse(saved) as ThemeSemanticColors;
      for (const [k, v] of Object.entries(parsed ?? {})) {
        if (typeof v === "string") base[k] = v;
      }
      return base;
    } catch {
      return base;
    }
  });

  // Templates with a light/dark toggle keep a separate dark palette (`dark_*` keys).
  const [mode, setMode] = useState<"light" | "dark">("light");
  const hasDark = !!config.dark;

  const switchMode = (next: "light" | "dark") => {
    setMode(next);
    // Show the preview in the mode being edited.
    getTargetRoot?.()?.setAttribute("data-mode", next);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const applyColors = (newColors: ThemeSemanticColors) => {
    // Apply to the preview template root if available, else fall back to :root.
    const target = getTargetRoot?.() ?? null;
    const root = target ?? document.documentElement;
    applyThemeColors(root, templateKey, newColors);
  };

  useEffect(() => {
    // Apply once on mount for initial state.
    applyColors(colors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialColors || typeof initialColors !== "object") return;
    // If DB-loaded colors arrive after mount, sync them into the UI state.
    setColors((prev) => {
      const next: ThemeSemanticColors = { ...prev };
      for (const [k, v] of Object.entries(initialColors)) {
        if (typeof v === "string") next[k] = v;
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      applyColors(next);
      return next;
    });
    setSaveNote(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialColors, templateKey]);

  const handleColorChange = (key: string, value: string) => {
    const newColors = { ...colors, [mode === "dark" ? `${DARK_PREFIX}${key}` : key]: value };
    setColors(newColors);
    applyColors(newColors);
    localStorage.setItem(storageKey, JSON.stringify(newColors));
    setSaveNote(null);
  };

  const handleReset = () => {
    setColors(config.defaults);
    applyColors(config.defaults);
    localStorage.removeItem(storageKey);
    setSaveNote(null);
  };

  const handleSave = async () => {
    if (!onSaveColors) {
      setSaveNote("Saved locally.");
      return;
    }
    setIsSaving(true);
    setSaveNote(null);
    try {
      await onSaveColors(colors);
      setSaveNote("Saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save.";
      setSaveNote(message);
    } finally {
      setIsSaving(false);
    }
  };

  const shown: ThemeSemanticColors = mode === "dark" ? effectiveDarkColors(templateKey, colors) : colors;
  const fieldKeys = Object.keys(mode === "dark" && config.dark ? config.dark.defaults : config.defaults);

  // Button gradient follows the palette being edited.
  const getButtonGradient = () =>
    `linear-gradient(135deg, ${colors.accent ?? config.defaults.accent} 0%, ${colors.accent2 ?? config.defaults.accent2} 100%)`;

  return (
    <>
      {/* Sidebar Overlay */}
      <div
        style={{
          position: "fixed",
          right: isOpen ? 0 : "-320px",
          top: 0,
          height: "100vh",
          width: "320px",
          backgroundColor: "#FFFFFF",
          boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
          zIndex: 1001,
          transition: "right 0.3s ease",
          overflowY: "auto",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1F2937" }}>
            Color Customization
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "24px",
              color: "#6B7280",
              padding: "4px",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {hasDark ? (
          <div
            role="tablist"
            aria-label="Colour mode"
            style={{ display: "flex", gap: 4, padding: 4, marginBottom: 20, background: "#F3F4F6", borderRadius: 10 }}
          >
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: mode === m ? "#FFFFFF" : "transparent",
                  color: mode === m ? "#111827" : "#6B7280",
                  boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                }}
              >
                {m === "light" ? "Light mode" : "Dark mode"}
              </button>
            ))}
          </div>
        ) : null}
        {mode === "dark" ? (
          <p style={{ margin: "-8px 0 20px", fontSize: 12, color: "#6B7280" }}>
            Colours visitors see with dark mode on. Your light accent carries over when it stays readable.
          </p>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {fieldKeys.map((key) => (
            <div key={key}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#1F2937" }}>
                {config.labels[key] || key}
              </label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="color"
                  value={shown[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  style={{ width: "60px", height: "40px", border: "1px solid #E5E7EB", borderRadius: "8px", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={shown[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  style={{ flex: 1, padding: "8px", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "14px" }}
                />
              </div>
            </div>
          ))}

          {/* Save + Reset */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: getButtonGradient(),
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? "Saving…" : "Save colors"}
            </button>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "#F3F4F6",
                color: "#111827",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
          {saveNote ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: saveNote === "Saved." || saveNote === "Saved locally." ? "#065F46" : "#B91C1C",
              }}
            >
              {saveNote}
            </div>
          ) : null}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => onClose()}
        style={{
          position: "fixed",
          right: isOpen ? "340px" : "20px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: getButtonGradient(),
          border: "none",
          color: "#FFFFFF",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(107, 70, 193, 0.3)",
          zIndex: 1000,
          transition: "right 0.3s ease",
        }}
        aria-label={isOpen ? "Close color palette" : "Open color palette"}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          )}
        </svg>
      </button>
    </>
  );
}
