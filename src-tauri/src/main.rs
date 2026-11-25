#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // NVIDIA's driver cannot share WebKitGTK's DMA-BUF buffers with Wayland compositors, which
    // closes the window with a protocol error. Shared-memory buffers avoid that while keeping
    // GPU rendering; disabling the DMA-BUF renderer instead would paint every frame on the CPU
    // and make scrolling slow. Choices the user made through WebKit's variables are kept.
    #[cfg(target_os = "linux")]
    if std::path::Path::new("/sys/module/nvidia").exists()
        && [
            "WEBKIT_DISABLE_DMABUF_RENDERER",
            "WEBKIT_DMABUF_RENDERER_FORCE_SHM",
            "WEBKIT_DISABLE_COMPOSITING_MODE",
        ]
        .iter()
        .all(|name| std::env::var_os(name).is_none())
    {
        std::env::set_var("WEBKIT_DMABUF_RENDERER_FORCE_SHM", "1");
    }
    asdfy_lib::run();
}
