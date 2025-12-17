## Context
- Eagle 插件需在桌面端内（Electron/JS 环境）调用外部 Python 工具 `Eagle_AItagger_byWD1.4` 的 `main.py`。
- 用户机器可能已有全局 Python，也可能在工具目录下存在 venv；CUDA/CUDNN/onnxruntime-gpu 等依赖需提前安装。
- 插件需通过 Eagle Plugin API 获取当前选中图片列表（含绝对路径和缩略图 URL），避免手动维护 `image_list.txt`。

## Goals
- 轻量前端（推荐 Svelte + Vite，纯静态产物嵌入插件目录），UI 采用 shadcn/ui 官方默认样式（黑/白极简，重要信息用高明度红绿黄蓝提示），保持极简风格。
- 自动加载/保存配置：从工具目录读取 `config.ini`（Model/Tag/Process/Json 区段），允许 UI 编辑并写回。
- 环境探测：优先检测工具目录下 venv（Windows `Scripts/python.exe`，macOS/Linux `bin/python`），否则回落 `python`/`python3`；探测 Python 版本、CUDA/CUDNN 版本（若可用）、关键依赖（onnxruntime-gpu/torch/opencv-python 等）。
- 环境硬性要求：Python ≥3.8；CUDA 必须 12.9；cuDNN 必须 9.10.1；Windows 需检查 CUDA 安装目录与必备 DLL；显存推荐 ≥8GB；不满足时明确警告并默认回退 CPU。Linux/macOS 若缺少 torch 时仍需通过文件/命令探测尽力读取版本，不得假定已安装 torch。
- 运行控制：生成/覆盖 `image_list.txt`（或临时文件）后启动 `main.py`，实时流式 stdout/stderr 至 UI，可中止进程。
- 安全与体验：明确错误提示（缺少 Python、模型/词典缺失、依赖未安装、CUDA 不可用），避免 UI 卡死。
- 默认初始页为“运行”，配置页为第二页；提供调试模式开关，开启时才输出调试日志。

## Non-Goals
- 不修改 `Eagle_AItagger_byWD1.4` Python 源码。
- 不在插件内自动安装 CUDA/CUDNN 或 Python 依赖（仅提示与检测）。

## Decisions
- **前端框架**：Svelte（运行时体积小，易与原生 DOM/Eagle API 结合）。若后续需换框架，保持 API 抽象层（service + store）以便替换。
- **UI 组件与样式**：使用 shadcn/ui 默认主题（深色模式）与极简样式，仅做必要的布局适配，不追加重度自定义皮肤。
- **构建**：Vite 产出静态文件（index.html + bundle），放置于插件目录；Eagle 插件以本地文件方式加载，并遵循 `manifest.json` 的 `dist/index.html` 入口。
- **状态与服务分层**：UI 组件（Svelte） <- store（选择状态、配置、运行状态） <- service 层（Eagle API 适配器、文件读写、进程控制、环境检测）。
- **调试模式**：提供 UI 开关，开启时才向控制台输出调试日志，默认关闭。
- **环境硬性要求与检测**：
  - Python: 3.8+。
  - CUDA: 必须 12.9；Windows 需检查 `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9` 是否存在。
  - cuDNN: 必须 9.10.1；Windows 检查上述路径 `bin` 中存在 `cudnn64_9.dll`、`cudnn_cnn64_9.dll`、`cudnn_graph64_9.dll`。
  - 显存：提示推荐 ≥8GB（展示为建议，不强制阻断）。
  - Linux/macOS：若检测到 torch，可读取 `torch.version.cuda` 与 `torch.backends.cudnn.version()`；若未安装 torch，则通过文件/命令最佳努力读取 CUDA/cuDNN 版本（例如 `/usr/local/cuda/version.txt`、`nvcc --version`、`ls /usr/local/cuda/lib*/libcudnn*`），若仍无法确认则提示“未检测到 CUDA/cuDNN 或版本不符，将回退 CPU”。macOS 默认 CPU，若有 torch 则展示其版本。
