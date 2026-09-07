import { useEffect, useState } from "react";

export type BackgroundKey =
  | "default"
  | "aurora1"
  | "aurora2"
  | "aurora3"
  | "aurora4"
  | "image";

// 已保存的自定义图片。id 为稳定标识，用于区分不同图片以实现「单击切换」。
export type SavedImage = { id: string; dataUrl: string };

type BgDef = { label: string; preview: string; css: string };

// 背景预设。preview 用于设置面板中的缩略预览；css 作为应用到 body 的背景值。
// image 为「自定义图片」，由 images 库里的图片动态驱动。
export const BACKGROUNDS: Record<BackgroundKey, BgDef> = {
  default: {
    label: "默认",
    preview: "linear-gradient(160deg,#141a24,#0f1115)",
    css: "",
  },
  aurora1: {
    label: "极光 · 精灵",
    preview: "linear-gradient(135deg,#10b981,#7c3aed 55%,#38bdf8)",
    css: "radial-gradient(90% 70% at 15% 12%, rgba(16,185,129,0.55), transparent 60%), radial-gradient(80% 70% at 85% 20%, rgba(124,58,237,0.5), transparent 60%), radial-gradient(90% 80% at 50% 95%, rgba(56,189,248,0.4), transparent 60%), #0b0f1a",
  },
  aurora2: {
    label: "极光 · 深海",
    preview: "linear-gradient(135deg,#38bdf8,#4f46e5 55%,#0ea5e9)",
    css: "radial-gradient(90% 70% at 80% 15%, rgba(56,189,248,0.5), transparent 60%), radial-gradient(80% 70% at 20% 30%, rgba(79,70,229,0.5), transparent 60%), radial-gradient(90% 80% at 60% 100%, rgba(14,165,233,0.35), transparent 60%), #070b16",
  },
  aurora3: {
    label: "极光 · 落霞",
    preview: "linear-gradient(135deg,#ec4899,#a855f7 55%,#fb923c)",
    css: "radial-gradient(90% 70% at 70% 15%, rgba(236,72,153,0.5), transparent 60%), radial-gradient(80% 70% at 25% 25%, rgba(168,85,247,0.5), transparent 60%), radial-gradient(90% 80% at 55% 95%, rgba(251,146,60,0.4), transparent 60%), #14081a",
  },
  aurora4: {
    label: "极光 · 极夜",
    preview: "linear-gradient(135deg,#2dd4bf,#1e40af 55%,#059669)",
    css: "radial-gradient(90% 70% at 20% 80%, rgba(45,212,191,0.4), transparent 60%), radial-gradient(80% 70% at 80% 20%, rgba(30,64,175,0.6), transparent 60%), radial-gradient(90% 80% at 50% 50%, rgba(5,150,105,0.3), transparent 60%), #05070d",
  },
  image: { label: "自定义图片", preview: "", css: "" },
};

export type { BgDef };

const BG_KEY = "lch-bg";
const IMAGES_KEY = "lch-bg-images";
const ACTIVE_IMG_KEY = "lch-bg-active-image";
const MAX_IMAGES = 5;
const MAX_EDGE = 1920;

function readBackground(): BackgroundKey {
  try {
    const b = localStorage.getItem(BG_KEY);
    if (b && b in BACKGROUNDS) return b as BackgroundKey;
  } catch {
    /* ignore */
  }
  return "default";
}

function readImages(): SavedImage[] {
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((i) => i && typeof i.id === "string" && typeof i.dataUrl === "string")
      .slice(0, MAX_IMAGES);
  } catch {
    return [];
  }
}

function readActiveImageId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_IMG_KEY);
  } catch {
    return null;
  }
}

// 若当前 activeImageId 已失效则回退到第一张可用图片；无图片则返回 null。
function validActive(images: SavedImage[], id: string | null): string | null {
  if (id && images.some((i) => i.id === id)) return id;
  return images.length ? images[0].id : null;
}

function genId(): string {
  return "img-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 将用户图片缩放为不超过 1920px 宽的 JPEG dataURL，以便塞进 localStorage（约 5MB 上限），
// 同时减轻背景渲染压力。
function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas 2d unavailable");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法解析图片"));
    };
    img.src = url;
  });
}

export function useBackground() {
  const [bg, setBgState] = useState<BackgroundKey>(readBackground);
  const [images, setImages] = useState<SavedImage[]>(readImages);
  const [activeImageId, setActiveImageId] = useState<string | null>(readActiveImageId);

  // 当前生效的自定义图片（bg === image 时才有意义）。
  const activeImage =
    bg === "image" ? images.find((i) => i.id === activeImageId) ?? images[0] ?? null : null;

  // 启动/加载后修正不一致：图片无有效激活项、或 bg=image 但无图片。
  useEffect(() => {
    const valid = validActive(images, activeImageId);
    if (valid !== activeImageId) setActiveImageId(valid);
  }, [images, activeImageId]);

  useEffect(() => {
    if (bg === "image" && images.length === 0) setBgState("default");
  }, [bg, images]);

  // 应用背景到 body。
  useEffect(() => {
    document.documentElement.dataset.bg = bg;
    const b = document.body;
    if (bg === "image" && activeImage) {
      b.style.background = `url("${activeImage.dataUrl}") center / cover no-repeat`;
    } else if (bg === "default") {
      b.style.background = "";
    } else {
      b.style.background = BACKGROUNDS[bg as Exclude<BackgroundKey, "image">].css;
    }
    try {
      localStorage.setItem(BG_KEY, bg);
    } catch {
      /* ignore */
    }
  }, [bg, activeImage]);

  useEffect(() => {
    try {
      localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
    } catch {
      /* ignore */
    }
  }, [images]);

  useEffect(() => {
    try {
      if (activeImageId) localStorage.setItem(ACTIVE_IMG_KEY, activeImageId);
      else localStorage.removeItem(ACTIVE_IMG_KEY);
    } catch {
      /* ignore */
    }
  }, [activeImageId]);

  // 切换预设背景（default / 极光*）。
  const setBackground = (k: BackgroundKey) => {
    if (k === "image") return;
    setBgState(k);
  };

  // 上传一张自定义图片并立即应用；最多保留最近 MAX_IMAGES 张，超出会替换最旧一张。
  const uploadImage = async (file: File): Promise<boolean> => {
    try {
      const dataUrl = await processImage(file);
      const id = genId();
      setImages((prev) => [{ id, dataUrl }, ...prev].slice(0, MAX_IMAGES));
      setActiveImageId(id);
      setBgState("image");
      return true;
    } catch (e) {
      console.error("[background] 上传失败", e);
      return false;
    }
  };

  // 单击某张已保存图片，直接切换到它。
  const selectImage = (id: string) => {
    if (!images.some((i) => i.id === id)) return;
    setActiveImageId(id);
    setBgState("image");
  };

  // 删除某张已保存图片；若是当前激活项则切换到剩余第一张或默认。
  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
    if (activeImageId === id) {
      const remaining = images.filter((i) => i.id !== id);
      if (remaining.length) {
        setActiveImageId(remaining[0].id);
        setBgState("image");
      } else {
        setActiveImageId(null);
        setBgState("default");
      }
    }
  };

  // 清除全部自定义图片并回到默认背景。
  const clearImage = () => {
    setImages([]);
    setActiveImageId(null);
    setBgState("default");
  };

  return {
    bg,
    setBackground,
    images,
    activeImage,
    activeImageId,
    uploadImage,
    selectImage,
    removeImage,
    clearImage,
  };
}
