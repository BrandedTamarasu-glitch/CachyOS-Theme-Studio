import {
  applySemanticThemeAdjustments,
  buildThemeArtifacts,
  createThemePayload,
  ensureTokenSet,
  mixColors,
  normalizeHex,
  outputTargets,
  presets,
  randomHex,
  sanitizeThemeName,
  tokenDefinitions,
  withAlpha
} from "./theme-core.mjs";

const DEFAULT_PRESET_NAME = "Solar Drift";

const startFromPresetButton = document.querySelector("#startFromPreset");
const startFromDesktopButton = document.querySelector("#startFromDesktop");
const startFromWallpaperButton = document.querySelector("#startFromWallpaper");
const startFromSavedButton = document.querySelector("#startFromSaved");
const startFromImportButton = document.querySelector("#startFromImport");
const startSourceStatus = document.querySelector("#startSourceStatus");
const wallpaperFileInput = document.querySelector("#wallpaperFile");
const wallpaperControls = document.querySelector("#wallpaperControls");
const chooseWallpaperAgainButton = document.querySelector("#chooseWallpaperAgain");
const wallpaperStyleSelect = document.querySelector("#wallpaperStyle");
const wallpaperSwatches = document.querySelector("#wallpaperSwatches");
const wallpaperSourceState = document.querySelector("#wallpaperSourceState");
const wallpaperBiasDarkInput = document.querySelector("#wallpaperBiasDark");
const wallpaperPreserveAccentInput = document.querySelector("#wallpaperPreserveAccent");
const wallpaperSoftenNeutralsInput = document.querySelector("#wallpaperSoftenNeutrals");
const currentSource = document.querySelector("#currentSource");
const currentStageBadge = document.querySelector("#currentStageBadge");
const semanticAccentInput = document.querySelector("#semanticAccent");
const semanticMoodInput = document.querySelector("#semanticMood");
const semanticMoodValue = document.querySelector("#semanticMoodValue");
const semanticContrastInput = document.querySelector("#semanticContrast");
const semanticContrastValue = document.querySelector("#semanticContrastValue");
const semanticTemperatureInput = document.querySelector("#semanticTemperature");
const semanticTemperatureValue = document.querySelector("#semanticTemperatureValue");
const semanticBiasSelect = document.querySelector("#semanticBias");
const advancedEditorToggle = document.querySelector("#advancedEditorToggle");
const advancedEditorPanel = document.querySelector("#advancedEditorPanel");
const preflightReadiness = document.querySelector("#preflightReadiness");
const preflightImpact = document.querySelector("#preflightImpact");
const preflightWarnings = document.querySelector("#preflightWarnings");
const preflightBanner = document.querySelector("#preflightBanner");
const qualityContrast = document.querySelector("#qualityContrast");
const qualityContrastNote = document.querySelector("#qualityContrastNote");
const qualityAccent = document.querySelector("#qualityAccent");
const qualityAccentNote = document.querySelector("#qualityAccentNote");
const qualityMood = document.querySelector("#qualityMood");
const qualityMoodNote = document.querySelector("#qualityMoodNote");
const qualityBias = document.querySelector("#qualityBias");
const qualityBiasNote = document.querySelector("#qualityBiasNote");
const previewDecision = document.querySelector("#previewDecision");
const previewWindowsButton = document.querySelector("#previewWindows");
const previewWidgetsButton = document.querySelector("#previewWidgets");
const previewTerminalButton = document.querySelector("#previewTerminal");
const previewNotificationsButton = document.querySelector("#previewNotifications");
const previewReadabilityButton = document.querySelector("#previewReadability");
const themeNameInput = document.querySelector("#themeName");
const presetSelect = document.querySelector("#presetSelect");
const tokenFields = document.querySelector("#tokenFields");
const outputTargetSelect = document.querySelector("#outputTarget");
const outputHint = document.querySelector("#outputHint");
const exportOutput = document.querySelector("#exportOutput");
const resetThemeButton = document.querySelector("#resetTheme");
const randomizeThemeButton = document.querySelector("#randomizeTheme");
const saveThemeVariantButton = document.querySelector("#saveThemeVariant");
const copyOutputButton = document.querySelector("#copyOutput");
const downloadOutputButton = document.querySelector("#downloadOutput");
const importFileInput = document.querySelector("#importFile");
const detectEnvironmentButton = document.querySelector("#detectEnvironment");
const installThemeButton = document.querySelector("#installTheme");
const applyThemeButton = document.querySelector("#applyTheme");
const refreshLibraryButton = document.querySelector("#refreshLibrary");
const importLibraryThemeButton = document.querySelector("#importLibraryTheme");
const libraryImportFileInput = document.querySelector("#libraryImportFile");
const rollbackThemeButton = document.querySelector("#rollbackTheme");
const clearHistoryButton = document.querySelector("#clearHistory");
const resetUiStateButton = document.querySelector("#resetUiState");
const captureBaselineButton = document.querySelector("#captureBaseline");
const toggleCompareButton = document.querySelector("#toggleCompare");
const compareHint = document.querySelector("#compareHint");
const savedThemesContainer = document.querySelector("#savedThemes");
const themeHistoryContainer = document.querySelector("#themeHistory");
const librarySearchInput = document.querySelector("#librarySearch");
const librarySortSelect = document.querySelector("#librarySort");
const integrationHealthContainer = document.querySelector("#integrationHealth");
const environmentSummary = document.querySelector("#environmentSummary");
const desktopStatus = document.querySelector("#desktopStatus");
const desktopMode = document.querySelector("#desktopMode");
const desktopCanvas = document.querySelector("#desktopCanvas");
const previewHoverBadge = document.querySelector("#previewHoverBadge");
const compareStage = document.querySelector("#compareStage");
const baselineCanvas = document.querySelector("#baselineCanvas");
const currentCompareCanvas = document.querySelector("#currentCompareCanvas");
const compareBeforeLabel = document.querySelector("#compareBeforeLabel");
const compareAfterLabel = document.querySelector("#compareAfterLabel");

let currentPresetName = DEFAULT_PRESET_NAME;
let currentOutputTarget = "json";
let currentTheme = structuredClone(presets[currentPresetName]);
let baselineTheme = structuredClone(currentTheme);
let compareAfterTheme = structuredClone(currentTheme);
let tauriInvoke = null;
let lastLibraryState = null;
let lastIntegrationHealth = [];
let compareEnabled = false;
let saveUiStateTimer = null;
let selectedThemeSafeName = null;
let expandedDiagnosticIds = new Set();
let desktopIntegrationEnabled = false;
let desktopMutationInFlight = false;
let currentSourceType = "preset";
let currentPreviewMode = "windows";
let advancedEditorExpanded = false;
let lastEnvironment = null;
let semanticBaseTheme = structuredClone(currentTheme);
let librarySearchTerm = "";
let librarySortMode = "favorites-first";
let compareBeforeText = "Before";
let compareAfterText = "After";
let compareAfterTracksWorkingDraft = true;
let savedThemePreviewCache = new Map();
let libraryPreviewRequestToken = 0;
let hoveredLibraryPreview = null;
let favoriteThemeSafeNames = new Set();
let wallpaperExtractionStyle = "balanced";
let lastWallpaperColors = [];
let lastWallpaperFileLabel = "";
let wallpaperGenerationOptions = {
  favorDarkTones: false,
  preserveAccent: true,
  softenNeutrals: false
};

const sourceButtons = {
  preset: startFromPresetButton,
  desktop: startFromDesktopButton,
  wallpaper: startFromWallpaperButton,
  saved: startFromSavedButton,
  import: startFromImportButton
};

const previewModeButtons = {
  windows: previewWindowsButton,
  widgets: previewWidgetsButton,
  terminal: previewTerminalButton,
  notifications: previewNotificationsButton,
  readability: previewReadabilityButton
};

function renderPresetOptions() {
  presetSelect.innerHTML = "";
  Object.keys(presets).forEach((presetName) => {
    const option = document.createElement("option");
    option.value = presetName;
    option.textContent = presetName;
    presetSelect.append(option);
  });
  presetSelect.value = currentPresetName;
}

function renderOutputTargets() {
  outputTargetSelect.innerHTML = "";
  Object.entries(outputTargets).forEach(([id, target]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = target.label;
    outputTargetSelect.append(option);
  });
  outputTargetSelect.value = currentOutputTarget;
}

function renderTokenFields() {
  tokenFields.innerHTML = "";

  tokenDefinitions.forEach((token) => {
    const wrapper = document.createElement("div");
    wrapper.className = "token-field";

    const meta = document.createElement("div");
    meta.className = "token-meta";
    meta.innerHTML = `<label for="${token.id}-text">${token.label}</label><p>${token.description}</p>`;

    const inputs = document.createElement("div");
    inputs.className = "token-inputs";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = currentTheme[token.id];
    colorInput.setAttribute("aria-label", token.label);

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.id = `${token.id}-text`;
    textInput.value = currentTheme[token.id];
    textInput.setAttribute("inputmode", "text");

    colorInput.addEventListener("input", () => {
      updateToken(token.id, colorInput.value);
      textInput.value = colorInput.value;
    });

    textInput.addEventListener("change", () => {
      const normalizedValue = normalizeHex(textInput.value) || currentTheme[token.id];
      updateToken(token.id, normalizedValue);
      colorInput.value = normalizedValue;
      textInput.value = normalizedValue;
    });

    inputs.append(colorInput, textInput);
    wrapper.append(meta, inputs);
    tokenFields.append(wrapper);
  });
}

