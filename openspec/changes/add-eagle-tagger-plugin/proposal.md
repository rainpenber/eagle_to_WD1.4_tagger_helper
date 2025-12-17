# Change: Eagle 插件一键触发 WD1.4 打标

## Why
- 现有流程需手动复制图片路径、编辑 image_list.txt、手动开终端运行 main.py，步骤繁琐且易出错。
- 希望在 Eagle 内直接选择图片、配置模型/词典/语言、检测 Python/CUDA 依赖，并一键运行或停止标注。

## What Changes
- 在插件配置页允许选择 Eagle_AItagger_byWD1.4 目录并自动加载 config.ini，支持修改模型/词典/阈值/语言等并持久化。
- 在运行页显示 Eagle 选中图片缩略图与数量，自动写入 image_list.txt（或临时列表）并调用 main.py。
- 内置环境探测：优先使用工具目录内 venv（若存在），否则回落系统 Python；展示 Python/CUDA/CUDNN/依赖检测结果。
- 运行控制：UI 按钮启动/停止 main.py，实时展示 stdout/stderr，错误与退出码可视化提示。
- 界面样式采用 shadcn/ui 官方默认主题（深色模式），保持极简、可读的布局与组件风格；运行页为默认入口。
- 新增调试模式开关，开启后才在控制台输出调试日志。
- 环境硬性要求：Python ≥3.8；CUDA 必须 12.9；cuDNN 必须 9.10.1；Windows 必须检测 `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\bin` 存在且包含 `cudnn64_9.dll`、`cudnn_cnn64_9.dll`、`cudnn_graph64_9.dll`；显存推荐 ≥8GB；其他平台按可检测到的 CUDA/cuDNN 版本提示并允许回退 CPU。

## Impact
- 影响规格：`eagle-tagger-plugin`
- 影响代码/系统：Eagle 插件前端（轻量框架与 Eagle Plugin API）、Node/JS 侧进程调度与日志管道、外部 Python 工具调用（不改动工具源码）。

