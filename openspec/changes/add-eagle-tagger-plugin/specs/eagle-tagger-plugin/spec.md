## ADDED Requirements

### Requirement: External Tagger Configuration
插件 SHALL 允许用户选择 Eagle_AItagger_byWD1.4 工具目录，自动读取该目录下的 `config.ini`（含 Model/Tag/Process/Json 区段），并在 UI 中展示与编辑模型路径、词典路径、阈值、语言与附加标签等关键字段；保存时 SHALL 写回 config.ini 或插件本地存储（保持未修改字段不变）。

#### Scenario: Load config on directory set
- **WHEN** 用户在配置页设置或更换工具目录
- **THEN** 插件读取该目录下的 `config.ini` 并在 UI 预填各配置字段；缺失文件时提示错误并阻止运行

#### Scenario: Persist edited config
- **WHEN** 用户在 UI 修改模型/词典/阈值/语言等并点击保存
- **THEN** 插件更新 config.ini（或插件偏好存储）并提示保存成功；未修改字段保持原值

### Requirement: Selection Intake and Preview
插件 SHALL 通过 Eagle Plugin API 获取当前选中图片的绝对路径与缩略图 URL，在运行页展示选中数量、列表和缩略图预览；运行页为默认入口。

#### Scenario: Show selected assets
- **WHEN** 用户在 Eagle 选择一批图片并打开插件
- **THEN** 插件显示选中数量和缩略图预览；若未选中，显示提示并禁用运行按钮；无 thumbnail 时显示原图

#### Scenario: Preview first five with overflow hint
- **WHEN** 选中图片超过 5 张
- **THEN** 仅显示前 5 个 125x125 圆角缩略图，第 6 张仅显示右半边以提示仍有更多

### Requirement: Environment Detection
插件 SHALL 自动探测 Python 运行环境，优先使用工具目录下 venv（Windows `venv/Scripts/python.exe`，Unix `venv/bin/python`），若不存在则回落系统 `python`/`python3`；并在 UI 展示 Python 版本、CUDA/CUDNN（若可获取）以及关键依赖（onnxruntime/torch/opencv 等）缺失情况。
插件 SHALL 校验环境硬性要求：Python ≥3.8；CUDA 必须 12.9；cuDNN 必须 9.10.1；显存推荐 ≥8GB（作为提示不阻断 CPU 路径）。Windows MUST 检查 `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9` 目录存在且其 `bin` 中包含 `cudnn64_9.dll`、`cudnn_cnn64_9.dll`、`cudnn_graph64_9.dll`；缺失或版本不符时阻止 GPU 路径并提示。Linux/macOS 不得假设已安装 torch；若缺少 torch，仍应通过文件/命令（如 `/usr/local/cuda/version.txt`、`nvcc --version`、`ls /usr/local/cuda/lib*/libcudnn*`）最佳努力检测；若无法确认版本，则提示回退 CPU。

#### Scenario: Detect interpreter preference
- **WHEN** 用户设置工具目录或点击“检测环境”
- **THEN** 插件按优先级选择解释器并显示所选路径；若无可用 Python，提示错误并阻止运行

#### Scenario: Report dependency status
- **WHEN** 解释器检测完成
- **THEN** 插件执行依赖探测脚本，显示 Python 版本、CUDA/CUDNN 信息（如可用）与缺失依赖列表；失败时提示原因并允许重试

#### Scenario: Auto and post-directory detection
- **WHEN** 插件窗口创建 或 用户确认/更改工具目录
- **THEN** 自动执行环境检测并展示结果

#### Scenario: Enforce CUDA/cuDNN versions (Windows)
- **WHEN** 在 Windows 上运行环境检测
- **THEN** 插件检查 `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9` 及其 `bin` 是否含 `cudnn64_9.dll`、`cudnn_cnn64_9.dll`、`cudnn_graph64_9.dll`，并核对 CUDA=12.9、cuDNN=9.10.1；缺失/不符时提示并回退 CPU

#### Scenario: Enforce CUDA/cuDNN versions (macOS/Linux)
- **WHEN** 在 macOS/Linux 上运行环境检测
- **THEN** 插件若检测到 torch 则读取 CUDA/cuDNN 版本；若未安装 torch，则通过文件/命令（如 `/usr/local/cuda/version.txt`、`nvcc --version`、`ls /usr/local/cuda/lib*/libcudnn*`）尝试推断；若仍无法确认或版本不符，提示“未检测到 CUDA/cuDNN 或版本不符，将回退 CPU”，允许 CPU 路径继续

### Requirement: Tagger Execution Control
插件 SHALL 基于当前选中图片生成/覆盖 image_list（与 config.ini 同目录或临时路径），使用选定解释器调用 `main.py --config <config>`；运行期间 SHALL 将 stdout/stderr 流式展示在 UI，并提供停止按钮终止子进程。

#### Scenario: Run tagging
- **WHEN** 用户点击运行且环境检测通过
- **THEN** 插件生成 image_list、调用 main.py 并在 UI 展示实时日志；完成后显示退出码/成功提示，失败时展示错误原因

#### Scenario: Stop tagging
- **WHEN** 用户在运行中点击停止
- **THEN** 插件终止子进程，记录并展示退出状态（含被终止提示），释放占用资源

### Requirement: User Experience and Safeguards
插件 SHALL 在 UI 中提供清晰状态与错误提示（如缺少 config.ini、模型/词典文件不存在、无 Python/依赖缺失），并确保长日志可滚动/复制；在 GPU 不可用时 SHALL 提示回退 CPU；整体界面采用 shadcn/ui 官方默认样式（黑/白极简，重要信息用高明度红绿黄蓝），保持极简且一致的组件风格；提供调试模式开关，开启时才输出调试日志。

#### Scenario: Guard invalid state
- **WHEN** 关键前置条件缺失（未选中图片、无 config.ini、无有效 Python/模型/词典）
- **THEN** 运行按钮保持禁用并呈现修复建议

#### Scenario: Long log usability
- **WHEN** main.py 输出大量日志
- **THEN** UI 允许滚动、复制，并保留最近日志而不阻塞界面

#### Scenario: Minimal shadcn styling
- **WHEN** 插件渲染配置、预览与运行控制界面
- **THEN** 组件与布局遵循 shadcn/ui 官方默认黑/白极简风格，重要信息用高明度红绿黄蓝提示，无重度定制；调试日志仅在调试模式打开时输出

### Requirement: Full List Modal
插件 SHALL 提供“完整列表”弹窗，包含图片视图与文字视图（路径列表）双向绑定；初次打开懒加载前 9 个条目，支持滚动加载更多；支持取消与确认按钮（点击空白不关闭）。

#### Scenario: Open modal and lazy load
- **WHEN** 用户点击“完整列表”
- **THEN** 打开 modal，图片视图与文字视图同步显示前 9 条，滚动时继续加载；支持切换视图且数据保持一致

#### Scenario: Persist list for tagging
- **WHEN** 用户在 modal 中确认
- **THEN** 当前列表内容 SHALL 写入/覆盖 `image_list.txt` 以供 main.py 使用；取消则不改写文件

