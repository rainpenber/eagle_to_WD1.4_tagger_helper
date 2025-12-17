export type SectionModel = {
  model_path: string;
  tags_path: string;
};

export type SectionTag = {
  threshold: number;
  replace_underscore: boolean;
  underscore_excludes: string;
  escape_tags: boolean;
  use_chinese_name: boolean;
  additional_tags: string;
  exclude_tags: string;
  sort_alphabetically: boolean;
};

export type SectionProcess = {
  max_workers: number;
  batch_size: number;
  max_retries: number;
  checkpoint_interval: number;
};

export type SectionJson = {
  is_creat_image_info_csv: boolean;
  add_write_mode: boolean;
};

export type ConfigData = {
  model: SectionModel;
  tag: SectionTag;
  process: SectionProcess;
  json: SectionJson;
};

export type AssetItem = {
  path: string;
  thumb?: string;
};

export type EnvInfo = {
  pythonPath: string;
  source: 'venv' | 'system' | '';
  pythonVersion: string;
  cuda?: string;
  cudnn?: string;
  ok: boolean; // Python 版本满足运行需求（GPU 可选）
  message?: string;
  gpuOk?: boolean; // GPU 版本/文件满足要求
  gpuMessage?: string;
  gpuCount?: number;
  vram?: number[]; // 字节数列表
};

