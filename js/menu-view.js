/**
 * 扫码菜单展示页逻辑
 * 从 URL hash 读取菜单数据，渲染三种模板，支持加购/下单（纯前端演示）
 */

(function () {
  "use strict";

  var cart = []; // { name, price, qty }

  function init() {
    var hash = window.location.hash.slice(1);
    if (!hash) {
      showError("未找到菜单数据", "请扫描餐厅二维码打开菜单");
      return;
    }

    var data = decodeMenuData(hash);
    if (!data || !data.i || !data.i.length) {
      showError("菜单数据无效", "二维码可能已损坏，请联系服务员");
      return;
    }

    renderMenu(data);
    bindCartBar();
  }

  /** 显示错误页 */
  function showError(title, msg) {
    document.body.innerHTML =
      '<div class="error-page">' +
      "<h2>" + title + "</h2>" +
      "<p>" + msg + "</p>" +
      '<a href="index.html">← 返回生成器</a>' +
      "</div>";
  }

  /** 渲染菜单 */
  function renderMenu(data) {
    var tpl = data.t || "minimal";
    var container = document.createElement("div");
    container.className = "menu-" + tpl;

    // 头部
    var header = document.createElement("div");
    header.className = "header";
    header.innerHTML =
      '<div class="restaurant-name">' + escapeHtml(data.n) + "</div>" +
      (data.table
        ? '<div class="table-badge">' + escapeHtml(data.table) + "</div>"
        : "") +
      (tpl === "minimal"
        ? '<div class="subtitle">— 欢迎光临 —</div>'
        : tpl === "vintage"
        ? '<div class="subtitle">~ 今日推荐 ~</div>'
        : "");

    container.appendChild(header);

    // 菜品列表
    var list = document.createElement("div");
    list.className = "menu-list";

    data.i.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "item";

      if (tpl === "ins") {
        row.innerHTML =
          '<div class="item-info">' +
          '<div class="item-name">' + escapeHtml(item[0]) + "</div>" +
          '<span class="item-price">' + formatPrice(item[1]) + "</span>" +
          "</div>";
      } else {
        row.innerHTML =
          '<span class="item-name">' + escapeHtml(item[0]) + "</span>" +
          '<span class="item-price">' + formatPrice(item[1]) + "</span>";
      }

      // 操作按钮
      var actions = document.createElement("div");
      actions.className = "item-actions";

      var btnAdd = document.createElement("button");
      btnAdd.className = "btn-cart btn-add";
      btnAdd.textContent = "加购";
      btnAdd.addEventListener("click", function () {
        addToCart(item[0], item[1]);
      });

      var btnOrder = document.createElement("button");
      btnOrder.className = "btn-cart btn-order";
      btnOrder.textContent = "下单";
      btnOrder.addEventListener("click", function () {
        addToCart(item[0], item[1]);
        showOrderModal(data.n, item[0]);
      });

      actions.appendChild(btnAdd);
      actions.appendChild(btnOrder);
      row.appendChild(actions);
      list.appendChild(row);
    });

    container.appendChild(list);
    document.body.innerHTML = "";
    document.body.appendChild(container);

    // 底部购物车栏
    var cartBar = document.createElement("div");
    cartBar.className = "cart-bar";
    cartBar.id = "cartBar";
    cartBar.innerHTML =
      '<div class="cart-info">' +
      '已选 <span class="cart-count" id="cartCount">0</span> 件 · ' +
      '合计 <span class="cart-total" id="cartTotal">¥0</span>' +
      "</div>" +
      '<button class="btn-checkout" id="btnCheckout">去结算</button>';
    document.body.appendChild(cartBar);

    document.getElementById("btnCheckout").addEventListener("click", function () {
      if (cart.length === 0) {
        showToast("购物车是空的，请先加购");
        return;
      }
      showCheckoutModal(data.n);
    });
  }

  /** 加购 */
  function addToCart(name, price) {
    var existing = cart.find(function (c) { return c.name === name; });
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ name: name, price: price, qty: 1 });
    }
    updateCartBar();
    showToast("已加入：" + name);
  }

  /** 更新底部购物车栏 */
  function updateCartBar() {
    var count = 0;
    var total = 0;
    cart.forEach(function (c) {
      count += c.qty;
      total += c.price * c.qty;
    });

    var bar = document.getElementById("cartBar");
    if (!bar) return;

    document.getElementById("cartCount").textContent = count;
    document.getElementById("cartTotal").textContent = formatPrice(total);
    bar.classList.toggle("show", count > 0);
  }

  function bindCartBar() {
    /* 已在 renderMenu 中绑定 */
  }

  /** 单件下单弹窗 */
  function showOrderModal(restaurant, dishName) {
    showModal(
      "下单成功（演示）",
      "您已在「" + restaurant + "」下单「" + dishName + "」。" +
      "此为前端演示，实际下单需对接收银系统。"
    );
  }

  /** 结算弹窗 */
  function showCheckoutModal(restaurant) {
    var summary = cart
      .map(function (c) {
        return c.name + " ×" + c.qty + "  " + formatPrice(c.price * c.qty);
      })
      .join("\n");

    var total = cart.reduce(function (s, c) { return s + c.price * c.qty; }, 0);

    showModal(
      "结算成功（演示）",
      "餐厅：" + restaurant + "\n\n" + summary + "\n\n合计：" + formatPrice(total) +
      "\n\n此为前端演示，无需支付。"
    );

    cart = [];
    updateCartBar();
  }

  /** 通用弹窗 */
  function showModal(title, msg) {
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay show";
    overlay.innerHTML =
      '<div class="modal-box">' +
      "<h3>" + escapeHtml(title) + "</h3>" +
      "<p style='white-space:pre-line'>" + escapeHtml(msg) + "</p>" +
      '<button class="btn-close">知道了</button>' +
      "</div>";

    overlay.querySelector(".btn-close").addEventListener("click", function () {
      overlay.remove();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
