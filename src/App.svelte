<script lang="ts">
  import { onMount, tick } from 'svelte';
  import ini from 'ini';
  import type { AssetItem, ConfigData, EnvInfo } from './lib/types';
  import Switch from './lib/components/Switch.svelte';
  import Pagination from './lib/components/Pagination.svelte';
  import Toast from './lib/components/Toast.svelte';

  type Tab = 'config' | 'run';

  const isWin = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');
  const hasNode = typeof window !== 'undefined' && (window as any).require;
  const fs = hasNode ? (window as any).require('fs') : null;
  const path = hasNode ? (window as any).require('path') : null;
  const childProcess = hasNode ? (window as any).require('child_process') : null;

  const defaultConfig = (): ConfigData => ({
    model: { model_path: './model/model.onnx', tags_path: './csv/Tags-cn_2024_ver-1.0.csv' },
    tag: {
      threshold: 0.5,
      replace_underscore: true,
      underscore_excludes: '',
      escape_tags: false,
      use_chinese_name: true,
      additional_tags: 'AITagger_ed',
      exclude_tags: '',
      sort_alphabetically: false
    },
    process: { max_workers: 2, batch_size: 8, max_retries: 3, checkpoint_interval: 100 },
    json: { is_creat_image_info_csv: false, add_write_mode: false }
  });

let activeTab: Tab = 'run';
  let toolDir = (typeof localStorage !== 'undefined' && localStorage.getItem('toolDir')) || '';
  let config: ConfigData = defaultConfig();
  let iniRaw: any = null;
  let configMessage = '';

  let envInfo: EnvInfo = { pythonPath: '', source: '', pythonVersion: '', ok: false, message: '', gpuOk: false };
  let envDetected = false;
  let detectBusy = false;
  let toastVisible = false;
  let toastMessage = '';
  let toastType: 'info' | 'loading' | 'success' | 'error' = 'info';

  let selected: AssetItem[] = [];
  let selectionMessage = '';

  let running = false;
  let runMessage = '';
  let logs: string[] = [];
  let proc: any = null;
  let autoScroll = true;
  let logBox: HTMLDivElement | null = null;
  let showFullList = false;
  let fullListText = '';
let fullListTab: 'images' | 'text' = 'images';
let fullListPaths: string[] = [];
let fullListCurrentPage = 1;
let fullListPageSize = 10;
let fullListTextContent = '';
// 显示模式：true = 分页模式，false = 滚动加载模式（默认）
let fullListUsePagination = (typeof localStorage !== 'undefined' && localStorage.getItem('fullListUsePagination') === '1') || false;
let fullListVisible = 10; // 滚动加载模式下已显示的图片数量
let modalScrollEl: HTMLDivElement | null = null;
let debugMode = (typeof localStorage !== 'undefined' && localStorage.getItem('debugMode') === '1') || false;

const logDbg = (location: string, message: string, data: Record<string, any> = {}, hypothesisId = 'debug') => {
  if (!debugMode) return;
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/af339645-0d7f-4aeb-aee8-10c1b7f06eeb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'build-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
  console.log(`[dbg] ${location} - ${message}`, data);
};

  const bool = (val: any) => val === true || val === 'True' || val === 'true' || val === '1';

  const mapFromIni = (data: any): ConfigData => ({
    model: {
      model_path: data?.Model?.model_path ?? defaultConfig().model.model_path,
      tags_path: data?.Model?.tags_path ?? defaultConfig().model.tags_path
    },
    tag: {
      threshold: parseFloat(data?.Tag?.threshold ?? defaultConfig().tag.threshold),
      replace_underscore: bool(data?.Tag?.replace_underscore),
      underscore_excludes: data?.Tag?.underscore_excludes ?? '',
      escape_tags: bool(data?.Tag?.escape_tags),
      use_chinese_name: bool(data?.Tag?.use_chinese_name ?? true),
      additional_tags: data?.Tag?.additional_tags ?? '',
      exclude_tags: data?.Tag?.exclude_tags ?? '',
      sort_alphabetically: bool(data?.Tag?.sort_alphabetically)
    },
    process: {
      max_workers: Number(data?.Process?.max_workers ?? 2),
      batch_size: Number(data?.Process?.batch_size ?? 8),
      max_retries: Number(data?.Process?.max_retries ?? 3),
      checkpoint_interval: Number(data?.Process?.checkpoint_interval ?? 100)
    },
    json: {
      is_creat_image_info_csv: bool(data?.Json?.is_creat_image_info_csv),
      add_write_mode: bool(data?.Json?.add_write_mode)
    }
  });

  const mergeToIni = (base: any, next: ConfigData) => {
    const copy = JSON.parse(JSON.stringify(base || {}));
    copy.Model = copy.Model || {};
    copy.Model.model_path = next.model.model_path;
    copy.Model.tags_path = next.model.tags_path;

    copy.Tag = copy.Tag || {};
    copy.Tag.threshold = next.tag.threshold;
    copy.Tag.replace_underscore = next.tag.replace_underscore;
    copy.Tag.underscore_excludes = next.tag.underscore_excludes;
    copy.Tag.escape_tags = next.tag.escape_tags;
    copy.Tag.use_chinese_name = next.tag.use_chinese_name;
    copy.Tag.additional_tags = next.tag.additional_tags;
    copy.Tag.exclude_tags = next.tag.exclude_tags;
    copy.Tag.sort_alphabetically = next.tag.sort_alphabetically;

    copy.Process = copy.Process || {};
    copy.Process.max_workers = next.process.max_workers;
    copy.Process.batch_size = next.process.batch_size;
    copy.Process.max_retries = next.process.max_retries;
    copy.Process.checkpoint_interval = next.process.checkpoint_interval;

    copy.Json = copy.Json || {};
    copy.Json.is_creat_image_info_csv = next.json.is_creat_image_info_csv;
    copy.Json.add_write_mode = next.json.add_write_mode;

    return copy;
  };

  const safeJoin = (...parts: string[]) => (path ? path.join(...parts) : parts.join('/'));

  const normalizeToolDir = (raw: string) => {
    if (!raw) return '';
    let v = raw.replace(/\r?\n/g, '').trim();
    const len = v.length;
    if (len % 2 === 0) {
      const half = len / 2;
      const left = v.slice(0, half);
      const right = v.slice(half);
      if (left === right) v = left;
    }
    return v;
  };

  const handleToolDirInput = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement | null;
    const raw = target?.value ?? '';
    const val = normalizeToolDir(raw);
    toolDir = val;
  logDbg('src/App.svelte:handleToolDirInput', 'normalize toolDir', { raw, normalized: val }, 'H1-toolDir-dup');
  };

