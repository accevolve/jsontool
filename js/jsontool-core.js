/*!
 * jsontool-core.js — JsonTool.cn 纯逻辑层（无 DOM 依赖，可在 Node 中单测）
 * 提供：JSON 修复、去转义/转义、Unicode 互转、错误定位与中文化。
 * 大整数精度保真由 lossless-json 在渲染层处理，此处不重复。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JsonToolCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- 一键修复：包装 jsonrepair（显式调用，绝不自动改用户数据）----
  function repairJSON(text, repairFn) {
    repairFn = repairFn || (typeof JSONRepair !== 'undefined' && JSONRepair.jsonrepair);
    if (typeof repairFn !== 'function') throw new Error('jsonrepair 未加载');
    return repairFn(String(text));
  }

  // ---- 去转义：把"被转义的 JSON 文本"还原一层 ----
  // 例：{\"name\":\"张三\"}  ->  {"name":"张三"}
  function unescapeJSONString(text) {
    var t = String(text).trim();
    // 情况1：整体是带引号的 JSON 字符串字面量
    if (t.length >= 2 && t.charAt(0) === '"' && t.charAt(t.length - 1) === '"') {
      try { return JSON.parse(t); } catch (e) { /* fall through */ }
    }
    // 情况2：裸的转义内容 → 包引号后按 JSON 字符串解析
    try { return JSON.parse('"' + t + '"'); } catch (e) { /* fall through */ }
    // 退化：手工替换常见转义序列
    return t.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
            .replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/\\\\/g, '\\');
  }

  // ---- 转义：把当前文本转义为可嵌入 JSON 字符串的内容（不含外层引号）----
  function escapeJSONString(text) {
    var s = JSON.stringify(String(text));
    return s.substring(1, s.length - 1);
  }

  // ---- Unicode：\uXXXX -> 中文 ----
  function unicodeDecode(text) {
    return String(text).replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) {
      return String.fromCharCode(parseInt(h, 16));
    });
  }

  // ---- Unicode：非 ASCII 字符 -> \uXXXX ----
  function unicodeEncode(text) {
    return String(text).replace(/[\u0080-\uffff]/g, function (c) {
      return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  // ---- 错误定位与中文化：返回 {line, col, hint, raw, lineText, caret} ----
  function analyzeError(text, err) {
    var raw = (err && err.message) ? err.message : String(err);
    text = String(text);
    var pos = null, line = null, col = null;

    // 来源1：原生 JSON.parse「at position N」（旧版浏览器）→ 由 position 反算行列
    var mPos = /position\s+(\d+)/i.exec(raw);
    if (mPos) {
      pos = parseInt(mPos[1], 10);
      var before = text.slice(0, pos);
      line = (before.match(/\n/g) || []).length + 1;
      col = pos - before.lastIndexOf('\n'); // 1-based
    }
    // 来源2：jsonlint「Parse error on line N」/ 通用「line N」
    if (line == null) {
      var mLine = /line\s+(\d+)/i.exec(raw);
      if (mLine) line = parseInt(mLine[1], 10);
    }
    // 列号：显式 column N；否则取 jsonlint 插入符「----^」的位置
    if (col == null) {
      var mCol = /column\s+(\d+)/i.exec(raw);
      if (mCol) col = parseInt(mCol[1], 10);
      else {
        var mCaret = /\n([ \t\-]*)\^/.exec(raw);
        if (mCaret) col = mCaret[1].length + 1;
      }
    }

    // 出错行原文 + 插入位置指示
    var lineText = null, caret = null;
    if (line != null) {
      var lines = text.split('\n');
      lineText = lines[line - 1];
      if (lineText != null && col != null && col >= 1) {
        caret = new Array(col).join(' ') + '^';
      }
    }

    return {
      line: line, col: col, raw: raw,
      hint: chineseHint(raw),
      lineText: lineText, caret: caret
    };
  }

  // 把常见英文报错翻成中文提示（永远保留原始 raw 作兜底）
  function chineseHint(raw) {
    var r = String(raw);
    // jsonrepair 常见报错
    if (/Object key expected/i.test(r)) return '此处应是对象的键名（键与冒号之间可能有多余字符）';
    if (/Colon expected/i.test(r)) return '此处缺少冒号（:）';
    if (/Comma expected/i.test(r)) return '此处缺少逗号（,）';
    if (/Quoted string expected/i.test(r)) return '此处应是带双引号的字符串';
    if (/Value expected/i.test(r)) return '此处缺少值';
    if (/Unexpected character/i.test(r)) return '出现无法识别的意外字符';
    // 原生 JSON.parse / jsonlint 报错
    if (/Unexpected end of (JSON|input|data)/i.test(r) || /end of the JSON/i.test(r))
      return 'JSON 意外结束，可能缺少右括号、右花括号或闭合引号';
    if (/Unexpected (token|string|number|non-whitespace)/i.test(r))
      return '出现意外的字符或符号，常见原因：多余逗号、缺少逗号、引号不匹配';
    if (/single quote/i.test(r))
      return 'JSON 不允许使用单引号，请改用双引号';
    if (/duplicate key/i.test(r))
      return '存在重复的键名';
    if (/Expecting/i.test(r))
      return '此处不符合 JSON 语法：' + r;
    return r; // 无匹配则原样返回，保证信息不丢失
  }

  return {
    repairJSON: repairJSON,
    unescapeJSONString: unescapeJSONString,
    escapeJSONString: escapeJSONString,
    unicodeDecode: unicodeDecode,
    unicodeEncode: unicodeEncode,
    analyzeError: analyzeError,
    chineseHint: chineseHint
  };
}));
