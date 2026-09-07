import { BACKGROUNDS, type BackgroundKey, type SavedImage } from "../hooks/useBackground";
import { ACCENTS, type AccentKey, type Theme } from "../hooks/useTheme";

type SettingsModalProps = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  accent: AccentKey;
  setAccent: (a: AccentKey) => void;
  bg: BackgroundKey;
  setBackground: (b: BackgroundKey) => void;
  images: SavedImage[];
  activeImageId: string | null;
  onUploadImage: (file: File) => void;
  onSelectImage: (id: string) => void;
  onRemoveImage: (id: string) => void;
  onClearImage: () => void;
  autostartEnabled: boolean;
  autostartReady: boolean;
  onToggleAutostart: () => void;
  onClose: () => void;
};

const MAX_IMAGES = 5;

export function SettingsModal({
  theme,
  setTheme,
  accent,
  setAccent,
  bg,
  setBackground,
  images,
  activeImageId,
  onUploadImage,
  onSelectImage,
  onRemoveImage,
  onClearImage,
  autostartEnabled,
  autostartReady,
  onToggleAutostart,
  onClose,
}: SettingsModalProps) {
  const accentKeys = Object.keys(ACCENTS) as AccentKey[];
  const bgKeys = Object.keys(BACKGROUNDS) as BackgroundKey[];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal glass-modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="设置"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-title">
            <span className="settings-head-icon">⚙️</span>
            <div>
              <div className="modal-cmd settings-title">设置</div>
              <div className="modal-cat">外观、背景与开机自启动</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="关闭设置">
            ✕
          </button>
        </div>

        <div className="modal-body settings-body">
          {/* 主题 */}
          <section className="settings-group">
            <div className="settings-row-head">
              <span className="settings-label">主题</span>
              <span className="settings-hint">{theme === "dark" ? "深色" : "浅色"}</span>
            </div>
            <div className="segmented">
              <button
                className={`segment ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                🌙 深色
              </button>
              <button
                className={`segment ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                ☀️ 浅色
              </button>
            </div>
          </section>

          {/* 强调色 */}
          <section className="settings-group">
            <div className="settings-row-head">
              <span className="settings-label">主题色</span>
            </div>
            <div className="swatch-row">
              {accentKeys.map((key) => (
                <button
                  key={key}
                  className={`accent-dot ${accent === key ? "active" : ""}`}
                  style={{ background: ACCENTS[key] }}
                  onClick={() => setAccent(key)}
                  aria-label={`主题色 ${key}`}
                  title={key}
                />
              ))}
            </div>
          </section>

          {/* 背景 */}
          <section className="settings-group">
            <div className="settings-row-head">
              <span className="settings-label">背景 · 极光</span>
            </div>
            <div className="swatch-row">
              {bgKeys
                .filter((k) => k !== "image")
                .map((key) => (
                  <button
                    key={key}
                    className={`bg-swatch ${bg === key ? "active" : ""}`}
                    style={{ background: BACKGROUNDS[key].preview }}
                    onClick={() => setBackground(key)}
                    aria-label={`背景 ${BACKGROUNDS[key].label}`}
                    title={BACKGROUNDS[key].label}
                  />
                ))}
            </div>
            <div className="settings-hint">已选：{BACKGROUNDS[bg].label}</div>

            <div className="bg-upload">
              <label className="upload-btn">
                📷 上传图片（可多张）
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="file-hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    files.forEach((f) => onUploadImage(f));
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {images.length > 0 && (
                <button className="clear-btn" onClick={onClearImage}>
                  ✕ 清除全部图片
                </button>
              )}
            </div>

            <div className="bg-library">
              <div className="settings-row-head">
                <span className="settings-label">我的背景 · 单击切换</span>
                <span className="settings-hint">
                  {images.length}/{MAX_IMAGES} 张
                </span>
              </div>
              {images.length === 0 ? (
                <p className="settings-desc">
                  保存的自定义图片会出现在这里，单击即可切换；最多保存 {MAX_IMAGES} 张，保存超过后会自动替换最早的一张。
                </p>
              ) : (
                <div className="swatch-row">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className={`bg-item-wrap ${
                        activeImageId === img.id && bg === "image" ? "active" : ""
                      }`}
                    >
                      <button
                        className="bg-swatch bg-item"
                        style={{ background: `url("${img.dataUrl}") center / cover` }}
                        onClick={() => onSelectImage(img.id)}
                        title="单击切换到此背景"
                        aria-label="切换到此背景"
                      />
                      <button
                        className="bg-item-remove"
                        onClick={() => onRemoveImage(img.id)}
                        title="删除此背景"
                        aria-label="删除此背景"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 开机自启动 */}
          <section className="settings-group">
            <div className="settings-row-head">
              <span className="settings-label">开机自启动</span>
              <span className="settings-hint">
                {autostartReady ? (autostartEnabled ? "已开启" : "已关闭") : "读取中…"}
              </span>
            </div>
            <div className="settings-row">
              <p className="settings-desc">登录系统后自动启动「Linux 指令速查助手」。</p>
              <button
                className={`switch ${autostartEnabled ? "on" : ""}`}
                onClick={onToggleAutostart}
                disabled={!autostartReady}
                aria-pressed={autostartEnabled}
                aria-label="开机自启动"
                role="switch"
              >
                <span className="switch-knob" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