const setRunList = (paths: string[]) => {
  const cleaned = paths.map((p) => (p || '').trim()).filter((p) => p.length > 0);
  fullListPaths = cleaned;
};

const parseTextToList = (text: string) => {
  const list = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  setRunList(list);
};

const toggleDebugMode = (e: Event) => {
  const target = e.currentTarget as HTMLInputElement | null;
  const checked = !!target?.checked;
  debugMode = checked;
  if (typeof localStorage !== 'undefined') localStorage.setItem('debugMode', checked ? '1' : '0');
  logDbg('ui:debugMode', 'toggle', { checked }, 'H-debug');
};

// 分页计算
$: fullListTotalPages = Math.max(1, Math.ceil(fullListPaths.length / fullListPageSize));
$: fullListStartIndex = (fullListCurrentPage - 1) * fullListPageSize;
$: fullListEndIndex = Math.min(fullListStartIndex + fullListPageSize, fullListPaths.length);
$: fullListCurrentPageData = fullListPaths.slice(fullListStartIndex, fullListEndIndex);

// 滚动加载模式下的数据
$: fullListScrollData = fullListPaths.slice(0, fullListVisible);

// 确保当前页码不超过总页数
$: if (fullListCurrentPage > fullListTotalPages && fullListTotalPages > 0) {
  fullListCurrentPage = fullListTotalPages;
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= fullListTotalPages) {
    fullListCurrentPage = page;
    logDbg('fullList:pagination', 'goto-page', { page, totalPages: fullListTotalPages }, 'H-pagination');
  }
};

const handlePageSizeChange = (e: Event) => {
  const target = e.currentTarget as HTMLSelectElement | null;
  const newSize = target ? parseInt(target.value, 10) : 10;
  if (newSize > 0) {
    // 计算新页码，尽量保持当前显示的第一项不变
    const currentFirstIndex = fullListStartIndex;
    fullListPageSize = newSize;
    fullListCurrentPage = Math.max(1, Math.floor(currentFirstIndex / newSize) + 1);
    logDbg('fullList:pagination', 'page-size-change', { newSize, newPage: fullListCurrentPage }, 'H-pagination');
  }
};

// 加载更多图片（按钮触发）
const loadMoreImages = () => {
  if (fullListUsePagination || fullListVisible >= fullListPaths.length) {
    return;
  }
  const newVisible = Math.min(fullListPaths.length, fullListVisible + 10);
  logDbg('fullList:load-more', 'button-clicked', {
    oldVisible: fullListVisible,
    newVisible,
    totalPaths: fullListPaths.length
  }, 'H-scroll');
  fullListVisible = newVisible;
};

// 切换显示模式
const toggleDisplayMode = (checked: boolean) => {
  fullListUsePagination = checked;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('fullListUsePagination', checked ? '1' : '0');
  }
  // 切换模式时重置状态
  if (checked) {
    fullListCurrentPage = 1;
  } else {
    fullListVisible = 10;
  }
  logDbg('fullList:mode', 'toggle', { usePagination: checked }, 'H-mode');
};

