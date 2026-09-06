import { COMMANDS, type Command } from "../data/commands";
import { searchCommands } from "./search";

// ---------------------------------------------------------------------------
// 离线规则生成引擎：根据用户的中文/英文「需求描述」合成一条可执行的 Linux 命令。
// 不联网、不依赖任何外部服务。
// ---------------------------------------------------------------------------

export interface GeneratedCommand {
  cmd: string;
  explanation: string;
  builtFrom: string;
  refs: Command[];
  danger?: boolean;
  tips?: string[];
}

const INDEX: Record<string, Command> = {};
for (const c of COMMANDS) INDEX[c.cmd] = c;

type Ctx = { input: string; norm: string };

interface BuildResult {
  cmd?: string;
  explanation?: string;
  tips?: string[];
  refs?: string[];
  danger?: boolean;
}

interface Rule {
  id: string;
  label: string;
  test: RegExp[];
  build: (ctx: Ctx) => BuildResult;
  refs?: string[];
  danger?: boolean;
}

function resolveRefs(names: string[]): Command[] {
  const out: Command[] = [];
  const seen = new Set<string>();
  for (const n of names) {
    const c = INDEX[n];
    if (c && !seen.has(c.cmd)) {
      seen.add(c.cmd);
      out.push(c);
    }
  }
  return out;
}

function get(input: string, ...res: RegExp[]): string | null {
  for (const re of res) {
    const m = input.match(re);
    if (m) return ((m[1] ?? m[0]) as string).trim();
  }
  return null;
}

function getPath(input: string): string {
  const m = input.match(/(\/[a-zA-Z0-9_\-\.\/]*[\w\-]+\/?)|\.[\/\w][\w.\-]*/);
  return m ? m[0] : ".";
}

function getFileName(input: string): string | null {
  return get(
    input,
    /([a-zA-Z0-9_.\-]+\.(?:log|txt|tar|gz|zip|conf|json|yml|yaml|sh|py|js|ts|html|csv|db|sql|png|jpe?g|pdf|mp4|mp3|md|xml|env|properties|ini|bak|tmp|cfg|service|socket))/
  );
}

function getNum(input: string): string | null {
  const nums = input.match(/(\d+(?:\.\d+)?)/);
  return nums ? nums[1] : null;
}

function getPort(input: string): string | null {
  return get(
    input,
    /端口\s*[：: ]?\s*(\d{1,5})/,
    /port\s*[：: ]?\s*(\d{1,5})/i,
    /(\d{1,5})\s*端口/,
    /(\d{1,5})\s*(?:port|端口)/i
  );
}

