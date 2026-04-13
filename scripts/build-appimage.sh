#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPIMAGE_DIR="$ROOT_DIR/src-tauri/target/release/bundle/appimage"
APPIMAGE_DEB_DIR="$ROOT_DIR/src-tauri/target/release/bundle/appimage_deb"
APPDIR="$APPIMAGE_DIR/CachyOS Theme Studio.AppDir"
VERSION="$(node -p "require('$ROOT_DIR/package.json').version")"
APPIMAGE="$APPIMAGE_DIR/CachyOS Theme Studio_${VERSION}_amd64.AppImage"
APPIMAGE_PLUGIN="${TAURI_APPIMAGE_PLUGIN:-$HOME/.cache/tauri/linuxdeploy-plugin-appimage.AppImage}"
DESKTOP_SOURCE="$APPDIR/usr/share/applications/CachyOS Theme Studio.desktop"
DESKTOP_TARGET="$APPDIR/usr/share/applications/com.cachyos.themestudio.desktop"
ROOT_DESKTOP_LINK="$APPDIR/com.cachyos.themestudio.desktop"
METADATA_DIR="$APPDIR/usr/share/metainfo"
METADATA_SOURCE="$ROOT_DIR/packaging/appstream/com.cachyos.themestudio.appdata.xml"

# Tauri reuses the AppDir between AppImage runs; clean it so stale bundle files
# cannot break appstream validation after metadata or icon path changes.
rm -rf "$APPIMAGE_DIR" "$APPIMAGE_DEB_DIR"

cd "$ROOT_DIR"
NO_STRIP=true npx tauri build -b appimage

# appimagetool expects AppStream metadata to match the AppDir desktop filename.
# Tauri names the desktop file after productName, so normalize only the AppImage
# staging tree before rebuilding the final AppImage artifact.
if [[ -f "$DESKTOP_SOURCE" ]]; then
  mv "$DESKTOP_SOURCE" "$DESKTOP_TARGET"
fi

rm -f "$APPDIR/CachyOS Theme Studio.desktop" "$ROOT_DESKTOP_LINK"
ln -s "usr/share/applications/com.cachyos.themestudio.desktop" "$ROOT_DESKTOP_LINK"

mkdir -p "$METADATA_DIR"
rm -f "$METADATA_DIR"/*.appdata.xml "$METADATA_DIR"/*.metainfo.xml
cp "$METADATA_SOURCE" "$METADATA_DIR/com.cachyos.themestudio.appdata.xml"
rm -f "$APPIMAGE"

ARCH=x86_64 LDAI_OUTPUT="$APPIMAGE" "$APPIMAGE_PLUGIN" --appimage-extract-and-run --appdir "$APPDIR"
