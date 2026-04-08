export const tokenDefinitions = [
  {
    id: "bg",
    label: "Workspace background",
    description: "Primary desktop and app surface tone."
  },
  {
    id: "panel",
    label: "Panel surface",
    description: "Shell bars, cards, and main chrome."
  },
  {
    id: "panel-elevated",
    label: "Elevated panel",
    description: "Title bars, selected groups, raised surfaces."
  },
  {
    id: "text",
    label: "Text",
    description: "Main foreground and readable copy."
  },
  {
    id: "muted",
    label: "Muted text",
    description: "Secondary labels and meta information."
  },
  {
    id: "accent",
    label: "Accent",
    description: "Primary interactive color."
  },
  {
    id: "accent-strong",
    label: "Accent depth",
    description: "Gradient partner for active controls."
  },
  {
    id: "border",
    label: "Borders",
    description: "Window outlines and separators."
  },
  {
    id: "success",
    label: "Success",
    description: "Terminal and positive status tones."
  },
  {
    id: "warning",
    label: "Warning",
    description: "Attention state color."
  },
  {
    id: "danger",
    label: "Danger",
    description: "Destructive action tone."
  }
];

export const presets = {
  "Solar Drift": {
    bg: "#0e1726",
    panel: "#182337",
    "panel-elevated": "#20304b",
    text: "#edf3ff",
    muted: "#9cb0cd",
    accent: "#4de2c5",
    "accent-strong": "#11c8a8",
    border: "#2d446b",
    success: "#9cf58b",
    warning: "#ffcf72",
    danger: "#ff7d8b"
  },
  "Graphite Bloom": {
    bg: "#151515",
    panel: "#212126",
    "panel-elevated": "#2b2b31",
    text: "#f6f3ed",
    muted: "#b1ada5",
    accent: "#f28c28",
    "accent-strong": "#dd5d17",
    border: "#44424f",
    success: "#8fe388",
    warning: "#f7c66b",
    danger: "#f06f7c"
  },
  "Northern Light": {
    bg: "#0d1b24",
    panel: "#17303c",
    "panel-elevated": "#1e4150",
    text: "#ebfeff",
    muted: "#98c6cf",
    accent: "#7dedff",
    "accent-strong": "#23c9f4",
    border: "#2f5a68",
    success: "#90f3c3",
    warning: "#f4dd76",
    danger: "#ff8d98"
  }
};

export function normalizeHex(value) {
  const normalized = `${value || ""}`.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : null;
}

export function hexToRgb(hex) {
  const safeHex = normalizeHex(hex) || "#000000";
  const numeric = parseInt(safeHex.slice(1), 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255
  };
}

