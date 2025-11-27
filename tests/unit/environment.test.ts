import { describe, it, expect } from 'vitest';
import { detectEnvironment, isEditableEnvironment } from '@/utils/environment';

describe('detectEnvironment', () => {
  it('應識別 www.sit.kkday.com 為 sit 環境', () => {
    expect(detectEnvironment('www.sit.kkday.com')).toBe('sit');
  });

  it('應識別 www-05.sit.kkday.com 為 sit 環境', () => {
    expect(detectEnvironment('www-05.sit.kkday.com')).toBe('sit');
  });

  it('應識別 www-202.sit.kkday.com 為 sit 環境', () => {
    expect(detectEnvironment('www-202.sit.kkday.com')).toBe('sit');
  });

  it('應識別 www.stage.kkday.com 為 stage 環境', () => {
    expect(detectEnvironment('www.stage.kkday.com')).toBe('stage');
  });

  it('應識別 www.kkday.com 為 production 環境', () => {
    expect(detectEnvironment('www.kkday.com')).toBe('production');
  });

  it('應識別 www.google.com 為 unsupported', () => {
    expect(detectEnvironment('www.google.com')).toBe('unsupported');
  });

  it('應識別空字串為 unsupported', () => {
    expect(detectEnvironment('')).toBe('unsupported');
  });

  it('應識別 kkday.com（無 www）為 unsupported', () => {
    expect(detectEnvironment('kkday.com')).toBe('unsupported');
  });
});

describe('isEditableEnvironment', () => {
  it('sit 環境應可編輯', () => {
    expect(isEditableEnvironment('sit')).toBe(true);
  });

  it('stage 環境應可編輯', () => {
    expect(isEditableEnvironment('stage')).toBe(true);
  });

  it('production 環境不可編輯', () => {
    expect(isEditableEnvironment('production')).toBe(false);
  });

  it('unsupported 環境不可編輯', () => {
    expect(isEditableEnvironment('unsupported')).toBe(false);
  });
});
