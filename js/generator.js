/**
 * 餐饮菜单二维码生成器 - 主逻辑
 */

(function () {
  "use strict";

  // ===== 状态 =====
  var state = {
    restaurant: "",
    template: "minimal",
    dishes: [{ name: "", price: "" }],
    logoDataUrl: null,
    colorDark: "#e55a2b",
    colorLight: "#ffffff",
    qrSize: 512,
  };

  // 预设菜单样例
  var PRESETS = {
    minimal: {
      n: "小橙食堂",
      t: "minimal",
      i: [
        ["番茄炒蛋", 18],
        ["红烧肉", 38],
        ["清炒时蔬", 15],
        ["紫菜蛋花汤", 8],
      ],
    },
    ins: {
      n: "Orange Bistro",
      t: "ins",
      i: [
        ["牛油果沙拉", 32],
        ["意式浓缩", 22],
        ["松饼塔", 45],
        ["鲜榨橙汁", 18],
      ],
    },
    vintage: {
      n: "老味道饭馆",
      t: "vintage",
      i: [
        ["招牌烤鸭", 88],
        ["手工面", 25],
        ["桂花糕", 12],
        ["茉莉花茶", 6],
      ],
    },
  };

  // ===== DOM 引用 =====
  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function initElements() {
    els.restaurant = $("restaurantName");
    els.dishList = $("dishList");
    els.templateCards = document.querySelectorAll(".template-card");
    els.preview = $("menuPreview");
    els.qrCanvas = $("qrCanvas");
    els.qrHidden = $("qrHidden");
    els.qrLoading = $("qrLoading");
    els.colorDark = $("colorDark");
    els.colorLight = $("colorLight");
    els.logoInput = $("logoInput");
    els.logoPreview = $("logoPreview");
    els.tableStart = $("tableStart");
    els.tableEnd = $("tableEnd");
    els.tablePrefix = $("tablePrefix");
    els.tableQrGrid = $("tableQrGrid");
  }

  // ===== 步骤导航 =====
  var currentStep = 1;

  function goToStep(step) {
    if (step < 1 || step > 3) return;
    currentStep = step;

    document.querySelectorAll(".step-panel").forEach(function (panel) {
      panel.classList.toggle("active", parseInt(panel.dataset.step, 10) === step);
    });

    document.querySelectorAll(".step-item").forEach(function (item) {
      var s = parseInt(item.dataset.step, 10);
      item.classList.toggle("active", s === step);
      item.classList.toggle("done", s < step);
    });

    if (step === 2) renderPreview();
    if (step === 3) generateMainQR();
  }

  // ===== 菜品列表管理 =====
  function getDishesFromDOM() {
    var items = els.dishList.querySelectorAll(".dish-item");
    var dishes = [];
    items.forEach(function (row) {
      var name = row.querySelector(".dish-name").value.trim();
      var price = row.querySelector(".dish-price").value.trim();
      if (name) dishes.push({ name: name, price: price });
    });
    return dishes;
  }

  function renderDishList(dishes) {
    els.dishList.innerHTML = "";
    dishes.forEach(function (d, idx) {
      els.dishList.appendChild(createDishRow(d.name, d.price, idx));
    });
  }

  function createDishRow(name, price, idx) {
    var row = document.createElement("div");
    row.className = "dish-item";
    row.innerHTML =
      '<input type="text" class="dish-name" placeholder="菜名" value="' +
      (name || "") +
      '">' +
      '<input type="number" class="dish-price" placeholder="价格" min="0" step="0.01" value="' +
      (price || "") +
      '">' +
      '<button type="button" class="btn-remove" title="删除">×</button>';
    row.querySelector(".btn-remove").addEventListener("click", function () {
      var all = getDishesFromDOM();
      all.splice(idx, 1);
      if (all.length === 0) all.push({ name: "", price: "" });
      renderDishList(all);
    });
    return row;
  }

  function addDishRow() {
    var dishes = getDishesFromDOM();
    dishes.push({ name: "", price: "" });
    renderDishList(dishes);
  }

  // ===== 收集菜单数据 =====
  function collectMenuData(tableLabel) {
    var dishes = getDishesFromDOM();
    var data = {
      n: els.restaurant.value.trim() || "我的餐厅",
      t: state.template,
      i: dishes.map(function (d) {
        return [d.name, parseFloat(d.price) || 0];
      }),
    };
    if (tableLabel) data.table = tableLabel;
    return data;
  }

  // ===== 菜单预览渲染 =====
  function renderPreview() {
    var data = collectMenuData();
    var tpl = data.t || "minimal";
    var html = '<div class="preview-' + tpl + '">';
    html += '<div class="menu-title">' + escapeHtml(data.n) + "</div>";

    if (tpl === "minimal") {
      html += '<div class="menu-subtitle">— 电子菜单 —</div>';
    }

    (data.i || []).forEach(function (item) {
      html +=
        '<div class="menu-item">' +
        "<span>" +
        escapeHtml(item[0]) +
        "</span>" +
        '<span class="menu-price">' +
        formatPrice(item[1]) +
        "</span></div>";
    });

    html += "</div>";
    els.preview.innerHTML = html;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== 二维码生成核心 =====
  var qrInstance = null;

  /**
   * 使用 qrcode.js 生成二维码，绘制到 canvas 并可选叠加 logo
   * @returns {Promise<HTMLCanvasElement>}
   */
  function createQRCanvas(menuData, size) {
    return new Promise(function (resolve) {
      var url = buildMenuUrl(menuData);
      els.qrHidden.innerHTML = "";

      qrInstance = new QRCode(els.qrHidden, {
        text: url,
        width: size,
        height: size,
        colorDark: state.colorDark,
        colorLight: state.colorLight,
        correctLevel: QRCode.CorrectLevel.H,
      });

      // qrcode.js 异步绘制 canvas，稍等再读取
      setTimeout(function () {
        var srcCanvas = els.qrHidden.querySelector("canvas");
        if (!srcCanvas) {
          resolve(null);
          return;
        }

        var outCanvas = document.createElement("canvas");
        outCanvas.width = size;
        outCanvas.height = size;
        var ctx = outCanvas.getContext("2d");

        ctx.drawImage(srcCanvas, 0, 0, size, size);

        drawLogoWatermark(ctx, size, state.logoDataUrl).then(function () {
          resolve(outCanvas);
        });
      }, 120);
    });
  }

  /** 在二维码中心绘制 logo（白色底 + 图片），返回 Promise */
  function drawLogoWatermark(ctx, size, logoUrl) {
    return new Promise(function (resolve) {
      if (!logoUrl) {
        resolve();
        return;
      }

      var logoSize = size * 0.22;
      var x = (size - logoSize) / 2;
      var y = (size - logoSize) / 2;
      var pad = logoSize * 0.12;

      ctx.fillStyle = "#ffffff";
      roundRect(ctx, x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, pad);
      ctx.fill();

      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, x, y, logoSize, logoSize);
        resolve();
      };
      img.onerror = resolve;
      img.src = logoUrl;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** 生成主二维码并显示 */
  function generateMainQR() {
    els.qrLoading.classList.add("show");

    createQRCanvas(collectMenuData(), state.qrSize).then(function (canvas) {
      els.qrLoading.classList.remove("show");
      if (!canvas) return;

      var displaySize = Math.min(280, state.qrSize);
      els.qrCanvas.width = displaySize;
      els.qrCanvas.height = displaySize;
      var ctx = els.qrCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, 0, displaySize, displaySize);

      // 保存高清版本供导出
      els.qrCanvas._hdCanvas = canvas;
    });
  }

  /** 导出 canvas 为 PNG 下载 */
  function downloadCanvas(canvas, filename) {
    var link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  /** 批量生成桌号二维码 */
  function generateTableQRs() {
    var start = parseInt(els.tableStart.value, 10) || 1;
    var end = parseInt(els.tableEnd.value, 10) || 5;
    var prefix = els.tablePrefix.value.trim() || "号桌";

    if (start > end) {
      showToast("起始桌号不能大于结束桌号");
      return;
    }
    if (end - start > 20) {
      showToast("单次最多生成 20 张桌号二维码");
      return;
    }

    els.tableQrGrid.innerHTML = "";
    els.qrLoading.classList.add("show");

    var promises = [];
    for (var i = start; i <= end; i++) {
      (function (num) {
        var label = num + prefix;
        promises.push(
          createQRCanvas(collectMenuData(label), 256).then(function (canvas) {
            return { label: label, canvas: canvas };
          })
        );
      })(i);
    }

    Promise.all(promises).then(function (results) {
      els.qrLoading.classList.remove("show");
      results.forEach(function (item) {
        if (!item.canvas) return;
        var wrap = document.createElement("div");
        wrap.className = "table-qr-item";

        var displayCanvas = document.createElement("canvas");
        displayCanvas.width = 140;
        displayCanvas.height = 140;
        displayCanvas.getContext("2d").drawImage(item.canvas, 0, 0, 140, 140);
        displayCanvas._hdCanvas = item.canvas;

        var labelEl = document.createElement("div");
        labelEl.className = "table-label";
        labelEl.textContent = item.label;

        var btn = document.createElement("button");
        btn.className = "btn btn-sm btn-outline";
        btn.textContent = "下载";
        btn.addEventListener("click", function () {
          downloadCanvas(item.canvas, "桌号-" + item.label + ".png");
        });

        wrap.appendChild(displayCanvas);
        wrap.appendChild(labelEl);
        wrap.appendChild(btn);
        els.tableQrGrid.appendChild(wrap);
      });

      showToast("已生成 " + results.length + " 张桌号二维码");
    });
  }

  /** 复制菜单文本 */
  function copyMenuText() {
    var text = formatMenuText(collectMenuData());
    navigator.clipboard.writeText(text).then(function () {
      showToast("菜单文本已复制到剪贴板");
    }).catch(function () {
      // 降级方案
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("菜单文本已复制到剪贴板");
    });
  }

  /** 加载预设菜单 */
  function loadPreset(key) {
    var preset = PRESETS[key];
    if (!preset) return;

    els.restaurant.value = preset.n;
    state.template = preset.t;
    updateTemplateSelection(preset.t);

    renderDishList(
      preset.i.map(function (item) {
        return { name: item[0], price: String(item[1]) };
      })
    );

    showToast("已加载「" + key + "」预设菜单");
  }

  function updateTemplateSelection(tpl) {
    state.template = tpl;
    els.templateCards.forEach(function (card) {
      card.classList.toggle("selected", card.dataset.template === tpl);
    });
  }

  // ===== 事件绑定 =====
  function bindEvents() {
    // 步骤按钮
    $("btnNext1").addEventListener("click", function () {
      if (!els.restaurant.value.trim()) {
        showToast("请输入餐厅名称");
        return;
      }
      var dishes = getDishesFromDOM();
      if (dishes.length === 0 || !dishes.some(function (d) { return d.name; })) {
        showToast("请至少添加一道菜品");
        return;
      }
      goToStep(2);
    });

    $("btnPrev2").addEventListener("click", function () { goToStep(1); });
    $("btnNext2").addEventListener("click", function () { goToStep(3); });
    $("btnPrev3").addEventListener("click", function () { goToStep(2); });

    // 添加菜品
    $("btnAddDish").addEventListener("click", addDishRow);

    // 模板选择
    els.templateCards.forEach(function (card) {
      card.addEventListener("click", function () {
        updateTemplateSelection(card.dataset.template);
      });
    });

    // 预设菜单
    document.querySelectorAll("[data-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        loadPreset(btn.dataset.preset);
      });
    });

    // 颜色选择
    els.colorDark.addEventListener("input", function () {
      state.colorDark = els.colorDark.value;
      if (currentStep === 3) generateMainQR();
    });
    els.colorLight.addEventListener("input", function () {
      state.colorLight = els.colorLight.value;
      if (currentStep === 3) generateMainQR();
    });

    // Logo 上传
    els.logoInput.addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showToast("请上传图片文件");
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        state.logoDataUrl = ev.target.result;
        els.logoPreview.src = state.logoDataUrl;
        els.logoPreview.classList.add("show");
        if (currentStep === 3) generateMainQR();
      };
      reader.readAsDataURL(file);
    });

    // 生成 / 导出
    $("btnRegenerate").addEventListener("click", generateMainQR);
    $("btnExportHD").addEventListener("click", function () {
      els.qrLoading.classList.add("show");
      // 重新生成 1024px 高清版以确保打印质量
      createQRCanvas(collectMenuData(), 1024).then(function (canvas) {
        els.qrLoading.classList.remove("show");
        if (!canvas) {
          showToast("导出失败，请重试");
          return;
        }
        var name = (els.restaurant.value.trim() || "菜单") + "-二维码.png";
        downloadCanvas(canvas, name);
        showToast("高清二维码已下载（1024×1024）");
      });
    });

    $("btnCopyText").addEventListener("click", copyMenuText);
    $("btnGenTables").addEventListener("click", generateTableQRs);
  }

  // ===== 初始化 =====
  function init() {
    initElements();
    bindEvents();
    renderDishList(state.dishes);
    updateTemplateSelection(state.template);
    goToStep(1);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
