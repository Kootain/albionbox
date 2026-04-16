export type LocalizedText = {
  'EN-US'?: string;
  'ZH-CN'?: string;
  [key: string]: string | undefined;
};

export type ItemData = {
  Index: number;
  UniqueName: string;
  Name?: LocalizedText;
};

export type SpellData = {
  Index: number;
  UniqueName: string;
  Name?: LocalizedText;
};
