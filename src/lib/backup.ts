// 用户数据备份 / 恢复：收藏、外观（主题/主题色）、背景（预设 + 自定义图片）、开机自启动状态等。
// 这些数据目前都保存在 localStorage，导出为一个 JSON 文件，导入时整体恢复。

const APP_ID = "linux-command-helper";

// 需要备份的 localStorage 键。键名必须与各 hooks 里定义的一致。
const DATA_KEYS = [
  "lch-favorites",
  "lch-theme",
  "lch-accent",
  "lch-glass",
  "lch-bg",
  "lch-bg-images",
  "lch-bg-active-image",
];

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

// 收集当前所有需要备份的数据（值按原类型读取，不二次序列化字符串）。
export function collectBackup(): BackupFile {
  const data: Record<string, unknown> = {};
  for (const key of DATA_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    } catch {
      /* ignore */
    }
  }
  return {
    app: APP_ID,
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// 导出为 JSON 文件下载（WebView2 走浏览器下载流程保存到下载目录）。
export function downloadBackupFile(): void {
  const json = JSON.stringify(collectBackup(), null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Linux指令速查助手-备份-${timestamp()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface ImportResult {
  ok: boolean;
  message: string;
}

// 校验并导入备份文件：把所有可识别键写回 localStorage；导入成功后建议刷新页面以重新应用所有设置。
export async function importBackupFile(file: File): Promise<ImportResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, message: "读取文件失败，请重试。" };
  }

  let parsed: Partial<BackupFile>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "不是有效的备份文件（无法解析 JSON）。" };
  }

  if (parsed?.app !== APP_ID || typeof parsed.data !== "object" || parsed.data === null) {
    return { ok: false, message: "不是「Linux 指令速查助手」的备份文件。" };
  }

  let count = 0;
  for (const key of DATA_KEYS) {
    if (!(key in parsed.data)) continue;
    try {
      localStorage.setItem(key, JSON.stringify(parsed.data[key]));
      count += 1;
    } catch {
      /* ignore */
    }
  }

  if (count === 0) {
    return { ok: false, message: "备份文件中没有可恢复的数据。" };
  }
  return { ok: true, message: `成功恢复 ${count} 项配置，正在刷新…` };
}
