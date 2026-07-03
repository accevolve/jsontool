/*!
 * jQuery Json Plugin (with Transition Definitions)
 * Examples and documentation at: http://json.cn/
 * Copyright (c) 2012-2013  China.Ren.
 * Version: 1.0.2 (19-OCT-2013)
 * Dual licensed under the MIT and GPL licenses.
 * http://jquery.malsup.com/license.html
 * Requires: jQuery v1.3.1 or later
 *
 * 2026 改造：美化展示改为「源码保真」。
 *   不再先解析成对象树再格式化（那会把 >→>、\n→换行 等解码丢失），
 *   而是直接扫描源文本，只重排缩进/着色/折叠——双引号内的内容逐字保留，
 *   >、\n、\t、\uXXXX、&nbsp;、<h1> 等一律「原样」显示。
 *   数字沿用大整数保真（超安全范围保留原始串，安全范围归一化）。
 *   输入在渲染前已由 jsonlint / LosslessJSON 校验为合法 JSON，此处可假定合法。
 */
var JSONFormat = (function(){

    // HTML 转义：& 必须最先替换，否则会把后续替换生成的实体二次转义。
    // 让字符串内容原样显示而非被浏览器当实体/标签解析；" 一并转义，防止 http 自动链接越出 href 属性。
    function _escape_html(str){
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function indent_tab(indent_count){
        return (new Array(indent_count + 1)).join('&nbsp;&nbsp;&nbsp;&nbsp;');
    }

    function _format_number(raw){
        var s;
        if (typeof LosslessJSON !== 'undefined' && LosslessJSON.isSafeNumber) {
            // 安全范围内归一化显示；超安全范围（大整数/高精度小数）保留原始串，避免精度丢失
            s = LosslessJSON.isSafeNumber(raw) ? String(Number(raw)) : raw;
        } else {
            s = raw;
        }
        return '<span class="json_number">' + s + '</span>';
    }

    function _format_string(raw){
        // raw 是双引号之间的「源码原文」（转义序列如 >、\n 均逐字保留）
        var is_url = 0 <= raw.search(/^http/);
        var esc = _escape_html(raw);
        if (is_url) {
            esc = '<a href="' + esc + '" target="_blank" rel="noopener" class="json_link">' + esc + '</a>';
        }
        return '<span class="json_string">"' + esc + '"</span>';
    }

    // 源码保真美化器：逐字符扫描合法 JSON 源文本，输出带缩进/着色/折叠的 HTML
    function _Formatter(text){
        this.s = String(text);
        this.i = 0;
        this.n = this.s.length;
    }
    _Formatter.prototype = {
        ws: function(){
            var s = this.s;
            while(this.i < this.n){
                var c = s.charAt(this.i);
                if(c === ' ' || c === '\t' || c === '\n' || c === '\r') this.i++;
                else break;
            }
        },
        // 读取一个字符串字面量，返回双引号之间的原始内容（不解码）。
        // 遇到 \ 跳过其后一个字符，避免把 \" 误判为结束引号。
        readStringRaw: function(){
            var s = this.s, start = this.i;
            this.i++; // 跳过开引号
            while(this.i < this.n){
                var c = s.charAt(this.i);
                if(c === '\\'){ this.i += 2; continue; }
                if(c === '"'){ this.i++; break; }
                this.i++;
            }
            return s.slice(start + 1, this.i - 1);
        },
        // 读取 number / true / false / null 的原始文本
        readLiteral: function(){
            var s = this.s, start = this.i;
            while(this.i < this.n){
                var c = s.charAt(this.i);
                if(c === ',' || c === ']' || c === '}' || c === ' ' || c === '\t' || c === '\n' || c === '\r') break;
                this.i++;
            }
            return s.slice(start, this.i);
        },
        value: function(indent){
            this.ws();
            var c = this.s.charAt(this.i);
            if(c === '{') return this.object(indent);
            if(c === '[') return this.array(indent);
            if(c === '"') return _format_string(this.readStringRaw());
            var tok = this.readLiteral();
            if(tok === 'true' || tok === 'false') return '<span class="json_boolean">' + tok + '</span>';
            if(tok === 'null') return '<span class="json_null">null</span>';
            return _format_number(tok);
        },
        array: function(indent){
            this.i++; // 跳过 [
            var parts = [];
            this.ws();
            if(this.s.charAt(this.i) === ']'){
                this.i++;
            } else {
                while(true){
                    this.ws();
                    parts.push(indent_tab(indent) + this.value(indent + 1));
                    this.ws();
                    var c = this.s.charAt(this.i++);
                    if(c === ',') continue;
                    break; // ] 或异常均结束
                }
            }
            return '<span data-type="array" data-size="' + parts.length + '"><i  style="cursor:pointer;" class="fa fa-minus-square-o" onclick="hide(this)"></i>[<br/>'
                + parts.join(',<br/>')
                + '<br/>' + indent_tab(indent - 1) + ']</span>';
        },
        object: function(indent){
            this.i++; // 跳过 {
            var parts = [];
            this.ws();
            if(this.s.charAt(this.i) === '}'){
                this.i++;
            } else {
                while(true){
                    this.ws();
                    var keyRaw = this.readStringRaw();
                    this.ws();
                    this.i++; // 跳过 :
                    var val = this.value(indent + 1);
                    parts.push(indent_tab(indent) + '<span class="json_key">"' + _escape_html(keyRaw) + '"</span>:' + val);
                    this.ws();
                    var c = this.s.charAt(this.i++);
                    if(c === ',') continue;
                    break; // } 或异常均结束
                }
            }
            return '<span  data-type="object"><i  style="cursor:pointer;" class="fa fa-minus-square-o" onclick="hide(this)"></i>{<br/>'
                + parts.join(',<br/>')
                + '<br/>' + indent_tab(indent - 1) + '}</span>';
        }
    };

    function loadCssString(){
        var style = document.createElement('style');
        style.type = 'text/css';
        var code = Array.prototype.slice.apply(arguments).join('');
        try{
            style.appendChild(document.createTextNode(code));
        }catch(ex){
            style.styleSheet.cssText = code;
        }
        document.getElementsByTagName('head')[0].appendChild(style);
    }

    loadCssString(
        '.json_key{ color: #92278f;font-weight:bold;}',
        '.json_null{color: #f1592a;font-weight:bold;}',
        '.json_string{ color: #3ab54a;font-weight:bold;}',
        '.json_number{ color: #25aae2;font-weight:bold;}',
        '.json_link{ color: #717171;font-weight:bold;}',
        '.json_array_brackets{}');

    var _JSONFormat = function(origin_data){
        // 保留源文本，渲染时逐字符扫描（不再预解析，以实现源码保真）
        this.origin = origin_data;
    };

    _JSONFormat.prototype = {
        constructor : _JSONFormat,
        toString : function(){
            return new _Formatter(this.origin).value(1);
        }
    }

    return _JSONFormat;

})();
var last_html = '';
function hide(obj){
    var data_type = obj.parentNode.getAttribute('data-type');
    var data_size = obj.parentNode.getAttribute('data-size');
    obj.parentNode.setAttribute('data-inner',obj.parentNode.innerHTML);
    if (data_type === 'array') {
        obj.parentNode.innerHTML = '<i  style="cursor:pointer;" class="fa fa-plus-square-o" onclick="show(this)"></i>Array[<span class="json_number">' + data_size + '</span>]';
    }else{
        obj.parentNode.innerHTML = '<i  style="cursor:pointer;" class="fa fa-plus-square-o" onclick="show(this)"></i>Object{...}';
    }

}

function show(obj){
    var innerHtml = obj.parentNode.getAttribute('data-inner');
    obj.parentNode.innerHTML = innerHtml;
}