function getPerceivedLuminance(hex) {
  const safeHex = normalizeHex(hex) || "#000000";
  const red = Number.parseInt(safeHex.slice(1, 3), 16);
  const green = Number.parseInt(safeHex.slice(3, 5), 16);
  const blue = Number.parseInt(safeHex.slice(5, 7), 16);
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

function setSource(type, summary) {
  currentSourceType = type;

  Object.entries(sourceButtons).forEach(([sourceType, button]) => {
    if (!button) {
      return;
    }

    const active = sourceType === type;
    button.classList.toggle("active", active);
    button.classList.toggle("secondary", !active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  if (startSourceStatus) {
    startSourceStatus.textContent = summary;
  }

  if (currentSource) {
    currentSource.textContent = `Editing from: ${type === "saved" ? "Saved Theme" : type === "desktop" ? "Current Desktop" : type === "import" ? "Imported Theme" : type === "wallpaper" ? "Wallpaper / Image" : "Preset"}`;
  }

  if (currentStageBadge) {
    currentStageBadge.textContent = `Source: ${type === "saved" ? "Saved Theme" : type === "desktop" ? "Current Desktop" : type === "import" ? "Import" : type === "wallpaper" ? "Wallpaper" : "Preset"}`;
  }

  wallpaperControls?.classList.toggle("hidden", type !== "wallpaper");
  wallpaperControls?.setAttribute("aria-hidden", type === "wallpaper" ? "false" : "true");
  updateWallpaperControlState();
}

function updateWallpaperControlState() {
  if (!wallpaperSourceState) {
    return;
  }

  if (!lastWallpaperColors.length) {
    wallpaperSourceState.textContent = "No image selected yet. Choose one to generate a first draft.";
    return;
  }

  const sourceLabel = lastWallpaperFileLabel || "the last selected image";
  wallpaperSourceState.textContent = `Using colors from ${sourceLabel}. Adjust the feel here, then keep refining in Style.`;
}

function syncAdvancedEditorState() {
  if (!advancedEditorToggle || !advancedEditorPanel) {
    return;
  }

  advancedEditorToggle.setAttribute("aria-expanded", advancedEditorExpanded ? "true" : "false");
  advancedEditorToggle.textContent = advancedEditorExpanded
    ? "Hide Advanced Token Editing"
    : "Advanced Token Editing";
  advancedEditorPanel.classList.toggle("hidden", !advancedEditorExpanded);
  advancedEditorPanel.setAttribute("aria-hidden", advancedEditorExpanded ? "false" : "true");
}

function setPreviewMode(mode) {
  currentPreviewMode = mode;
  if (desktopCanvas) {
    desktopCanvas.dataset.previewMode = mode;
  }
  if (baselineCanvas) {
    baselineCanvas.dataset.previewMode = mode;
  }
  if (currentCompareCanvas) {
    currentCompareCanvas.dataset.previewMode = mode;
  }

  Object.entries(previewModeButtons).forEach(([buttonMode, button]) => {
    if (!button) {
      return;
    }

    const active = buttonMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  const modeText = {
    windows: "Previewing window chrome and main surfaces.",
    widgets: "Previewing controls, cards, and widget surfaces.",
    terminal: "Previewing terminal contrast and code readability.",
    notifications: "Previewing toast and badge readability.",
    readability: "Previewing text hierarchy, disabled states, and selection visibility."
  };

  if (currentStageBadge) {
    currentStageBadge.textContent = modeText[mode];
  }
}

function resetSemanticControlsFromTheme(theme) {
  semanticBaseTheme = structuredClone(theme);

  if (semanticAccentInput) {
    semanticAccentInput.value = theme.accent;
  }
  if (semanticMoodInput) {
    semanticMoodInput.value = "0";
  }
  if (semanticContrastInput) {
    semanticContrastInput.value = "0";
  }
  if (semanticTemperatureInput) {
    semanticTemperatureInput.value = "0";
  }
  if (semanticBiasSelect) {
    const luminance = getPerceivedLuminance(theme.bg);
    semanticBiasSelect.value = luminance < 0.24 ? "darker" : luminance > 0.5 ? "lighter" : "balanced";
  }

  updateSemanticLabels();
}

function updateSemanticLabels() {
  const moodValue = Number.parseInt(semanticMoodInput?.value || "0", 10);
  const contrastValue = Number.parseInt(semanticContrastInput?.value || "0", 10);
  const temperatureValue = Number.parseInt(semanticTemperatureInput?.value || "0", 10);

  if (semanticMoodValue) {
    semanticMoodValue.textContent =
      moodValue > 35 ? "Vivid" : moodValue < -35 ? "Calm" : "Balanced";
    semanticMoodInput?.setAttribute("aria-valuetext", semanticMoodValue.textContent);
  }
  if (semanticContrastValue) {
    semanticContrastValue.textContent =
      contrastValue > 35 ? "Strong" : contrastValue < -35 ? "Soft" : "Balanced";
    semanticContrastInput?.setAttribute("aria-valuetext", semanticContrastValue.textContent);
  }
  if (semanticTemperatureValue) {
    semanticTemperatureValue.textContent =
      temperatureValue > 35 ? "Warm" : temperatureValue < -35 ? "Cool" : "Balanced";
    semanticTemperatureInput?.setAttribute("aria-valuetext", semanticTemperatureValue.textContent);
  }
}

function applySemanticControls() {
  if (
    !semanticAccentInput ||
    !semanticMoodInput ||
    !semanticContrastInput ||
    !semanticTemperatureInput ||
    !semanticBiasSelect
  ) {
    return;
  }

  currentTheme = applySemanticThemeAdjustments(semanticBaseTheme, {
    accent: semanticAccentInput.value,
    mood: semanticMoodInput.value,
    contrast: semanticContrastInput.value,
    temperature: semanticTemperatureInput.value,
    bias: semanticBiasSelect.value
  });
  applyThemeToDocument();
  renderTokenFields();
  updateOutput();
  updateSemanticLabels();
  queueUiStateSave();
}

function renderQualitySummary(theme) {
  const textContrast = Math.abs(getPerceivedLuminance(theme.text) - getPerceivedLuminance(theme.panel));
  const accentContrast = Math.abs(getPerceivedLuminance(theme.accent) - getPerceivedLuminance(theme.panel));
  const backgroundLuminance = getPerceivedLuminance(theme.bg);
  let decisionTone = "balanced";
  let decisionTitle = "Balanced preview";
  let decisionCopy = "This draft looks usable so far. Switch surfaces to pressure-test contrast and emphasis.";

  if (qualityContrast) {
    qualityContrast.textContent =
      textContrast > 0.65 ? "Strong" : textContrast < 0.38 ? "Warning" : "Balanced";
  }
  if (qualityContrastNote) {
    qualityContrastNote.textContent =
      textContrast > 0.65
        ? "Text separation is strong and should stay readable across most surfaces."
        : textContrast < 0.38
          ? "Text may fade into panels on smaller widgets or lower-quality displays."
          : "Text and panel separation are in a safe middle range.";
  }
  if (qualityAccent) {
    qualityAccent.textContent =
      accentContrast > 0.35 ? "Visible" : accentContrast < 0.18 ? "Muted" : "Moderate";
  }
  if (qualityAccentNote) {
    qualityAccentNote.textContent =
      accentContrast > 0.35
        ? "Interactive highlights stand out clearly."
        : accentContrast < 0.18
          ? "Accent elements may disappear into surrounding surfaces."
          : "Interactive highlights are noticeable without dominating the layout.";
  }
  if (qualityMood) {
    qualityMood.textContent =
      getPerceivedLuminance(theme.accent) > 0.62 ? "Bright" : accentContrast > 0.3 ? "Vivid" : "Balanced";
  }
  if (qualityMoodNote) {
    qualityMoodNote.textContent =
      getPerceivedLuminance(theme.accent) > 0.62
        ? "The accent energy feels bright and forward."
        : accentContrast > 0.3
          ? "The palette has clear energy without becoming noisy."
          : "The overall palette energy feels measured rather than flat or loud.";
  }
  if (qualityBias) {
    qualityBias.textContent =
      backgroundLuminance < 0.22 ? "Darker" : backgroundLuminance > 0.5 ? "Lighter" : "Balanced";
  }
  if (qualityBiasNote) {
    qualityBiasNote.textContent =
      backgroundLuminance < 0.22
        ? "Surface weight leans dark, which helps drama but can hide subtle borders."
        : backgroundLuminance > 0.5
          ? "Surface weight leans light, which helps openness but can reduce depth."
          : "The base surfaces are neither overly dark nor washed out.";
  }

  if (textContrast < 0.38 || accentContrast < 0.18) {
    decisionTone = "warning";
    decisionTitle = "Needs readability review";
    decisionCopy = "At least one key signal is weak. Check Readability and Widgets before applying.";
  } else if (textContrast > 0.65 && accentContrast > 0.35) {
    decisionTone = "strong";
    decisionTitle = "Strong preview";
    decisionCopy = "Contrast and accents are both landing clearly. Compare mode should now focus on tone and balance.";
  }

  if (previewDecision) {
    previewDecision.className = `preview-decision preview-decision-${decisionTone}`;
    const title = previewDecision.querySelector("strong");
    const copy = previewDecision.querySelector("span");
    if (title) {
      title.textContent = decisionTitle;
    }
    if (copy) {
      copy.textContent = decisionCopy;
    }
  }
}

function renderReviewList(container, items, emptyText) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = `<p class="library-empty">${emptyText}</p>`;
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = `review-item${item.status ? ` ${item.status}` : ""}`;

    const label = document.createElement("strong");
    label.textContent = item.label;

    const value = document.createElement("span");
    value.textContent = item.value;

    row.append(label, value);
    container.append(row);
  });
}

function setPreflightBanner(tone, title, detail) {
  if (!preflightBanner) {
    return;
  }

  preflightBanner.className = `preflight-banner preflight-banner-${tone}`;
  preflightBanner.innerHTML = "";

  const heading = document.createElement("strong");
  heading.textContent = title;

  const copy = document.createElement("span");
  copy.textContent = detail;

  preflightBanner.append(heading, copy);
}

function renderPreflightSummary() {
  const readiness = [];
  const impacts = [
    {
      label: "Theme payload",
      value: `${sanitizeThemeName(themeNameInput.value || currentPresetName)} files are ready to write`,
      status: "info"
    },
    {
      label: "Targets",
      value: "Plasma colors, GTK imports, and Kvantum selector when available",
      status: "info"
    },
    {
      label: "Recovery",
      value: "Applying creates a restore point in recent history",
      status: "ready"
    }
  ];
  const warnings = [];
  let readyCount = 0;
  let cautionCount = 0;
  let blockedCount = 0;

  if (desktopIntegrationEnabled && lastEnvironment) {
    readiness.push(
      { label: "Desktop session", value: lastEnvironment.desktopSession || "Detected", status: "ready" },
      {
        label: "Plasma apply",
        value: lastEnvironment.plasmaApplyAvailable ? "Available for live activation" : "Missing, so live activation is limited",
        status: lastEnvironment.plasmaApplyAvailable ? "ready" : "warning"
      },
      { label: "GTK integration", value: "Managed import files supported", status: "ready" },
      {
        label: "Kvantum",
        value: lastEnvironment.kvantumManagerAvailable ? "Manager available" : "Manager missing, but selector files can still be written",
        status: lastEnvironment.kvantumManagerAvailable ? "ready" : "warning"
      }
    );
  } else {
    readiness.push({
      label: "Desktop bridge",
      value: "Launch the Tauri build to unlock install, apply, library, and rollback actions",
      status: "blocked"
    });
  }

  if (!desktopIntegrationEnabled) {
    warnings.push({
      label: "Apply mode",
      value: "You are still in preview-only mode until the desktop app is running",
      status: "blocked"
    });
  }

  lastIntegrationHealth.forEach((item) => {
    if (item.status !== "ready") {
      warnings.push({
        label: item.label,
        value: item.detail,
        status: item.status === "missing" ? "blocked" : "warning"
      });
    }
  });

  [...readiness, ...warnings].forEach((item) => {
    if (item.status === "ready") {
      readyCount += 1;
    } else if (item.status === "warning") {
      cautionCount += 1;
    } else if (item.status === "blocked") {
      blockedCount += 1;
    }
  });

  if (!desktopIntegrationEnabled) {
    setPreflightBanner(
      "blocked",
      "Preview only",
      "Launch the desktop app and run a desktop check before trying to install or apply."
    );
  } else if (blockedCount > 0) {
    setPreflightBanner(
      "blocked",
      "Fix blockers first",
      `${blockedCount} blocking issue${blockedCount === 1 ? "" : "s"} need attention before this is a confident apply.`
    );
  } else if (cautionCount > 0) {
    setPreflightBanner(
      "warning",
      "Ready with caution",
      `${readyCount} checks look good, but ${cautionCount} item${cautionCount === 1 ? "" : "s"} still deserve a review before you apply.`
    );
  } else {
    setPreflightBanner(
      "ready",
      "Ready to apply",
      "Desktop integration looks healthy and this draft has a clear recovery path."
    );
  }

  renderReviewList(preflightReadiness, readiness, "Run a desktop check to load readiness details for this session.");
  renderReviewList(preflightImpact, impacts, "Draft output details will appear here once the theme is ready to install.");
  renderReviewList(preflightWarnings, warnings, "No immediate desktop warnings detected.");
}

function getVisibleSavedThemes(savedThemes = []) {
  const normalizedSearch = librarySearchTerm.trim().toLowerCase();
  const filteredThemes = normalizedSearch
    ? savedThemes.filter((theme) =>
        `${theme.displayName} ${theme.safeName}`.toLowerCase().includes(normalizedSearch)
      )
    : [...savedThemes];

  filteredThemes.sort((left, right) => {
    const favoriteDelta =
      Number(favoriteThemeSafeNames.has(right.safeName)) - Number(favoriteThemeSafeNames.has(left.safeName));
    if (favoriteDelta !== 0 && librarySortMode === "favorites-first") {
      return favoriteDelta;
    }
    if (librarySortMode === "name-asc") {
      return left.displayName.localeCompare(right.displayName);
    }
    if (librarySortMode === "name-desc") {
      return right.displayName.localeCompare(left.displayName);
    }
    if (librarySortMode === "updated-asc") {
      return Number(left.updatedAt || 0) - Number(right.updatedAt || 0);
    }
    return Number(right.updatedAt || 0) - Number(left.updatedAt || 0);
  });

  return filteredThemes;
}

function formatHistoryLabel(entry, index, currentAppliedSafeName) {
  if (entry.safeName === currentAppliedSafeName) {
    return `Current snapshot: ${entry.displayName}`;
  }

  if (index === 0) {
    return `Latest saved restore point: ${entry.displayName}`;
  }

  if (index === 1 && currentAppliedSafeName) {
    return `Previous restore point: ${entry.displayName}`;
  }

  return `Applied snapshot: ${entry.displayName}`;
}

function toggleFavoriteTheme(safeName) {
  if (favoriteThemeSafeNames.has(safeName)) {
    favoriteThemeSafeNames.delete(safeName);
  } else {
    favoriteThemeSafeNames.add(safeName);
  }
  queueUiStateSave();
  if (lastLibraryState) {
    renderSavedThemes(lastLibraryState.savedThemes || [], lastLibraryState.currentAppliedSafeName || null);
  }
}

function getSavedThemePreview(theme) {
  return savedThemePreviewCache.get(theme.safeName) || null;
}

function describePreviewFeel(tokens) {
  const backgroundLuminance = getPerceivedLuminance(tokens.bg);
  const accentLuminance = getPerceivedLuminance(tokens.accent);
  const accentContrast = Math.abs(accentLuminance - getPerceivedLuminance(tokens.panel));

  const weight =
    backgroundLuminance < 0.22 ? "Dark" : backgroundLuminance > 0.52 ? "Light" : "Balanced";
  const energy =
    accentContrast > 0.34 ? "Vivid" : accentContrast < 0.18 ? "Soft" : "Steady";

  return `${weight} / ${energy}`;
}

function describePreviewReadability(tokens) {
  const textContrast = Math.abs(getPerceivedLuminance(tokens.text) - getPerceivedLuminance(tokens.panel));
  if (textContrast > 0.65) {
    return { label: "Easy read", tone: "good" };
  }
  if (textContrast < 0.38) {
    return { label: "Low contrast", tone: "warning" };
  }
  return { label: "Balanced read", tone: "balanced" };
}

function sortColorsByLuminance(colors) {
  return [...colors].sort((left, right) => getPerceivedLuminance(left) - getPerceivedLuminance(right));
}

function getWallpaperGenerationOptions() {
  return {
    favorDarkTones: Boolean(wallpaperBiasDarkInput?.checked),
    preserveAccent: wallpaperPreserveAccentInput ? wallpaperPreserveAccentInput.checked : true,
    softenNeutrals: Boolean(wallpaperSoftenNeutralsInput?.checked)
  };
}

function rebuildWallpaperDraftFromLastColors(statusMessage) {
  if (!lastWallpaperColors.length) {
    return;
  }

  wallpaperGenerationOptions = getWallpaperGenerationOptions();
  const nextName = themeNameInput.value.trim() || "Wallpaper Draft";
  const payload = buildThemeFromImagePalette(
    nextName,
    lastWallpaperColors,
    wallpaperExtractionStyle,
    wallpaperGenerationOptions
  );
  loadImportedTheme(payload);
  updateOutput();
  setSource("wallpaper", statusMessage);
  updateWallpaperControlState();
}

function renderWallpaperSwatches(colors = []) {
  if (!wallpaperSwatches) {
    return;
  }

  wallpaperSwatches.innerHTML = "";
  const visibleColors = colors.length ? colors.slice(0, 6) : new Array(6).fill(null);
  visibleColors.forEach((color) => {
    const swatch = document.createElement("span");
    swatch.className = `wallpaper-swatch${color ? "" : " placeholder"}`;
    if (color) {
      swatch.style.background = color;
    }
    wallpaperSwatches.append(swatch);
  });

  updateWallpaperControlState();
}

function buildThemeFromImagePalette(
  name,
  colors,
  style = wallpaperExtractionStyle,
  options = wallpaperGenerationOptions
) {
  const sortedColors = sortColorsByLuminance(colors);
  const darkest = sortedColors[0] || "#10141d";
  const lightest = sortedColors.at(-1) || "#f3f6fb";
  const mid = sortedColors[Math.floor(sortedColors.length / 2)] || "#7a8aa0";
  const accent = options.preserveAccent ? sortedColors.at(-1) || mid : sortedColors.at(-2) || mid;
  const accentStrong = options.preserveAccent ? sortedColors.at(-2) || accent : sortedColors.at(-3) || accent;

  const nextTheme = ensureTokenSet(structuredClone(presets["Solar Drift"]));
  if (style === "moody") {
    nextTheme.bg = mixColors(darkest, "#04060a", options.favorDarkTones ? 0.74 : 0.62);
    nextTheme.panel = mixColors(mid, nextTheme.bg, options.softenNeutrals ? 0.8 : 0.72);
    nextTheme.border = mixColors(lightest, nextTheme.panel, 0.82);
    nextTheme.accent = mixColors(accent, darkest, 0.2);
    nextTheme["accent-strong"] = mixColors(accentStrong, accent, 0.24);
    nextTheme.text = "#f4f7fb";
    nextTheme.muted = mixColors(nextTheme.text, nextTheme.panel, 0.58);
  } else if (style === "punchy") {
    nextTheme.bg = mixColors(darkest, "#0a1020", options.favorDarkTones ? 0.42 : 0.28);
    nextTheme.panel = mixColors(mid, nextTheme.bg, options.softenNeutrals ? 0.58 : 0.48);
    nextTheme.border = mixColors(lightest, nextTheme.panel, 0.68);
    nextTheme.accent = mixColors(accent, lightest, 0.1);
    nextTheme["accent-strong"] = mixColors(accentStrong, accent, 0.08);
    nextTheme.text = getPerceivedLuminance(nextTheme.panel) < 0.42 ? "#f7fbff" : "#101722";
    nextTheme.muted = mixColors(nextTheme.text, nextTheme.panel, 0.42);
  } else {
    nextTheme.bg = mixColors(darkest, "#06080d", options.favorDarkTones ? 0.58 : 0.45);
    nextTheme.panel = mixColors(mid, nextTheme.bg, options.softenNeutrals ? 0.72 : 0.62);
    nextTheme.border = mixColors(lightest, nextTheme.panel, 0.78);
    nextTheme.accent = accent;
    nextTheme["accent-strong"] = mixColors(accentStrong, accent, 0.45);
    nextTheme.text = getPerceivedLuminance(nextTheme.panel) < 0.36 ? "#f4f7fb" : "#16202b";
    nextTheme.muted = mixColors(nextTheme.text, nextTheme.panel, 0.52);
  }
  nextTheme.success = mixColors(nextTheme.accent, "#7ee6a2", 0.58);
  nextTheme.warning = mixColors(nextTheme.accent, "#ffb347", 0.52);
  nextTheme.error = mixColors(nextTheme["accent-strong"], "#ff6b81", 0.48);
  return createThemePayload(name, nextTheme);
}

async function extractPaletteFromImage(file) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Image could not be loaded."));
      nextImage.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Canvas context unavailable.");
    }

    const width = 48;
    const height = Math.max(1, Math.round((image.height / image.width) * width));
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const { data } = context.getImageData(0, 0, width, height);
    const buckets = new Map();

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha < 180) {
        continue;
      }

      const red = Math.round(data[index] / 32) * 32;
      const green = Math.round(data[index + 1] / 32) * 32;
      const blue = Math.round(data[index + 2] / 32) * 32;
      const key = `${red},${green},${blue}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    const colors = [...buckets.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([key]) => {
        const [red, green, blue] = key.split(",").map((value) => Number(value).toString(16).padStart(2, "0"));
        return `#${red}${green}${blue}`;
      });

    if (!colors.length) {
      throw new Error("No usable colors found in the image.");
    }

    return colors;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function importWallpaperFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const colors = await extractPaletteFromImage(file);
    lastWallpaperColors = colors;
    lastWallpaperFileLabel = file.name;
    wallpaperGenerationOptions = getWallpaperGenerationOptions();
    renderWallpaperSwatches(colors);
    const imageName = file.name.replace(/\.[^.]+$/, "") || "Wallpaper Draft";
    const payload = buildThemeFromImagePalette(
      imageName,
      colors,
      wallpaperExtractionStyle,
      wallpaperGenerationOptions
    );
    loadImportedTheme(payload);
    currentOutputTarget = "json";
    outputTargetSelect.value = "json";
    updateOutput();
    setSource("wallpaper", `Built a first draft from ${file.name}. Review the generated palette, then fine-tune it before saving or applying.`);
    setDesktopStatus(`Image palette extracted from ${file.name}.`);
  } catch (error) {
    setDesktopStatus(`Wallpaper import failed.\n${describeDesktopError(error)}`);
  } finally {
    wallpaperFileInput.value = "";
  }
}