const handleFullTextInput = (e: Event) => {
  const val = (e.currentTarget as HTMLTextAreaElement | null)?.value ?? '';
  fullListTextContent = val;
  parseTextToList(val);
};

  const savePref = () => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('toolDir', toolDir);
    } catch {
      /* ignore */
    }
  };

  const loadConfig = () => {
    if (!fs || !path) {
      configMessage = '缺少 Node 集成（fs/path），请在 Eagle 启用。';
      return;
    }
    if (!toolDir) {
      configMessage = '请先填写工具目录。';
      return;
    }
    const configPath = safeJoin(toolDir, 'config.ini');
    if (!fs.existsSync(configPath)) {
      configMessage = `未找到 ${configPath}`;
      return;
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
    iniRaw = ini.parse(raw);
    config = mapFromIni(iniRaw);
    configMessage = '已读取 config.ini';
  };

  const envCacheKey = (dir: string) => `envCache:${dir || 'default'}`;

  const tryLoadEnvFromCache = (): boolean => {
    if (typeof localStorage === 'undefined') return false;
    const dir = toolDir || '';
    try {
      const raw = localStorage.getItem(envCacheKey(dir));
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.envInfo) return false;
      if (!parsed.envInfo.ok) return false;
      envInfo = parsed.envInfo as EnvInfo;
      envDetected = true;
      logDbg('envCache', 'hit', { dir, envInfo }, 'H-env-cache');
      return true;
    } catch (e) {
      logDbg('envCache', 'parse-failed', { e }, 'H-env-cache');
      return false;
    }
  };

  const saveEnvCache = () => {
    if (typeof localStorage === 'undefined') return;
    const dir = toolDir || '';
    try {
      const payload = {
        toolDir: dir,
        envInfo,
        ts: Date.now()
      };
      localStorage.setItem(envCacheKey(dir), JSON.stringify(payload));
      logDbg('envCache', 'saved', { dir, envInfo }, 'H-env-cache');
    } catch (e) {
      logDbg('envCache', 'save-failed', { e }, 'H-env-cache');
    }
  };

  const clearEnvCache = (dir?: string) => {
    if (typeof localStorage === 'undefined') return;
    try {
      if (dir) {
        localStorage.removeItem(envCacheKey(dir));
      } else {
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (k.startsWith('envCache:')) localStorage.removeItem(k);
        }
      }
      logDbg('envCache', 'cleared', { dir: dir ?? 'all' }, 'H-env-cache');
    } catch (e) {
      logDbg('envCache', 'clear-failed', { e }, 'H-env-cache');
    }
  };

  const saveConfig = () => {
    if (!fs || !path) {
      configMessage = '缺少 Node 集成（fs/path）。';
      return;
    }
    if (!toolDir) {
      configMessage = '请先填写工具目录。';
      return;
    }
    const configPath = safeJoin(toolDir, 'config.ini');
    const merged = mergeToIni(iniRaw || {}, config);
    fs.writeFileSync(configPath, ini.stringify(merged));
    configMessage = '配置已保存';
  };

  const fetchSelection = async () => {
    try {
      let items: any[] = [];
      if ((window as any).eagle?.item?.getSelected) {
        items = (await (window as any).eagle.item.getSelected()) || [];
      } else if ((window as any).eagle?.getSelectedItems) {
        items = (await (window as any).eagle.getSelectedItems()) || [];
      } else if ((window as any).eagle?.getSelectedAssets) {
        items = (await (window as any).eagle.getSelectedAssets()) || [];
      }
      selected = items.map((i: any) => {
        const pathVal = i?.filePath || i?.fileURL || i?.path || i?.url || '';
        const thumbVal = i?.thumbnailPath || i?.thumbnailURL || i?.thumbnail || i?.thumb;
        return { path: pathVal, thumb: thumbVal };
      });
      setRunList(selected.map((s) => s.path));
      if (!items.length) selectionMessage = '未选中图片，请在 Eagle 先选择。';
    } catch (err) {
      console.error('fetchSelection error', err);
      selectionMessage = '获取选中项失败：' + err;
    }
  };

  const loadFullImageList = () => {
    // 优先使用本次选择的图片，确保 modal 反映当前选择
    const currentSelectionPaths = selected.map((s) => s.path).filter((p) => !!p);
    if (currentSelectionPaths.length > 0) {
      setRunList(currentSelectionPaths);
      fullListText = currentSelectionPaths.join('\n');
      fullListTextContent = fullListText;
      fullListCurrentPage = 1;
      fullListVisible = 10;
      fullListTab = 'images';
      showFullList = true;
      logDbg('fullList', 'open-from-selection', { count: currentSelectionPaths.length }, 'H-full');
      return;
    }

    // 没有选择时，才尝试从 image_list.txt 读取历史列表
    if (!fs || !path) {
      fullListText = '缺少 fs/path，无法读取 image_list.txt';
      showFullList = true;
      return;
    }
    if (!toolDir) {
      fullListText = '尚未设置工具目录';
      showFullList = true;
      return;
    }
    try {
      const imageListPath = safeJoin(toolDir, 'image_list.txt');
      if (!fs.existsSync(imageListPath)) {
        // 若不存在则根据当前（可能为空的）列表生成一份
        buildImageList();
      }
      fullListText = fs.readFileSync(imageListPath, 'utf-8');
      parseTextToList(fullListText);
      fullListTextContent = fullListText;
      fullListCurrentPage = 1;
      fullListVisible = 10;
      fullListTab = 'images';
      showFullList = true;
      logDbg('fullList', 'open-from-file', { count: fullListPaths.length }, 'H-full');
    } catch (err) {
      fullListText = '读取 image_list.txt 失败：' + err;
      showFullList = true;
    }
  };

  const registerEagleEvents = () => {
    const eagle = (window as any).eagle;
    if (!eagle || typeof eagle.onPluginCreate !== 'function') return;
    try {
      eagle.onPluginCreate(async () => {
        console.log('[eagle] onPluginCreate');
        await fetchSelection();
        try {
          if (toolDir) {
            loadConfig();
            if (!tryLoadEnvFromCache()) {
              detectEnv();
            }
          } else {
            detectEnv();
          }
        } catch (err) {
          console.error('[eagle] onPluginCreate env/config error', err);
        }
      });
      if (typeof eagle.onPluginShow === 'function') {
        eagle.onPluginShow(async () => {
          console.log('[eagle] onPluginShow');
          await fetchSelection();
        });
      }
      if (typeof eagle.onPluginRun === 'function') {
        eagle.onPluginRun(async () => {
          console.log('[eagle] onPluginRun');
          await fetchSelection();
        });
      }
    } catch (err) {
      console.error('[eagle] register events failed', err);
    }
  };

  const parseVersionOk = (ver: string) => {
    const m = ver.match(/(\d+)\.(\d+)/);
    if (!m) return false;
    const major = Number(m[1]);
    const minor = Number(m[2]);
    return major > 3 || (major === 3 && minor >= 8);
  };

  const bestPython = (): string => {
    const candidates = [];
    const venvPy = safeJoin(toolDir || '', '.venv', isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python');
    if (toolDir) candidates.push(venvPy);
    candidates.push(isWin ? 'python' : 'python3');
    for (const c of candidates) {
      try {
        const res = childProcess?.spawnSync(c, ['--version'], { encoding: 'utf-8' });
        if (res && (res.stdout || res.stderr)) return c;
      } catch {
        continue;
      }
    }
    return candidates[0];
  };

  const detectEnv = () => {
    envDetected = false;
    detectBusy = true;
    toastVisible = true;
    toastMessage = '正在检测环境...';
    toastType = 'loading';
    
    if (!childProcess) {
      envInfo = {
        pythonPath: '',
        source: '',
        pythonVersion: '',
        ok: false,
        message: '缺少 child_process，无法检测'
      };
      detectBusy = false;
      envDetected = true;
      toastMessage = '检测失败：缺少 child_process';
      toastType = 'error';
      setTimeout(() => {
        toastVisible = false;
      }, 2000);
      return;
    }
    const pyPath = bestPython();
    logDbg('detectEnv', 'context', { isWin, toolDir, pyPath }, 'H-env');
    if (!pyPath) {
      envInfo = { pythonPath: '', source: '', pythonVersion: '', ok: false, message: '未找到 Python' };
      detectBusy = false;
      envDetected = true;
      toastMessage = '检测失败：未找到 Python';
      toastType = 'error';
      setTimeout(() => {
        toastVisible = false;
      }, 2000);
      return;
    }

    let pythonVersion = '';
    try {
      const ver = childProcess.spawnSync(pyPath, ['--version'], { encoding: 'utf-8' });
      pythonVersion = (ver.stdout || ver.stderr || '').trim();
      logDbg('detectEnv', 'python --version raw', { stdout: ver.stdout, stderr: ver.stderr, status: ver.status, error: ver.error }, 'H-env');
    } catch (err) {
      logDbg('detectEnv', 'python --version error', { err }, 'H-env');
    }
    if (!pythonVersion) {
    try {
        const ver2 = childProcess.spawnSync(
          pyPath,
          ['-c', 'import sys;print(f"{sys.version_info[0]}.{sys.version_info[1]}")'],
          { encoding: 'utf-8' }
        );
        pythonVersion = (ver2.stdout || ver2.stderr || '').trim();
        logDbg('detectEnv', 'python -c version raw', { stdout: ver2.stdout, stderr: ver2.stderr, status: ver2.status, error: ver2.error }, 'H-env');
      } catch (err2) {
        logDbg('detectEnv', 'python -c version error', { err2 }, 'H-env');
      }
    }
    logDbg('detectEnv', 'pythonVersion final', { pythonVersion }, 'H-env');
    const pyOk = parseVersionOk(pythonVersion);

    // GPU detection: try multiple methods
    let cuda = '';
    let cudnn = '';
    let gpuCount = 0;
    let vram: number[] = [];
    let torchAvailable = false;
    
    // Method 1: Try torch (most reliable)
    try {
      const torchProbe = childProcess.spawnSync(
        pyPath,
        ['-'],
        {
          input: `import json, sys\ntry:\n import torch\n cuda=str(torch.version.cuda or '')\n cudnn=str(torch.backends.cudnn.version() or '')\n cnt=torch.cuda.device_count() if torch.cuda.is_available() else 0\n vram=[torch.cuda.get_device_properties(i).total_memory for i in range(cnt)] if cnt else []\n print(json.dumps({'cuda':cuda,'cudnn':cudnn,'cnt':cnt,'vram':vram,'torch':True}))\nexcept Exception as e:\n print(json.dumps({'torch':False,'err':str(e)}))\n`,
          encoding: 'utf-8'
        }
      );
      const raw = (torchProbe.stdout || '').trim();
      logDbg('detectEnv', 'torch raw', { stdout: raw, stderr: torchProbe.stderr }, 'H-env');
      const obj = raw ? JSON.parse(raw) : { torch: false };
      if (obj.torch) {
        torchAvailable = true;
        cuda = obj.cuda || '';
        cudnn = obj.cudnn || '';
        gpuCount = obj.cnt || 0;
        vram = obj.vram || [];
      }
      logDbg('detectEnv', 'torch probe', obj, 'H-env');
    } catch (e) {
      torchAvailable = false;
      logDbg('detectEnv', 'torch probe failed', { e }, 'H-env');
    }
    
    // Method 2: Try onnxruntime-gpu (if torch not available)
    if (!torchAvailable) {
      try {
        const ortProbe = childProcess.spawnSync(
          pyPath,
          ['-'],
          {
            input: `import json, sys\ntry:\n import onnxruntime as ort\n providers=ort.get_available_providers()\n has_gpu='CUDAExecutionProvider' in providers or 'TensorrtExecutionProvider' in providers\n print(json.dumps({'ort':True,'has_gpu':has_gpu,'providers':providers}))\nexcept Exception as e:\n print(json.dumps({'ort':False,'err':str(e)}))\n`,
            encoding: 'utf-8'
          }
        );
        const raw = (ortProbe.stdout || '').trim();
        logDbg('detectEnv', 'onnxruntime raw', { stdout: raw, stderr: ortProbe.stderr }, 'H-env');
        const obj = raw ? JSON.parse(raw) : { ort: false };
        if (obj.ort && obj.has_gpu) {
          // onnxruntime-gpu is available, indicating GPU support
          logDbg('detectEnv', 'onnxruntime-gpu available', obj, 'H-env');
        }
      } catch (e) {
        logDbg('detectEnv', 'onnxruntime probe failed', { e }, 'H-env');
      }
    }
    
    // Method 3: Try nvidia-smi (system command, if available)
    if (!cuda && !isWin) {
      try {
        const nvidiaSmi = childProcess.spawnSync('nvidia-smi', ['--query-gpu=driver_version', '--format=csv,noheader'], { encoding: 'utf-8' });
        if (nvidiaSmi.stdout && nvidiaSmi.status === 0) {
          // nvidia-smi is available, indicating NVIDIA GPU driver is installed
          logDbg('detectEnv', 'nvidia-smi available', { stdout: nvidiaSmi.stdout }, 'H-env');
        }
      } catch (e) {
        logDbg('detectEnv', 'nvidia-smi not available', { e }, 'H-env');
      }
    }

    // Windows CUDA/cuDNN file checks
    let winDllOk = true;
    if (isWin) {
      const cudaDir = 'C:\\\\Program Files\\\\NVIDIA GPU Computing Toolkit\\\\CUDA\\\\v12.9';
      const cudaExists = fs?.existsSync(cudaDir);
      const binDir = safeJoin(cudaDir, 'bin');
      const dlls = ['cudnn64_9.dll', 'cudnn_cnn64_9.dll', 'cudnn_graph64_9.dll'];
      const dllExists = dlls.every((d) => fs?.existsSync(safeJoin(binDir, d)));
      winDllOk = Boolean(cudaExists && dllExists);
      logDbg('detectEnv', 'win CUDA dir', { cudaDir, cudaExists, binDir, dllExists }, 'H-env');
      if (winDllOk) {
        // Windows 上已通过目录和 DLL 校验版本，直接标记为 12.9 / 9.10.1
        if (!cuda) cuda = '12.9';
        if (!cudnn) cudnn = '9.10.1';
      } else {
        cuda = cuda || '未确认';
        cudnn = cudnn || '未确认';
      }
    }

    // Linux/macOS fallback when no torch
    if (!torchAvailable && !isWin) {
      try {
        const versionTxt = '/usr/local/cuda/version.txt';
        if (fs?.existsSync(versionTxt)) {
          const t = fs.readFileSync(versionTxt, 'utf-8');
          const m = t.match(/CUDA Version (\d+\.\d+)/);
          if (m) cuda = m[1];
          logDbg('detectEnv', 'version.txt content', { content: t }, 'H-env');
        }
      } catch {
        /* ignore */
      }
      try {
        const nvcc = childProcess.spawnSync('nvcc', ['--version'], { encoding: 'utf-8' });
        const out = (nvcc.stdout || nvcc.stderr || '').toString();
        const m = out.match(/release (\d+\.\d+)/);
        if (m) cuda = cuda || m[1];
        logDbg('detectEnv', 'nvcc --version output', { out }, 'H-env');
      } catch {
        /* ignore */
      }
      try {
        const libPaths = ['/usr/local/cuda/lib64', '/usr/local/cuda/lib'];
        for (const p of libPaths) {
          if (!fs?.existsSync(p)) continue;
          const files = fs.readdirSync(p).filter((f: string) => f.toLowerCase().includes('cudnn'));
          const hit = files.find((f: string) => f.includes('9.10.1') || f.includes('9_10_1'));
          if (hit) {
            cudnn = '9.10.1';
            logDbg('detectEnv', 'cudnn file hit', { hit, path: p }, 'H-env');
            break;
          }
        }
      } catch (e) {
        logDbg('detectEnv', 'linux/macos cudnn scan failed', { e }, 'H-env');
      }
      logDbg('detectEnv', 'fallback cuda/cudnn', { cuda, cudnn }, 'H-env');
    }

    const cudaOk = !!cuda && cuda.startsWith('12.9');
    const cudnnOk = !!cudnn && cudnn.startsWith('9.10.1');
    const gpuOk = isWin ? winDllOk && cudaOk && cudnnOk : cudaOk && cudnnOk;
    const envOk = pyOk;

      envInfo = {
        pythonPath: pyPath,
        source: pyPath.includes('venv') ? 'venv' : 'system',
        pythonVersion,
        cuda,
        cudnn,
        ok: envOk,
        message: envOk ? 'Python 环境就绪' : 'Python 版本不满足要求',
        gpuOk,
        gpuMessage: gpuOk ? 'GPU 环境满足 12.9 / 9.10.1' : '未满足 CUDA/cuDNN 要求，回退 CPU',
        gpuCount,
        vram
      };
    logDbg('detectEnv', 'result', envInfo, 'H-env');
    envDetected = true;
    if (envInfo.ok) {
      saveEnvCache();
    }
    detectBusy = false;
  };

  const pyStatusOk = () => parseVersionOk(envInfo.pythonVersion || '');
  const gpuStatusOk = () => !!envInfo.gpuOk;

  const resetEnvCacheAndDetect = () => {
    clearEnvCache(toolDir || undefined);
    envInfo = { pythonPath: '', source: '', pythonVersion: '', ok: false, message: '', gpuOk: false };
    envDetected = false;
    detectEnv();
  };

  const appendLog = (line: string) => {
    logs = [...logs, line];
    tickScroll();
  };

  const tickScroll = () => {
    if (autoScroll && logBox) {
      setTimeout(() => {
        logBox!.scrollTop = logBox!.scrollHeight;
      }, 0);
    }
  };

  const buildImageList = (paths?: string[]) => {
    if (!fs || !path) throw new Error('缺少 fs/path');
    const imageListPath = safeJoin(toolDir, 'image_list.txt');
    const list = (paths && paths.length ? paths : fullListPaths.length ? fullListPaths : selected.map((s) => s.path)).filter(Boolean);
    const content = list.join('\n');
    fs.writeFileSync(imageListPath, content);
    return imageListPath;
  };

  const startRun = () => {
    console.log('[run] startRun click', { toolDir, selectedCount: selected.length, envOk: envInfo.ok });
    logDbg(
      'startRun',
      'clicked',
      { toolDir, hasChild: !!childProcess, hasFs: !!fs, selectedCount: selected.length, envInfo },
      'H-run'
    );
    if (!toolDir) {
      runMessage = '请先设置工具目录';
      logDbg('startRun', 'abort:no-toolDir', {}, 'H-run');
      return;
    }
    if (!childProcess) {
      runMessage = '缺少 child_process，无法运行 Python';
      logDbg('startRun', 'abort:no-childProcess', {}, 'H-run');
      return;
    }
    if (!fs || !path) {
      runMessage = '缺少 fs/path';
      logDbg('startRun', 'abort:no-fs-path', {}, 'H-run');
      return;
    }
    if (!selected.length) {
      runMessage = '请先在 Eagle 选择图片';
      logDbg('startRun', 'abort:no-selection', {}, 'H-run');
      return;
    }
    // 先用「探测通过」的 envInfo.pythonPath，否则直接用 bestPython
    let pyPath: string | null = null;
    if (envInfo.ok && envInfo.pythonPath) {
      pyPath = envInfo.pythonPath;
    } else {
      pyPath = bestPython();
    }
    // 如果指向的解释器路径在磁盘上不存在，再额外做一轮兜底
    if (fs && pyPath && !fs.existsSync(pyPath)) {
      logDbg('startRun', 'env python not exists, fallback bestPython', { pyPath }, 'H-run');
      const alt = bestPython();
      logDbg('startRun', 'bestPython result', { alt }, 'H-run');
      if (alt && alt !== pyPath) {
        pyPath = alt;
      }
    }
    if (!pyPath) {
      runMessage = '未找到可用的 Python 解释器';
      logDbg('startRun', 'abort:no-python', {}, 'H-run');
      return;
    }
    try {
      const imageList = buildImageList();
      runMessage = `运行中：${pyPath} main.py`;
      logs = [`写入列表：${imageList}`];
      const baseEnv = ((window as any).process && (window as any).process.env) || {};
      const env = { ...baseEnv, PYTHONIOENCODING: 'utf-8' };
      logDbg('startRun', 'spawning', { pyPath, cwd: toolDir, imageList, envPYTHONIOENCODING: env.PYTHONIOENCODING }, 'H-run');
      proc = childProcess.spawn(pyPath, ['main.py'], { cwd: toolDir, env });
      running = true;
      proc.on('error', (err: any) => {
        const msg = `进程启动失败：${String(err?.message || err)}`;
        appendLog(msg);
        runMessage = msg;
        logDbg('startRun', 'spawn-error', { err: String(err) }, 'H-run');
        running = false;
        proc = null;
      });
      proc.stdout?.on('data', (d: any) => {
        appendLog(d.toString());
      });
      proc.stderr?.on('data', (d: any) => {
        appendLog('[ERR] ' + d.toString());
      });
      proc.on('close', (code: number, signal: string) => {
        appendLog(`进程退出，code=${code}, signal=${signal}`);
        logDbg('startRun', 'closed', { code, signal }, 'H-run');
        running = false;
        proc = null;
      });
    } catch (err: any) {
      runMessage = '启动失败：' + err;
      logDbg('startRun', 'exception', { err: String(err) }, 'H-run');
    }
  };

  const stopRun = () => {
    if (proc && proc.kill) {
      proc.kill('SIGTERM');
      appendLog('已请求停止 (SIGTERM)');
    }
  };

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'));
    } catch {
      /* ignore */
    }
  };

  onMount(async () => {
    registerEagleEvents();
    await fetchSelection();
    if (toolDir) {
      loadConfig();
    }
    if (!tryLoadEnvFromCache()) {
      detectEnv();
    }
  });

  let badgeClassValue = 'warn';
  let badgeTextValue = '未检测到环境';

  $: {
    logDbg('ui:badge', 'reactive-update', { envOk: envInfo.ok, envDetected, pythonPath: envInfo.pythonPath, pythonVersion: envInfo.pythonVersion }, 'H-env-badge');
    if (!envDetected && !envInfo.pythonPath && !envInfo.pythonVersion) {
      badgeClassValue = 'warn';
      badgeTextValue = '未检测到环境';
    } else if (envInfo.ok) {
      badgeClassValue = 'ok';
      badgeTextValue = '配置成功';
    } else {
      badgeClassValue = 'warn';
      badgeTextValue = 'Python 版本不满足';
    }
  }