export function hexToCsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r},${g},${b}`;
}

export function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function mixColors(hexA, hexB, amount) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const channels = ["r", "g", "b"].map((channel) =>
    Math.round(a[channel] + (b[channel] - a[channel]) * amount)
  );
  return `rgb(${channels.join(", ")})`;
}

export function blendHex(hexA, hexB, amount) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const channels = ["r", "g", "b"].map((channel) =>
    Math.round(a[channel] + (b[channel] - a[channel]) * amount)
  );
  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function lighten(hex, amount) {
  return blendHex(hex, "#ffffff", amount);
}

export function darken(hex, amount) {
  return blendHex(hex, "#000000", amount);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function applySemanticThemeAdjustments(themeTokens, semanticState = {}) {
  const theme = ensureTokenSet(themeTokens);
  const accent = normalizeHex(semanticState.accent) || theme.accent;
  const mood = clamp(Number(semanticState.mood || 0), -100, 100) / 100;
  const contrast = clamp(Number(semanticState.contrast || 0), -100, 100) / 100;
  const temperature = clamp(Number(semanticState.temperature || 0), -100, 100) / 100;
  const bias = semanticState.bias === "lighter" || semanticState.bias === "darker"
    ? semanticState.bias
    : "balanced";

  const warmedAccent = temperature >= 0
    ? blendHex(accent, "#ff9966", temperature * 0.18)
    : blendHex(accent, "#66b8ff", Math.abs(temperature) * 0.22);

  const nextTheme = structuredClone(theme);
  nextTheme.accent = warmedAccent;
  nextTheme["accent-strong"] = blendHex(
    warmedAccent,
    mood >= 0 ? "#ffffff" : "#000000",
    Math.abs(mood) * 0.32
  );

  nextTheme.panel = blendHex(nextTheme.panel, warmedAccent, clamp((mood + 1) * 0.08, 0, 0.2));
  nextTheme["panel-elevated"] = blendHex(
    nextTheme["panel-elevated"],
    warmedAccent,
    clamp((mood + 1) * 0.1, 0, 0.24)
  );
  nextTheme.border = blendHex(nextTheme.border, warmedAccent, clamp((contrast + 1) * 0.08, 0, 0.22));
  nextTheme.muted = blendHex(
    nextTheme.muted,
    contrast >= 0 ? "#ffffff" : nextTheme.panel,
    Math.abs(contrast) * 0.22
  );
  nextTheme.text = blendHex(
    nextTheme.text,
    contrast >= 0 ? "#ffffff" : nextTheme.muted,
    Math.abs(contrast) * 0.16
  );

  if (temperature >= 0) {
    nextTheme.warning = blendHex(nextTheme.warning, "#ffb066", temperature * 0.26);
    nextTheme.danger = blendHex(nextTheme.danger, "#ff8a72", temperature * 0.16);
    nextTheme.success = blendHex(nextTheme.success, "#b9ef8b", temperature * 0.12);
  } else {
    nextTheme.success = blendHex(nextTheme.success, "#8bd8f5", Math.abs(temperature) * 0.18);
    nextTheme.warning = blendHex(nextTheme.warning, "#d9d57f", Math.abs(temperature) * 0.12);
    nextTheme.danger = blendHex(nextTheme.danger, "#ff95b8", Math.abs(temperature) * 0.12);
  }

  if (bias === "lighter") {
    nextTheme.bg = blendHex(nextTheme.bg, "#ffffff", 0.12);
    nextTheme.panel = blendHex(nextTheme.panel, "#ffffff", 0.1);
    nextTheme["panel-elevated"] = blendHex(nextTheme["panel-elevated"], "#ffffff", 0.12);
  } else if (bias === "darker") {
    nextTheme.bg = blendHex(nextTheme.bg, "#000000", 0.18);
    nextTheme.panel = blendHex(nextTheme.panel, "#000000", 0.14);
    nextTheme["panel-elevated"] = blendHex(nextTheme["panel-elevated"], "#000000", 0.12);
  }

  return ensureTokenSet(nextTheme);
}

export function randomHex() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;
}

export function sanitizeThemeName(themeName) {
  return (themeName.trim() || "Untitled Theme").replace(/[^A-Za-z0-9_-]+/g, "-");
}

export function ensureTokenSet(tokens) {
  return Object.fromEntries(
    tokenDefinitions.map((token) => [
      token.id,
      normalizeHex(tokens?.[token.id]) || presets["Solar Drift"][token.id]
    ])
  );
}

export function createThemePayload(themeName, tokens) {
  return {
    name: themeName.trim() || "Untitled Theme",
    platform: "CachyOS",
    version: 1,
    generatedAt: new Date().toISOString(),
    tokens: ensureTokenSet(tokens)
  };
}

export function generatePlasmaColors(themeName, themeTokens) {
  const tokens = ensureTokenSet(themeTokens);
  const disabledText = hexToCsv(lighten(tokens.muted, 0.18));
  const inactiveText = hexToCsv(lighten(tokens.muted, 0.08));
  const hover = hexToCsv(lighten(tokens.accent, 0.1));
  const focus = hexToCsv(tokens.accent);
  const negative = hexToCsv(tokens.danger);
  const neutral = hexToCsv(tokens.warning);
  const positive = hexToCsv(tokens.success);
  const selection = hexToCsv(tokens.accent);

  return `[General]
