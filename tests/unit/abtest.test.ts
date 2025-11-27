import { describe, it, expect } from 'vitest';
import { parseABTestData, buildCookieName, getCookieDomain } from '@/utils/abtest';
import type { RawABTestData } from '@/types';

describe('parseABTestData', () => {
  it('應正確轉換原始資料格式', () => {
    const rawData: RawABTestData = {
      app_only_coupon_on_mweb_test: {
        case: 'control',
        data: null,
        cases: {
          control: 'control',
          show_all: 'show_all',
          show_banner: 'show_banner',
        },
      },
    };

    const result = parseABTestData(rawData);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('app_only_coupon_on_mweb_test');
    expect(result[0].currentCase).toBe('control');
    expect(result[0].cases).toHaveLength(3);
    expect(result[0].cases).toContainEqual({ key: 'control', label: 'control' });
    expect(result[0].cases).toContainEqual({ key: 'show_all', label: 'show_all' });
  });

  it('應處理多個 A/B Test', () => {
    const rawData: RawABTestData = {
      test_a: {
        case: 'control',
        data: null,
        cases: { control: 'control', variant: 'variant' },
      },
      test_b: {
        case: 'experiment',
        data: { some: 'data' },
        cases: { control: 'control', experiment: 'experiment' },
      },
    };

    const result = parseABTestData(rawData);

    expect(result).toHaveLength(2);
  });

  it('應處理 null 輸入', () => {
    expect(parseABTestData(null)).toEqual([]);
  });

  it('應處理空物件', () => {
    expect(parseABTestData({})).toEqual([]);
  });
});

describe('buildCookieName', () => {
  it('應產生正確的 cookie 名稱', () => {
    expect(buildCookieName('app_only_coupon_on_mweb_test')).toBe(
      'ab_test_override_app_only_coupon_on_mweb_test'
    );
  });

  it('應處理空字串', () => {
    expect(buildCookieName('')).toBe('ab_test_override_');
  });

  it('應處理含特殊字元的 key', () => {
    expect(buildCookieName('test-with-dash')).toBe('ab_test_override_test-with-dash');
  });
});

describe('getCookieDomain', () => {
  it('應回傳 sit 環境的 domain', () => {
    expect(getCookieDomain('www.sit.kkday.com')).toBe('.sit.kkday.com');
    expect(getCookieDomain('www-05.sit.kkday.com')).toBe('.sit.kkday.com');
  });

  it('應回傳 stage 環境的 domain', () => {
    expect(getCookieDomain('www.stage.kkday.com')).toBe('.stage.kkday.com');
  });

  it('應回傳 production 環境的 domain', () => {
    expect(getCookieDomain('www.kkday.com')).toBe('.kkday.com');
  });
});
