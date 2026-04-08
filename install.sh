#!/bin/bash
set -e

echo "==> Detecting distribution..."

if [ -f /etc/debian_version ]; then
    sudo apt update
    sudo apt install -y python3-pip python3-pyqt6 python3-pyqt6.qtwebengine
elif [ -f /etc/arch-release ]; then
    sudo pacman -S --noconfirm python-pip python-pyqt6 python-pyqt6-webengine
elif [ -f /etc/fedora-release ]; then
    sudo dnf install -y python3-pip python3-pyqt6 python3-pyqt6-webengine
else
    echo "Unknown distribution. Please install manually: python3-pip, PyQt6 and PyQt6-WebEngine."
    exit 1
fi

echo "==> Updating setuptools..."
pip install --upgrade setuptools --break-system-packages

echo "==> Installing Python dependencies..."
pip install -r requirements.txt --break-system-packages

echo "==> Installing simple-linux..."
pip install . --break-system-packages


if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    export PATH="$HOME/.local/bin:$PATH"
    echo "==> Added ~/.local/bin to PATH"
fi

echo "==> Installing desktop entry and icon..."
mkdir -p ~/.local/share/applications
mkdir -p ~/.local/share/icons

sed -i "s|Exec=simple-linux|Exec=$HOME/.local/bin/simple-linux|g" simple-linux.desktop

cp simple-linux.desktop ~/.local/share/applications/
cp simple-linux.svg ~/.local/share/icons/simple-linux.svg

update-desktop-database ~/.local/share/applications/ 2>/dev/null || true

echo ""
echo "✓ Done! Run with: simple-linux"