ColorScheme=${sanitizeThemeName(themeName)}
Name=${themeName.trim() || "Untitled Theme"}
shadeSortColumn=true

[Colors:Button]
BackgroundNormal=${hexToCsv(tokens.panel)}
BackgroundAlternate=${hexToCsv(lighten(tokens.panel, 0.06))}
ForegroundNormal=${hexToCsv(tokens.text)}
ForegroundInactive=${inactiveText}
ForegroundActive=${focus}
ForegroundLink=${focus}
ForegroundVisited=${hexToCsv(tokens["accent-strong"])}
DecorationFocus=${focus}
DecorationHover=${hover}

[Colors:Complementary]
BackgroundNormal=${hexToCsv(darken(tokens.bg, 0.08))}
BackgroundAlternate=${hexToCsv(darken(tokens.panel, 0.05))}
ForegroundNormal=${hexToCsv(tokens.text)}
ForegroundInactive=${inactiveText}
ForegroundActive=${focus}
ForegroundLink=${focus}
ForegroundVisited=${hexToCsv(tokens["accent-strong"])}
DecorationFocus=${focus}
DecorationHover=${hover}

[Colors:Header]
BackgroundNormal=${hexToCsv(tokens["panel-elevated"])}
BackgroundAlternate=${hexToCsv(lighten(tokens["panel-elevated"], 0.04))}
ForegroundNormal=${hexToCsv(tokens.text)}
ForegroundInactive=${inactiveText}
ForegroundActive=${focus}
DecorationFocus=${focus}
DecorationHover=${hover}

[Colors:Selection]
BackgroundNormal=${selection}
BackgroundAlternate=${hexToCsv(lighten(tokens.accent, 0.14))}
ForegroundNormal=${hexToCsv(darken(tokens.text, 0.9))}
ForegroundInactive=${hexToCsv(darken(tokens.text, 0.74))}
ForegroundActive=${hexToCsv(darken(tokens.text, 0.9))}
DecorationFocus=${focus}
DecorationHover=${hover}

[Colors:Tooltip]
BackgroundNormal=${hexToCsv(lighten(tokens.panel, 0.05))}
BackgroundAlternate=${hexToCsv(tokens.panel)}
ForegroundNormal=${hexToCsv(tokens.text)}
ForegroundInactive=${inactiveText}
ForegroundActive=${focus}
DecorationFocus=${focus}
DecorationHover=${hover}

[Colors:View]
BackgroundNormal=${hexToCsv(tokens.bg)}
BackgroundAlternate=${hexToCsv(lighten(tokens.bg, 0.04))}
ForegroundNormal=${hexToCsv(tokens.text)}
ForegroundInactive=${inactiveText}
ForegroundActive=${focus}
ForegroundLink=${focus}
ForegroundVisited=${hexToCsv(tokens["accent-strong"])}
DecorationFocus=${focus}
DecorationHover=${hover}

[Colors:Window]
BackgroundNormal=${hexToCsv(tokens.panel)}
BackgroundAlternate=${hexToCsv(tokens["panel-elevated"])}
ForegroundNormal=${hexToCsv(tokens.text)}
ForegroundInactive=${inactiveText}
ForegroundActive=${focus}
ForegroundLink=${focus}
ForegroundVisited=${hexToCsv(tokens["accent-strong"])}
DecorationFocus=${focus}
DecorationHover=${hover}

[Colors:WM]
activeBackground=${hexToCsv(tokens["panel-elevated"])}
activeBlend=${hexToCsv(tokens.accent)}
activeForeground=${hexToCsv(tokens.text)}
inactiveBackground=${hexToCsv(tokens.panel)}
inactiveBlend=${hexToCsv(tokens.border)}
inactiveForeground=${inactiveText}

