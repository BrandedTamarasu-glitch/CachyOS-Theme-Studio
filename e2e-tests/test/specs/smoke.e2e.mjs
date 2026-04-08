import assert from "node:assert/strict";

function logStep(message) {
  console.log(`[smoke] ${message}`);
}

async function waitForStatusMatch(pattern) {
  const status = await $("#desktopStatus");
  await browser.waitUntil(
    async () => pattern.test(await status.getText()),
    {
      timeout: 120000,
      interval: 250,
      timeoutMsg: `Timed out waiting for desktop status to match ${pattern}`
    }
  );
}

async function getDesktopStatusText() {
  const status = await $("#desktopStatus");
  return status.getText();
}

async function setThemeName(value) {
  const input = await $("#themeName");
  await input.waitForDisplayed({ timeout: 30000 });
  await input.clearValue();
  await input.setValue(value);
}

async function waitForAlert(timeoutMessage) {
  await browser.waitUntil(
    async () => {
      try {
        await browser.getAlertText();
        return true;
      } catch {
        return false;
      }
    },
    {
      timeout: 10000,
      interval: 200,
      timeoutMsg: timeoutMessage
    }
  );
}

async function clickAndAcceptConfirm(selector) {
  const button = await $(selector);
  await button.waitForEnabled({ timeout: 30000 });
  await button.click();
  await waitForAlert("Expected a confirmation dialog.");
  await browser.acceptAlert();
}

async function renameThemeCard(currentName, renamedName) {
  const renameButton = await $(
    `//article[contains(@class,"library-item")][.//h3[normalize-space()="${currentName}"]]//button[normalize-space()="Rename"]`
  );
  await renameButton.waitForEnabled({ timeout: 30000 });
  await renameButton.click();

  await waitForAlert("Expected a prompt dialog for rename.");
  await browser.sendAlertText(renamedName);
  await browser.acceptAlert();

  await waitForAlert("Expected a confirmation dialog after rename prompt.");
  await browser.acceptAlert();
}

async function deleteThemeCard(themeName) {
  const deleteButton = await $(
    `//article[contains(@class,"library-item")][.//h3[normalize-space()="${themeName}"]]//button[normalize-space()="Delete"]`
  );
  await deleteButton.waitForEnabled({ timeout: 30000 });
  await deleteButton.click();

  await waitForAlert("Expected a delete confirmation dialog.");
  await browser.acceptAlert();
}

async function selectThemeCard(themeName) {
  const selectButton = await $(
    `//article[contains(@class,"library-item")][.//h3[normalize-space()="${themeName}"]]//button[@aria-pressed]`
  );
  await selectButton.waitForEnabled({ timeout: 30000 });
  await selectButton.click();
}

async function getCurrentAppliedThemeName() {
  const currentCard = await $(
    `//article[contains(@class,"library-item")][contains(@class,"current")]//h3`
  );
  if (await currentCard.isExisting()) {
    return currentCard.getText();
  }

  return null;
}

async function attemptDeleteTheme(themeName) {
  logStep(`attempting delete for ${themeName}`);
  await selectThemeCard(themeName);
  await deleteThemeCard(themeName);
  await browser.waitUntil(
    async () => /(Deleted saved theme|Delete failed\.)/.test(await getDesktopStatusText()),
    {
      timeout: 30000,
      interval: 250,
      timeoutMsg: `Timed out waiting for delete result for ${themeName}`
    }
  );
  return getDesktopStatusText();
}

describe("CachyOS Theme Studio desktop smoke", () => {
  it("covers install, health action, rollback, rename, delete, clear history, and reset state", async () => {
    logStep("waiting for desktop integration mode");
    const desktopMode = await $("#desktopMode");
    await browser.waitUntil(
      async () => (await desktopMode.getText()).includes("Desktop integration enabled"),
      {
        timeout: 60000,
        interval: 250,
        timeoutMsg: "Desktop mode never enabled."
      }
    );

    logStep("installing Smoke Alpha");
    await setThemeName("Smoke Alpha");
    await $("#installTheme").click();
    await waitForStatusMatch(/Theme files written\./);

    logStep("installing Smoke Beta");
    await setThemeName("Smoke Beta");
    await $("#installTheme").click();
    await waitForStatusMatch(/Theme files written\./);

    logStep("detecting environment");
    const detectEnvironmentButton = await $("#detectEnvironment");
    await detectEnvironmentButton.waitForEnabled({ timeout: 30000 });
    await detectEnvironmentButton.click();
    await waitForStatusMatch(/Desktop environment detected\./);

    logStep("running first health action");
    const firstHealthAction = await $("//div[@id='integrationHealth']//button");
    await firstHealthAction.waitForEnabled({ timeout: 30000 });
    await firstHealthAction.click();
    await waitForStatusMatch(/Desktop environment detected\./);

    logStep("rolling back");
    await $("#rollbackTheme").click();
    await waitForAlert("Expected a rollback confirmation dialog.");
    await browser.acceptAlert();
    await waitForStatusMatch(/Theme:/);

    logStep("renaming Smoke Beta to Smoke Gamma");
    await renameThemeCard("Smoke Beta", "Smoke Gamma");
    await waitForStatusMatch(/Renamed saved theme/);

    logStep("waiting for renamed card");
    const renamedCard = await $(
      `//article[contains(@class,"library-item")][.//h3[normalize-space()="Smoke Gamma"]]`
    );
    await renamedCard.waitForExist({ timeout: 30000 });

    const currentAppliedThemeName = await getCurrentAppliedThemeName();
    const deleteCandidates =
      currentAppliedThemeName === "Smoke Gamma" ? ["Smoke Alpha", "Smoke Gamma"] : ["Smoke Gamma", "Smoke Alpha"];

    let deletedThemeName = null;
    for (const candidate of deleteCandidates) {
      const resultText = await attemptDeleteTheme(candidate);
      logStep(`delete result for ${candidate}: ${resultText.replace(/\n+/g, " | ")}`);
      if (/Deleted saved theme/.test(resultText)) {
        deletedThemeName = candidate;
        break;
      }
    }

    assert.ok(deletedThemeName, "Expected one saved theme delete attempt to succeed.");
    await browser.waitUntil(
      async () =>
        !(await $(`//article[contains(@class,"library-item")][.//h3[normalize-space()="${deletedThemeName}"]]`).isExisting()),
      {
        timeout: 30000,
        timeoutMsg: "Deleted saved theme card still exists."
      }
    );

    logStep("clearing history");
    await clickAndAcceptConfirm("#clearHistory");
    await waitForStatusMatch(/Theme history cleared\./);

    const historyText = await $("#themeHistory").getText();
    assert.match(historyText, /No restore points yet\./);

    logStep("resetting UI state");
    await clickAndAcceptConfirm("#resetUiState");
    await waitForStatusMatch(/Desktop app UI state reset\./);

    const themeNameInput = await $("#themeName");
    assert.equal(await themeNameInput.getValue(), "Solar Drift");
    logStep("smoke test complete");
  });
});
