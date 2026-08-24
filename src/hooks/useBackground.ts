import { useEffect, useState } from "react";

export type BackgroundKey =
  | "default"
  | "aurora1"
  | "aurora2"
  | "aurora3"
  | "aurora4"
  | "image";

type BgDef = { label: string; preview: string; css: string };

// 背景预设。preview 用于设置面板中的缩略预览；css 作为应用到 body 的背景值。
// image 为「自定义上传图片」，由 imageUrl 动态驱动。
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
const IMG_KEY = "lch-bg-image";
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

function readImage(): string {
  try {
    return localStorage.getItem(IMG_KEY) || "";
  } catch {
    return "";
  }
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
  const [imageUrl, setImageUrl] = useState<string>(readImage);

  // 应用背景到 body。预设走内联背景；image 走上传图片；default 清空内联回退到主题底色。
  useEffect(() => {
    document.documentElement.dataset.bg = bg;
    const b = document.body;
    if (bg === "image" && imageUrl) {
      b.style.background = `url("${imageUrl}") center / cover no-repeat`;
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
  }, [bg, imageUrl]);

  useEffect(() => {
    try {
      if (imageUrl) localStorage.setItem(IMG_KEY, imageUrl);
      else localStorage.removeItem(IMG_KEY);
    } catch {
      /* ignore */
    }
  }, [imageUrl]);

  const setBackground = (k: BackgroundKey) => setBgState(k);

  const uploadImage = async (file: File) => {
    try {
      const dataUrl = await processImage(file);
      setImageUrl(dataUrl);
      setBgState("image");
    } catch (e) {
      console.error("[background] 上传失败", e);
    }
  };

  const clearImage = () => {
    setImageUrl("");
    setBgState("default");
  };

  return { bg, setBackground, imageUrl, uploadImage, clearImage };
}
