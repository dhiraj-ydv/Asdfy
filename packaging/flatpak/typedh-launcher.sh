#!/usr/bin/env sh
# WebKit's DMA-BUF renderer can terminate Wayland clients on NVIDIA systems.
# Use its supported fallback unless the caller explicitly opts back in.
export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"
exec /app/bin/typedh-bin "$@"
