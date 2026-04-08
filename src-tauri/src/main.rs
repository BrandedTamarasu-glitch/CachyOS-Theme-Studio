use serde::{Deserialize, Serialize};
use std::cmp::Reverse;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

struct AppState {
    persistence_lock: Mutex<()>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentInfo {
    desktop_session: String,
    xdg_current_desktop: String,
    home_dir: String,
    plasma_apply_available: bool,
    kvantum_manager_available: bool,
    current_applied_safe_name: Option<String>,
    integration_health: Vec<HealthCheck>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HealthCheck {
    id: String,
    label: String,
    status: String,
    detail: String,
    action_label: Option<String>,
    diagnostics: Vec<DiagnosticEntry>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DiagnosticEntry {
    label: String,
    value: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HealthActionRequest {
    target_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenameThemeRequest {
    safe_name: String,
    new_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ApplyThemeRequest {
    theme_name: String,
    theme_json: String,
    plasma_colors: String,
    kvantum_config: String,
    gtk_css: String,
    activate: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ApplyThemeResponse {
    safe_name: String,
    home_dir: String,
    written_paths: Vec<String>,
    activation_messages: Vec<String>,
    theme_json: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ThemeHistoryEntry {
    safe_name: String,
    display_name: String,
    applied_at: String,
    theme_json_path: String,
    request_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedThemeSummary {
    safe_name: String,
    display_name: String,
    installed_at: String,
    updated_at: String,
    theme_json_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ThemeLibrary {
    saved_themes: Vec<SavedThemeSummary>,
    recent_history: Vec<ThemeHistoryEntry>,
    can_rollback: bool,
    current_applied_safe_name: Option<String>,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
struct UiState {
    current_theme_json: String,
    baseline_theme_json: String,
    compare_enabled: bool,
    output_target: String,
    selected_theme_safe_name: Option<String>,
    favorite_theme_safe_names: Vec<String>,
    expanded_diagnostic_ids: Vec<String>,
}

#[tauri::command]
fn detect_environment(state: tauri::State<'_, AppState>) -> EnvironmentInfo {
    let home_dir = home_dir();
    let plasma_apply_available = command_exists("plasma-apply-colorscheme");
    let kvantum_manager_available = command_exists("kvantummanager");
    let _guard = state.persistence_lock.lock().expect("persistence lock poisoned");
    let current_applied_safe_name = read_current_applied()
        .ok()
        .flatten()
        .map(|entry| entry.safe_name);

    EnvironmentInfo {
        desktop_session: env::var("DESKTOP_SESSION").unwrap_or_else(|_| "unknown".into()),
        xdg_current_desktop: env::var("XDG_CURRENT_DESKTOP").unwrap_or_else(|_| "unknown".into()),
        home_dir: home_dir.display().to_string(),
        plasma_apply_available,
        kvantum_manager_available,
        current_applied_safe_name: current_applied_safe_name.clone(),
        integration_health: build_integration_health(
            &home_dir,
            plasma_apply_available,
            kvantum_manager_available,
            current_applied_safe_name,
        ),
    }
}

#[tauri::command]
fn load_ui_state(state: tauri::State<'_, AppState>) -> Result<Option<UiState>, String> {
    let _guard = state.persistence_lock.lock().map_err(|_| "Persistence lock poisoned.".to_string())?;
    let path = ui_state_path();
    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(path).map_err(|err| err.to_string())?;
    let state = serde_json::from_str(&raw).map_err(|err| err.to_string())?;
    Ok(Some(state))
}

#[tauri::command]
fn save_ui_state(app_state: tauri::State<'_, AppState>, state: UiState) -> Result<(), String> {
    let _guard = app_state
        .persistence_lock
        .lock()
        .map_err(|_| "Persistence lock poisoned.".to_string())?;
    atomic_write_text_file(
        &ui_state_path(),
        &serde_json::to_string_pretty(&state).map_err(|err| err.to_string())?,
    )
}

#[tauri::command]
fn reset_ui_state(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let _guard = state.persistence_lock.lock().map_err(|_| "Persistence lock poisoned.".to_string())?;
    remove_path_if_exists(&ui_state_path())
}

#[tauri::command]
fn apply_theme(state: tauri::State<'_, AppState>, request: ApplyThemeRequest) -> Result<ApplyThemeResponse, String> {
    let _guard = state.persistence_lock.lock().map_err(|_| "Persistence lock poisoned.".to_string())?;
    apply_theme_internal(request, true, true)
}

#[tauri::command]
fn run_health_action(
    state: tauri::State<'_, AppState>,
    request: HealthActionRequest,
) -> Result<ApplyThemeResponse, String> {
    let _guard = state.persistence_lock.lock().map_err(|_| "Persistence lock poisoned.".to_string())?;
    match request.target_id.as_str() {
        "plasma" | "kvantum" => reapply_current_theme_for_target(&request.target_id),
        "gtk3" | "gtk4" => repair_gtk_target(&request.target_id),
        _ => Err("Unknown health action target.".into()),
    }
}

#[tauri::command]
fn import_theme_to_library(
    state: tauri::State<'_, AppState>,
    theme_json: String,
) -> Result<ApplyThemeResponse, String> {
    let _guard = state.persistence_lock.lock().map_err(|_| "Persistence lock poisoned.".to_string())?;
    let value: serde_json::Value = serde_json::from_str(&theme_json).map_err(|err| err.to_string())?;
    let theme_name = value
        .get("name")
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Imported theme JSON is missing a name.".to_string())?;
    let sanitized_theme_name = sanitize_theme_label(&theme_name);
    let tokens = value
        .get("tokens")
        .cloned()
        .ok_or_else(|| "Imported theme JSON is missing tokens.".to_string())?;
    let validated_tokens = sanitize_theme_tokens(&tokens)?;

    let plasma_colors = build_plasma_colors(&theme_name, &validated_tokens);
    let kvantum_config = build_kvantum_config(&theme_name, &validated_tokens);
    let gtk_css = build_gtk_css(&theme_name, &validated_tokens);
    let sanitized_theme_json = serde_json::json!({
        "name": sanitized_theme_name,
        "tokens": validated_tokens
    });

    apply_theme_internal(
        ApplyThemeRequest {
            theme_name: sanitized_theme_name,
            theme_json: serde_json::to_string_pretty(&sanitized_theme_json).map_err(|err| err.to_string())?,
            plasma_colors,
            kvantum_config,
            gtk_css,
            activate: false,
        },
        false,
        false,
    )
}

#[tauri::command]
fn list_theme_library(state: tauri::State<'_, AppState>) -> Result<ThemeLibrary, String> {
    let _guard = state.persistence_lock.lock().map_err(|_| "Persistence lock poisoned.".to_string())?;
    let themes_root = themes_root();
    let history = read_history()?;
    let mut saved_themes = Vec::new();

    if themes_root.exists() {
        let entries = fs::read_dir(&themes_root).map_err(|err| err.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let safe_name = entry.file_name().to_string_lossy().to_string();
            let theme_json_path = path.join(format!("{safe_name}.json"));
            let manifest_path = path.join("manifest.json");

            if !theme_json_path.exists() {
                continue;
            }

            let display_name = read_display_name(&manifest_path, &safe_name);
            let installed_at = read_string_field(&manifest_path, "installedAt").unwrap_or_else(|| "unknown".into());
            let updated_at = modified_at_string(&theme_json_path).unwrap_or_else(|| installed_at.clone());

            saved_themes.push(SavedThemeSummary {
                safe_name,
                display_name,
                installed_at,
                updated_at,
                theme_json_path: theme_json_path.display().to_string(),
            });
        }
    }

    saved_themes.sort_by_key(|theme| Reverse(theme.updated_at.clone()));

    let recent_history = history.iter().rev().take(6).cloned().collect::<Vec<_>>();
    let current_applied_safe_name = read_current_applied()?.map(|entry| entry.safe_name);

    Ok(ThemeLibrary {
        saved_themes,
        recent_history,
        can_rollback: history.len() >= 2,
        current_applied_safe_name,
    })
}

#[tauri::command]
fn load_saved_theme(safe_name: String) -> Result<String, String> {
    let safe_name = validate_theme_safe_name(&safe_name)?;
    let theme_json_path = theme_dir(&safe_name).join(format!("{safe_name}.json"));
    fs::read_to_string(theme_json_path).map_err(|err| err.to_string())
}

#[tauri::command]
fn rename_saved_theme(
    state: tauri::State<'_, AppState>,
    request: RenameThemeRequest,
) -> Result<SavedThemeSummary, String> {
    let _guard = state.persistence_lock.lock().map_err(|_| "Persistence lock poisoned.".to_string())?;
    let safe_name = validate_theme_safe_name(&request.safe_name)?;
    let new_name = request.new_name.trim();
    if new_name.is_empty() {
        return Err("Theme name cannot be empty.".into());
    }
    let sanitized_new_name = sanitize_theme_label(new_name);

    let root = theme_dir(&safe_name);
    if !root.exists() {
        return Err("Saved theme snapshot was not found.".into());
    }

    let theme_json_path = root.join(format!("{safe_name}.json"));
    let request_path = root.join("request.json");
    let manifest_path = root.join("manifest.json");
    let original_theme_json = fs::read_to_string(&theme_json_path).map_err(|err| err.to_string())?;
    let original_request_json = fs::read_to_string(&request_path).map_err(|err| err.to_string())?;
    let original_manifest_json = fs::read_to_string(&manifest_path).map_err(|err| err.to_string())?;

    let updated_theme_json = renamed_theme_json_content(&original_theme_json, &sanitized_new_name)?;
    let updated_request_json = renamed_request_json_content(&original_request_json, &sanitized_new_name)?;
    let updated_manifest_json = renamed_manifest_json_content(&original_manifest_json, &sanitized_new_name)?;

    let mut history = read_history()?;
    let original_history = history.clone();
    for entry in &mut history {
        if entry.safe_name == safe_name {
            entry.display_name = sanitized_new_name.clone();
        }
    }
    let original_current_applied = read_current_applied()?;
    let mut updated_current_applied = original_current_applied.clone();
    if let Some(entry) = &mut updated_current_applied {
        if entry.safe_name == safe_name {
            entry.display_name = sanitized_new_name.clone();
        }
    }

    let rename_result = (|| -> Result<(), String> {
        atomic_write_text_file(&theme_json_path, &updated_theme_json)?;
        atomic_write_text_file(&request_path, &updated_request_json)?;
        atomic_write_text_file(&manifest_path, &updated_manifest_json)?;
        write_history(&history)?;
        write_current_applied(updated_current_applied.as_ref())?;
        Ok(())
    })();

    if let Err(error) = rename_result {
        let _ = atomic_write_text_file(&theme_json_path, &original_theme_json);
        let _ = atomic_write_text_file(&request_path, &original_request_json);
        let _ = atomic_write_text_file(&manifest_path, &original_manifest_json);
        let _ = write_history(&original_history);
        let _ = write_current_applied(original_current_applied.as_ref());
        return Err(error);
    }

    build_saved_theme_summary(&safe_name)
}

#[tauri::command]
fn delete_saved_theme(state: tauri::State<'_, AppState>, safe_name: String) -> Result<(), String> {
    let _guard = state.persistence_lock.lock().map_err(|_| "Persistence lock poisoned.".to_string())?;
    let safe_name = validate_theme_safe_name(&safe_name)?;

    let history = read_history()?;
    if read_current_applied()?
        .as_ref()
        .map(|entry| entry.safe_name.as_str() == safe_name)
        .unwrap_or(false)
    {
        return Err("The currently applied snapshot cannot be deleted.".into());
    }

    let root = theme_dir(&safe_name);
    if !root.exists() {
        return Err("Saved theme snapshot was not found.".into());
    }

    let original_history = history.clone();
    let filtered_history = history
        .into_iter()
        .filter(|entry| entry.safe_name != safe_name)
        .collect::<Vec<_>>();
    let trash_path = deleted_theme_trash_dir(&safe_name);
    if trash_path.exists() {
        fs::remove_dir_all(&trash_path)
            .map_err(|err| format!("Failed to clear existing trash path {}: {err}", trash_path.display()))?;
    }
    if let Some(parent) = trash_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| format!("Failed to create trash directory {}: {err}", parent.display()))?;
    }

    fs::rename(&root, &trash_path).map_err(|err| {
        format!(
            "Failed to move saved theme from {} to {}: {err}",
            root.display(),
            trash_path.display()
        )
    })?;

    let original_ui_state = read_ui_state_raw()?;
    let delete_result = (|| -> Result<(), String> {
        write_history(&filtered_history)?;
        clear_selected_theme_if_matches(&safe_name)?;
        fs::remove_dir_all(&trash_path)
            .map_err(|err| format!("Failed to remove trashed theme {}: {err}", trash_path.display()))?;
        Ok(())
    })();

    if let Err(error) = delete_result {
        let _ = fs::rename(&trash_path, &root);
        let _ = write_history(&original_history);
        let _ = restore_ui_state_raw(original_ui_state.as_deref());
        return Err(error);
    }

    Ok(())
}

#[tauri::command]
fn clear_theme_history(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let _guard = state.persistence_lock.lock().map_err(|_| "Persistence lock poisoned.".to_string())?;
    write_history(&Vec::new())
}

#[tauri::command]
fn rollback_last_theme(state: tauri::State<'_, AppState>) -> Result<ApplyThemeResponse, String> {
    let _guard = state.persistence_lock.lock().map_err(|_| "Persistence lock poisoned.".to_string())?;
    let history = read_history()?;
    if history.len() < 2 {
      return Err("No previous theme snapshot is available to roll back to.".into());
    }

    let target = history[history.len() - 2].clone();
    let request_json = fs::read_to_string(&target.request_path).map_err(|err| err.to_string())?;
    let mut request: ApplyThemeRequest =
        serde_json::from_str(&request_json).map_err(|err| err.to_string())?;
    request.activate = true;
    apply_theme_internal(request, true, true)
}

fn apply_theme_internal(
    request: ApplyThemeRequest,
    record_history: bool,
    install_system_files: bool,
) -> Result<ApplyThemeResponse, String> {
    let ApplyThemeRequest {
        theme_name,
        theme_json,
        activate,
        ..
    } = request;
    let sanitized_theme_name = sanitize_theme_label(&theme_name);
    let sanitized_tokens = extract_theme_tokens(&theme_json)?;
    let theme_json = sanitized_theme_json(&theme_json, &sanitized_theme_name, &sanitized_tokens)?;
    let plasma_colors = build_plasma_colors(&sanitized_theme_name, &sanitized_tokens);
    let kvantum_config = build_kvantum_config(&sanitized_theme_name, &sanitized_tokens);
    let gtk_css = build_gtk_css(&sanitized_theme_name, &sanitized_tokens);

    let safe_name = sanitize_theme_name(&sanitized_theme_name);
    let root = theme_dir(&safe_name);
    let home_dir = home_dir();

    let plasma_path = home_dir
        .join(".local/share/color-schemes")
        .join(format!("{safe_name}.colors"));
    let kvantum_theme_path = home_dir
        .join(".config/Kvantum")
        .join(&safe_name)
        .join(format!("{safe_name}.kvconfig"));
    let kvantum_active_path = home_dir.join(".config/Kvantum/kvantum.kvconfig");
    let gtk3_theme_path = home_dir.join(".config/gtk-3.0/cachyos-theme.css");
    let gtk4_theme_path = home_dir.join(".config/gtk-4.0/cachyos-theme.css");
    let gtk3_import_path = home_dir.join(".config/gtk-3.0/gtk.css");
    let gtk4_import_path = home_dir.join(".config/gtk-4.0/gtk.css");
    let theme_json_path = root.join(format!("{safe_name}.json"));
    let request_path = root.join("request.json");
    let manifest_path = root.join("manifest.json");

    let manifest_json = serde_json::json!({
        "name": sanitized_theme_name,
        "safeName": safe_name,
        "installedAt": iso_timestamp(),
        "targets": {
            "plasma": format!("~/.local/share/color-schemes/{safe_name}.colors"),
            "kvantum": format!("~/.config/Kvantum/{safe_name}/{safe_name}.kvconfig"),
            "kvantumActive": "~/.config/Kvantum/kvantum.kvconfig",
            "gtk3Theme": "~/.config/gtk-3.0/cachyos-theme.css",
            "gtk3Import": "~/.config/gtk-3.0/gtk.css",
            "gtk4Theme": "~/.config/gtk-4.0/cachyos-theme.css",
            "gtk4Import": "~/.config/gtk-4.0/gtk.css",
            "themeJson": theme_json_path.display().to_string(),
            "requestJson": request_path.display().to_string()
        }
    });

    let request_snapshot = ApplyThemeRequest {
        theme_name: sanitized_theme_name.clone(),
        theme_json: theme_json.clone(),
        plasma_colors,
        kvantum_config,
        gtk_css,
        activate,
    };

    let mut writes = vec![
        (theme_json_path.clone(), theme_json.clone()),
        (
            request_path.clone(),
            serde_json::to_string_pretty(&request_snapshot).map_err(|err| err.to_string())?,
        ),
        (
            manifest_path.clone(),
            serde_json::to_string_pretty(&manifest_json).map_err(|err| err.to_string())?,
        ),
    ];

    if install_system_files {
        writes.extend(vec![
            (plasma_path, request_snapshot.plasma_colors.clone()),
            (kvantum_theme_path, request_snapshot.kvantum_config.clone()),
            (kvantum_active_path, format!("[General]\ntheme={safe_name}\n")),
            (gtk3_theme_path, request_snapshot.gtk_css.clone()),
            (gtk4_theme_path, request_snapshot.gtk_css.clone()),
        ]);
    }

    let mut written_paths = Vec::new();
    for (path, content) in writes {
        write_text_file(&path, &content)?;
        written_paths.push(path.display().to_string());
    }

    if install_system_files {
        merge_gtk_import(&gtk3_import_path)?;
        merge_gtk_import(&gtk4_import_path)?;
        written_paths.push(gtk3_import_path.display().to_string());
        written_paths.push(gtk4_import_path.display().to_string());
    }

    if record_history {
        append_history(ThemeHistoryEntry {
            safe_name: safe_name.clone(),
            display_name: sanitized_theme_name.clone(),
            applied_at: iso_timestamp(),
            theme_json_path: theme_json_path.display().to_string(),
            request_path: request_path.display().to_string(),
        })?;
    }

    if install_system_files {
        write_current_applied(Some(&ThemeHistoryEntry {
            safe_name: safe_name.clone(),
            display_name: sanitized_theme_name.clone(),
            applied_at: iso_timestamp(),
            theme_json_path: theme_json_path.display().to_string(),
            request_path: request_path.display().to_string(),
        }))?;
    }

    let mut activation_messages = vec![
        if install_system_files {
            "Theme files written.".to_string()
        } else {
            "Theme snapshot saved to the library.".to_string()
        },
        if install_system_files {
            "GTK imports merged.".to_string()
        } else {
            "System theme files were not changed.".to_string()
        },
    ];

    if activate && install_system_files {
        activation_messages.extend(run_activation(&safe_name));
    } else if activate {
        activation_messages.push("Activation skipped because the import only saved the snapshot.".to_string());
    } else {
        activation_messages.push("Activation skipped.".to_string());
    }

    Ok(ApplyThemeResponse {
        safe_name,
        home_dir: home_dir.display().to_string(),
        written_paths,
        activation_messages,
        theme_json,
    })
}

fn append_history(entry: ThemeHistoryEntry) -> Result<(), String> {
    let mut history = read_history()?;
    history.push(entry);
    write_history(&history)
}

fn write_history(history: &[ThemeHistoryEntry]) -> Result<(), String> {
    atomic_write_text_file(
        &history_path(),
        &serde_json::to_string_pretty(history).map_err(|err| err.to_string())?,
    )
}

fn write_current_applied(entry: Option<&ThemeHistoryEntry>) -> Result<(), String> {
    let path = current_applied_path();
    match entry {
        Some(entry) => atomic_write_text_file(
            &path,
            &serde_json::to_string_pretty(entry).map_err(|err| err.to_string())?,
        ),
        None => remove_path_if_exists(&path),
    }
}

fn read_history() -> Result<Vec<ThemeHistoryEntry>, String> {
    let path = history_path();
    if !path.exists() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(path).map_err(|err| err.to_string())?;
    serde_json::from_str(&raw).map_err(|err| err.to_string())
}

fn read_current_applied() -> Result<Option<ThemeHistoryEntry>, String> {
    let path = current_applied_path();
    if path.exists() {
        let raw = fs::read_to_string(path).map_err(|err| err.to_string())?;
        let entry = serde_json::from_str(&raw).map_err(|err| err.to_string())?;
        return Ok(Some(entry));
    }

    Ok(read_history()?.last().cloned())
}

fn read_display_name(manifest_path: &Path, fallback: &str) -> String {
    read_string_field(manifest_path, "name").unwrap_or_else(|| fallback.to_string())
}

fn read_string_field(path: &Path, field: &str) -> Option<String> {
    let raw = fs::read_to_string(path).ok()?;
    let value: serde_json::Value = serde_json::from_str(&raw).ok()?;
    value.get(field)?.as_str().map(|value| value.to_string())
}

fn modified_at_string(path: &Path) -> Option<String> {
    let metadata = fs::metadata(path).ok()?;
    let modified = metadata.modified().ok()?;
    Some(system_time_to_string(modified))
}

fn run_activation(safe_name: &str) -> Vec<String> {
    let mut messages = Vec::new();

    match run_command("plasma-apply-colorscheme", &[safe_name]) {
        CommandState::Applied => messages.push("Plasma color scheme applied.".to_string()),
        CommandState::Missing => messages.push("Plasma activation command unavailable.".to_string()),
        CommandState::Failed(message) => messages.push(format!("Plasma activation failed: {message}")),
    }

    match run_command("kvantummanager", &["--set", safe_name]) {
        CommandState::Applied => messages.push("Kvantum theme applied.".to_string()),
        CommandState::Missing => {
            messages.push("Kvantum manager unavailable. Selector file still written.".to_string())
        }
        CommandState::Failed(message) => messages.push(format!("Kvantum activation failed: {message}")),
    }

    messages.push("GTK import files are active for the user session.".to_string());
    messages
}

fn write_text_file(path: &Path, content: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    fs::write(path, content).map_err(|err| err.to_string())
}

fn atomic_write_text_file(path: &Path, content: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Invalid file path.".to_string())?;
    let temp_path = path.with_file_name(format!("{file_name}.tmp"));
    fs::write(&temp_path, content).map_err(|err| err.to_string())?;
    fs::rename(&temp_path, path).map_err(|err| err.to_string())
}

fn remove_path_if_exists(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    fs::remove_file(path).map_err(|err| err.to_string())
}

fn renamed_theme_json_content(raw: &str, new_name: &str) -> Result<String, String> {
    let mut value: serde_json::Value = serde_json::from_str(raw).map_err(|err| err.to_string())?;
    value["name"] = serde_json::Value::String(new_name.to_string());
    serde_json::to_string_pretty(&value).map_err(|err| err.to_string())
}

fn renamed_request_json_content(raw: &str, new_name: &str) -> Result<String, String> {
    let mut value: serde_json::Value = serde_json::from_str(raw).map_err(|err| err.to_string())?;
    value["themeName"] = serde_json::Value::String(new_name.to_string());

    if let Some(theme_json) = value.get("themeJson").and_then(|value| value.as_str()) {
        let renamed_theme_json = rename_theme_payload_json(theme_json, new_name)?;
        value["themeJson"] = serde_json::Value::String(renamed_theme_json);
    }

    serde_json::to_string_pretty(&value).map_err(|err| err.to_string())
}

fn renamed_manifest_json_content(raw: &str, new_name: &str) -> Result<String, String> {
    let mut value: serde_json::Value = serde_json::from_str(raw).map_err(|err| err.to_string())?;
    value["name"] = serde_json::Value::String(new_name.to_string());
    serde_json::to_string_pretty(&value).map_err(|err| err.to_string())
}

fn rename_theme_payload_json(theme_json: &str, new_name: &str) -> Result<String, String> {
    let mut payload: serde_json::Value = serde_json::from_str(theme_json).map_err(|err| err.to_string())?;
    payload["name"] = serde_json::Value::String(new_name.to_string());
    serde_json::to_string_pretty(&payload).map_err(|err| err.to_string())
}

fn build_saved_theme_summary(safe_name: &str) -> Result<SavedThemeSummary, String> {
    let root = theme_dir(safe_name);
    let theme_json_path = root.join(format!("{safe_name}.json"));
    let manifest_path = root.join("manifest.json");
    if !theme_json_path.exists() {
        return Err("Saved theme snapshot is missing its theme JSON.".into());
    }

    let display_name = read_display_name(&manifest_path, safe_name);
    let installed_at = read_string_field(&manifest_path, "installedAt").unwrap_or_else(|| "unknown".into());
    let updated_at = modified_at_string(&theme_json_path).unwrap_or_else(|| installed_at.clone());

    Ok(SavedThemeSummary {
        safe_name: safe_name.to_string(),
        display_name,
        installed_at,
        updated_at,
        theme_json_path: theme_json_path.display().to_string(),
    })
}

fn clear_selected_theme_if_matches(safe_name: &str) -> Result<(), String> {
    let Some(raw) = read_ui_state_raw()? else {
        return Ok(());
    };
    let mut state: UiState = serde_json::from_str(&raw).map_err(|err| err.to_string())?;
    if state
        .selected_theme_safe_name
        .as_deref()
        .map(|value| value == safe_name)
        .unwrap_or(false)
    {
        state.selected_theme_safe_name = None;
        atomic_write_text_file(
            &ui_state_path(),
            &serde_json::to_string_pretty(&state).map_err(|err| err.to_string())?,
        )?;
    }

    Ok(())
}

fn read_ui_state_raw() -> Result<Option<String>, String> {
    let path = ui_state_path();
    if !path.exists() {
        return Ok(None);
    }

    fs::read_to_string(path)
        .map(Some)
        .map_err(|err| err.to_string())
}

fn restore_ui_state_raw(raw: Option<&str>) -> Result<(), String> {
    match raw {
        Some(raw) => atomic_write_text_file(&ui_state_path(), raw),
        None => remove_path_if_exists(&ui_state_path()),
    }
}

fn merge_gtk_import(path: &Path) -> Result<(), String> {
    let managed_block = "/* CachyOS Theme Studio: begin */\n/* Generated by CachyOS Theme Studio */\n@import url(\"cachyos-theme.css\");\n/* CachyOS Theme Studio: end */";
    let begin_marker = "/* CachyOS Theme Studio: begin */";
    let end_marker = "/* CachyOS Theme Studio: end */";

    if !path.exists() {
        write_text_file(path, &format!("{managed_block}\n"))?;
        return Ok(());
    }

    let existing = fs::read_to_string(path).map_err(|err| err.to_string())?;
    if let Some(begin_index) = existing.find(begin_marker) {
        if let Some(relative_end_index) = existing[begin_index..].find(end_marker) {
            let end_index = begin_index + relative_end_index + end_marker.len();
            let mut merged = String::new();
            merged.push_str(&existing[..begin_index]);
            merged.push_str(managed_block);
            merged.push_str(&existing[end_index..]);
            return write_text_file(path, &merged);
        }
    }

    let merged = format!("{managed_block}\n\n{existing}");
    write_text_file(path, &merged)
}

fn command_exists(command: &str) -> bool {
    Command::new("sh")
        .arg("-lc")
        .arg(format!("command -v {command} >/dev/null 2>&1"))
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

enum CommandState {
    Applied,
    Missing,
    Failed(String),
}

fn run_command(command: &str, args: &[&str]) -> CommandState {
    if !command_exists(command) {
        return CommandState::Missing;
    }

    match Command::new(command).args(args).status() {
        Ok(status) if status.success() => CommandState::Applied,
        Ok(status) => CommandState::Failed(format!("exit status {}", status)),
        Err(error) => CommandState::Failed(error.to_string()),
    }
}

fn build_plasma_colors(theme_name: &str, tokens: &serde_json::Value) -> String {
    let background = token_hex(tokens, "bg");
    let panel = token_hex(tokens, "panel");
    let elevated = token_hex(tokens, "panel-elevated");
    let text = token_hex(tokens, "text");
    let accent = token_hex(tokens, "accent");
    let accent_strong = token_hex(tokens, "accent-strong");
    let border = token_hex(tokens, "border");

    format!(
        "[General]\nColorScheme={}\nName={}\n\n[Colors:Window]\nBackgroundNormal={}\nBackgroundAlternate={}\nForegroundNormal={}\nForegroundActive={}\nForegroundVisited={}\nDecorationFocus={}\nDecorationHover={}\n\n[Colors:View]\nBackgroundNormal={}\nBackgroundAlternate={}\nForegroundNormal={}\nForegroundActive={}\nDecorationFocus={}\nDecorationHover={}\n",
        sanitize_theme_name(theme_name),
        theme_name,
        hex_to_csv(&panel),
        hex_to_csv(&elevated),
        hex_to_csv(&text),
        hex_to_csv(&accent),
        hex_to_csv(&accent_strong),
        hex_to_csv(&accent),
        hex_to_csv(&border),
        hex_to_csv(&background),
        hex_to_csv(&panel),
        hex_to_csv(&text),
        hex_to_csv(&accent),
        hex_to_csv(&accent),
        hex_to_csv(&border)
    )
}

fn build_integration_health(
    home_dir: &Path,
    plasma_apply_available: bool,
    kvantum_manager_available: bool,
    current_applied_safe_name: Option<String>,
) -> Vec<HealthCheck> {
    let plasma_dir = home_dir.join(".local/share/color-schemes");
    let kvantum_selector = home_dir.join(".config/Kvantum/kvantum.kvconfig");
    let gtk3_import = home_dir.join(".config/gtk-3.0/gtk.css");
    let gtk4_import = home_dir.join(".config/gtk-4.0/gtk.css");
    let gtk3_theme = home_dir.join(".config/gtk-3.0/cachyos-theme.css");
    let gtk4_theme = home_dir.join(".config/gtk-4.0/cachyos-theme.css");

    vec![
        HealthCheck {
            id: "plasma".into(),
            label: "Plasma".into(),
            status: if plasma_apply_available && plasma_dir.exists() {
                "ready".into()
            } else if plasma_dir.exists() {
                "partial".into()
            } else {
                "missing".into()
            },
            detail: if let Some(current) = current_applied_safe_name.clone() {
                format!(
                    "Color schemes directory: {}. Activation command: {}. Current theme: {}.",
                    display_bool(plasma_dir.exists()),
                    display_bool(plasma_apply_available),
                    current
                )
            } else {
                format!(
                    "Color schemes directory: {}. Activation command: {}.",
                    display_bool(plasma_dir.exists()),
                    display_bool(plasma_apply_available)
                )
            },
            action_label: current_applied_safe_name
                .as_ref()
                .map(|_| "Reapply Plasma".to_string()),
            diagnostics: vec![
                DiagnosticEntry {
                    label: "Color Scheme Path".into(),
                    value: plasma_dir.display().to_string(),
                },
                DiagnosticEntry {
                    label: "Directory Exists".into(),
                    value: display_bool(plasma_dir.exists()).into(),
                },
                DiagnosticEntry {
                    label: "Activation Command".into(),
                    value: command_diagnostic("plasma-apply-colorscheme"),
                },
            ],
        },
        HealthCheck {
            id: "kvantum".into(),
            label: "Kvantum".into(),
            status: if kvantum_manager_available && kvantum_selector.exists() {
                "ready".into()
            } else if kvantum_selector.exists() {
                "partial".into()
            } else {
                "missing".into()
            },
            detail: format!(
                "Selector file: {}. Manager command: {}.",
                display_bool(kvantum_selector.exists()),
                display_bool(kvantum_manager_available)
            ),
            action_label: current_applied_safe_name
                .as_ref()
                .map(|_| "Reapply Kvantum".to_string()),
            diagnostics: vec![
                DiagnosticEntry {
                    label: "Selector File".into(),
                    value: kvantum_selector.display().to_string(),
                },
                DiagnosticEntry {
                    label: "Selector Exists".into(),
                    value: display_bool(kvantum_selector.exists()).into(),
                },
                DiagnosticEntry {
                    label: "Manager Command".into(),
                    value: command_diagnostic("kvantummanager"),
                },
            ],
        },
        HealthCheck {
            id: "gtk3".into(),
            label: "GTK 3".into(),
            status: gtk_status(&gtk3_import, &gtk3_theme),
            detail: gtk_detail(&gtk3_import, &gtk3_theme),
            action_label: current_applied_safe_name
                .as_ref()
                .map(|_| "Repair GTK 3".to_string()),
            diagnostics: gtk_diagnostics(&gtk3_import, &gtk3_theme),
        },
        HealthCheck {
            id: "gtk4".into(),
            label: "GTK 4".into(),
            status: gtk_status(&gtk4_import, &gtk4_theme),
            detail: gtk_detail(&gtk4_import, &gtk4_theme),
            action_label: current_applied_safe_name
                .as_ref()
                .map(|_| "Repair GTK 4".to_string()),
            diagnostics: gtk_diagnostics(&gtk4_import, &gtk4_theme),
        },
    ]
}

fn gtk_status(import_path: &Path, theme_path: &Path) -> String {
    if !import_path.exists() || !theme_path.exists() {
        return "missing".into();
    }

    if gtk_import_present(import_path) {
        "ready".into()
    } else {
        "partial".into()
    }
}

fn gtk_detail(import_path: &Path, theme_path: &Path) -> String {
    format!(
        "Import file: {}. Managed import block: {}. Theme CSS: {}.",
        display_bool(import_path.exists()),
        display_bool(gtk_import_present(import_path)),
        display_bool(theme_path.exists())
    )
}

fn gtk_import_present(path: &Path) -> bool {
    fs::read_to_string(path)
        .map(|content| content.contains("@import url(\"cachyos-theme.css\");"))
        .unwrap_or(false)
}

fn gtk_diagnostics(import_path: &Path, theme_path: &Path) -> Vec<DiagnosticEntry> {
    vec![
        DiagnosticEntry {
            label: "Import File".into(),
            value: import_path.display().to_string(),
        },
        DiagnosticEntry {
            label: "Import Exists".into(),
            value: display_bool(import_path.exists()).into(),
        },
        DiagnosticEntry {
            label: "Managed Import".into(),
            value: display_bool(gtk_import_present(import_path)).into(),
        },
        DiagnosticEntry {
            label: "Theme CSS".into(),
            value: theme_path.display().to_string(),
        },
        DiagnosticEntry {
            label: "Theme CSS Exists".into(),
            value: display_bool(theme_path.exists()).into(),
        },
        DiagnosticEntry {
            label: "Theme CSS Modified".into(),
            value: modified_at_string(theme_path).unwrap_or_else(|| "unknown".into()),
        },
    ]
}

fn command_diagnostic(command: &str) -> String {
    if !command_exists(command) {
        return "missing".into();
    }

    Command::new("sh")
        .arg("-lc")
        .arg(format!("command -v {command}"))
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "available".into())
}

fn display_bool(value: bool) -> &'static str {
    if value {
        "yes"
    } else {
        "no"
    }
}

fn reapply_current_theme_for_target(target_id: &str) -> Result<ApplyThemeResponse, String> {
    let current = read_current_applied()?
        .ok_or_else(|| "No current theme snapshot is available.".to_string())?;
    let request_json = fs::read_to_string(&current.request_path).map_err(|err| err.to_string())?;
    let request: ApplyThemeRequest =
        serde_json::from_str(&request_json).map_err(|err| err.to_string())?;
    let safe_name = sanitize_theme_name(&request.theme_name);
    let home_dir = home_dir();
    let mut written_paths = Vec::new();
    let mut activation_messages = Vec::new();

    match target_id {
        "plasma" => {
            let plasma_path = home_dir
                .join(".local/share/color-schemes")
                .join(format!("{safe_name}.colors"));
            write_text_file(&plasma_path, &request.plasma_colors)?;
            written_paths.push(plasma_path.display().to_string());
            activation_messages.push("Plasma color scheme file rewritten from the current snapshot.".into());
            activation_messages.push(match run_command("plasma-apply-colorscheme", &[&safe_name]) {
                CommandState::Applied => "Plasma color scheme applied.".into(),
                CommandState::Missing => "Plasma activation command unavailable.".into(),
                CommandState::Failed(message) => format!("Plasma activation failed: {message}"),
            });
        }
        "kvantum" => {
            let kvantum_theme_path = home_dir
                .join(".config/Kvantum")
                .join(&safe_name)
                .join(format!("{safe_name}.kvconfig"));
            let kvantum_active_path = home_dir.join(".config/Kvantum/kvantum.kvconfig");
            write_text_file(&kvantum_theme_path, &request.kvantum_config)?;
            write_text_file(&kvantum_active_path, &format!("[General]\ntheme={safe_name}\n"))?;
            written_paths.push(kvantum_theme_path.display().to_string());
            written_paths.push(kvantum_active_path.display().to_string());
            activation_messages.push("Kvantum theme files rewritten from the current snapshot.".into());
            activation_messages.push(match run_command("kvantummanager", &["--set", &safe_name]) {
                CommandState::Applied => "Kvantum theme applied.".into(),
                CommandState::Missing => "Kvantum manager unavailable. Selector file still written.".into(),
                CommandState::Failed(message) => format!("Kvantum activation failed: {message}"),
            });
        }
        _ => return Err("Unknown targeted reapply.".into()),
    }

    Ok(ApplyThemeResponse {
        safe_name,
        home_dir: home_dir.display().to_string(),
        written_paths,
        activation_messages,
        theme_json: request.theme_json,
    })
}

fn repair_gtk_target(target_id: &str) -> Result<ApplyThemeResponse, String> {
    let current = read_current_applied()?
        .ok_or_else(|| "No current theme snapshot is available.".to_string())?;
    let request_json = fs::read_to_string(&current.request_path).map_err(|err| err.to_string())?;
    let request: ApplyThemeRequest =
        serde_json::from_str(&request_json).map_err(|err| err.to_string())?;

    let safe_name = sanitize_theme_name(&request.theme_name);
    let home_dir = home_dir();
    let mut written_paths = Vec::new();

    match target_id {
        "gtk3" => {
            let gtk3_theme_path = home_dir.join(".config/gtk-3.0/cachyos-theme.css");
            let gtk3_import_path = home_dir.join(".config/gtk-3.0/gtk.css");
            write_text_file(&gtk3_theme_path, &request.gtk_css)?;
            merge_gtk_import(&gtk3_import_path)?;
            written_paths.push(gtk3_theme_path.display().to_string());
            written_paths.push(gtk3_import_path.display().to_string());
        }
        "gtk4" => {
            let gtk4_theme_path = home_dir.join(".config/gtk-4.0/cachyos-theme.css");
            let gtk4_import_path = home_dir.join(".config/gtk-4.0/gtk.css");
            write_text_file(&gtk4_theme_path, &request.gtk_css)?;
            merge_gtk_import(&gtk4_import_path)?;
            written_paths.push(gtk4_theme_path.display().to_string());
            written_paths.push(gtk4_import_path.display().to_string());
        }
        _ => return Err("Unknown GTK repair target.".into()),
    }

    Ok(ApplyThemeResponse {
        safe_name,
        home_dir: home_dir.display().to_string(),
        written_paths,
        activation_messages: vec![
            "GTK theme files rewritten from the current snapshot.".into(),
            "Managed import block repaired.".into(),
        ],
        theme_json: request.theme_json,
    })
}

fn build_kvantum_config(theme_name: &str, tokens: &serde_json::Value) -> String {
    let panel = token_hex(tokens, "panel");
    let background = token_hex(tokens, "bg");
    let text = token_hex(tokens, "text");
    let accent = token_hex(tokens, "accent");
    let accent_strong = token_hex(tokens, "accent-strong");
    let border = token_hex(tokens, "border");

    format!(
        "[General]\nthemeName={}\ncomment=Imported by CachyOS Theme Studio\n\n[Palette]\nwindow.color={}\nbase.color={}\ntext.color={}\nbutton.color={}\nbuttontext.color={}\nhighlight.color={}\nvisitedlink.color={}\nmid.color={}\n",
        sanitize_theme_name(theme_name),
        panel,
        background,
        text,
        panel,
        text,
        accent,
        accent_strong,
        border
    )
}

fn build_gtk_css(theme_name: &str, tokens: &serde_json::Value) -> String {
    let background = token_hex(tokens, "bg");
    let panel = token_hex(tokens, "panel");
    let elevated = token_hex(tokens, "panel-elevated");
    let text = token_hex(tokens, "text");
    let muted = token_hex(tokens, "muted");
    let accent = token_hex(tokens, "accent");
    let accent_strong = token_hex(tokens, "accent-strong");
    let border = token_hex(tokens, "border");

    format!(
        "/* {}: GTK starter variables */\n:root {{\n  --cachyos-bg: {};\n  --cachyos-panel: {};\n  --cachyos-panel-elevated: {};\n  --cachyos-text: {};\n  --cachyos-muted: {};\n  --cachyos-accent: {};\n  --cachyos-accent-strong: {};\n  --cachyos-border: {};\n}}\n\nwindow,\n.background {{\n  background: var(--cachyos-bg);\n  color: var(--cachyos-text);\n}}\n\nheaderbar,\n.titlebar {{\n  background: var(--cachyos-panel-elevated);\n  color: var(--cachyos-text);\n  border-color: var(--cachyos-border);\n}}\n\nbutton.suggested-action,\nbutton:checked {{\n  background: linear-gradient(135deg, var(--cachyos-accent), var(--cachyos-accent-strong));\n  color: #04131b;\n}}\n\n.dim-label,\n.subtitle {{\n  color: var(--cachyos-muted);\n}}\n",
        theme_name, background, panel, elevated, text, muted, accent, accent_strong, border
    )
}

fn token_hex(tokens: &serde_json::Value, key: &str) -> String {
    tokens
        .get(key)
        .and_then(|value| value.as_str())
        .and_then(normalize_hex)
        .unwrap_or_else(|| "#000000".into())
}

fn normalize_hex(value: &str) -> Option<String> {
    let normalized = value.trim().to_ascii_lowercase();
    if normalized.len() == 7
        && normalized.starts_with('#')
        && normalized.chars().skip(1).all(|character| character.is_ascii_hexdigit())
    {
        Some(normalized)
    } else {
        None
    }
}

fn sanitize_theme_label(input: &str) -> String {
    let collapsed = input
        .chars()
        .filter(|character| !character.is_control())
        .collect::<String>()
        .replace("*/", "* /")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if collapsed.is_empty() {
        "Untitled Theme".into()
    } else {
        collapsed
    }
}

fn sanitize_theme_tokens(tokens: &serde_json::Value) -> Result<serde_json::Value, String> {
    let required_keys = [
        "bg",
        "panel",
        "panel-elevated",
        "text",
        "muted",
        "accent",
        "accent-strong",
        "border",
        "success",
        "warning",
        "danger",
    ];

    let mut sanitized = serde_json::Map::new();
    for key in required_keys {
        let value = tokens
            .get(key)
            .and_then(|value| value.as_str())
            .and_then(normalize_hex)
            .ok_or_else(|| format!("Imported theme token {key} is missing or invalid."))?;
        sanitized.insert(key.to_string(), serde_json::Value::String(value));
    }

    Ok(serde_json::Value::Object(sanitized))
}

fn extract_theme_tokens(theme_json: &str) -> Result<serde_json::Value, String> {
    let value: serde_json::Value = serde_json::from_str(theme_json).map_err(|err| err.to_string())?;
    let tokens = value
        .get("tokens")
        .ok_or_else(|| "Theme JSON is missing tokens.".to_string())?;
    sanitize_theme_tokens(tokens)
}

fn sanitized_theme_json(
    raw_theme_json: &str,
    theme_name: &str,
    tokens: &serde_json::Value,
) -> Result<String, String> {
    let mut value: serde_json::Value = serde_json::from_str(raw_theme_json).map_err(|err| err.to_string())?;
    value["name"] = serde_json::Value::String(theme_name.to_string());
    value["tokens"] = tokens.clone();
    serde_json::to_string_pretty(&value).map_err(|err| err.to_string())
}

fn hex_to_csv(hex: &str) -> String {
    let trimmed = hex.trim_start_matches('#');
    if trimmed.len() != 6 {
        return "0,0,0".into();
    }

    let r = u8::from_str_radix(&trimmed[0..2], 16).unwrap_or(0);
    let g = u8::from_str_radix(&trimmed[2..4], 16).unwrap_or(0);
    let b = u8::from_str_radix(&trimmed[4..6], 16).unwrap_or(0);
    format!("{r},{g},{b}")
}

fn sanitize_theme_name(input: &str) -> String {
    let mapped: String = input
        .trim()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
                character
            } else {
                '-'
            }
        })
        .collect();

    if mapped.is_empty() {
        "Untitled-Theme".into()
    } else {
        mapped
    }
}

fn home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("."))
}

fn config_root() -> PathBuf {
    home_dir().join(".config/cachyos-theme-studio")
}

fn themes_root() -> PathBuf {
    config_root().join("themes")
}

fn theme_dir(safe_name: &str) -> PathBuf {
    themes_root().join(safe_name)
}

fn deleted_theme_trash_dir(safe_name: &str) -> PathBuf {
    config_root().join("trash").join(format!("{safe_name}-pending-delete"))
}

fn history_path() -> PathBuf {
    config_root().join("history.json")
}

fn ui_state_path() -> PathBuf {
    config_root().join("ui-state.json")
}

fn current_applied_path() -> PathBuf {
    config_root().join("current-applied.json")
}

fn validate_theme_safe_name(input: &str) -> Result<String, String> {
    let safe_name = input.trim();
    if safe_name.is_empty() {
        return Err("Missing theme snapshot id.".into());
    }
    if sanitize_theme_name(safe_name) != safe_name || safe_name == "." || safe_name == ".." {
        return Err("Invalid theme snapshot id.".into());
    }
    Ok(safe_name.to_string())
}

fn system_time_to_string(time: SystemTime) -> String {
    let seconds = time
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    seconds.to_string()
}

fn iso_timestamp() -> String {
    system_time_to_string(SystemTime::now())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            persistence_lock: Mutex::new(()),
        })
        .invoke_handler(tauri::generate_handler![
            detect_environment,
            load_ui_state,
            save_ui_state,
            reset_ui_state,
            run_health_action,
            apply_theme,
            import_theme_to_library,
            list_theme_library,
            load_saved_theme,
            rename_saved_theme,
            delete_saved_theme,
            clear_theme_history,
            rollback_last_theme
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
