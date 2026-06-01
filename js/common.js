/**
 * 公共工具模块 - 菜单数据编解码与 URL 生成
 * 供生成器页 (index) 和菜单展示页 (menu) 共用
 */

/** 将菜单对象编码为 Base64 字符串（放入 URL hash） */
function encodeMenuData(data) {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

/** 从 Base64 字符串解码菜单对象 */
function decodeMenuData(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/**
 * 生成菜单页面的完整 URL（扫码后打开）
 * @param {Object} data - { n: 餐厅名, t: 模板, i: [[菜名, 价格], ...], table?: 桌号 }
 */
function buildMenuUrl(data) {
  const base = window.location.href.replace(/[^/]*$/, "");
  return base + "menu.html#" + encodeMenuData(data);
}

/** 格式化价格为显示字符串 */
function formatPrice(price) {
  const num = parseFloat(price);
  if (isNaN(num)) return "¥0";
  return "¥" + (Number.isInteger(num) ? num : num.toFixed(2));
}

/** 将菜单数据格式化为纯文本（方便复制发给顾客） */
function formatMenuText(data) {
  const lines = [data.n || "未命名餐厅", "—".repeat(20)];
  if (data.table) lines.unshift("【" + data.table + "】");
  (data.i || []).forEach(function (item) {
    lines.push(item[0] + "  " + formatPrice(item[1]));
  });
  lines.push("—".repeat(20));
  lines.push("扫码查看电子菜单");
  return lines.join("\n");
}

/** 显示 Toast 提示 */
function showToast(message, duration) {
  duration = duration || 2500;
  var toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () {
    toast.classList.remove("show");
  }, duration);
}
