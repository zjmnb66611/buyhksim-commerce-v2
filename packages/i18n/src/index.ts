export const locales = ["zh-CN", "zh-HK", "en"] as const;
export type Locale = (typeof locales)[number];

export const messages = {
  "zh-CN": { search: "搜索", cart: "购物车", favorite: "收藏夹", account: "登录/注册", orders: "我的订单", addToCart: "加入购物车" },
  "zh-HK": { search: "搜尋", cart: "購物車", favorite: "收藏夾", account: "登入/註冊", orders: "我的訂單", addToCart: "加入購物車" },
  en: { search: "Search", cart: "Cart", favorite: "Favorites", account: "Sign in", orders: "Orders", addToCart: "Add to cart" },
} as const satisfies Record<Locale, Record<string, string>>;