[Colors:Negative]
BackgroundNormal=${negative}
BackgroundAlternate=${hexToCsv(lighten(tokens.danger, 0.12))}
ForegroundNormal=${hexToCsv(tokens.text)}
ForegroundInactive=${disabledText}
ForegroundActive=${negative}
DecorationFocus=${negative}
DecorationHover=${hexToCsv(lighten(tokens.danger, 0.1))}

[Colors:Neutral]
BackgroundNormal=${neutral}
BackgroundAlternate=${hexToCsv(lighten(tokens.warning, 0.14))}
ForegroundNormal=${hexToCsv(darken(tokens.text, 0.85))}
ForegroundInactive=${hexToCsv(darken(tokens.text, 0.74))}
ForegroundActive=${neutral}
DecorationFocus=${neutral}
DecorationHover=${hexToCsv(lighten(tokens.warning, 0.08))}

[Colors:Positive]
BackgroundNormal=${positive}
BackgroundAlternate=${hexToCsv(lighten(tokens.success, 0.12))}
ForegroundNormal=${hexToCsv(darken(tokens.text, 0.85))}
ForegroundInactive=${hexToCsv(darken(tokens.text, 0.74))}
ForegroundActive=${positive}
DecorationFocus=${positive}
DecorationHover=${hexToCsv(lighten(tokens.success, 0.08))}`.trim();
}

export function generateGtkCss(themeName, themeTokens) {
  const tokens = ensureTokenSet(themeTokens);
  return `/* ${themeName.trim() || "Untitled Theme"}: GTK starter variables */
:root {
  --cachyos-bg: ${tokens.bg};
  --cachyos-panel: ${tokens.panel};
  --cachyos-panel-elevated: ${tokens["panel-elevated"]};
  --cachyos-text: ${tokens.text};
  --cachyos-muted: ${tokens.muted};
  --cachyos-accent: ${tokens.accent};
  --cachyos-accent-strong: ${tokens["accent-strong"]};
  --cachyos-border: ${tokens.border};
  --cachyos-success: ${tokens.success};
  --cachyos-warning: ${tokens.warning};
  --cachyos-danger: ${tokens.danger};
}

window,
.background {
  background: var(--cachyos-bg);
  color: var(--cachyos-text);
}

headerbar,
.titlebar,
.navigation-sidebar {
  background: var(--cachyos-panel-elevated);
  color: var(--cachyos-text);
  border-color: var(--cachyos-border);
}

button.suggested-action,
button:checked,
scale highlight,
progressbar progress {
  background: linear-gradient(135deg, var(--cachyos-accent), var(--cachyos-accent-strong));
  color: ${darken(tokens.text, 0.9)};
}

entry,
textview,
list,
popover,
dialog {
  background: var(--cachyos-panel);
  color: var(--cachyos-text);
  border-color: var(--cachyos-border);
}

.dim-label,
.caption,
.subtitle {
  color: var(--cachyos-muted);
}

.success {
  color: var(--cachyos-success);
}

.warning {
  color: var(--cachyos-warning);
}

.error,
.destructive-action {
  color: var(--cachyos-danger);
}`.trim();
}

export function generateGtkImportCss() {
  return `/* Generated by CachyOS Theme Studio */
@import url("cachyos-theme.css");`.trim();
}

export function generateKvantumConfig(themeName, themeTokens) {
  const tokens = ensureTokenSet(themeTokens);
  return `[General]
themeName=${sanitizeThemeName(themeName)}
comment=Generated by CachyOS Theme Studio
tint_on_mouse_over=12
tint_on_focus=18

[Palette]
window.color=${tokens.panel}
base.color=${tokens.bg}
alternatebase.color=${lighten(tokens.bg, 0.05)}
text.color=${tokens.text}
windowtext.color=${tokens.text}
button.color=${tokens.panel}
buttontext.color=${tokens.text}
highlight.color=${tokens.accent}
highlightedtext.color=${darken(tokens.text, 0.9)}
link.color=${tokens.accent}
visitedlink.color=${tokens["accent-strong"]}
mid.color=${tokens.border}
midlight.color=${lighten(tokens.border, 0.14)}
dark.color=${darken(tokens.panel, 0.18)}
shadow.color=${darken(tokens.bg, 0.28)}