</script>

<div class="app-shell">
  <div class="tabs">
    <button class="tab {activeTab === 'run' ? 'active' : ''}" type="button" on:click={() => (activeTab = 'run')}>
      运行
    </button>
    <button class="tab {activeTab === 'config' ? 'active' : ''}" type="button" on:click={() => (activeTab = 'config')}>
      配置
    </button>
    <div class={`badge ${badgeClassValue}`}>{badgeTextValue}</div>
  </div>

  {#if activeTab === 'run'}
    <div class="card">
      <div class="card-title">
        已选图片
        <span class="badge">{selected.length || fullListPaths.length}</span>
        <div class="spacer"></div>
        <label class="muted small debug-toggle">
          <input
            type="checkbox"
            checked={debugMode}
            on:change={toggleDebugMode}
          />
          调试模式
        </label>
      </div>
      {#if selected.length === 0 && fullListPaths.length === 0}
        <div class="muted">请在 Eagle 先选择图片</div>
      {:else}
        <div class="grid thumb-grid">
          {#each selected.slice(0, 5) as item}
            <div class="thumb thumb-fixed">
              {#if item.thumb}
                <img src={item.thumb} alt="thumb" class="thumb-img" />
              {:else}
                <img src={item.path} alt="thumb" class="thumb-img" />
              {/if}
            </div>
          {/each}
          {#if selected.length > 5}
            <div class="thumb thumb-fixed hint clip-half">
              {#if selected[5]?.thumb}
                <img src={selected[5].thumb} alt="more" class="thumb-img" />
              {:else}
                <img src={selected[5].path} alt="more" class="thumb-img" />
              {/if}
            </div>
          {/if}
        </div>
        <div class="button-row" style="margin-top:8px">
          <button class="btn" type="button" on:click={loadFullImageList}>完整列表</button>
        </div>
      {/if}
      {#if selectionMessage}
        <div class="status-line">{selectionMessage}</div>
      {/if}
    </div>

    <div class="card">
      <div class="card-title">运行控制</div>
      <div class="stack">
        <div class="muted small">命令预览：{envInfo.pythonPath || '[python]'} main.py</div>
        <div class="button-row">
          <button class="btn primary" on:click={startRun} disabled={running || !selected.length}>开始运行</button>
          <button class="btn danger" on:click={stopRun} disabled={!running}>停止</button>
          <button class="btn" on:click={fetchSelection}>刷新选中</button>
        </div>
        {#if runMessage}
          <div class="status-line">{runMessage}</div>
        {/if}
      </div>
    </div>

    <div class="card">
      <div class="card-title">日志</div>
      <div class="button-row">
        <button class="btn" on:click={() => (autoScroll = !autoScroll)}>{autoScroll ? '暂停自动滚动' : '启用自动滚动'}</button>
        <button class="btn" on:click={copyLogs}>复制全部</button>
      </div>
      <div class="log-area" bind:this={logBox}>
        {#if !logs.length}
          <div class="muted">尚无日志</div>
        {:else}
          {#each logs as line}
            <div>{line}</div>
          {/each}
        {/if}
      </div>
    </div>
  {:else if activeTab === 'config'}
    <!-- 环境检测（精简显示，移到最上方） -->
    <div class="card">
      <div class="card-title">环境</div>
      <div class="env-compact">
        <div class="env-compact-item">
          <span class="env-compact-icon {pyStatusOk() ? 'ok' : 'warn'}">✓</span>
          <span class="badge {pyStatusOk() ? 'ok' : 'warn'}">Python</span>
          <span class="env-compact-text">{envInfo.pythonPath || '未找到解释器'}</span>
        </div>
        <div class="env-compact-item">
          <span class="env-compact-icon {gpuStatusOk() ? 'ok' : 'warn'}">✓</span>
          <span class="badge {gpuStatusOk() ? 'ok' : 'warn'}">GPU</span>
          <span class="env-compact-text">
            {gpuStatusOk() 
              ? `CUDA ${envInfo.cuda || '?'} / cuDNN ${envInfo.cudnn || '?'}`
              : '未检测到 GPU'}
          </span>
        </div>
      </div>
      <div class="button-row" style="margin-top: 12px">
        <button class="btn" on:click={detectEnv} disabled={detectBusy}>
          {detectBusy ? '检测中...' : '重新检测'}
        </button>
        <button class="btn" type="button" on:click={resetEnvCacheAndDetect}>
          初始化环境缓存
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">工具目录</div>
      <div class="input-row">
        <input
          class="input"
          placeholder="Eagle_AItagger_byWD1.4 路径"
          bind:value={toolDir}
          on:input={handleToolDirInput}
          on:change={savePref}
        />
        <button class="btn" on:click={loadConfig}>读取</button>
      </div>
      {#if configMessage}
        <div class="status-line">{configMessage}</div>
      {/if}
    </div>

    <div class="card">
      <div class="card-title">工具配置</div>
      <div class="config-two-column">
        <div class="config-column">
          <div class="sub-title">模型与词典</div>
          <div class="stack">
            <input class="input" bind:value={config.model.model_path} placeholder="model_path" />
            <div class="status-line muted small">模型路径：{config.model.model_path || '未填'}</div>
            <input class="input" bind:value={config.model.tags_path} placeholder="tags_path" />
            <div class="status-line muted small">词典路径：{config.model.tags_path || '未填'}</div>
          </div>
        </div>
        <div class="config-column">
          <div class="sub-title">标签参数</div>
          <div class="stack">
            <div class="threshold-row">
              <span class="small muted">阈值</span>
              <input type="range" min="0" max="1" step="0.01" bind:value={config.tag.threshold} class="threshold-slider" />
              <input class="input threshold-input" type="number" min="0" max="1" step="0.01" bind:value={config.tag.threshold} />
            </div>
            <div class="switch-row-inline">
              <div class="switch-row">
                <label class="switch-label">
                  <input
                    type="checkbox"
                    class="switch-checkbox"
                    checked={config.tag.use_chinese_name}
                    on:change={(e) => (config.tag.use_chinese_name = e.currentTarget.checked)}
                  />
                  <span class="switch-slider"></span>
                </label>
                <span class="small">使用中文标签</span>
              </div>
              <div class="switch-row">
                <label class="switch-label">
                  <input
                    type="checkbox"
                    class="switch-checkbox"
                    checked={config.tag.replace_underscore}
                    on:change={(e) => (config.tag.replace_underscore = e.currentTarget.checked)}
                  />
                  <span class="switch-slider"></span>
                </label>
                <span class="small">替换下划线</span>
              </div>
            </div>
            <div class="stack">
              <div class="small muted" style="margin-bottom: 4px">附加标签</div>
              <textarea class="textarea" bind:value={config.tag.additional_tags} placeholder="附加标签（逗号分隔）"></textarea>
              <div class="small muted" style="margin-top: 8px; margin-bottom: 4px">排除标签</div>
              <textarea class="textarea" bind:value={config.tag.exclude_tags} placeholder="排除标签（逗号分隔）"></textarea>
            </div>
          </div>
        </div>
      </div>
      <div class="button-row" style="margin-top: 8px">
        <button class="btn primary" on:click={saveConfig}>保存配置</button>
      </div>
    </div>
  {/if}

  {#if showFullList}
    <div class="modal-backdrop">
      <div class="modal">
        <div class="card-title modal-head">
          <div class="tabs-inline">
            <button class="btn {fullListTab === 'images' ? 'primary' : ''}" type="button" on:click={() => (fullListTab = 'images')}>
              图片视图
            </button>
            <button class="btn {fullListTab === 'text' ? 'primary' : ''}" type="button" on:click={() => (fullListTab = 'text')}>
              文字视图
            </button>
          </div>
          <div class="button-row">
            <button class="btn" type="button" on:click={() => (showFullList = false)}>取消</button>
            <button
              class="btn primary"
              type="button"
              on:click={() => {
                try {
                  const imageList = buildImageList(fullListPaths);
                  fullListText = fullListPaths.join('\n');
                  fullListTextContent = fullListText;
                  logDbg('fullList', 'write image_list', { imageList, count: fullListPaths.length }, 'H-full');
                  showFullList = false;
                } catch (err) {
                  fullListText = '写入失败：' + err;
                }
              }}
            >
              确认
            </button>
          </div>
        </div>

        {#if fullListTab === 'images'}
          <!-- 模式切换开关 -->
          <div class="display-mode-toggle">
            <div class="display-mode-label">
              <span class="small {!fullListUsePagination ? 'bold' : ''}">滚动加载</span>
              <Switch checked={fullListUsePagination} onCheckedChange={toggleDisplayMode} />
              <span class="small {fullListUsePagination ? 'bold' : ''}">分页</span>
            </div>
          </div>

          {#if fullListUsePagination}
            <!-- 分页模式 -->
            <div class="modal-scroll">
              <div class="grid thumb-grid">
                {#each fullListCurrentPageData as path}
                  {@const item = selected.find((s) => s.path === path)}
                  <div class="thumb thumb-fixed">
                    {#if item?.thumb}
                      <img src={item.thumb} alt="img" class="thumb-img" />
                    {:else}
                      <img src={path} alt="img" class="thumb-img" />
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
            <!-- 分页组件 -->
            <div class="pagination-container">
              <Pagination
                currentPage={fullListCurrentPage}
                totalPages={fullListTotalPages}
                onPageChange={goToPage}
                showFirstLast={true}
                maxVisible={5}
              />
              <div class="pagination-size">
                <label for="page-size-select" class="small muted">每页数量：</label>
                <select id="page-size-select" class="select small" value={fullListPageSize} on:change={handlePageSizeChange}>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          {:else}
            <!-- 滚动加载模式 -->
            <div class="modal-scroll" bind:this={modalScrollEl}>
              <div class="grid thumb-grid">
                {#each fullListScrollData as path}
                  {@const item = selected.find((s) => s.path === path)}
                  <div class="thumb thumb-fixed">
                    {#if item?.thumb}
                      <img src={item.thumb} alt="img" class="thumb-img" />
                    {:else}
                      <img src={path} alt="img" class="thumb-img" />
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
            {#if fullListVisible < fullListPaths.length}
              <div class="scroll-load-controls">
                <div class="scroll-loading-hint muted small">
                  已加载 {fullListVisible} / {fullListPaths.length}
                </div>
                <button class="btn small" type="button" on:click={loadMoreImages}>
                  加载下一页
                </button>
              </div>
            {:else if fullListPaths.length > 0}
              <div class="scroll-loading-hint muted small">
                已加载全部 {fullListPaths.length} 项
              </div>
            {/if}
          {/if}
        {:else}
          <div class="modal-scroll">
            <textarea
              class="textarea"
              style="min-height:320px"
              bind:value={fullListTextContent}
              on:input={handleFullTextInput}
            ></textarea>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Toast 提示 -->
<Toast message={toastMessage} visible={toastVisible} type={toastType} />