function syncPreviewHoverBadge() {
  if (!previewHoverBadge) {
    return;
  }

  if (!hoveredLibraryPreview) {
    previewHoverBadge.hidden = true;
    previewHoverBadge.textContent = "Library preview";
    return;
  }

  previewHoverBadge.hidden = false;
  previewHoverBadge.textContent = `Previewing: ${hoveredLibraryPreview.displayName}`;
}

function syncPrimaryPreviewSurface() {
  applyThemeToPreviewSurface(
    desktopCanvas,
    hoveredLibraryPreview?.tokens || currentTheme,
    hoveredLibraryPreview ? [] : currentSourceType === "wallpaper" ? lastWallpaperColors : []
  );
  syncPreviewHoverBadge();
}

function setHoveredLibraryPreview(theme, tokens) {
  hoveredLibraryPreview = {
    safeName: theme.safeName,
    displayName: theme.displayName,
    tokens
  };
  syncPrimaryPreviewSurface();
}

function clearHoveredLibraryPreview(safeName = null) {
  if (!hoveredLibraryPreview) {
    return;
  }
  if (safeName && hoveredLibraryPreview.safeName !== safeName) {
    return;
  }
  hoveredLibraryPreview = null;
  syncPrimaryPreviewSurface();
}

function queueLibraryPreviewWarm(savedThemes) {
  if (!tauriInvoke || !savedThemes.length) {
    return;
  }

  const pendingThemes = savedThemes.filter((theme) => !savedThemePreviewCache.has(theme.safeName));
  if (!pendingThemes.length) {
    return;
  }

  const requestToken = ++libraryPreviewRequestToken;

  void Promise.all(
    pendingThemes.map(async (theme) => {
      try {
        const payload = await loadSavedThemePayload(theme.safeName);
        return [theme.safeName, ensureTokenSet(payload?.tokens || {})];
      } catch {
        return null;
      }
    })
  ).then((results) => {
    if (requestToken !== libraryPreviewRequestToken) {
      return;
    }

    let updated = false;
    results.forEach((entry) => {
      if (!entry) {
        return;
      }
      const [safeName, tokens] = entry;
      savedThemePreviewCache.set(safeName, tokens);
      updated = true;
    });

    if (updated && lastLibraryState) {
      renderSavedThemes(lastLibraryState.savedThemes || [], lastLibraryState.currentAppliedSafeName || null);
    }
  });
}