function getProcess(input: string): string | null {
  return get(
    input,
    /(?:进程|名叫|叫做|名为)\s*["']?([a-zA-Z0-9_.\-]+)/,
    /(?:kill|杀掉|结束|关闭)\s*["']?([a-zA-Z0-9_.\-]+)/i,
    /(?:杀掉|结束|关闭|终止)\s*(?:名为|叫)?\s*["']?([a-zA-Z0-9_.\-]+)/
  );
}

function getSearchText(input: string): string | null {
  return get(
    input,
    /["'“”]([^"'“”]{1,40})["'“”]/,
    /(?:包含|含有|包括|匹配|搜索|查找|找)\s*["'“”]?([a-zA-Z0-9_.\-]+)/,
    /(?:内容|单词|字符串|文字)\s*[：: ]?\s*["']?([^"'\s，。]{1,40})/
  );
}

function getMtimeDays(input: string): string | null {
  return get(input, /(\d+(?:\.\d+)?)\s*(?:天|日)/, /(\d+)\s*(?:个月)/);
}

function getSize(input: string): { num: string; unit: string } | null {
  const m = input.match(/(\d+(?:\.\d+)?)\s*(gb|mb|kb|g|m|k)/i);
  if (!m) return null;
  let unit = m[2].toLowerCase();
  unit = unit === "g" ? "G" : unit === "m" ? "M" : unit === "k" ? "K" : unit.toUpperCase();
  return { num: m[1], unit };
}

// ---------------------------------------------------------------------------
// 规则集
// ---------------------------------------------------------------------------

const RULES: Rule[] = [
  // 0. 清理/删除旧文件
  {
    id: "clean-old-files",
    label: "清理旧文件",
    test: [
      /清理|删除.*(?:旧|超过|之前|过期)|旧.*(?:清理|删除)|delete.*older|清理.*(?:缓存|临时|日志)/i,
      /\d+\s*(?:天|个月).*(?:删除|清理|删掉)|(?:删除|清理|删掉).*\d+\s*(?:天|个月)|没改过|mtime|修改时间/i,
    ],
    refs: ["find", "rm"],
    danger: true,
    build: ({ input }) => {
      const path = getPath(input);
      const days = getMtimeDays(input);
      const name = getFileName(input);
      const cmdDays = days ?? "30";
      const namePart = name ? ` -name "${name}"` : "";
      const suffix = /日志|log/i.test(input) ? ' -name "*.log"' : namePart;
      const cmd = `find ${path} -type f${suffix} -mtime +${cmdDays} -delete`;
      return {
        cmd,
        explanation: `删除 ${path} 下修改时间超过 ${cmdDays} 天的文件${name ? `（匹配 ${name}）` : "（含日志文件）"}。`,
        tips: [`-delete 会直接删除，先去掉它换成 -print 预览要删的内容`, `${path} 是路径，可替换为实际目录`],
        danger: true,
      };
    },
  },
  {
    id: "clean-cache",
    label: "清理缓存",
    test: [/清理缓存|清空缓存|缓存清理|clear.+cache|清理(?:缓存|临时文件)/i],
    refs: ["rm", "df"],
    danger: true,
    build: () => ({
      cmd: "sudo rm -rf /var/cache/*",
      explanation: "清空系统缓存目录（需要管理员权限）。",
      tips: ["先备份重要数据；也可用 `du -sh /var/cache/*` 查看占用。"],
      danger: true,
    }),
  },

  // 1. 查找文件
  {
    id: "find-by-name",
    label: "查找文件",
    test: [/查找|搜索.*文件|找出|找一下|找.*(文件|在哪里|在哪)|find|定位.*文件/i],
    refs: ["find", "grep", "df"],
    build: ({ input }) => {
      const path = getPath(input);
      const name = getFileName(input) ?? get(input, /名为\s*["']?([^"'\s]+)/, /叫\s*["']?([^"'\s]+)/);
      const quoted = get(input, /["'“”]([^"'“”]+)["'“”]/);
      const target = name ?? quoted ?? "*.txt";
      return {
        cmd: `find ${path} -type f -name "${target}"`,
        explanation: `在 ${path} 下按名称查找文件「${target}」。`,
        tips: [`把 ${path} 换成实际目录；` + `可用 -iname 忽略大小写`],
      };
    },
  },
  {
    id: "find--size",
    label: "查找大文件",
    test: [/大文件|超过.{0,4}(?:大小|mb|gb|占用)|最大的文件|disk.*large|du.*大/i],
    refs: ["find", "du"],
    build: ({ input }) => {
      const path = getPath(input);
      const size = getSize(input);
      const human = size ? `${size.num}${size.unit}` : "100M";
      const s = size ? `+${size.num}${size.unit}` : "+100M";
      return {
        cmd: `find ${path} -type f -size ${s} -exec ls -lh {} +`,
        explanation: `列出 ${path} 下大于 ${human} 的文件并显示大小。`,
        tips: [`可加 | sort -k5 -h 按大小排序`],
      };
    },
  },

  // 2. 搜索文本内容
  {
    id: "grep-text",
    label: "搜索文本内容",
    test: [/grep|搜索.*(?:内容|文字|单词|字符串|文本)|在.*(?:里|中).*(?:找|搜)|包含.*(?:内容|文字|字符串|文本)|含有.*(?:内容|文字|文本)|(?:文本|内容|单词|字符串).*搜索/i, /包含|含有|搜索/i],
    refs: ["grep"],
    build: ({ input }) => {
      const path = getPath(input);
      const text = getSearchText(input) ?? "关键字";
      return {
        cmd: `grep -rn "${text}" ${path}`,
        explanation: `在 ${path} 下递归搜索包含「${text}」的行。`,
        tips: [`-r 递归子目录；` + `-i 忽略大小写；` + `-l 只显示文件名`],
      };
    },
  },

  // 3. 删除文件/目录
  {
    id: "rm",
    label: "删除文件或目录",
    test: [/删除|移除|删掉|删了|去掉|rm\b/i],
    refs: ["rm", "rmdir"],
    danger: true,
    build: ({ input }) => {
      const filename = getFileName(input);
      const path = getPath(input);
      const target = filename ?? (/(目录|文件夹)/i.test(input) ? path : `${path}/${filename ?? "file"}`);
      const force = /强制|-f|全部|[不问]|确认|force/i.test(input);
      const recursive = /目录|文件夹|文件夹|递归|目录.*(删|清)/i.test(input);
      const flags = (recursive ? "-r" : "") + (force ? "f" : "i");
      const cmd = `rm ${flags} ${target}`;
      return {
        cmd,
        explanation: `删除 ${target}${recursive ? "（递归删除目录及其内容）" : ""}${force ? "（强制，不提示）" : "（删除前询问）"}。`,
        tips: ["这类删除操作不可恢复，建议先确认目标。", "删除目录建议先 `ls` 检查内容。"],
        danger: true,
      };
    },
  },

  // 4. 杀进程
  {
    id: "kill",
    label: "杀掉进程",
    test: [/杀.*进程|杀掉|结束.*进程|终止.*进程|kill|pkill|关闭.*进程/i],
    refs: ["ps", "kill"],
    danger: true,
    build: ({ input }) => {
      const proc = getProcess(input);
      const pid = get(input, /pid\s*[#：: ]?\s*(\d+)/i, /进程\s*[#：: ]?\s*(\d+)/);
      if (pid) {
        return {
          cmd: `kill -9 ${pid}`,
          explanation: `强制终止进程号 ${pid}。`,
          tips: ["`kill`（不带 -9）先给进程优雅退出的机会。"],
          danger: true,
        };
      }
      const name = proc ?? "process";
      return {
        cmd: `pkill -f "${name}"`,
        explanation: `按名称匹配并终止名为「${name}」的进程。`,
        tips: [`先 ` + `ps aux | grep ${name} ` + `确认要杀的是哪些。`],
        danger: true,
      };
    },
  },

  // 5. 查看进程
  {
    id: "ps",
    label: "查看进程",
    test: [/查看.*进程|哪些进程|正在运行|进程列表|ps\b|top\b|进程.*(看|查|显示)/i],
    refs: ["ps", "top"],
    build: ({ input }) => {
      const proc = getProcess(input);
      const name = proc && /grep|ps/i.test(input) ? proc : null;
      return {
        cmd: name ? `ps aux | grep ${name}` : `ps aux --sort=-%mem | head -20`,
        explanation: name
          ? `查看进程列表并筛选出「${name}」相关的进程。`
          : "查看当前所有进程，按内存占用排序并显示前 20 行。",
        tips: ["用 `top` 可实时查看；`htop` 更直观（需安装）。"],
      };
    },
  },

  // 6. 查看/跟踪日志
  {
    id: "tail-log",
    label: "查看日志",
    test: [/查看日志|看日志|日志.*(查看|跟踪|实时|最新)|尾随|tail|实时.*日志|跟踪.*日志/i],
    refs: ["tail", "journalctl", "head"],
    build: ({ input }) => {
      const path = getPath(input);
      const file = getFileName(input);
      const target = file ? path : path === "." ? "/var/log/syslog" : path;
      const follow = /实时|跟踪|跟随|follow|-f/i.test(input);
      const lines = getNum(input) ?? "100";
      return {
        cmd: `tail -n ${lines}${follow ? " -f" : ""} ${target}`,
        explanation: `${follow ? "实时跟踪" : "查看"}文件 ${target} 的最后 ${lines} 行。`,
        tips: ["`-f` 会持续输出新增内容，Ctrl+C 退出。", "systemd 服务日志可用 `journalctl -u 服务名 -f`。"],
      };
    },
  },

  // 7. 磁盘占用
  {
    id: "disk",
    label: "磁盘占用",
    test: [/磁盘|硬盘|空间|存储|df\b|du\b|磁盘.*占|空间.*不够|不够.*空间|哪个目录.*占/i],
    refs: ["df", "du"],
    build: ({ input }) => {
      const path = getPath(input);
      if (/哪个目录|目录.*占|什么.*占|du|分析.*目录/i.test(input)) {
        return {
          cmd: `du -sh ${path}/* 2>/dev/null | sort -hr | head -20`,
          explanation: `统计 ${path} 下各目录占用，按大小降序显示前 20 个。`,
          tips: ["`-h` 人类可读；`| head -20` 只看最大的。"],
        };
      }
      return {
        cmd: "df -h",
        explanation: "查看各文件系统磁盘使用情况。",
        tips: ["`df -h` 按人类可读单位显示。"],
      };
    },
  },

  // 8. 内存 / CPU
  {
    id: "mem-cpu",
    label: "内存 / CPU",
    test: [/内存|内存占用|memory|free\b|运行时长|uptime|cpu\b|负载/i],
    refs: ["free"],
    build: ({ input }) => {
      const cpu = /cpu|cpu\b|负载|load/i.test(input);
      return {
        cmd: cpu ? "uptime && top -bn1 | head -15" : "free -h",
        explanation: cpu
          ? "查看系统负载与 CPU 占用概况。"
          : "查看内存使用情况（人类可读单位）。",
        tips: ["`top`/`htop` 实时查看；`free -h` 看内存。"],
      };
    },
  },

  // 9. 端口占用
  {
    id: "port",
    label: "端口占用",
    test: [/端口|port|占用.*端口|哪个.*端口|查看.*监听|监听.*端口/i],
    refs: ["ss", "lsof"],
    build: ({ input }) => {
      const port = getPort(input);
      if (port) {
        return {
          cmd: `ss -tlnp | grep ${port}`,
          explanation: `查看占用端口 ${port} 的进程（可用 -p 显示进程）。`,
          tips: [`也可用 ` + `lsof -i :${port}`],
        };
      }
      return {
        cmd: "ss -tlnp",
        explanation: "列出当前监听的所有 TCP 端口及其占用进程。",
        tips: ["`ss -tlnp` 需较高权限才能看到进程名。"],
      };
    },
  },

  // 10. 权限修改
  {
    id: "chmod",
    label: "权限修改",
    test: [/权限|chmod|chown|所有者|归属|读写执行|可执行|7\d\d|755|777/i],
    refs: ["chmod", "chown"],
    build: ({ input }) => {
      const target = getFileName(input) ?? getPath(input);
      if (/所有者|归属|chown/i.test(input)) {
        const user = get(input, /(?:所有者|归属|给)\s*([a-zA-Z0-9_]+)/, /chown\s+([^\s]+)/i);
        return {
          cmd: `chown ${user ?? "user:group"} ${target}`,
          explanation: `把 ${target} 的所有者改为 ${user ?? "user:group"}。`,
          refs: ["chown"],
        };
      }
      const mode = get(input, /chmod\s+(\d{3,4})/i, /权限\s*[：: ]?\s*(\d{3,4})/) ?? "755";
      return {
        cmd: `chmod ${mode} ${target}`,
        explanation: `把 ${target} 的权限设为 ${mode}。`,
        tips: [`目录可执行/可读用 ` + `chmod 755` + `；` + `文件常用 ` + `chmod 644`],
      };
    },
  },

  // 11. 解压（放在压缩之前，避免「解压 xx.tar.gz」被 `tar` 匹配到压缩）
  {
    id: "decompress",
    label: "解压",
    test: [/解压|解包|解压缩|提取|unzip|解压到/i],
    refs: ["tar"],
    build: ({ input }) => {
      const target = getFileName(input) ?? "archive.tar.gz";
      if (/zip\b|\.zip/i.test(target) || /zip/i.test(input)) {
        return { cmd: `unzip ${target.replace(/\.tar\.gz$/, "")}`, explanation: `解压 zip 文件 ${target}。`, refs: ["tar"] };
      }
      return {
        cmd: `tar -xzvf ${target}`,
        explanation: `解压 ${target}。`,
        tips: ["`.tar.gz` 用 `tar -xzvf`；`.zip` 用 `unzip`；`.tar.xz` 用 `tar -xJvf`。"],
      };
    },
  },

  // 12. 压缩
  {
    id: "compress",
    label: "压缩",
    test: [/压缩|打包|打成一个|zip|tar|gzip|7z|压缩包/i],
    refs: ["tar", "gzip", "zip"],
    build: ({ input }) => {
      const path = getPath(input);
      const target = getFileName(input) ?? "archive.tar.gz";
      if (/zip\b|\.zip/i.test(input)) {
        const dir = path === "." ? "dir" : path;
        return { cmd: `zip -r ${target.replace(/\.tar\.gz$/, ".zip")} ${dir}`, explanation: `把目录 ${dir} 打包为 zip。`, refs: ["zip"] };
      }
      const dir = path === "." ? "dir" : path;
      return {
        cmd: `tar -czvf ${target} ${dir}`,
        explanation: `把 ${dir} 压缩成 ${target}（gzip 格式）。`,
        tips: ["`tar -czvf 包名 目录` 打包；`tar -xzvf` 解包。"],
      };
    },
  },

  // 13. 下载
  {
    id: "download",
    label: "下载",
    test: [/下载|curl|wget|拉取.*文件|下载.*文件/i],
    refs: ["curl", "wget"],
    build: ({ input }) => {
      const url = get(input, /(https?:\/\/[^\s"'，。]+)/i);
      const out = getFileName(input) ?? (url ? url.split("/").pop() ?? "file" : "file");
      return {
        cmd: url ? `curl -L -o ${out} "${url}"` : `curl -L -o ${out} "https://example.com/file"`,
        explanation: url ? `下载 ${url} 并保存为 ${out}。` : "下载文件（URL 为示例，需替换）。",
        tips: ["`wget` 更适合断点续传；`curl -O` 用 URL 文件名。"],
      };
    },
  },

  // 14. Git
  {
    id: "git",
    label: "Git 操作",
    test: [/git|提交|推送|拉取|克隆|提交代码|版本控制|commit|push|pull|clone/i],
    refs: ["git"],
    build: ({ input }) => {
      const repo = get(input, /仓库\s*[：: ]?\s*(\S+)/, /clone\s+(\S+)/i) ?? "repo";
      if (/克隆|clone|拉取.*仓库/i.test(input)) {
        return { cmd: `git clone ${repo}`, explanation: `克隆仓库 ${repo} 到本地。` };
      }
      if (/推送|push/i.test(input)) {
        return { cmd: "git add . && git commit -m '更新' && git push", explanation: "暂存全部改动、提交并推送到远程。" };
      }
      if (/拉取|pull/i.test(input)) {
        return { cmd: "git pull origin main", explanation: "拉取远程 main 分支的最新改动。" };
      }
      if (/状态|status/i.test(input)) {
        return { cmd: "git status", explanation: "查看当前工作区/暂存区状态。" };
      }
      if (/历史|log|提交记录/i.test(input)) {
        return { cmd: "git log --oneline --graph -20", explanation: "以精简格式查看最近 20 条提交。" };
      }
      if (/分支|branch/i.test(input)) {
        return { cmd: "git branch -a", explanation: "查看所有本地与远程分支。" };
      }
      return { cmd: "git status", explanation: "先看 Git 当前状态，再决定下一步。" };
    },
  },

  // 15. 系统信息
  {
    id: "sysinfo",
    label: "系统信息",
    test: [/系统信息|系统版本|内核|发行版|查看系统|uname|lscpu|os-release|电脑.*(配置|信息)/i],
    refs: ["uname"],
    build: ({ input }) => {
      if (/内核|uname|kernel/i.test(input)) return { cmd: "uname -a", explanation: "显示内核与系统信息。" };
      if (/cpu|核|cpu信息|lscpu/i.test(input)) return { cmd: "lscpu", explanation: "显示 CPU 架构与核心信息。" };
      return { cmd: "cat /etc/os-release", explanation: "查看当前发行版信息。" };
    },
  },

  // 16. 环境变量
  {
    id: "env",
    label: "环境变量",
    test: [/环境变量|环境|export|echo.*\$[a-z]|设置.*变量|查看.*变量/i],
    refs: ["export"],
    build: ({ input }) => {
      const varName = get(input, /\$([a-zA-Z_][a-zA-Z0-9_]*)/, /变量\s*[：: ]?([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (/设置|export/i.test(input) && varName) {
        return { cmd: `export ${varName}="value"`, explanation: `设置环境变量 ${varName}（value 需替换）。` };
      }
      if (varName) return { cmd: `echo $${varName}`, explanation: `查看环境变量 ${varName} 的值。` };
      return { cmd: "printenv", explanation: "查看当前全部环境变量。" };
    },
  },

  // 17. 创建目录/文件
  {
    id: "mkdir",
    label: "创建目录/文件",
    test: [/创建.*目录|创建.*文件夹|新建.*目录|新建.*文件夹|建目录|mkdir|新建文件|创建文件|touch/i],
    refs: ["mkdir", "touch"],
    build: ({ input }) => {
      const path = getPath(input);
      if (/文件|touch/i.test(input) && !/目录|文件夹|mkdir/i.test(input)) {
        const f = getFileName(input) ?? "file.txt";
        return { cmd: `touch ${path === "." ? f : `${path}/${f}`}`, explanation: `创建空文件${path === "." ? " " + f : ` ${path}/${f}`}。` };
      }
      const nested = /多级|嵌套|递归|-p/i.test(input);
      return {
        cmd: `mkdir -${nested ? "p " : ""}${path === "." ? "newdir" : path}`,
        explanation: `创建目录${path === "." ? " newdir" : ` ${path}`}${nested ? "（含父目录）" : ""}。`,
      };
    },
  },

  // 18. 移动 / 重命名 / 复制
  {
    id: "move-copy",
    label: "移动/复制",
    test: [/移动|移动文件|重命名|改名|复制|拷贝|mv\b|cp\b|剪切/i],
    refs: ["mv", "cp"],
    build: ({ input }) => {
      const path = getPath(input);
      if (/复制|拷贝|cp\b/i.test(input)) {
        return { cmd: `cp -r ${path === "." ? "src" : path} ${path === "." ? "dst" : `${path}_bak`}`, explanation: `复制${path === "." ? " src 到 dst" : ` ${path} 到备份目录`}。` };
      }
      if (/重命名|改名/i.test(input)) {
        return { cmd: `mv ${path === "." ? "old.txt" : path} ${path === "." ? "new.txt" : `${path}.new`}`, explanation: "把文件重命名。" };
      }
      return { cmd: `mv ${path === "." ? "src" : path} ${path === "." ? "dst" : `${path}/`}`, explanation: "移动文件到目标位置。" };
    },
  },

  // 19. 统计
  {
    id: "count",
    label: "统计数量",
    test: [/统计.*(多少|数量|几个)|多少.*(文件|个)|数量|count|数一下|wc -l/i],
    refs: ["wc"],
    build: ({ input }) => {
      const path = getPath(input);
      const f = getFileName(input);
      const namePart = f ? ` -name "${f}"` : "";
      if (/文件|file|目录/i.test(input) && /统计|多少|数量/i.test(input)) {
        return {
          cmd: `find ${path} -type f${namePart} | wc -l`,
          explanation: `统计 ${path} 下文件的个数${f ? `（匹配 ${f}）` : ""}。`,
        };
      }
      return { cmd: `wc -l ${path === "." ? "file" : path}`, explanation: "统计文件行数。" };
    },
  },

  // 20. 查看行数 / 大文件查看
  {
    id: "view-lines",
    label: "查看行数",
    test: [/行数|多少行|前.{0,3}行|wc\b|head\b|less\b|查看(?:前|后).{0,3}行/i],
    refs: ["head", "tail"],
    build: ({ input }) => {
      const path = getPath(input);
      const lines = getNum(input) ?? "50";
      if (/行数|多少行|wc/i.test(input)) return { cmd: `wc -l ${path === "." ? "file" : path}`, explanation: "统计文件总行数。" };
      const tail = /后|末尾|最后|tail/i.test(input);
      return {
        cmd: `${tail ? "tail" : "head"} -n ${lines} ${path === "." ? "file" : path}`,
        explanation: `查看文件${path === "." ? " file" : ` ${path}`}${tail ? " 末尾" : "开头"} ${lines} 行。`,
      };
    },
  },

  // 21. 定时任务
  {
    id: "cron",
    label: "定时任务",
    test: [/定时|定时任务|计划任务|cron|crontab|每天早上|每分钟|定时执行/i],
    refs: ["crontab"],
    build: () => ({
      cmd: "crontab -e",
      explanation: "编辑当前用户的定时任务表。",
      tips: ["每 5 分钟 `*/5 * * * * 命令`；每天 2 点 `0 2 * * * 命令`。"],
    }),
  },

  // 22. 服务管理
  {
    id: "service",
    label: "服务管理",
    test: [/服务|systemctl|开机自启|启动.*服务|停止.*服务|重启.*服务|nginx.*(启动|停止)/i],
    refs: ["systemctl"],
    build: ({ input }) => {
      const svc =
        get(input, /([a-zA-Z0-9_.\-]+)\s*服务/, /服务\s*[：: ]?([a-zA-Z0-9_.\-]+)/, /(?:重启|启动|停止|状态|enable)\s+([a-zA-Z0-9_.\-]+)/) ??
        "service";
      if (/开机自启|enable/i.test(input)) return { cmd: `systemctl enable ${svc}`, explanation: `设置 ${svc} 开机自启。` };
      if (/停止|stop/i.test(input)) return { cmd: `systemctl stop ${svc}`, explanation: `停止服务 ${svc}。` };
      if (/重启|restart/i.test(input)) return { cmd: `systemctl restart ${svc}`, explanation: `重启服务 ${svc}。` };
      if (/状态|status/i.test(input)) return { cmd: `systemctl status ${svc}`, explanation: `查看服务 ${svc} 的状态。` };
      return { cmd: `systemctl start ${svc}`, explanation: `启动服务 ${svc}。` };
    },
  },

  // 23. 网络检查
  {
    id: "network",
    label: "网络检测",
    test: [/网络|连通|延迟|ping|能不能.*(通|访问)|测.*网速|traceroute|nslookup|解析.*域名/i],
    refs: ["ping", "curl"],
    build: ({ input }) => {
      const host = get(input, /(?:ping|nslookup|traceroute)\s+([a-zA-Z0-9.\-]+)/i) ?? "www.baidu.com";
      if (/解析|nslookup|dns|域名/i.test(input)) return { cmd: `nslookup ${host}`, explanation: `解析域名 ${host} 的 IP。` };
      if (/延迟|能不能|连通|ping/i.test(input)) return { cmd: `ping -c 4 ${host}`, explanation: `向 ${host} 发送 4 个包测连通与延迟。` };
      return { cmd: `curl -I ${host.startsWith("http") ? host : `https://${host}`}`, explanation: `检查 ${host} 是否可访问（返回响应头）。` };
    },
  },
];

function scoreRule(input: string, rule: Rule): number {
  let s = 0;
  for (const re of rule.test) if (re.test(input)) s += 1;
  return s;
}

function topRefs(input: string): Command[] {
  const out: Command[] = [];
  const seen = new Set<string>();
  for (const c of searchCommands(input).slice(0, 8)) {
    if (!seen.has(c.cmd)) {
      seen.add(c.cmd);
      out.push(c);
    }
  }
  return out.slice(0, 5);
}

export function generateCommand(input: string): GeneratedCommand | null {
  const raw = input.trim();
  if (!raw) return null;
  const ctx: Ctx = { input: raw, norm: raw.toLowerCase() };

  let best: Rule | null = null;
  let bestScore = 0;
  for (const r of RULES) {
    const s = scoreRule(raw, r);
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }

  if (!best || bestScore <= 0) {
    const refs = topRefs(raw);
    if (refs.length === 0) return null;
    return {
      cmd: "",
      explanation: "未能自动合成一条具体的命令，以下是与你的描述最接近的现有指令，点击可查看用法。",
      builtFrom: "相关指令",
      refs,
      tips: ["试着描述得更具体，例如加上：路径 / 文件名 / 端口 / 天数 / 进程名。"],
    };
  }

  const built = best.build(ctx);
  const names = [...(built.refs ?? []), ...(best.refs ?? [])];
  const refs = resolveRefs(names);

  return {
    cmd: built.cmd ?? "",
    explanation: built.explanation ?? `已根据「${best.label}」生成。`,
    builtFrom: best.label,
    refs,
    danger: built.danger ?? best.danger,
    tips: built.tips,
  };
}