[Colors]
tooltip.base=${lighten(tokens.panel, 0.06)}
tooltip.text=${tokens.text}
progress.indicator=${tokens.accent}
progress.track=${darken(tokens.panel, 0.08)}
focus.color=${tokens.accent}
tree.expander=${tokens.muted}
menu.border=${tokens.border}

[Hacks]
transparent_menutitle=true
respect_DE=true`.trim();
}

export function generateKvantumManagerConfig(themeName) {
  return `[General]
theme=${sanitizeThemeName(themeName)}`.trim();
}

export const outputTargets = {
  json: {
    label: "Theme JSON",
    extension: "json",
    hint: "Portable source theme payload for import, sync, and future generators.",
    generate: (themeName, tokens) =>
      JSON.stringify(createThemePayload(themeName, tokens), null, 2)
  },
  plasma: {
    label: "KDE Plasma Colors",
    extension: "colors",
    hint: "Starter `.colors` content for Plasma color schemes and desktop surfaces.",
    generate: (themeName, tokens) => generatePlasmaColors(themeName, tokens)
  },
  kvantum: {
    label: "Kvantum SVG Theme INI",
    extension: "kvconfig",
    hint: "Starter Kvantum config values mapped from the shared palette.",
    generate: (themeName, tokens) => generateKvantumConfig(themeName, tokens)
  },
  gtk: {
    label: "GTK CSS Variables",
    extension: "css",
    hint: "Palette variables and starter CSS surface rules for GTK/libadwaita-oriented work.",
    generate: (themeName, tokens) => generateGtkCss(themeName, tokens)
  }
};

export function buildThemeArtifacts(themeName, themeTokens) {
  const safeName = sanitizeThemeName(themeName);
  const tokens = ensureTokenSet(themeTokens);
  const payload = createThemePayload(themeName, tokens);

  return [
    {
      relativePath: `${safeName}/${safeName}.json`,
      content: JSON.stringify(payload, null, 2)
    },
    {
      relativePath: `${safeName}/plasma/${safeName}.colors`,
      content: generatePlasmaColors(themeName, tokens)
    },
    {
      relativePath: `${safeName}/kvantum/${safeName}/${safeName}.kvconfig`,
      content: generateKvantumConfig(themeName, tokens)
    },
    {
      relativePath: `${safeName}/gtk/gtk-3.0/cachyos-theme.css`,
      content: generateGtkCss(themeName, tokens)
    },
    {
      relativePath: `${safeName}/gtk/gtk-3.0/gtk.css`,
      content: generateGtkImportCss()
    },
    {
      relativePath: `${safeName}/gtk/gtk-4.0/cachyos-theme.css`,
      content: generateGtkCss(themeName, tokens)
    },
    {
      relativePath: `${safeName}/gtk/gtk-4.0/gtk.css`,
      content: generateGtkImportCss()
    },
    {
      relativePath: `${safeName}/README.txt`,
      content: [
        `Theme: ${themeName.trim() || "Untitled Theme"}`,
        "",
        "Generated by CachyOS Theme Studio.",
        "",
        "Plasma:",
        `  Copy plasma/${safeName}.colors to ~/.local/share/color-schemes/`,
        "",
        "Kvantum:",
        `  Copy kvantum/${safeName}/ to ~/.config/Kvantum/${safeName}/`,
        "",
        "GTK:",
        "  Copy gtk/gtk-3.0/gtk.css and cachyos-theme.css into ~/.config/gtk-3.0/",
        "  Copy gtk/gtk-4.0/gtk.css and cachyos-theme.css into ~/.config/gtk-4.0/"
      ].join("\n")
    }
  ];
}