function formatSafeNameLabel(safeName) {
  return safeName.replace(/-/g, " ");
}

function describeSavedThemeStatus(theme, isCurrent, isSelected) {
  if (isCurrent && isSelected) {
    return "Currently applied on the desktop and pinned as the saved-theme compare base.";
  }

  if (isCurrent) {
    return "Currently applied on the desktop. Load it to edit or compare it against another snapshot.";
  }

  if (isSelected) {
    return "Pinned as the saved-theme compare base. Choose another saved theme and press Compare to review them side by side.";
  }

  if (theme.displayName !== formatSafeNameLabel(theme.safeName)) {
    return "Custom display label saved over the original snapshot id, useful for variants and renamed library themes.";
  }

  return "Saved library snapshot ready to load, compare, duplicate, or export.";
}

function describeSavedThemeCompare(theme, savedThemes) {
  if (!selectedThemeSafeName) {
    return `Compare against the working draft, or select this card as the compare base for a saved-vs-saved review.`;
  }

  if (selectedThemeSafeName === theme.safeName) {
    return "This card is the compare base. Pick a different saved theme and press Compare to open a saved-vs-saved preview.";
  }

  const compareBaseTheme = savedThemes.find((entry) => entry.safeName === selectedThemeSafeName);
  const compareBaseName = compareBaseTheme?.displayName || selectedThemeSafeName;
  return `Ready to compare directly against ${compareBaseName}.`;
}

function applyThemeToDocument() {
  if (compareAfterTracksWorkingDraft) {
    compareAfterTheme = structuredClone(currentTheme);
  }
  tokenDefinitions.forEach((token) => {
    document.documentElement.style.setProperty(`--${token.id}`, currentTheme[token.id]);
  });
  updateWallpaper();
  syncPrimaryPreviewSurface();
  applyThemeToPreviewSurface(currentCompareCanvas, compareAfterTheme);
  applyThemeToPreviewSurface(baselineCanvas, baselineTheme);
  renderQualitySummary(currentTheme);
}

function updateToken(tokenId, value) {
  currentTheme[tokenId] = value;
  semanticBaseTheme = structuredClone(currentTheme);
  document.documentElement.style.setProperty(`--${tokenId}`, value);
  updateWallpaper();
  renderQualitySummary(currentTheme);
  resetSemanticControlsFromTheme(currentTheme);
  updateOutput();
  queueUiStateSave();
}

function updateWallpaper() {
  const wallpaper = buildWallpaperGradient(
    currentTheme,
    currentSourceType === "wallpaper" ? lastWallpaperColors : []
  );
  document.documentElement.style.setProperty("--desktop-wallpaper", wallpaper);
}

function buildWallpaperGradient(theme, imageColors = []) {
  const firstImageColor = imageColors[0] || theme.accent;
  const secondImageColor = imageColors[1] || theme["accent-strong"];
  const thirdImageColor = imageColors[2] || theme.panel;
  const paletteStrength = imageColors.length ? 0.22 : 0;

  return `
    radial-gradient(circle at 18% 18%, ${withAlpha(mixColors(firstImageColor, theme.accent, 0.18), 0.26)}, transparent 30%),
    radial-gradient(circle at 78% 14%, ${withAlpha(mixColors(secondImageColor, theme["accent-strong"], 0.2), 0.22)}, transparent 24%),
    radial-gradient(circle at 52% 78%, ${withAlpha(mixColors(thirdImageColor, theme.panel, 0.26), paletteStrength)}, transparent 32%),
    linear-gradient(135deg, ${mixColors(theme.bg, "#000000", 0.4)} 0%, ${mixColors(theme.panel, firstImageColor, 0.18)} 46%, ${mixColors(theme.bg, secondImageColor, 0.08)} 100%)
  `;
}

function applyThemeToPreviewSurface(surface, theme, imageColors = []) {
  if (!surface) {
    return;
  }

  tokenDefinitions.forEach((token) => {
    surface.style.setProperty(`--${token.id}`, theme[token.id]);
  });

  surface.style.setProperty(
    "--desktop-wallpaper",
    buildWallpaperGradient(theme, imageColors)
  );
}

function updateOutput() {
  const target = outputTargets[currentOutputTarget];
  outputHint.textContent = target.hint;
  exportOutput.value =
    currentOutputTarget === "json"
      ? JSON.stringify(createThemePayload(themeNameInput.value, currentTheme), null, 2)
      : target.generate(themeNameInput.value, currentTheme);
}

function syncCompareLabels() {
  if (compareBeforeLabel) {
    compareBeforeLabel.textContent = compareBeforeText;
  }
  if (compareAfterLabel) {
    compareAfterLabel.textContent = compareAfterText;
  }
}

function setCompareLabels(beforeText = "Before", afterText = "After") {
  compareBeforeText = beforeText;
  compareAfterText = afterText;
  syncCompareLabels();
}

function resetEditorState() {
  currentPresetName = DEFAULT_PRESET_NAME;
  currentOutputTarget = "json";
  currentTheme = structuredClone(presets[DEFAULT_PRESET_NAME]);
  baselineTheme = structuredClone(currentTheme);
  compareAfterTheme = structuredClone(currentTheme);
  compareAfterTracksWorkingDraft = true;
  compareEnabled = false;
  setCompareLabels("Before", "After");
  selectedThemeSafeName = null;
  favoriteThemeSafeNames = new Set();
  expandedDiagnosticIds = new Set();

  themeNameInput.value = DEFAULT_PRESET_NAME;
  presetSelect.value = DEFAULT_PRESET_NAME;
  outputTargetSelect.value = "json";
  compareStage?.classList.add("hidden");
  syncCompareToggleState();

  applyThemeToDocument();
  resetSemanticControlsFromTheme(currentTheme);
  renderTokenFields();
  renderIntegrationHealth(lastIntegrationHealth);
  renderPreflightSummary();
  setSource("preset", "Start from a preset to generate a first draft, then shape it before applying anything.");
  setPreviewMode("windows");
  updateOutput();
  if (lastLibraryState) {
    renderSavedThemes(lastLibraryState.savedThemes || [], lastLibraryState.currentAppliedSafeName || null);
    renderThemeHistory(lastLibraryState.recentHistory || [], lastLibraryState.currentAppliedSafeName || null);
  }
}

function loadPreset(presetName) {
  currentPresetName = presetName;
  currentTheme = structuredClone(presets[presetName]);
  themeNameInput.value = presetName;
  semanticBaseTheme = structuredClone(currentTheme);
  compareAfterTheme = structuredClone(currentTheme);
  compareAfterTracksWorkingDraft = true;
  setCompareLabels("Before", "After");
  applyThemeToDocument();
  resetSemanticControlsFromTheme(currentTheme);
  renderTokenFields();
  updateOutput();
  setSource("preset", `Started from preset ${presetName}. Shape it with the controls before applying anything.`);
  queueUiStateSave();
}

function loadImportedTheme(payload) {
  const importedName =
    typeof payload?.name === "string" && payload.name.trim()
      ? payload.name.trim()
      : "Imported Theme";

  currentTheme = ensureTokenSet(payload?.tokens || {});
  currentPresetName = importedName;
  themeNameInput.value = importedName;
  semanticBaseTheme = structuredClone(currentTheme);
  compareAfterTheme = structuredClone(currentTheme);
  compareAfterTracksWorkingDraft = true;
  setCompareLabels("Before", "After");
  applyThemeToDocument();
  resetSemanticControlsFromTheme(currentTheme);
  renderTokenFields();
  updateOutput();
  queueUiStateSave();
}

async function copyCurrentOutput() {
  try {
    await navigator.clipboard.writeText(exportOutput.value);
    copyOutputButton.textContent = "Copied";
  } catch {
    copyOutputButton.textContent = "Clipboard blocked";
  }
  window.setTimeout(() => {
    copyOutputButton.textContent = "Copy Output";
  }, 1200);
}

