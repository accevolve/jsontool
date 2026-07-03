/*!
 * jsontool.js — JsonTool.cn 交互增强层（DOM 接线）
 * 依赖：jQuery, JSONFormat(jquery.json.js), xml2json/json2xml, jsonlint,
 *       LosslessJSON, JSONRepair, JsonToolCore, ClipboardJS, toastr
 * 原则：完全复刻原有行为（格式化/压缩/转XML/复制/清空/折叠），增强为 additive；
 *       任何增强依赖缺失时自动降级回原能力，绝不致页面报错。
 */
(function () {
  'use strict';
  var $ = window.jQuery;
  if (!$) return;

  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  $(function () {
    var $src = $('#json-src');
    var $target = $('#json-target');
    if (!$src.length || !$target.length) return; // 非工具页不启用

    var Core = window.JsonToolCore;
    var hasLossless = (typeof LosslessJSON !== 'undefined' && LosslessJSON.parse);
    var hasLint = (typeof jsonlint !== 'undefined');
    var LS_KEY = 'jsontool:last';

    var current_json = '';      // 供「转 XML」使用（保持原 jsonlint 解析）
    var current_json_str = '';  // 「压缩」串（大整数保真）
    var xml_flag = false, zip_flag = false;

    function resetToggles() {
      xml_flag = false; zip_flag = false;
      $('.xml, .zip').removeClass('is-active');
    }

    // ---- 错误展示（行列 + 中文提示 + 出错行）----
    function showError(content, err) {
      if (!Core) { $target.html('<span style="color:#f1592a;font-weight:bold;">' + esc(err && err.message || err) + '</span>'); return; }
      var info = Core.analyzeError(content, err);
      var html = '<div style="color:#f1592a;font-weight:bold;">解析错误</div>';
      if (info.line != null) {
        html += '<div style="color:#666;margin-top:6px;">位置：第 ' + info.line + ' 行'
              + (info.col != null ? '，第 ' + info.col + ' 列' : '') + '</div>';
      }
      if (info.hint) html += '<div style="color:#333;margin-top:6px;">' + esc(info.hint) + '</div>';
      if (info.lineText != null) {
        html += '<pre style="margin-top:8px;background:#fafafa;border:1px solid #eee;padding:8px;overflow:auto;'
              + 'font-family:monospace;white-space:pre;"><code>' + esc(info.lineText)
              + (info.caret ? '\n' + esc(info.caret) : '') + '</code></pre>';
      }
      $target.html(html);
    }

    // ---- 核心渲染管线（复刻原逻辑 + 大整数保真 + 错误增强）----
    function render() {
      resetToggles();
      var content = String($src.val()).trim();
      if (content === '') { $target.html(''); return; }

      // XML → JSON（与原逻辑一致）
      if (content.charAt(0) === '<' && content.charAt(content.length - 1) === '>') {
        try {
          content = JSON.stringify($.xml2json(content));
        } catch (e) {
          $target.html('解析错误：<span style="color:#f1592a;font-weight:bold;">' + esc(e.message) + '</span>');
          return;
        }
      }

      try {
        if (hasLint) current_json = jsonlint.parse(content);   // 供转 XML（保持原行为）
        else current_json = JSON.parse(content);
        current_json_str = hasLossless                          // 压缩串：大整数保真
          ? LosslessJSON.stringify(LosslessJSON.parse(content))
          : JSON.stringify(current_json);
        $target.html(new JSONFormat(content, 4).toString());    // 渲染：大整数保真
      } catch (e) {
        showError(content, e);
      }
    }

    var renderDebounced = debounce(render, 200);
    var saveDebounced = debounce(save, 500);
    function onInput() { renderDebounced(); saveDebounced(); }

    // ---- 现有按钮：复刻原行为 ----
    $('.zip').on('click', function (e) {
      e && e.preventDefault();
      if (zip_flag) { render(); }
      else { $target.text(current_json_str); zip_flag = true; $(this).addClass('is-active'); }
    });

    $('.xml').on('click', function (e) {
      e && e.preventDefault();
      if (xml_flag) { render(); return; }
      try {
        var result = $.json2xml(current_json);
        $target.html('<textarea style="width:100%;height:100%;border:0;resize:none;">' + esc(result) + '</textarea>');
        xml_flag = true; $(this).addClass('is-active');
      } catch (e2) { if (window.toastr) toastr.error('转换失败'); }
    });

    if (typeof ClipboardJS !== 'undefined') {
      var clipboard = new ClipboardJS('.copy');
      clipboard.on('success', function (e) { if (window.toastr) { toastr.options.timeOut = 30; toastr.success('已复制'); } e.clearSelection(); });
      clipboard.on('error', function () { if (window.toastr) { toastr.options.timeOut = 30; toastr.error('复制失败'); } });
    }

    $('.clear').on('click', function (e) { e && e.preventDefault(); $src.val(''); $target.html(''); save(); });

    // ---- 新增：文本转换按钮 ----
    function getInput() { return $src.val(); }
    function setInput(v) { $src.val(v); }
    // 满铺只读文本框：用于无法美化的纯文本结果（如转义串），不塌缩面板
    function showRaw(text) {
      resetToggles();
      $target.html('<textarea readonly style="width:100%;height:100%;border:0;resize:none;outline:none;font-family:monospace;"></textarea>');
      $target.find('textarea').val(text);
    }
    function isJSON(t) {
      t = String(t).trim(); if (t === '') return false;
      try { (hasLossless ? LosslessJSON.parse : JSON.parse)(t); return true; } catch (e) { return false; }
    }
    // 统一转换：改写输入并保持右侧"美化"——结果是合法 JSON 则渲染美化树，否则满铺文本框展示，绝不塌缩；
    // 失败时给出中文 + 行列定位的提示（如 jsonrepair 遇到有歧义、无法安全修复的损坏）
    function transform(fn, label) {
      try {
        var out = fn(getInput());
        setInput(out); save();
        if (String(out).trim() === '') $target.html('');
        else if (isJSON(out)) render();
        else showRaw(out);
      } catch (e) {
        var info = (Core && Core.analyzeError) ? Core.analyzeError(getInput(), e) : { raw: (e && e.message) || e };
        var loc = info.line != null ? ('（第 ' + info.line + ' 行' + (info.col != null ? ' 第 ' + info.col + ' 列' : '') + '附近）') : '';
        var hint = info.hint || info.raw;
        if (window.toastr) toastr.error((label || '操作') + '失败' + loc + (hint ? '：' + hint : ''));
      }
    }

    if (Core) {
      $('.repair').on('click', function (e) { e && e.preventDefault(); transform(function (t) { return Core.repairJSON(t); }, '修复'); });
      $('.unescape').on('click', function (e) { e && e.preventDefault(); transform(function (t) { return Core.unescapeJSONString(t); }, '去转义'); });
      $('.escape').on('click', function (e) { e && e.preventDefault(); transform(function (t) { return Core.escapeJSONString(t); }, '转义'); });
      $('.uni-decode').on('click', function (e) { e && e.preventDefault(); transform(function (t) { return Core.unicodeDecode(t); }, 'Unicode 解码'); });
      $('.uni-encode').on('click', function (e) { e && e.preventDefault(); transform(function (t) { return Core.unicodeEncode(t); }, 'Unicode 编码'); });
    }

    // ---- 新增：输出区文本搜索 + 高亮 ----
    var $search = $('#json-search');
    if ($search.length) {
      $search.on('input', debounce(function () { doSearch($search.val()); }, 200));
    }

    // ---- 「转换」下拉：点击开合，点其他任意处关闭 ----
    var $dd = $('.jt-dropdown');
    if ($dd.length) {
      $dd.find('.jt-dropdown-toggle').on('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var open = $dd.toggleClass('open').hasClass('open');
        $(this).attr('aria-expanded', open ? 'true' : 'false');
      });
      $(document).on('click', function () {
        if ($dd.hasClass('open')) { $dd.removeClass('open').find('.jt-dropdown-toggle').attr('aria-expanded', 'false'); }
      });
    }
    function clearHighlights() {
      var marks = $target[0] ? $target[0].querySelectorAll('mark.jt-hit') : [];
      for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
      }
      if ($target[0] && $target[0].normalize) $target[0].normalize();
    }
    function doSearch(q) {
      clearHighlights();
      var root = $target[0];
      if (!q || !root) return;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      var ql = q.toLowerCase();
      nodes.forEach(function (node) {
        var text = node.nodeValue, lower = text.toLowerCase(), idx = lower.indexOf(ql);
        if (idx < 0) return;
        var frag = document.createDocumentFragment(), last = 0;
        while (idx >= 0) {
          if (idx > last) frag.appendChild(document.createTextNode(text.slice(last, idx)));
          var mark = document.createElement('mark');
          mark.className = 'jt-hit'; mark.style.background = '#ffe58f';
          mark.textContent = text.slice(idx, idx + q.length);
          frag.appendChild(mark);
          last = idx + q.length; idx = lower.indexOf(ql, last);
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
    }

    // ---- 新增：本地持久化（仅本机，不外传）----
    function save() { try { localStorage.setItem(LS_KEY, $src.val()); } catch (e) {} }
    function restore() {
      try { var v = localStorage.getItem(LS_KEY); if (v != null && v !== '') $src.val(v); } catch (e) {}
    }

    // ---- 初始化 ----
    restore();
    render();                               // 立即渲染一次（恢复内容或默认示例）
    $src.on('input', onInput);              // input 比 keyup 更全（覆盖粘贴/剪切）
  });
})();
