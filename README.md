# Eagle AI Tagger Helper

基于 [Eagle_AItagger_byWD1.4](https://github.com/Ir-Phen/Eagle_AItagger_byWD1.4) 开发的 Eagle 插件，为 Eagle 图像管理软件提供便捷的 AI 标签生成功能。

## 致谢

本项目旨在对接 [Ir-Phen/Eagle_AItagger_byWD1.4](https://github.com/Ir-Phen/Eagle_AItagger_byWD1.4) 项目，感谢原作者的优秀工作。


## 使用流程

### 前置准备

由于CUDA和cuDNN是闭源工具，你需要自行下载安装：

- **CUDA**: 12.9 ([下载地址](https://developer.download.nvidia.com/compute/cuda/12.9.0/local_installers/cuda_12.9.0_576.02_windows.exe))，下载之后直接双击安装即可

- **cuDNN**: 9.10.1 ([下载地址](https://developer.download.nvidia.com/compute/cudnn/redist/cudnn/windows-x86_64/cudnn-windows-x86_64-9.10.1.4_cuda12-archive.zip))，解压以后，将内容全部拷贝到`C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9` (注意让压缩包里的bin、include、lib文件夹和上述文件夹里的这三个文件夹合并)

- **VC_redist.x64**: ([下载地址](https://aka.ms/vs/17/release/vc_redist.x64.exe))

### 安装[Eagle_AItagger_byWD1.4](https://github.com/Ir-Phen/Eagle_AItagger_byWD1.4)

#### 方法1：使用整合包
[夸克 提取码：T2aP](https://pan.quark.cn/s/91e49b2bedbb) | [百度 提取码：vtp2](https://pan.baidu.com/s/18LGBFslqS1x8fKGTWAisGw?pwd=vtp2)
解压到一个固定的地方即可，不用安装依赖，依赖已经安装好了

#### 方法2：手动配置
1. **克隆仓库**
可以手动下载[Eagle_AItagger_byWD1.4](https://github.com/Ir-Phen/Eagle_AItagger_byWD1.4)的仓库zip，然后解压.也可以自行git clone下载

2. **安装基础环境**
- 安装python，版本3.8+
- 安装依赖
```bash
pip install -r requirements.txt
```
如果你使用uv和虚拟环境，也可以自行通过uv安装依赖

- 下载图像模型（请参考 [Eagle_AItagger_byWD1.4](https://github.com/Ir-Phen/Eagle_AItagger_byWD1.4) 项目说明），模型需要放置到`model`文件夹中

3. **准备插件**

### 安装插件

1. 从 [Releases](https://github.com/rainpenber/eagle_to_WD1.4_tagger_helper/releases) 下载最新版本的插件包,并解压
2. 打开 Eagle 软件
3. 进入 **插件** → **开发者工具**
4. 导入下载的插件包

### 使用步骤

1. **选择图片**
   - 在 Eagle 中选择需要标注的多张图片

2. **打开插件**
   - 点击插件按钮，打开插件界面

3. **配置工具目录**
   - 切换到 **配置** 选项卡
   - 设置 **工具目录** 为 `Eagle_AItagger_byWD1.4` 项目的工作目录
   - 点击 **读取** 按钮加载配置

4. **运行标注**
   - 切换到 **运行** 选项卡
   - 确认已选图片列表
   - 点击 **开始运行** 按钮
   - 等待处理完成

## TODO

- [ ] 考虑一步到位学习做web版运行oonxruntime

## 问题反馈

如遇问题，请前往 [Issues](https://github.com/your-username/eagle_to_WD1.4_tagger_helper/issues) 反馈。

## 开源协议

本项目采用 [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) 开源协议。

## 技术栈

- **前端框架**: Svelte 4 + TypeScript
- **构建工具**: Vite
- **运行时**: Node.js (Electron)