function downloadCurrentOutput() {
  const target = outputTargets[currentOutputTarget];
  const blob = new Blob([exportOutput.value], { type: "text/plain;charset=utf-8" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${sanitizeThemeName(themeNameInput.value || "untitled-theme")}.${target.extension}`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

async function importThemeFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    loadImportedTheme(payload);
    currentOutputTarget = "json";
    outputTargetSelect.value = "json";
    updateOutput();
    setSource("import", `Imported ${file.name}. Review the generated draft before saving or applying it.`);
  } catch {
    outputHint.textContent = "Import failed. Expected the exported Theme JSON structure.";
  } finally {
    importFileInput.value = "";
  }
}

async function initializeDesktopBridge() {
  const tauriSignals = Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__ || window.__TAURI_IPC__);
  if (!tauriSignals) {
    setDesktopAvailability(false);
    return;
  }

  try {
    const tauriCore = await import("@tauri-apps/api/core");
    tauriInvoke = tauriCore.invoke;
    setDesktopAvailability(true);
    await restoreUiState();
    await detectEnvironment();
    await refreshThemeLibrary();
  } catch (error) {
    setDesktopAvailability(false, `Tauri bridge unavailable: ${describeDesktopError(error)}`);
  }
}

function parseStoredThemeJson(rawThemeJson) {
  if (typeof rawThemeJson !== "string" || !rawThemeJson.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawThemeJson);
  } catch {
    return null;
  }
}

function describeDesktopError(error) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  if (error === undefined) {
    return "Unknown error.";
  }

  return String(error);
}

async function restoreUiState() {
  if (!tauriInvoke) {
    return;
  }

  try {
    const state = await tauriInvoke("load_ui_state");
    if (!state) {
      return;
    }

    if (typeof state.outputTarget === "string" && state.outputTarget in outputTargets) {
      currentOutputTarget = state.outputTarget;
      outputTargetSelect.value = currentOutputTarget;
    }

    if (typeof state.selectedThemeSafeName === "string" && state.selectedThemeSafeName.trim()) {
      selectedThemeSafeName = state.selectedThemeSafeName;
    }

    if (Array.isArray(state.favoriteThemeSafeNames)) {
      favoriteThemeSafeNames = new Set(
        state.favoriteThemeSafeNames.filter((value) => typeof value === "string" && value.trim())
      );
    }

    if (Array.isArray(state.expandedDiagnosticIds)) {
      expandedDiagnosticIds = new Set(
        state.expandedDiagnosticIds.filter((value) => typeof value === "string" && value.trim())
      );
    }

    const currentPayload = parseStoredThemeJson(state.currentThemeJson);
    if (currentPayload) {
      const payload = currentPayload;
      currentTheme = ensureTokenSet(payload?.tokens || {});
      currentPresetName =
        typeof payload?.name === "string" && payload.name.trim()
          ? payload.name.trim()
          : currentPresetName;
      themeNameInput.value = currentPresetName;
    }

    const baselinePayload = parseStoredThemeJson(state.baselineThemeJson);
    if (baselinePayload) {
      const payload = baselinePayload;
      baselineTheme = ensureTokenSet(payload?.tokens || {});
    }

    compareAfterTheme = structuredClone(currentTheme);
    compareAfterTracksWorkingDraft = true;

    compareEnabled = Boolean(state.compareEnabled);
    compareStage?.classList.toggle("hidden", !compareEnabled);
    syncCompareToggleState();

    applyThemeToDocument();
    resetSemanticControlsFromTheme(currentTheme);
    renderTokenFields();
    renderPreflightSummary();
    updateOutput();
  } catch (error) {
    setDesktopStatus(`UI state restore failed.\n${describeDesktopError(error)}`);
  }
}

function queueUiStateSave() {
  if (!tauriInvoke) {
    return;
  }

  if (saveUiStateTimer) {
    window.clearTimeout(saveUiStateTimer);
  }

  saveUiStateTimer = window.setTimeout(() => {
    void persistUiState();
  }, 180);
}

async function persistUiState() {
  if (!tauriInvoke) {
    return;
  }

  try {
    await tauriInvoke("save_ui_state", {
      state: {
        currentThemeJson: JSON.stringify(createThemePayload(themeNameInput.value, currentTheme)),
        baselineThemeJson: JSON.stringify(createThemePayload(`${themeNameInput.value} Baseline`, baselineTheme)),
        compareEnabled,
        outputTarget: currentOutputTarget,
        selectedThemeSafeName,
        favoriteThemeSafeNames: Array.from(favoriteThemeSafeNames),
        expandedDiagnosticIds: Array.from(expandedDiagnosticIds)
      }
    });
  } catch {
    // Ignore persistence failures; they should not block editing.
  }
}

function setDesktopAvailability(enabled, message = "") {
  desktopIntegrationEnabled = enabled;

  if (desktopMode) {
    desktopMode.textContent = enabled ? "Desktop integration enabled" : "Web preview mode";
  }

  syncDesktopActionAvailability();

  if (!enabled && environmentSummary) {
    environmentSummary.textContent =
      message || "Launch the Tauri app to enable direct desktop integration.";
  }

  if (!enabled) {
    renderSavedThemes([], null);
    renderThemeHistory([]);
    renderIntegrationHealth([]);
  }

  renderPreflightSummary();
}

function syncDesktopActionAvailability() {
  const canUseDesktopButtons = desktopIntegrationEnabled && !desktopMutationInFlight;

  if (detectEnvironmentButton) {
    detectEnvironmentButton.disabled = !canUseDesktopButtons;
  }
  if (installThemeButton) {
    installThemeButton.disabled = !canUseDesktopButtons;
  }
  if (applyThemeButton) {
    applyThemeButton.disabled = !canUseDesktopButtons;
  }
  if (refreshLibraryButton) {
    refreshLibraryButton.disabled = !canUseDesktopButtons;
  }
  if (importLibraryThemeButton) {
    importLibraryThemeButton.disabled = !canUseDesktopButtons;
  }
  if (saveThemeVariantButton) {
    saveThemeVariantButton.disabled = !canUseDesktopButtons;
  }
  if (rollbackThemeButton) {
    rollbackThemeButton.disabled =
      !canUseDesktopButtons || !(lastLibraryState?.canRollback);
  }
  if (clearHistoryButton) {
    clearHistoryButton.disabled =
      !canUseDesktopButtons || !((lastLibraryState?.recentHistory || []).length);
  }
  if (resetUiStateButton) {
    resetUiStateButton.disabled = !canUseDesktopButtons;
  }
}

async function runDesktopMutation(startMessage, task) {
  if (!tauriInvoke) {
    return null;
  }

  if (desktopMutationInFlight) {
    setDesktopStatus("Another desktop action is already running.");
    return null;
  }

  desktopMutationInFlight = true;
  syncDesktopActionAvailability();
  if (savedThemesContainer && lastLibraryState) {
    renderSavedThemes(lastLibraryState.savedThemes || [], lastLibraryState.currentAppliedSafeName || null);
  }
  if (integrationHealthContainer) {
    renderIntegrationHealth(lastIntegrationHealth);
  }
  setDesktopStatus(startMessage);

  try {
    return await task();
  } finally {
    desktopMutationInFlight = false;
    syncDesktopActionAvailability();
    if (savedThemesContainer && lastLibraryState) {
      renderSavedThemes(lastLibraryState.savedThemes || [], lastLibraryState.currentAppliedSafeName || null);
    }
    if (integrationHealthContainer) {
      renderIntegrationHealth(lastIntegrationHealth);
    }
  }
}

async function detectEnvironment() {
  if (!tauriInvoke) {
    return;
  }

  setDesktopStatus("Detecting desktop session...");

  try {
    const environment = await tauriInvoke("detect_environment");
    lastEnvironment = environment;
    environmentSummary.textContent = formatEnvironmentSummary(environment);
    setDesktopStatus(formatEnvironmentStatus(environment));
    lastIntegrationHealth = environment.integrationHealth || [];
    renderIntegrationHealth(lastIntegrationHealth);
    renderPreflightSummary();
  } catch (error) {
    setDesktopStatus(`Environment detection failed.\n${describeDesktopError(error)}`);
  }
}

function formatEnvironmentSummary(environment) {
  return [
    `Session: ${environment.desktopSession || "unknown"} on ${environment.xdgCurrentDesktop || "unknown desktop"}`,
    `Current applied theme: ${environment.currentAppliedSafeName || "none"}`,
    `Live apply path: ${environment.plasmaApplyAvailable ? "available" : "limited"}`,
    `Kvantum manager: ${environment.kvantumManagerAvailable ? "available" : "missing"}`,
    `Home: ${environment.homeDir || "unknown"}`
  ].join("\n");
}

function formatEnvironmentStatus(environment) {
  return [
    "Desktop environment detected.",
    `Desktop session: ${environment.desktopSession || "unknown"}`,
    `XDG current desktop: ${environment.xdgCurrentDesktop || "unknown"}`,
    `Home directory: ${environment.homeDir || "unknown"}`,
    `Plasma activation command: ${environment.plasmaApplyAvailable ? "available" : "missing"}`,
    `Kvantum manager: ${environment.kvantumManagerAvailable ? "available" : "missing"}`,
    `Current applied theme: ${environment.currentAppliedSafeName || "none"}`
  ].join("\n");
}

function renderIntegrationHealth(healthItems) {
  if (!integrationHealthContainer) {
    return;
  }

  integrationHealthContainer.innerHTML = "";
  if (!healthItems.length) {
    integrationHealthContainer.innerHTML = `<p class="library-empty">Run a desktop check to load integration health details.</p>`;
    renderPreflightSummary();
    return;
  }

  healthItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = `health-item ${item.status}`;
    const title = document.createElement("h3");
    title.textContent = item.label;

    const detail = document.createElement("p");
    detail.textContent = item.detail;

    card.append(title, detail);

    if (item.actionLabel) {
      const actions = document.createElement("div");
      actions.className = "button-row health-actions";

      const actionButton = document.createElement("button");
      actionButton.className = "secondary";
      actionButton.textContent = item.actionLabel;
      actionButton.disabled = desktopMutationInFlight;
      actionButton.addEventListener("click", () => {
        void runHealthAction(item.id, item.actionLabel);
      });

      actions.append(actionButton);
      card.append(actions);
    }

    if (item.diagnostics?.length) {
      const details = document.createElement("details");
      details.className = "health-diagnostics";
      details.open = expandedDiagnosticIds.has(item.id);
      details.addEventListener("toggle", () => {
        if (details.open) {
          expandedDiagnosticIds.add(item.id);
        } else {
          expandedDiagnosticIds.delete(item.id);
        }
        queueUiStateSave();
      });

      const summary = document.createElement("summary");
      summary.textContent = "Diagnostics";
      details.append(summary);

      const grid = document.createElement("div");
      grid.className = "health-diagnostics-grid";

      item.diagnostics.forEach((entry) => {
        const row = document.createElement("div");
        const label = document.createElement("strong");
        label.textContent = entry.label;

        const value = document.createElement("span");
        value.textContent = entry.value;

        row.append(label, value);
        grid.append(row);
      });

      details.append(grid);
      card.append(details);
    }

    integrationHealthContainer.append(card);
  });

  renderPreflightSummary();
}

async function runHealthAction(targetId, label) {
  if (!tauriInvoke) {
    return;
  }

  await runDesktopMutation(`${label}...`, async () => {
    try {
      const result = await tauriInvoke("run_health_action", {
        request: { targetId }
      });
      syncEditorWithResult(result);
      setDesktopStatus(formatApplyResult(result));
      queueUiStateSave();
      await detectEnvironment();
    } catch (error) {
      setDesktopStatus(`Health action failed.\n${describeDesktopError(error)}`);
    }
  });
}

function buildDesktopRequest(activate) {
  const payload = createThemePayload(themeNameInput.value, currentTheme);
  const artifacts = buildThemeArtifacts(payload.name, payload.tokens);

  return {
    themeName: payload.name,
    themeJson: JSON.stringify(payload, null, 2),
    plasmaColors: getArtifactContent(artifacts, ".colors"),
    kvantumConfig: getArtifactContent(artifacts, ".kvconfig"),
    gtkCss: getArtifactContent(artifacts, "gtk/gtk-3.0/cachyos-theme.css"),
    activate
  };
}

function getArtifactContent(artifacts, suffix) {
  const artifact = artifacts.find((entry) => entry.relativePath.endsWith(suffix));
  return artifact ? artifact.content : "";
}

async function installTheme(activate) {
  if (!tauriInvoke) {
    return;
  }

  await runDesktopMutation(
    activate ? "Installing and activating theme..." : "Installing theme files...",
    async () => {
      try {
        const result = await tauriInvoke("apply_theme", {
          request: buildDesktopRequest(activate)
        });
        selectedThemeSafeName = result.safeName;
        syncEditorWithResult(result);
        environmentSummary.textContent = `Last applied theme: ${result.safeName}\nHome: ${result.homeDir}`;
        setDesktopStatus(formatApplyResult(result));
        queueUiStateSave();
        await refreshThemeLibrary();
      } catch (error) {
        setDesktopStatus(`Theme apply failed.\n${describeDesktopError(error)}`);
      }
    }
  );
}

async function refreshThemeLibrary() {
  if (!tauriInvoke) {
    return;
  }

  try {
    const library = await tauriInvoke("list_theme_library");
    lastLibraryState = library;
    renderSavedThemes(library.savedThemes || [], library.currentAppliedSafeName || null);
    queueLibraryPreviewWarm(library.savedThemes || []);
    renderThemeHistory(library.recentHistory || [], library.currentAppliedSafeName || null);
    if (rollbackThemeButton) {
      rollbackThemeButton.disabled = desktopMutationInFlight || !library.canRollback;
    }
    if (clearHistoryButton) {
      clearHistoryButton.disabled = desktopMutationInFlight || !(library.recentHistory || []).length;
    }
    syncDesktopActionAvailability();
    renderPreflightSummary();
  } catch (error) {
    setDesktopStatus(`Theme library refresh failed.\n${describeDesktopError(error)}`);
  }
}

function renderSavedThemes(savedThemes, currentAppliedSafeName) {
  if (!savedThemesContainer) {
    return;
  }

  const visibleThemes = getVisibleSavedThemes(savedThemes);
  savedThemesContainer.innerHTML = "";
  if (!savedThemes.length) {
    savedThemesContainer.innerHTML = `<p class="library-empty">No saved themes yet. Save a variant or import one into the library.</p>`;
    return;
  }

  if (!visibleThemes.length) {
    savedThemesContainer.innerHTML = `<p class="library-empty">No saved themes match the current search or sort.</p>`;
    return;
  }

  visibleThemes.forEach((theme) => {
    const item = document.createElement("article");
    const isCurrent = theme.safeName === currentAppliedSafeName;
    const isSelected = theme.safeName === selectedThemeSafeName;
    const isFavorite = favoriteThemeSafeNames.has(theme.safeName);
    item.className = `library-item${isCurrent ? " current" : ""}${isSelected ? " selected" : ""}`;

    const badges = document.createElement("div");
    badges.className = "library-item-badges";

    if (isCurrent) {
      const badge = document.createElement("div");
      badge.className = "library-badge";
      badge.textContent = "Current Applied Theme";
      badges.append(badge);
    }

    if (isSelected) {
      const selectedBadge = document.createElement("div");
      selectedBadge.className = "library-badge secondary-badge";
      selectedBadge.textContent = "Compare Base";
      badges.append(selectedBadge);
    }

    if (isFavorite) {
      const favoriteBadge = document.createElement("div");
      favoriteBadge.className = "library-badge favorite-badge";
      favoriteBadge.textContent = "Favorite";
      badges.append(favoriteBadge);
    }

    if (theme.displayName !== theme.safeName.replace(/-/g, " ")) {
      const variantBadge = document.createElement("div");
      variantBadge.className = "library-badge secondary-badge";
      variantBadge.textContent = "Library Theme";
      badges.append(variantBadge);
    }

    if (badges.childElementCount) {
      item.append(badges);
    }

    const header = document.createElement("div");
    header.className = "library-item-header";

    const title = document.createElement("h3");
    title.textContent = theme.displayName;

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = isSelected ? "" : "secondary";
    selectButton.textContent = isSelected ? "Compare Base" : "Select";
    selectButton.setAttribute("aria-pressed", isSelected ? "true" : "false");
    selectButton.addEventListener("click", () => {
      selectedThemeSafeName = isSelected ? null : theme.safeName;
      queueUiStateSave();
      renderSavedThemes(savedThemes, currentAppliedSafeName);
    });

    header.append(title, selectButton);

    const previewTokens = getSavedThemePreview(theme);
    const previewStrip = document.createElement("div");
    previewStrip.className = `library-preview${previewTokens ? "" : " loading"}`;

    ["bg", "panel", "accent", "accent-strong", "text"].forEach((tokenId) => {
      const swatch = document.createElement("span");
      swatch.className = "library-preview-swatch";
      if (previewTokens) {
        swatch.style.background = previewTokens[tokenId];
      }
      previewStrip.append(swatch);
    });

    const previewDescriptor = document.createElement("div");
    previewDescriptor.className = "library-preview-meta";

    const feelLabel = document.createElement("span");
    feelLabel.className = "library-preview-pill";

    const readabilityLabel = document.createElement("span");
    readabilityLabel.className = "library-preview-pill";

    if (previewTokens) {
      feelLabel.textContent = describePreviewFeel(previewTokens);
      const readability = describePreviewReadability(previewTokens);
      readabilityLabel.textContent = readability.label;
      readabilityLabel.classList.add(`tone-${readability.tone}`);
    } else {
      feelLabel.textContent = "Preview loading";
      readabilityLabel.textContent = "Checking contrast";
    }

    previewDescriptor.append(feelLabel, readabilityLabel);

    if (previewTokens) {
      item.addEventListener("mouseenter", () => {
        setHoveredLibraryPreview(theme, previewTokens);
      });
      item.addEventListener("mouseleave", () => {
        clearHoveredLibraryPreview(theme.safeName);
      });
      item.addEventListener("focusin", () => {
        setHoveredLibraryPreview(theme, previewTokens);
      });
      item.addEventListener("focusout", (event) => {
        if (item.contains(event.relatedTarget)) {
          return;
        }
        clearHoveredLibraryPreview(theme.safeName);
      });
    }

    const safeNameMeta = document.createElement("p");
    safeNameMeta.className = "library-meta";
    safeNameMeta.textContent = `Safe name: ${theme.safeName}`;

    const updatedMeta = document.createElement("p");
    updatedMeta.className = "library-meta";
    updatedMeta.textContent = `Updated: ${formatUnixTimestamp(theme.updatedAt)}`;

    const statusMeta = document.createElement("p");
    statusMeta.className = "library-summary";
    statusMeta.textContent = describeSavedThemeStatus(theme, isCurrent, isSelected);

    const compareMeta = document.createElement("p");
    compareMeta.className = "library-meta compare-meta";
    compareMeta.textContent = describeSavedThemeCompare(theme, savedThemes);

    item.append(header, previewStrip, previewDescriptor, statusMeta, compareMeta, safeNameMeta, updatedMeta);

    const actions = document.createElement("div");
    actions.className = "button-row";
    const disableActions = desktopMutationInFlight;

    const loadButton = document.createElement("button");
    loadButton.className = "secondary";
    loadButton.textContent = "Load";
    loadButton.disabled = disableActions;
    loadButton.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedThemeSafeName = theme.safeName;
      void loadSavedTheme(theme.safeName);
    });

    const favoriteButton = document.createElement("button");
    favoriteButton.className = isFavorite ? "" : "secondary";
    favoriteButton.textContent = isFavorite ? "Favorited" : "Favorite";
    favoriteButton.disabled = disableActions;
    favoriteButton.setAttribute("aria-pressed", isFavorite ? "true" : "false");
    favoriteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavoriteTheme(theme.safeName);
    });

    const exportButton = document.createElement("button");
    exportButton.className = "secondary";
    exportButton.textContent = "Export";
    exportButton.disabled = disableActions;
    exportButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void exportSavedTheme(theme.safeName, theme.displayName);
    });

    const compareButton = document.createElement("button");
    compareButton.className = "secondary";
    compareButton.textContent = "Compare";
    compareButton.disabled = disableActions;
    compareButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void compareSavedTheme(theme.safeName, theme.displayName, savedThemes);
    });

    const renameButton = document.createElement("button");
    renameButton.className = "secondary";
    renameButton.textContent = "Rename";
    renameButton.disabled = disableActions;
    renameButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void renameSavedTheme(theme);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "secondary";
    deleteButton.textContent = "Delete";
    deleteButton.disabled = disableActions;
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void deleteSavedTheme(theme);
    });

    const duplicateButton = document.createElement("button");
    duplicateButton.className = "secondary";
    duplicateButton.textContent = "Duplicate";
    duplicateButton.disabled = disableActions;
    duplicateButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void saveThemeVariant(theme);
    });

    actions.append(loadButton, favoriteButton, compareButton, exportButton, duplicateButton, renameButton, deleteButton);
    item.append(actions);
    savedThemesContainer.append(item);
  });
}

function renderThemeHistory(recentHistory, currentAppliedSafeName) {
  if (!themeHistoryContainer) {
    return;
  }

  themeHistoryContainer.innerHTML = "";
  if (!recentHistory.length) {
    themeHistoryContainer.innerHTML = `<p class="library-empty">No restore points yet. Applying from the desktop flow will create them here.</p>`;
    return;
  }

  recentHistory.forEach((entry, index) => {
    const item = document.createElement("article");
    item.className = `library-item${entry.safeName === currentAppliedSafeName ? " current" : ""}`;
    if (entry.safeName === currentAppliedSafeName) {
      const badge = document.createElement("div");
      badge.className = "library-badge";
      badge.textContent = "Current Snapshot";
      item.append(badge);
    }

    const title = document.createElement("h3");
    title.textContent = entry.displayName;

    const historyLabel = document.createElement("p");
    historyLabel.className = "history-label";
    historyLabel.textContent = formatHistoryLabel(entry, index, currentAppliedSafeName);

    const appliedMeta = document.createElement("p");
    appliedMeta.className = "library-meta";
    appliedMeta.textContent = `Applied: ${formatUnixTimestamp(entry.appliedAt)}`;

    const snapshotMeta = document.createElement("p");
    snapshotMeta.className = "library-meta";
    snapshotMeta.textContent = `Snapshot: ${entry.safeName}`;

    item.append(title, historyLabel, appliedMeta, snapshotMeta);
    themeHistoryContainer.append(item);
  });
}

async function loadSavedTheme(safeName) {
  if (!tauriInvoke) {
    return;
  }

  setDesktopStatus(`Loading saved theme ${safeName}...`);

  try {
    const themeJson = await tauriInvoke("load_saved_theme", { safeName });
    const payload = JSON.parse(themeJson);
    selectedThemeSafeName = safeName;
    loadImportedTheme(payload);
    setSource("saved", `Opened saved theme ${safeName}. Review it, make adjustments, then apply or save a variant.`);
    if (lastLibraryState) {
      renderSavedThemes(lastLibraryState.savedThemes || [], lastLibraryState.currentAppliedSafeName || null);
    }
    setDesktopStatus(`Loaded saved theme ${safeName} into the editor.`);
    queueUiStateSave();
  } catch (error) {
    setDesktopStatus(`Loading saved theme failed.\n${describeDesktopError(error)}`);
  }
}

async function loadSavedThemePayload(safeName) {
  const themeJson = await tauriInvoke("load_saved_theme", { safeName });
  return JSON.parse(themeJson);
}

function getSavedThemeDisplayName(savedThemes, safeName) {
  const matchedTheme = savedThemes.find((theme) => theme.safeName === safeName);
  return matchedTheme?.displayName || safeName;
}

async function compareSavedTheme(safeName, displayName, savedThemes = []) {
  if (!tauriInvoke) {
    return;
  }

  setDesktopStatus(`Preparing compare view for ${safeName}...`);

  try {
    const compareBaseSafeName =
      selectedThemeSafeName && selectedThemeSafeName !== safeName ? selectedThemeSafeName : null;

    if (compareBaseSafeName) {
      const [baselinePayload, comparePayload] = await Promise.all([
        loadSavedThemePayload(compareBaseSafeName),
        loadSavedThemePayload(safeName)
      ]);
      const baselineName =
        typeof baselinePayload?.name === "string" && baselinePayload.name.trim()
          ? baselinePayload.name.trim()
          : getSavedThemeDisplayName(savedThemes, compareBaseSafeName);
      const compareName =
        typeof comparePayload?.name === "string" && comparePayload.name.trim()
          ? comparePayload.name.trim()
          : displayName || safeName;

      baselineTheme = ensureTokenSet(baselinePayload?.tokens || {});
      compareAfterTheme = ensureTokenSet(comparePayload?.tokens || {});
      compareAfterTracksWorkingDraft = false;
      applyThemeToPreviewSurface(currentCompareCanvas, compareAfterTheme);
      setCompareLabels(`Saved Theme: ${baselineName}`, `Saved Theme: ${compareName}`);
      setDesktopStatus(`Comparing saved theme ${baselineName} against saved theme ${compareName}.`);
    } else {
      const payload = await loadSavedThemePayload(safeName);
      const loadedTheme = ensureTokenSet(payload?.tokens || {});
      const baselineName =
        typeof payload?.name === "string" && payload.name.trim()
          ? payload.name.trim()
          : displayName || safeName;
      const workingName = themeNameInput.value.trim() || currentPresetName || "Working Draft";

      baselineTheme = loadedTheme;
      compareAfterTheme = structuredClone(currentTheme);
      compareAfterTracksWorkingDraft = true;
      applyThemeToPreviewSurface(currentCompareCanvas, compareAfterTheme);
      setCompareLabels(`Saved Theme: ${baselineName}`, `Working Draft: ${workingName}`);
      setDesktopStatus(`Comparing saved theme ${baselineName} against the current working draft.`);
    }

    compareEnabled = true;
    compareStage?.classList.remove("hidden");
    syncCompareToggleState();
    applyThemeToPreviewSurface(baselineCanvas, baselineTheme);
    renderSavedThemes(lastLibraryState?.savedThemes || [], lastLibraryState?.currentAppliedSafeName || null);
    queueUiStateSave();
  } catch (error) {
    setDesktopStatus(`Compare setup failed.\n${describeDesktopError(error)}`);
  }
}

async function exportSavedTheme(safeName, displayName) {
  if (!tauriInvoke) {
    return;
  }

  try {
    const themeJson = await tauriInvoke("load_saved_theme", { safeName });
    downloadText(`${sanitizeThemeName(displayName || safeName)}.json`, themeJson, "application/json");
    setDesktopStatus(`Exported saved theme ${safeName}.`);
  } catch (error) {
    setDesktopStatus(`Export failed.\n${describeDesktopError(error)}`);
  }
}

async function importThemeToLibrary(event) {
  if (!tauriInvoke) {
    return;
  }

  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const themeJson = await file.text();
    await runDesktopMutation(`Importing ${file.name} into the desktop library...`, async () => {
      try {
        const result = await tauriInvoke("import_theme_to_library", { themeJson });
        selectedThemeSafeName = result.safeName;
        syncEditorWithResult(result);
        setDesktopStatus(formatApplyResult(result));
        queueUiStateSave();
        await refreshThemeLibrary();
      } catch (error) {
        setDesktopStatus(`Library import failed.\n${describeDesktopError(error)}`);
      }
    });
  } catch (error) {
    setDesktopStatus(`Library import failed.\n${describeDesktopError(error)}`);
  } finally {
    libraryImportFileInput.value = "";
  }
}

async function saveThemeVariant(themeToClone = null) {
  if (!tauriInvoke) {
    return;
  }

  const baseName = themeToClone?.displayName || themeNameInput.value || currentPresetName || "Theme";
  const proposedName = window.prompt("Save a new variant name for this theme.", `${baseName} Variant`);
  if (proposedName === null) {
    return;
  }

  const trimmedName = proposedName.trim();
  if (!trimmedName) {
    setDesktopStatus("Variant save cancelled. Theme name cannot be empty.");
    return;
  }

  await runDesktopMutation(`Saving variant ${trimmedName}...`, async () => {
    try {
      let payload = createThemePayload(trimmedName, currentTheme);

      if (themeToClone) {
        const themeJson = await tauriInvoke("load_saved_theme", { safeName: themeToClone.safeName });
        const parsedPayload = JSON.parse(themeJson);
        payload = createThemePayload(trimmedName, parsedPayload?.tokens || currentTheme);
      }

      const result = await tauriInvoke("import_theme_to_library", {
        themeJson: JSON.stringify(payload, null, 2)
      });

      selectedThemeSafeName = result.safeName;
      if (!themeToClone) {
        themeNameInput.value = trimmedName;
        loadImportedTheme(payload);
      }
      setSource(
        themeToClone ? "saved" : currentSourceType,
        `Saved ${trimmedName} as a new variant in the local theme library.`
      );
      setDesktopStatus(`Saved theme variant ${result.displayName}.`);
      queueUiStateSave();
      await refreshThemeLibrary();
    } catch (error) {
      setDesktopStatus(`Save variant failed.\n${describeDesktopError(error)}`);
    }
  });
}

async function rollbackPreviousTheme() {
  if (!tauriInvoke) {
    return;
  }

  const previousEntry = lastLibraryState?.recentHistory?.[1];
  const confirmLabel = previousEntry?.displayName || "the previous theme";
  const confirmed = window.confirm(`Roll back to ${confirmLabel}? This will reapply the previous saved snapshot.`);
  if (!confirmed) {
    return;
  }

  await runDesktopMutation("Rolling back to the previous applied theme...", async () => {
    try {
      const result = await tauriInvoke("rollback_last_theme");
      selectedThemeSafeName = result.safeName;
      syncEditorWithResult(result);
      setSource("saved", `Rolled back to ${result.safeName}. Review the restored snapshot before continuing.`);
      environmentSummary.textContent = `Rolled back theme: ${result.safeName}\nHome: ${result.homeDir}`;
      setDesktopStatus(formatApplyResult(result));
      queueUiStateSave();
      await refreshThemeLibrary();
    } catch (error) {
      setDesktopStatus(`Rollback failed.\n${describeDesktopError(error)}`);
    }
  });
}

async function renameSavedTheme(theme) {
  if (!tauriInvoke) {
    return;
  }

  const proposedName = window.prompt("Enter a new theme name for this saved snapshot.", theme.displayName);
  if (proposedName === null) {
    return;
  }

  const trimmedName = proposedName.trim();
  if (!trimmedName) {
    setDesktopStatus("Rename cancelled. Theme name cannot be empty.");
    return;
  }

  if (trimmedName === theme.displayName) {
    setDesktopStatus(`Saved theme ${theme.safeName} already uses that name.`);
    return;
  }

  const confirmed = window.confirm(
    `Rename "${theme.displayName}" to "${trimmedName}"? The internal snapshot id ${theme.safeName} will stay the same.`
  );
  if (!confirmed) {
    return;
  }

  await runDesktopMutation(`Renaming saved theme ${theme.safeName}...`, async () => {
    try {
      const renamedTheme = await tauriInvoke("rename_saved_theme", {
        request: { safeName: theme.safeName, newName: trimmedName }
      });

      if (selectedThemeSafeName === theme.safeName) {
        themeNameInput.value = trimmedName;
        updateOutput();
        queueUiStateSave();
      }

      setDesktopStatus(`Renamed saved theme ${renamedTheme.safeName} to ${renamedTheme.displayName}.`);
      await refreshThemeLibrary();
    } catch (error) {
      setDesktopStatus(`Rename failed.\n${describeDesktopError(error)}`);
    }
  });
}

async function deleteSavedTheme(theme) {
  if (!tauriInvoke) {
    return;
  }

  const confirmed = window.confirm(
    `Delete "${theme.displayName}" from the theme library? This removes the saved snapshot files and any matching history entries.`
  );
  if (!confirmed) {
    return;
  }

  await runDesktopMutation(`Deleting saved theme ${theme.safeName}...`, async () => {
    try {
      await tauriInvoke("delete_saved_theme", { safeName: theme.safeName });
      if (selectedThemeSafeName === theme.safeName) {
        selectedThemeSafeName = null;
        queueUiStateSave();
      }
      setDesktopStatus(`Deleted saved theme ${theme.safeName}.`);
      await refreshThemeLibrary();
    } catch (error) {
      setDesktopStatus(`Delete failed.\n${describeDesktopError(error)}`);
    }
  });
}

async function clearThemeHistory() {
  if (!tauriInvoke) {
    return;
  }

  const confirmed = window.confirm(
    "Clear the recent apply history? Installed theme files will stay on disk, but rollback history will be removed."
  );
  if (!confirmed) {
    return;
  }

  await runDesktopMutation("Clearing theme history...", async () => {
    try {
      await tauriInvoke("clear_theme_history");
      setDesktopStatus("Theme history cleared.");
      await refreshThemeLibrary();
    } catch (error) {
      setDesktopStatus(`Clear history failed.\n${describeDesktopError(error)}`);
    }
  });
}

async function resetDesktopUiState() {
  if (!tauriInvoke) {
    return;
  }

  const confirmed = window.confirm(
    "Reset the desktop app UI state? This clears the saved editor session, selection, compare mode, and saved diagnostics expansion state."
  );
  if (!confirmed) {
    return;
  }

  await runDesktopMutation("Resetting saved UI state...", async () => {
    try {
      await tauriInvoke("reset_ui_state");
      if (saveUiStateTimer) {
        window.clearTimeout(saveUiStateTimer);
        saveUiStateTimer = null;
      }
      resetEditorState();
      setDesktopStatus("Desktop app UI state reset.");
    } catch (error) {
      setDesktopStatus(`UI state reset failed.\n${describeDesktopError(error)}`);
    }
  });
}

function syncEditorWithResult(result) {
  if (!result?.themeJson) {
    return;
  }

  try {
    if (result.safeName) {
      selectedThemeSafeName = result.safeName;
    }
    const payload = JSON.parse(result.themeJson);
    loadImportedTheme(payload);
  } catch {
    setDesktopStatus("Theme action completed, but the returned payload could not be reloaded into the editor.");
  }
}

function captureBaseline() {
  baselineTheme = structuredClone(currentTheme);
  compareAfterTheme = structuredClone(currentTheme);
  compareAfterTracksWorkingDraft = true;
  setCompareLabels("Captured Baseline", `Working Draft: ${themeNameInput.value.trim() || currentPresetName || "Current Theme"}`);
  applyThemeToPreviewSurface(baselineCanvas, baselineTheme);
  setDesktopStatus("Captured the current theme as the compare baseline.");
  queueUiStateSave();
}

function toggleCompareMode() {
  compareEnabled = !compareEnabled;
  compareStage?.classList.toggle("hidden", !compareEnabled);
  syncCompareToggleState();
  if (compareEnabled) {
    if (compareAfterTracksWorkingDraft) {
      compareAfterTheme = structuredClone(currentTheme);
    }
    if (compareBeforeText === "Before" && compareAfterText === "After") {
      setCompareLabels("Captured Baseline", `Working Draft: ${themeNameInput.value.trim() || currentPresetName || "Current Theme"}`);
    }
    applyThemeToPreviewSurface(currentCompareCanvas, compareAfterTheme);
    applyThemeToPreviewSurface(baselineCanvas, baselineTheme);
  }
  queueUiStateSave();
}

function syncCompareToggleState() {
  if (!toggleCompareButton) {
    compareStage?.setAttribute("aria-hidden", compareEnabled ? "false" : "true");
    return;
  }

  toggleCompareButton.textContent = compareEnabled ? "Close Compare" : "Open Compare";
  toggleCompareButton.setAttribute("aria-expanded", compareEnabled ? "true" : "false");
  compareStage?.setAttribute("aria-hidden", compareEnabled ? "false" : "true");
  if (compareHint) {
    compareHint.textContent = compareEnabled
      ? "Compare mode is open. Use the left side as your reference and the right side as the current draft."
      : "Capture a baseline before major edits, or use Library Compare to review saved themes side by side.";
  }
}

function formatUnixTimestamp(value) {
  const seconds = Number.parseInt(value, 10);
  if (!Number.isFinite(seconds)) {
    return value || "unknown";
  }

  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) {
    return value || "unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatApplyResult(result) {
  return [
    `Theme: ${result.safeName}`,
    "",
    "Written files:",
    ...result.writtenPaths.map((path) => `- ${path}`),
    "",
    "Activation:",
    ...result.activationMessages.map((message) => `- ${message}`)
  ].join("\n");
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function setDesktopStatus(text) {
  if (desktopStatus) {
    desktopStatus.textContent = text;
  }
}

renderPresetOptions();
renderOutputTargets();
loadPreset(currentPresetName);
initializeDesktopBridge();
applyThemeToPreviewSurface(baselineCanvas, baselineTheme);
applyThemeToPreviewSurface(currentCompareCanvas, compareAfterTheme);
syncCompareLabels();
if (toggleCompareButton) {
  toggleCompareButton.setAttribute("aria-controls", "compareStage");
}
setSource("preset", "Start from a preset to generate a first draft, then shape it before applying anything.");
resetSemanticControlsFromTheme(currentTheme);
setPreviewMode(currentPreviewMode);
syncAdvancedEditorState();
renderPreflightSummary();
syncCompareToggleState();

presetSelect.addEventListener("change", (event) => {
  loadPreset(event.target.value);
});

outputTargetSelect.addEventListener("change", (event) => {
  currentOutputTarget = event.target.value;
  updateOutput();
  queueUiStateSave();
});

themeNameInput.addEventListener("input", updateOutput);
themeNameInput.addEventListener("input", queueUiStateSave);

if (startFromPresetButton) {
  startFromPresetButton.addEventListener("click", () => {
    loadPreset(presetSelect.value || currentPresetName);
    presetSelect.focus();
  });
}

if (startFromDesktopButton) {
  startFromDesktopButton.addEventListener("click", async () => {
    setSource("desktop", "Using the current desktop as your review target. Detect the session and pull in the active snapshot if one exists.");
    if (tauriInvoke) {
      await detectEnvironment();
      if (lastEnvironment?.currentAppliedSafeName) {
        await loadSavedTheme(lastEnvironment.currentAppliedSafeName);
      }
    }
  });
}

if (startFromSavedButton) {
  startFromSavedButton.addEventListener("click", async () => {
    setSource("saved", "Choose a saved theme from the library and reopen it in the editor.");
    if (selectedThemeSafeName) {
      await loadSavedTheme(selectedThemeSafeName);
      return;
    }
    const firstTheme = lastLibraryState?.savedThemes?.[0];
    if (firstTheme) {
      selectedThemeSafeName = firstTheme.safeName;
      await loadSavedTheme(firstTheme.safeName);
    }
  });
}

if (startFromImportButton) {
  startFromImportButton.addEventListener("click", () => {
    setSource("import", "Import a Theme Studio JSON file to create a new working draft.");
    importFileInput?.click();
  });
}

if (startFromWallpaperButton) {
  startFromWallpaperButton.addEventListener("click", () => {
    setSource("wallpaper", "Choose a local image to extract a first-pass palette, then refine the draft in the editor.");
    wallpaperFileInput?.click();
  });
}

if (advancedEditorToggle) {
  advancedEditorToggle.addEventListener("click", () => {
    advancedEditorExpanded = !advancedEditorExpanded;
    syncAdvancedEditorState();
  });
}

if (semanticAccentInput) {
  semanticAccentInput.addEventListener("input", applySemanticControls);
}

if (semanticMoodInput) {
  semanticMoodInput.addEventListener("input", applySemanticControls);
}

if (semanticContrastInput) {
  semanticContrastInput.addEventListener("input", applySemanticControls);
}

if (semanticTemperatureInput) {
  semanticTemperatureInput.addEventListener("input", applySemanticControls);
}

if (semanticBiasSelect) {
  semanticBiasSelect.addEventListener("change", applySemanticControls);
}

if (saveThemeVariantButton) {
  saveThemeVariantButton.addEventListener("click", () => {
    void saveThemeVariant();
  });
}

if (librarySearchInput) {
  librarySearchInput.addEventListener("input", (event) => {
    librarySearchTerm = event.target.value || "";
    if (lastLibraryState) {
      renderSavedThemes(lastLibraryState.savedThemes || [], lastLibraryState.currentAppliedSafeName || null);
    }
  });
}

if (librarySortSelect) {
  librarySortSelect.addEventListener("change", (event) => {
    librarySortMode = event.target.value || "favorites-first";
    if (lastLibraryState) {
      renderSavedThemes(lastLibraryState.savedThemes || [], lastLibraryState.currentAppliedSafeName || null);
    }
  });
}

resetThemeButton.addEventListener("click", () => {
  loadPreset(currentPresetName in presets ? currentPresetName : DEFAULT_PRESET_NAME);
});

randomizeThemeButton.addEventListener("click", () => {
  currentTheme = ensureTokenSet(
    Object.fromEntries(tokenDefinitions.map((token) => [token.id, randomHex()]))
  );
  applyThemeToDocument();
  renderTokenFields();
  updateOutput();
  queueUiStateSave();
});

copyOutputButton.addEventListener("click", copyCurrentOutput);
downloadOutputButton.addEventListener("click", downloadCurrentOutput);
importFileInput.addEventListener("change", importThemeFile);
wallpaperFileInput?.addEventListener("change", importWallpaperFile);
chooseWallpaperAgainButton?.addEventListener("click", () => {
  wallpaperFileInput?.click();
});
wallpaperStyleSelect?.addEventListener("change", (event) => {
  wallpaperExtractionStyle = event.target.value || "balanced";
  rebuildWallpaperDraftFromLastColors(
    `Rebuilt the draft using the ${wallpaperExtractionStyle} wallpaper extraction style. Keep shaping it before saving or applying.`
  );
});
wallpaperBiasDarkInput?.addEventListener("change", () => {
  rebuildWallpaperDraftFromLastColors("Rebuilt the wallpaper draft with darker image weighting.");
});
wallpaperPreserveAccentInput?.addEventListener("change", () => {
  rebuildWallpaperDraftFromLastColors("Rebuilt the wallpaper draft with updated accent preservation.");
});
wallpaperSoftenNeutralsInput?.addEventListener("change", () => {
  rebuildWallpaperDraftFromLastColors("Rebuilt the wallpaper draft with softer neutral surfaces.");
});

if (detectEnvironmentButton) {
  detectEnvironmentButton.addEventListener("click", () => {
    void detectEnvironment();
  });
}

if (installThemeButton) {
  installThemeButton.addEventListener("click", () => {
    void installTheme(false);
  });
}

if (applyThemeButton) {
  applyThemeButton.addEventListener("click", () => {
    void installTheme(true);
  });
}

if (refreshLibraryButton) {
  refreshLibraryButton.addEventListener("click", () => {
    void refreshThemeLibrary();
  });
}

if (importLibraryThemeButton) {
  importLibraryThemeButton.addEventListener("click", () => {
    libraryImportFileInput?.click();
  });
}

if (libraryImportFileInput) {
  libraryImportFileInput.addEventListener("change", (event) => {
    void importThemeToLibrary(event);
  });
}

if (rollbackThemeButton) {
  rollbackThemeButton.addEventListener("click", () => {
    void rollbackPreviousTheme();
  });
}

if (clearHistoryButton) {
  clearHistoryButton.addEventListener("click", () => {
    void clearThemeHistory();
  });
}

if (resetUiStateButton) {
  resetUiStateButton.addEventListener("click", () => {
    void resetDesktopUiState();
  });
}

if (captureBaselineButton) {
  captureBaselineButton.addEventListener("click", captureBaseline);
}

if (toggleCompareButton) {
  toggleCompareButton.addEventListener("click", toggleCompareMode);
}

Object.entries(previewModeButtons).forEach(([mode, button]) => {
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    setPreviewMode(mode);
  });
});
