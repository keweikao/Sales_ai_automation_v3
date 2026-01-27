/**
 * 品牌配置 - 根據產品線顯示不同的品牌資訊
 */

export interface BrandConfig {
  name: string;
  displayName: string;
  footerName: string;
  gradient: {
    from: string;
    via: string;
    to: string;
  };
  logoGradient: string;
  accentColor: string;
  accentColorHex: string;
  accentColorLight: string;
  consultantCardBg: string;
  consultantCardBorder: string;
}

const brandConfigs: Record<string, BrandConfig> = {
  ichef: {
    name: "iCHEF",
    displayName: "iCHEF",
    footerName: "iCHEF Sales AI",
    gradient: {
      from: "from-amber-50",
      via: "via-orange-50",
      to: "to-red-50",
    },
    logoGradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
    accentColor: "orange",
    accentColorHex: "#f97316",
    accentColorLight: "#fff7ed",
    consultantCardBg:
      "linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%)",
    consultantCardBorder: "rgba(249, 115, 22, 0.2)",
  },
  beauty: {
    name: "美業管理",
    displayName: "美業管理系統",
    footerName: "美業管理 Sales AI",
    gradient: {
      from: "from-pink-50",
      via: "via-purple-50",
      to: "to-violet-50",
    },
    logoGradient: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
    accentColor: "pink",
    accentColorHex: "#ec4899",
    accentColorLight: "#fdf2f8",
    consultantCardBg:
      "linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
    consultantCardBorder: "rgba(236, 72, 153, 0.2)",
  },
};

/**
 * 取得品牌配置
 * @param productLine - 產品線 ID (ichef | beauty)
 * @returns 品牌配置，如果找不到則返回 iCHEF 預設配置
 */
export function getBrandConfig(productLine?: string): BrandConfig {
  if (!productLine) {
    return brandConfigs.ichef;
  }
  return brandConfigs[productLine] || brandConfigs.ichef;
}
