import { useCallback, useEffect, useState } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

// 开机自启动状态管理（基于 tauri-plugin-autostart）。
// 在桌面端读取真实状态；在浏览器（如纯前端 dev）下优雅降级为禁用。
export function useAutostart() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    isEnabled()
      .then((v) => setEnabled(v))
      .catch((e) => console.error("[autostart] 读取状态失败", e))
      .finally(() => setReady(true));
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (enabled) {
        await disable();
      } else {
        await enable();
      }
      setEnabled((prev) => !prev);
    } catch (e) {
      console.error("[autostart] 切换失败", e);
    }
  }, [enabled]);

  return { enabled, ready, toggle };
}
