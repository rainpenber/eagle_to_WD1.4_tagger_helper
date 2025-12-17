## 0. 低保真模型
- [x] 0.1 提供基于 shadcn/ui 极简风格的低保真页面稿（文字/框线示意），先行对齐布局与分区。

## 1. 规划与骨架
- [ ] 1.1 确认插件使用 Svelte + Vite 输出静态资源，UI 采用 shadcn/ui 默认黑/白极简样式（高明度提示色），搭建最小模板与构建脚本；默认进入“运行”页，标签顺序“运行”在前、“配置”在后。
- [ ] 1.2 接入 Eagle Plugin API，拉取选中图片列表与缩略图，运行页预览前 5 个并显示“更多”提示；超过 5 张时第 6 张仅显示右半边。

## 2. 配置管理
- [ ] 2.1 在配置页选择工具目录，读取并解析 `config.ini`，将 Model/Tag/Process/Json 关键字段映射到 UI。
- [ ] 2.2 保存配置：写回 config.ini（保持原有区段/未修改字段），持久化插件本地偏好（工具目录、语言、UI 状态）。

## 3. 环境探测
- [ ] 3.1 检测 venv 与系统 Python：解析 `<tool>/venv`（Win `Scripts/python.exe`，Unix `bin/python`），否则回落 `python`/`python3`，在 UI 显示选用的解释器。
- [ ] 3.2 执行探测脚本，显示 Python 版本、CUDA/CUDNN（若可得）、依赖缺失列表（onnxruntime/torch/opencv 等）；可视化呈现，满足时显示绿色“配置成功”。
- [ ] 3.3 硬性校验：Python≥3.8；CUDA=12.9；cuDNN=9.10.1。Windows 检查 `C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v12.9\\bin` 下存在 `cudnn64_9.dll/cudnn_cnn64_9.dll/cudnn_graph64_9.dll`；macOS/Linux 若有 torch 读取版本，若无 torch 则通过 `/usr/local/cuda/version.txt`、`nvcc --version`、`ls /usr/local/cuda/lib*/libcudnn*` 等兜底；不符或未知则提示回退 CPU；显存提示≥8GB（建议项）。
- [ ] 3.4 自动触发：窗口创建时自动检测；确认/修改工具目录后自动再次检测；环境模块放置在“配置”页。

## 4. 运行控制
- [ ] 4.1 生成/覆盖 image_list（来自 Eagle 选中项），调用 `main.py`（不拼接额外参数），流式推送 stdout/stderr 到 UI。
- [ ] 4.2 支持停止：暴露 stop 按钮，kill 子进程并提示退出状态；错误（缺少 Python/模型/词典）可视化。

## 5. 体验与校验
- [ ] 5.1 UI 打磨：状态提示、空选中提示、长日志滚动与复制，明确风险提示（需用户预装依赖）；应用 shadcn/ui 默认黑/白极简模式，重要信息用高明度红绿黄蓝；调试模式开关控制日志输出。
- [ ] 5.2 完整列表 modal：双向绑定图片/文字视图，懒加载（首屏 9 条，滚动加载更多），取消/确认按钮防误触，不点空白关闭；确认时写入 image_list.txt；无缩略图时显示原图。
- [ ] 5.3 自测清单：无 venv/有 venv、缺依赖、缺模型/词典、GPU/CPU 路径；Windows 为主，兼顾 macOS/Linux；大批量选中（最高 8 万）懒加载性能验证。

## 6. 验证
- [ ] 6.1 运行 `openspec validate add-eagle-tagger-plugin --strict`，修正格式/场景。