- **环境检测命令**（示例）：
  - Python: `"<python_path>" --version`
  - 依赖: `"<python_path>" - <<'PY'\nimport importlib, json\nmods=['onnxruntime','onnxruntime_gpu','torch','opencv-python','pandas']\nmissing=[m for m in mods if not importlib.util.find_spec(m.replace('-','_'))]\nprint(json.dumps({'missing':missing}))\nPY`
  - CUDA/cuDNN: `"<python_path>" - <<'PY'\nimport torch, json, sys\ncuda=str(torch.version.cuda or '')\ncudnn=str(torch.backends.cudnn.version() or '')\nprint(json.dumps({'cuda':cuda,'cudnn':cudnn,'gpu_count':torch.cuda.device_count() if torch.cuda.is_available() else 0,\n'vram': [torch.cuda.get_device_properties(i).total_memory for i in range(torch.cuda.device_count())] if torch.cuda.is_available() else []}))\nPY`；Windows 额外做文件/目录存在性检查。
  - Linux/macOS 无 torch 时的兜底：调用 `nvcc --version`（若存在）、读取 `/usr/local/cuda/version.txt`，并列举 `/usr/local/cuda/lib*/libcudnn*` 以推断版本；若仍未知，则标记“未检测到 GPU/驱动信息，回退 CPU”。
- **进程调用**：Node `child_process.spawn`（在插件运行的 JS 侧），带超时/kill；stdout/stderr 通过事件流推送到 UI。
- **文件路径策略**：
  - 工具目录设定后，默认 config.ini、image_list.txt 放在该目录。
  - venv 路径：`<tool>/venv/Scripts/python.exe`（Win）或 `<tool>/venv/bin/python`（Unix）；若不存在则使用系统 Python。
  - 模型/词典路径直接取 config.ini 中设置的相对/绝对路径，不做改写，仅校验存在性并提示。

## Low-fidelity UI（文字稿）
- 顶部 Tabs：默认进入 `运行`，`配置` 为第二页；右上状态徽标呈现环境检测结果（OK/警告/错误，采用 shadcn 默认样式颜色）。
- 配置页：
  - “工具目录”行：输入框 + “浏览”按钮；右侧小字显示已选 Python 解释器（标注 venv/系统）。
  - “模型与词典”卡片：模型路径输入、词典路径输入；下方文件存在性提示行。
  - “标签参数”卡片：阈值 slider+number、使用中文标签开关、附加/排除标签多行输入。
  - “操作”行：`保存配置` 主按钮，`重新加载` 次按钮；下方状态条显示保存结果。（环境检测按钮移至运行页）
- 运行页：
  - “已选图片”卡片：数量徽标 + 缩略图网格，前 5 个 125x125 圆角缩略图，若超过 5 张，第 6 张仅显示右半，提示仍有更多；空态提示“请在 Eagle 先选择图片”。“完整列表”按钮打开 modal，含图片视图与文字视图双向绑定，首屏懒加载 9 条，滚动加载更多；有确认/取消按钮（点击空白不关闭）；确认后写入 image_list.txt，取消不改写；无 thumbnail 时显示原图。
  - “环境”卡片：Python 版本、CUDA/CUDNN、缺失依赖、GPU 状态可视化；`重新检测` 按钮；无警告时显示绿色“配置成功”，无环境时显示警告；窗口创建时自动检测一次，更改/确认工具目录后再次检测。
  - “运行控制”卡片：`开始运行` / `停止`（运行中启用），命令预览为 `python main.py`（不拼接参数）；运行前写入 image_list.txt。
  - “日志”卡片：可滚动文本区域，“复制全部”按钮，运行中自动滚动到底；提供“调试模式”开关，开启时才输出调试日志。

## Risks / Trade-offs
- Eagle 插件运行时是否允许直接 spawn 外部进程需确认；若受限需退化为提示用户手动运行。
- 不同平台的 venv 路径兼容性风险；需在检测逻辑中覆盖常见路径并在 UI 告知选择的解释器。
- CUDA/CUDNN 检测依赖 torch 可用；若缺失 torch，则只能提示“未检测到 GPU 支持”。
- stdout/stderr 量大时，UI 需要限流/滚动，否则可能卡顿。

## Migration / Rollback
- 纯新增能力，不改现有功能；回滚可移除插件入口或禁用调用按钮。

## Open Questions
- Eagle Plugin API 的进程权限与文件读写限制具体范围？（假设可读写本地文件并 spawn 子进程）
- 是否需要无网络环境下的依赖检测降级方案（仅检查文件存在而非 import）？

