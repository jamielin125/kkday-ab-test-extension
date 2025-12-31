import type { Environment } from '@/types';

/**
 * 根據 hostname 判斷環境類型
 * @param hostname - 網站主機名稱
 * @returns 環境類型：sit | stage | production | unsupported
 */
export function detectEnvironment(hostname: string): Environment {
  // SIT 環境：www.sit.kkday.com, www-05.sit.kkday.com, www-202.sit.kkday.com, dev.kkday.com
  if (/^www(-\d+)?\.sit\.kkday\.com$/.test(hostname) || hostname === 'dev.kkday.com') {
    return 'sit';
  }

  // Stage 環境：www.stage.kkday.com
  if (hostname === 'www.stage.kkday.com') {
    return 'stage';
  }

  // Production 環境：www.kkday.com
  if (hostname === 'www.kkday.com') {
    return 'production';
  }

  return 'unsupported';
}

/**
 * 判斷是否為可編輯環境（sit 或 stage）
 * @param environment - 環境類型
 * @returns 是否可編輯
 */
export function isEditableEnvironment(environment: Environment): boolean {
  return environment === 'sit' || environment === 'stage';
}
