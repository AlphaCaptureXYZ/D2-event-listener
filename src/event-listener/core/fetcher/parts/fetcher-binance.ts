import 'isomorphic-fetch';

import { FetcherSource } from "src/event-listener/interfaces/shared.i";
import { LitModule } from "../../../modules/lit.module";

type EnvType = 'demo' | 'prod';

const binanceUrlSelector = {
    demo: 'https://testnet.binance.vision/api',
    prod: 'https://api.binance.com/api',
};

const objectToQueryString = (obj) => {
    return Object.keys(obj)
        .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
        .join('&');
};

class JHash {
    'use strict';

    /*
    * Configurable variables. You may need to tweak these to be compatible with
    * the server-side, but the defaults work in most cases.
    */
    static hexcase = 0;  // hex output format. 0 - lowercase; 1 - uppercase
    static b64pad = ""; // base-64 pad character. "=" for strict RFC compliance

    /*!
    * Functions shared by multiple hashing libraries.
    */

    /*
    * Convert a raw string to a hex string.
    */
    static rstr2hex(input) {
        try { this.hexcase } catch (e) { this.hexcase = 0; }
        var hex_tab = this.hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var output = "";
        var x;
        for (var i = 0; i < input.length; i++) {
            x = input.charCodeAt(i);
            output += hex_tab.charAt((x >>> 4) & 0x0F)
                + hex_tab.charAt(x & 0x0F);
        }
        return output;
    }

    /*
    * Convert a raw string to a base-64 string.
    */
    static rstr2b64(input) {
        try { this.b64pad } catch (e) { this.b64pad = ''; }
        var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var output = "";
        var len = input.length;
        for (var i = 0; i < len; i += 3) {
            var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i + 1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i + 2) : 0);
            for (var j = 0; j < 4; j++) {
                if (i * 8 + j * 6 > input.length * 8) {
                    output += this.b64pad;
                } else {
                    output += tab.charAt((triplet >>> 6 * (3 - j)) & 0x3F);
                }
            }
        }
        return output;
    }

    /*
    * Convert a raw string to an arbitrary string encoding.
    */
    static rstr2any(input, encoding) {
        var divisor = encoding.length;
        var i, j, q, x, quotient;

        // Convert to an array of 16-bit big-endian values, forming the dividend.
        var dividend = Array(Math.ceil(input.length / 2));
        for (i = 0; i < dividend.length; i++) {
            dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
        }

        /*
        * Repeatedly perform a long division. The binary array forms the dividend,
        * the length of the encoding is the divisor. Once computed, the quotient
        * forms the dividend for the next step. All remainders are stored for later use.
        */
        var full_length = Math.ceil(input.length * 8 / (Math.log(encoding.length) / Math.log(2)));
        var remainders = Array(full_length);
        for (j = 0; j < full_length; j++) {
            quotient = Array();
            x = 0;
            for (i = 0; i < dividend.length; i++) {
                x = (x << 16) + dividend[i];
                q = Math.floor(x / divisor);
                x -= q * divisor;
                if (quotient.length > 0 || q > 0) {
                    quotient[quotient.length] = q;
                }
            }
            remainders[j] = x;
            dividend = quotient;
        }

        // Convert the remainders to the output string.
        var output = "";
        for (i = remainders.length - 1; i >= 0; i--) {
            output += encoding.charAt(remainders[i]);
        }

        return output;
    }

    /*
    * Encode a string as utf-8.
    * For efficiency, this assumes the input is valid utf-16.
    */
    static str2rstr_utf8(input) {
        var output = "";
        var i = -1;
        var x, y;

        while (++i < input.length) {
            // Decode utf-16 surrogate pairs
            x = input.charCodeAt(i);
            y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
            if (0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
                x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
                i++;
            }

            // Encode output as utf-8
            if (x <= 0x7F) {
                output += String.fromCharCode(x);
            } else if (x <= 0x7FF) {
                output += String.fromCharCode(0xC0 | ((x >>> 6) & 0x1F),
                    0x80 | (x & 0x3F));
            } else if (x <= 0xFFFF) {
                output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                    0x80 | ((x >>> 6) & 0x3F),
                    0x80 | (x & 0x3F));
            } else if (x <= 0x1FFFFF) {
                output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                    0x80 | ((x >>> 12) & 0x3F),
                    0x80 | ((x >>> 6) & 0x3F),
                    0x80 | (x & 0x3F));
            }
        }
        return output;
    }

    /*
    * Encode a string as utf-16.
    */
    static str2rstr_utf16le(input) {
        var output = "";
        for (var i = 0; i < input.length; i++) {
            output += String.fromCharCode(input.charCodeAt(i) & 0xFF,
                (input.charCodeAt(i) >>> 8) & 0xFF);
        }
        return output;
    }

    static str2rstr_utf16be(input) {
        var output = "";
        for (var i = 0; i < input.length; i++) {
            output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                input.charCodeAt(i) & 0xFF);
        }
        return output;
    }

    /*
    * Convert a raw string to an array of little-endian words.
    * Characters >255 have their high-byte silently ignored.
    */
    static rstr2binl(input) {
        var output = Array(input.length >> 2);
        for (var i = 0; i < output.length; i++) {
            output[i] = 0;
        }
        for (var i = 0; i < input.length * 8; i += 8) {
            output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
        }
        return output;
    }

    /*
    * Convert an array of little-endian words to a string.
    */
    static binl2rstr(input) {
        var output = "";
        for (var i = 0; i < input.length * 32; i += 8) {
            output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
        }
        return output;
    }

    /*
    * Convert a raw string to an array of big-endian words.
    * Characters >255 have their high-byte silently ignored.
    */
    static rstr2binb(input) {
        var output = Array(input.length >> 2);
        for (var i = 0; i < output.length; i++) {
            output[i] = 0;
        }
        for (var i = 0; i < input.length * 8; i += 8) {
            output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
        }
        return output;
    }

    /*
    * Convert an array of big-endian words to a string.
    */
    static binb2rstr(input) {
        var output = "";
        for (var i = 0; i < input.length * 32; i += 8) {
            output += String.fromCharCode((input[i >> 5] >>> (24 - i % 32)) & 0xFF);
        }
        return output;
    }

    /*
    * Add integers, wrapping at 2^32. This uses 16-bit operations internally
    * to work around bugs in some JS interpreters.
    */
    static safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    /*
    * Bitwise rotate a 32-bit number to the left.
    */
    static bit_rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }

    /*
    * A constructor for 64-bit numbers.
    */
    static int64(h, l) {
        function int64(h, l) {
            this.h = h;
            this.l = l;
            // this.toString = this.int64toString;
        }
        return new int64(h, l);
    }

    /*
    * Copies src into dst, assuming both are 64-bit numbers.
    */
    static int64copy(dst, src) {
        dst.h = src.h;
        dst.l = src.l;
    }

    /*
    * Right-rotates a 64-bit number by shift.
    * Won't handle cases of shift>=32.
    * The static revrrot() is for that.
    */
    static int64rrot(dst, x, shift) {
        dst.l = (x.l >>> shift) | (x.h << (32 - shift));
        dst.h = (x.h >>> shift) | (x.l << (32 - shift));
    }

    /*
    * Reverses the dwords of the source and then rotates right by shift.
    * This is equivalent to rotation by 32+shift.
    */
    static int64revrrot(dst, x, shift) {
        dst.l = (x.h >>> shift) | (x.l << (32 - shift));
        dst.h = (x.l >>> shift) | (x.h << (32 - shift));
    }

    /*
    * Bitwise-shifts right a 64-bit number by shift.
    * Won't handle shift>=32, but it's never needed in SHA512.
    */
    static int64shr(dst, x, shift) {
        dst.l = (x.l >>> shift) | (x.h << (32 - shift));
        dst.h = (x.h >>> shift);
    }

    /*
    * Adds two 64-bit numbers.
    * Like the original implementation, does not rely on 32-bit operations.
    */
    static int64add(dst, x, y) {
        var w0 = (x.l & 0xffff) + (y.l & 0xffff);
        var w1 = (x.l >>> 16) + (y.l >>> 16) + (w0 >>> 16);
        var w2 = (x.h & 0xffff) + (y.h & 0xffff) + (w1 >>> 16);
        var w3 = (x.h >>> 16) + (y.h >>> 16) + (w2 >>> 16);
        dst.l = (w0 & 0xffff) | (w1 << 16);
        dst.h = (w2 & 0xffff) | (w3 << 16);
    }

    /*
    * Same, except with 4 addends. Works faster than adding them one by one.
    */
    static int64add4(dst, a, b, c, d) {
        var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff);
        var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (w0 >>> 16);
        var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (w1 >>> 16);
        var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (w2 >>> 16);
        dst.l = (w0 & 0xffff) | (w1 << 16);
        dst.h = (w2 & 0xffff) | (w3 << 16);
    }

    /*
    * Same, except with 5 addends.
    */
    static int64add5(dst, a, b, c, d, e) {
        var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff) + (e.l & 0xffff);
        var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (e.l >>> 16) + (w0 >>> 16);
        var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (e.h & 0xffff) + (w1 >>> 16);
        var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (e.h >>> 16) + (w2 >>> 16);
        dst.l = (w0 & 0xffff) | (w1 << 16);
        dst.h = (w2 & 0xffff) | (w3 << 16);
    }

    /*!
    * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
    * Digest Algorithm, as defined in RFC 1321.
    * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
    * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
    * Distributed under the BSD License
    * See http://pajhome.org.uk/crypt/md5 for more info.
    */

    /*
    * These are the functions you'll usually want to call.
    * They take string arguments and return either hex or base-64 encoded strings.
    */
    static hex_md5(s) { return this.rstr2hex(this.rstr_md5(this.str2rstr_utf8(s))); }
    static b64_md5(s) { return this.rstr2b64(this.rstr_md5(this.str2rstr_utf8(s))); }
    static any_md5(s, e) { return this.rstr2any(this.rstr_md5(this.str2rstr_utf8(s)), e); }
    static hex_hmac_md5(k, d) { return this.rstr2hex(this.rstr_hmac_md5(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
    static b64_hmac_md5(k, d) { return this.rstr2b64(this.rstr_hmac_md5(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
    static any_hmac_md5(k, d, e) { return this.rstr2any(this.rstr_hmac_md5(this.str2rstr_utf8(k), this.str2rstr_utf8(d)), e); }


    /*
    * Perform a simple self-test to see if the VM is working.
    */
    static md5_vm_test() {
        return this.hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
    }


    /*
    * Calculate the MD5 of a raw string.
    */
    static rstr_md5(s) {
        return this.binl2rstr(this.binl_md5(this.rstr2binl(s), s.length * 8));
    }

    /*
    * Calculate the HMAC-MD5, of a key and some data (raw strings).
    */
    static rstr_hmac_md5(key, data) {
        var bkey = this.rstr2binl(key);
        if (bkey.length > 16) {
            bkey = this.binl_md5(bkey, key.length * 8);
        }

        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        var hash = this.binl_md5(ipad.concat(this.rstr2binl(data)), 512 + data.length * 8);
        return this.binl2rstr(this.binl_md5(opad.concat(hash), 512 + 128));
    }

    /*
    * Calculate the MD5 of an array of little-endian words, and a bit length.
    */
    static binl_md5(x, len) {
        // Append padding
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var a = 1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d = 271733878;

        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;

            a = this.md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
            d = this.md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
            c = this.md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
            b = this.md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
            a = this.md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
            d = this.md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
            c = this.md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
            b = this.md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
            a = this.md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
            d = this.md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
            c = this.md5_ff(c, d, a, b, x[i + 10], 17, -42063);
            b = this.md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = this.md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
            d = this.md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = this.md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = this.md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);

            a = this.md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
            d = this.md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
            c = this.md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
            b = this.md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
            a = this.md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
            d = this.md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
            c = this.md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = this.md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
            a = this.md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
            d = this.md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
            c = this.md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
            b = this.md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
            a = this.md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
            d = this.md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
            c = this.md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
            b = this.md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

            a = this.md5_hh(a, b, c, d, x[i + 5], 4, -378558);
            d = this.md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
            c = this.md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
            b = this.md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = this.md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
            d = this.md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
            c = this.md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
            b = this.md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = this.md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
            d = this.md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
            c = this.md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
            b = this.md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
            a = this.md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
            d = this.md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = this.md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
            b = this.md5_hh(b, c, d, a, x[i + 2], 23, -995338651);

            a = this.md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
            d = this.md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
            c = this.md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = this.md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
            a = this.md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
            d = this.md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
            c = this.md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = this.md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
            a = this.md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
            d = this.md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = this.md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
            b = this.md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
            a = this.md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
            d = this.md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = this.md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
            b = this.md5_ii(b, c, d, a, x[i + 9], 21, -343485551);

            a = this.safe_add(a, olda);
            b = this.safe_add(b, oldb);
            c = this.safe_add(c, oldc);
            d = this.safe_add(d, oldd);
        }
        return Array(a, b, c, d);
    }


    /*
    * These functions implement the four basic operations the algorithm uses.
    */
    static md5_cmn(q, a, b, x, s, t) { return this.safe_add(this.bit_rol(this.safe_add(this.safe_add(a, q), this.safe_add(x, t)), s), b); }
    static md5_ff(a, b, c, d, x, s, t) { return this.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    static md5_gg(a, b, c, d, x, s, t) { return this.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    static md5_hh(a, b, c, d, x, s, t) { return this.md5_cmn(b ^ c ^ d, a, b, x, s, t); }
    static md5_ii(a, b, c, d, x, s, t) { return this.md5_cmn(c ^ (b | (~d)), a, b, x, s, t); }

    /*!
    * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
    * in FIPS 180-1
    * Version 2.2 Copyright Paul Johnston 2000 - 2009.
    * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
    * Distributed under the BSD License
    * See http://pajhome.org.uk/crypt/md5 for details.
    */

    /*
    * These are the functions you'll usually want to call.
    * They take string arguments and return either hex or base-64 encoded strings.
    */
    static hex_sha1(s) { return this.rstr2hex(this.rstr_sha1(this.str2rstr_utf8(s))); }
    static b64_sha1(s) { return this.rstr2b64(this.rstr_sha1(this.str2rstr_utf8(s))); }
    static any_sha1(s, e) { return this.rstr2any(this.rstr_sha1(this.str2rstr_utf8(s)), e); }
    static hex_hmac_sha1(k, d) { return this.rstr2hex(this.rstr_hmac_sha1(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
    static b64_hmac_sha1(k, d) { return this.rstr2b64(this.rstr_hmac_sha1(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
    static any_hmac_sha1(k, d, e) { return this.rstr2any(this.rstr_hmac_sha1(this.str2rstr_utf8(k), this.str2rstr_utf8(d)), e); }


    /*
    * Perform a simple self-test to see if the VM is working.
    */
    static sha1_vm_test() {
        return this.hex_sha1("abc").toLowerCase() == "a9993e364706816aba3e25717850c26c9cd0d89d";
    }


    /*
    * Calculate the SHA1 of a raw string.
    */
    static rstr_sha1(s) {
        return this.binb2rstr(this.binb_sha1(this.rstr2binb(s), s.length * 8));
    }


    /*
    * Calculate the HMAC-SHA1 of a key and some data (raw strings).
    */
    static rstr_hmac_sha1(key, data) {
        var bkey = this.rstr2binb(key);
        if (bkey.length > 16) {
            bkey = this.binb_sha1(bkey, key.length * 8);
        }

        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        var hash = this.binb_sha1(ipad.concat(this.rstr2binb(data)), 512 + data.length * 8);
        return this.binb2rstr(this.binb_sha1(opad.concat(hash), 512 + 160));
    }


    /*
    * Calculate the SHA-1 of an array of big-endian words, and a bit length.
    */
    static binb_sha1(x, len) {
        // Append padding
        x[len >> 5] |= 0x80 << (24 - len % 32);
        x[((len + 64 >> 9) << 4) + 15] = len;

        var w = Array(80);
        var a = 1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d = 271733878;
        var e = -1009589776;

        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;
            var olde = e;

            for (var j = 0; j < 80; j++) {
                if (j < 16) {
                    w[j] = x[i + j];
                } else {
                    w[j] = this.bit_rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
                }
                var t = this.safe_add(this.safe_add(this.bit_rol(a, 5), this.sha1_ft(j, b, c, d)), this.safe_add(this.safe_add(e, w[j]), this.sha1_kt(j)));
                e = d;
                d = c;
                c = this.bit_rol(b, 30);
                b = a;
                a = t;
            }

            a = this.safe_add(a, olda);
            b = this.safe_add(b, oldb);
            c = this.safe_add(c, oldc);
            d = this.safe_add(d, oldd);
            e = this.safe_add(e, olde);
        }
        return Array(a, b, c, d, e);

    }


    /*
    * Perform the appropriate triplet combination static for the current iteration.
    */
    static sha1_ft(t, b, c, d) {
        if (t < 20) { return (b & c) | ((~b) & d); }
        if (t < 40) { return b ^ c ^ d; }
        if (t < 60) { return (b & c) | (b & d) | (c & d); }
        return b ^ c ^ d;
    }


    /*
    * Determine the appropriate additive constant for the current iteration.
    */
    static sha1_kt(t) {
        return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
    }


    /*!
    * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
    * in FIPS 180-2
    * Version 2.2 Copyright Angel Marin, Paul Johnston 2000 - 2009.
    * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
    * Distributed under the BSD License
    * See http://pajhome.org.uk/crypt/md5 for details.
    * Also http://anmar.eu.org/projects/jssha2/
    */

    /*
    * These are the functions you'll usually want to call.
    * They take string arguments and return either hex or base-64 encoded strings.
    */
    static hex_sha256(s) { return this.rstr2hex(this.rstr_sha256(this.str2rstr_utf8(s))); }
    static b64_sha256(s) { return this.rstr2b64(this.rstr_sha256(this.str2rstr_utf8(s))); }
    static any_sha256(s, e) { return this.rstr2any(this.rstr_sha256(this.str2rstr_utf8(s)), e); }
    static hex_hmac_sha256(k, d) { return this.rstr2hex(this.rstr_hmac_sha256(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
    static b64_hmac_sha256(k, d) { return this.rstr2b64(this.rstr_hmac_sha256(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
    static any_hmac_sha256(k, d, e) { return this.rstr2any(this.rstr_hmac_sha256(this.str2rstr_utf8(k), this.str2rstr_utf8(d)), e); }


    /*
    * Perform a simple self-test to see if the VM is working.
    */
    static sha256_vm_test() {
        return this.hex_sha256("abc").toLowerCase() == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    }


    /*
    * Calculate the sha256 of a raw string.
    */
    static rstr_sha256(s) {
        return this.binb2rstr(this.binb_sha256(this.rstr2binb(s), s.length * 8));
    }


    /*
    * Calculate the HMAC-sha256 of a key and some data (raw strings).
    */
    static rstr_hmac_sha256(key, data) {
        var bkey = this.rstr2binb(key);
        if (bkey.length > 16) {
            bkey = this.binb_sha256(bkey, key.length * 8);
        }

        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        var hash = this.binb_sha256(ipad.concat(this.rstr2binb(data)), 512 + data.length * 8);
        return this.binb2rstr(this.binb_sha256(opad.concat(hash), 512 + 256));
    }


    /*
    * Main sha256 function, with its support functions.
    */
    static sha256_S(X, n) { return (X >>> n) | (X << (32 - n)); }
    static sha256_R(X, n) { return (X >>> n); }
    static sha256_Ch(x, y, z) { return ((x & y) ^ ((~x) & z)); }
    static sha256_Maj(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)); }
    static sha256_Sigma0256(x) { return (this.sha256_S(x, 2) ^ this.sha256_S(x, 13) ^ this.sha256_S(x, 22)); }
    static sha256_Sigma1256(x) { return (this.sha256_S(x, 6) ^ this.sha256_S(x, 11) ^ this.sha256_S(x, 25)); }
    static sha256_Gamma0256(x) { return (this.sha256_S(x, 7) ^ this.sha256_S(x, 18) ^ this.sha256_R(x, 3)); }
    static sha256_Gamma1256(x) { return (this.sha256_S(x, 17) ^ this.sha256_S(x, 19) ^ this.sha256_R(x, 10)); }
    static sha256_Sigma0512(x) { return (this.sha256_S(x, 28) ^ this.sha256_S(x, 34) ^ this.sha256_S(x, 39)); }
    static sha256_Sigma1512(x) { return (this.sha256_S(x, 14) ^ this.sha256_S(x, 18) ^ this.sha256_S(x, 41)); }
    static sha256_Gamma0512(x) { return (this.sha256_S(x, 1) ^ this.sha256_S(x, 8) ^ this.sha256_R(x, 7)); }
    static sha256_Gamma1512(x) { return (this.sha256_S(x, 19) ^ this.sha256_S(x, 61) ^ this.sha256_R(x, 6)); }

    static sha256_K = new Array(1116352408, 1899447441, -1245643825, -373957723, 961987163, 1508970993, -1841331548, -1424204075, -670586216, 310598401, 607225278, 1426881987, 1925078388, -2132889090, -1680079193, -1046744716, -459576895, -272742522, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, -1740746414, -1473132947, -1341970488, -1084653625, -958395405, -710438585, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, -2117940946, -1838011259, -1564481375, -1474664885, -1035236496, -949202525, -778901479, -694614492, -200395387, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, -2067236844, -1933114872, -1866530822, -1538233109, -1090935817, -965641998);

    static binb_sha256(m, l) {
        var HASH = new Array(1779033703, -1150833019, 1013904242, -1521486534, 1359893119, -1694144372, 528734635, 1541459225);
        var W = new Array(64);
        var a, b, c, d, e, f, g, h;
        var i, j, T1, T2;

        // Append padding
        m[l >> 5] |= 0x80 << (24 - l % 32);
        m[((l + 64 >> 9) << 4) + 15] = l;

        for (i = 0; i < m.length; i += 16) {
            a = HASH[0];
            b = HASH[1];
            c = HASH[2];
            d = HASH[3];
            e = HASH[4];
            f = HASH[5];
            g = HASH[6];
            h = HASH[7];

            for (j = 0; j < 64; j++) {
                if (j < 16) {
                    W[j] = m[j + i];
                } else {
                    W[j] = this.safe_add(this.safe_add(this.safe_add(this.sha256_Gamma1256(W[j - 2]), W[j - 7]), this.sha256_Gamma0256(W[j - 15])), W[j - 16]);
                }

                T1 = this.safe_add(this.safe_add(this.safe_add(this.safe_add(h, this.sha256_Sigma1256(e)), this.sha256_Ch(e, f, g)), this.sha256_K[j]), W[j]);
                T2 = this.safe_add(this.sha256_Sigma0256(a), this.sha256_Maj(a, b, c));
                h = g;
                g = f;
                f = e;
                e = this.safe_add(d, T1);
                d = c;
                c = b;
                b = a;
                a = this.safe_add(T1, T2);
            }

            HASH[0] = this.safe_add(a, HASH[0]);
            HASH[1] = this.safe_add(b, HASH[1]);
            HASH[2] = this.safe_add(c, HASH[2]);
            HASH[3] = this.safe_add(d, HASH[3]);
            HASH[4] = this.safe_add(e, HASH[4]);
            HASH[5] = this.safe_add(f, HASH[5]);
            HASH[6] = this.safe_add(g, HASH[6]);
            HASH[7] = this.safe_add(h, HASH[7]);
        }
        return HASH;
    }




    /*!
    * A JavaScript implementation of the Secure Hash Algorithm, SHA-512, as defined
    * in FIPS 180-2
    * Version 2.2 Copyright Anonymous Contributor, Paul Johnston 2000 - 2009.
    * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
    * Distributed under the BSD License
    * See http://pajhome.org.uk/crypt/md5 for details.
    */

    /*
    * These are the functions you'll usually want to call.
    * They take string arguments and return either hex or base-64 encoded strings.
    */
    static hex_sha512(s) { return this.rstr2hex(this.rstr_sha512(this.str2rstr_utf8(s))); }
    static b64_sha512(s) { return this.rstr2b64(this.rstr_sha512(this.str2rstr_utf8(s))); }
    static any_sha512(s, e) { return this.rstr2any(this.rstr_sha512(this.str2rstr_utf8(s)), e); }
    static hex_hmac_sha512(k, d) { return this.rstr2hex(this.rstr_hmac_sha512(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
    static b64_hmac_sha512(k, d) { return this.rstr2b64(this.rstr_hmac_sha512(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
    static any_hmac_sha512(k, d, e) { return this.rstr2any(this.rstr_hmac_sha512(this.str2rstr_utf8(k), this.str2rstr_utf8(d)), e); }


    /*
    * Perform a simple self-test to see if the VM is working.
    */
    static sha512_vm_test() {
        return this.hex_sha512("abc").toLowerCase() == "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" + "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f";
    }


    /*
    * Calculate the SHA-512 of a raw string.
    */
    static rstr_sha512(s) {
        return this.binb2rstr(this.binb_sha512(this.rstr2binb(s), s.length * 8));
    }


    /*
    * Calculate the HMAC-SHA-512 of a key and some data (raw strings).
    */
    static rstr_hmac_sha512(key, data) {
        var bkey = this.rstr2binb(key);
        if (bkey.length > 32) {
            bkey = this.binb_sha512(bkey, key.length * 8);
        }

        var ipad = Array(32), opad = Array(32);
        for (var i = 0; i < 32; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        var hash = this.binb_sha512(ipad.concat(this.rstr2binb(data)), 1024 + data.length * 8);
        return this.binb2rstr(this.binb_sha512(opad.concat(hash), 1024 + 512));
    }


    /*
    * Calculate the SHA-512 of an array of big-endian dwords, and a bit length.
    */
    static sha512_k;
    static binb_sha512(x, len) {
        if (this.sha512_k == undefined) {
            // SHA512 constants
            this.sha512_k = new Array(
                this.int64(0x428a2f98, -685199838), this.int64(0x71374491, 0x23ef65cd),
                this.int64(-1245643825, -330482897), this.int64(-373957723, -2121671748),
                this.int64(0x3956c25b, -213338824), this.int64(0x59f111f1, -1241133031),
                this.int64(-1841331548, -1357295717), this.int64(-1424204075, -630357736),
                this.int64(-670586216, -1560083902), this.int64(0x12835b01, 0x45706fbe),
                this.int64(0x243185be, 0x4ee4b28c), this.int64(0x550c7dc3, -704662302),
                this.int64(0x72be5d74, -226784913), this.int64(-2132889090, 0x3b1696b1),
                this.int64(-1680079193, 0x25c71235), this.int64(-1046744716, -815192428),
                this.int64(-459576895, -1628353838), this.int64(-272742522, 0x384f25e3),
                this.int64(0xfc19dc6, -1953704523), this.int64(0x240ca1cc, 0x77ac9c65),
                this.int64(0x2de92c6f, 0x592b0275), this.int64(0x4a7484aa, 0x6ea6e483),
                this.int64(0x5cb0a9dc, -1119749164), this.int64(0x76f988da, -2096016459),
                this.int64(-1740746414, -295247957), this.int64(-1473132947, 0x2db43210),
                this.int64(-1341970488, -1728372417), this.int64(-1084653625, -1091629340),
                this.int64(-958395405, 0x3da88fc2), this.int64(-710438585, -1828018395),
                this.int64(0x6ca6351, -536640913), this.int64(0x14292967, 0xa0e6e70),
                this.int64(0x27b70a85, 0x46d22ffc), this.int64(0x2e1b2138, 0x5c26c926),
                this.int64(0x4d2c6dfc, 0x5ac42aed), this.int64(0x53380d13, -1651133473),
                this.int64(0x650a7354, -1951439906), this.int64(0x766a0abb, 0x3c77b2a8),
                this.int64(-2117940946, 0x47edaee6), this.int64(-1838011259, 0x1482353b),
                this.int64(-1564481375, 0x4cf10364), this.int64(-1474664885, -1136513023),
                this.int64(-1035236496, -789014639), this.int64(-949202525, 0x654be30),
                this.int64(-778901479, -688958952), this.int64(-694614492, 0x5565a910),
                this.int64(-200395387, 0x5771202a), this.int64(0x106aa070, 0x32bbd1b8),
                this.int64(0x19a4c116, -1194143544), this.int64(0x1e376c08, 0x5141ab53),
                this.int64(0x2748774c, -544281703), this.int64(0x34b0bcb5, -509917016),
                this.int64(0x391c0cb3, -976659869), this.int64(0x4ed8aa4a, -482243893),
                this.int64(0x5b9cca4f, 0x7763e373), this.int64(0x682e6ff3, -692930397),
                this.int64(0x748f82ee, 0x5defb2fc), this.int64(0x78a5636f, 0x43172f60),
                this.int64(-2067236844, -1578062990), this.int64(-1933114872, 0x1a6439ec),
                this.int64(-1866530822, 0x23631e28), this.int64(-1538233109, -561857047),
                this.int64(-1090935817, -1295615723), this.int64(-965641998, -479046869),
                this.int64(-903397682, -366583396), this.int64(-779700025, 0x21c0c207),
                this.int64(-354779690, -840897762), this.int64(-176337025, -294727304),
                this.int64(0x6f067aa, 0x72176fba), this.int64(0xa637dc5, -1563912026),
                this.int64(0x113f9804, -1090974290), this.int64(0x1b710b35, 0x131c471b),
                this.int64(0x28db77f5, 0x23047d84), this.int64(0x32caab7b, 0x40c72493),
                this.int64(0x3c9ebe0a, 0x15c9bebc), this.int64(0x431d67c4, -1676669620),
                this.int64(0x4cc5d4be, -885112138), this.int64(0x597f299c, -60457430),
                this.int64(0x5fcb6fab, 0x3ad6faec), this.int64(0x6c44198c, 0x4a475817));
        }

        // Initial hash values
        var H = new Array(
            this.int64(0x6a09e667, -205731576),
            this.int64(-1150833019, -2067093701),
            this.int64(0x3c6ef372, -23791573),
            this.int64(-1521486534, 0x5f1d36f1),
            this.int64(0x510e527f, -1377402159),
            this.int64(-1694144372, 0x2b3e6c1f),
            this.int64(0x1f83d9ab, -79577749),
            this.int64(0x5be0cd19, 0x137e2179));

        var T1 = this.int64(0, 0),
            T2 = this.int64(0, 0),
            a = this.int64(0, 0),
            b = this.int64(0, 0),
            c = this.int64(0, 0),
            d = this.int64(0, 0),
            e = this.int64(0, 0),
            f = this.int64(0, 0),
            g = this.int64(0, 0),
            h = this.int64(0, 0),
            // Temporary variables not specified by the document
            s0 = this.int64(0, 0),
            s1 = this.int64(0, 0),
            Ch = this.int64(0, 0),
            Maj = this.int64(0, 0),
            r1 = this.int64(0, 0),
            r2 = this.int64(0, 0),
            r3 = this.int64(0, 0);
        var j, i;
        var W = new Array(80);
        for (i = 0; i < 80; i++) {
            W[i] = this.int64(0, 0);
        }

        // Append padding to the source string. The format is described in the FIPS.
        x[len >> 5] |= 0x80 << (24 - (len & 0x1f));
        x[((len + 128 >> 10) << 5) + 31] = len;

        for (i = 0; i < x.length; i += 32) {
            // 32 dwords is the block size
            this.int64copy(a, H[0]);
            this.int64copy(b, H[1]);
            this.int64copy(c, H[2]);
            this.int64copy(d, H[3]);
            this.int64copy(e, H[4]);
            this.int64copy(f, H[5]);
            this.int64copy(g, H[6]);
            this.int64copy(h, H[7]);

            for (j = 0; j < 16; j++) {
                W[j].h = x[i + 2 * j];
                W[j].l = x[i + 2 * j + 1];
            }

            for (j = 16; j < 80; j++) {
                // sigma1
                this.int64rrot(r1, W[j - 2], 19);
                this.int64revrrot(r2, W[j - 2], 29);
                this.int64shr(r3, W[j - 2], 6);
                s1.l = r1.l ^ r2.l ^ r3.l;
                s1.h = r1.h ^ r2.h ^ r3.h;
                // sigma0
                this.int64rrot(r1, W[j - 15], 1);
                this.int64rrot(r2, W[j - 15], 8);
                this.int64shr(r3, W[j - 15], 7);
                s0.l = r1.l ^ r2.l ^ r3.l;
                s0.h = r1.h ^ r2.h ^ r3.h;

                this.int64add4(W[j], s1, W[j - 7], s0, W[j - 16]);
            }

            for (j = 0; j < 80; j++) {
                // Ch
                Ch.l = (e.l & f.l) ^ (~e.l & g.l);
                Ch.h = (e.h & f.h) ^ (~e.h & g.h);

                // Sigma1
                this.int64rrot(r1, e, 14);
                this.int64rrot(r2, e, 18);
                this.int64revrrot(r3, e, 9);
                s1.l = r1.l ^ r2.l ^ r3.l;
                s1.h = r1.h ^ r2.h ^ r3.h;

                // Sigma0
                this.int64rrot(r1, a, 28);
                this.int64revrrot(r2, a, 2);
                this.int64revrrot(r3, a, 7);
                s0.l = r1.l ^ r2.l ^ r3.l;
                s0.h = r1.h ^ r2.h ^ r3.h;

                // Maj
                Maj.l = (a.l & b.l) ^ (a.l & c.l) ^ (b.l & c.l);
                Maj.h = (a.h & b.h) ^ (a.h & c.h) ^ (b.h & c.h);

                this.int64add5(T1, h, s1, Ch, this.sha512_k[j], W[j]);
                this.int64add(T2, s0, Maj);

                this.int64copy(h, g);
                this.int64copy(g, f);
                this.int64copy(f, e);
                this.int64add(e, d, T1);
                this.int64copy(d, c);
                this.int64copy(c, b);
                this.int64copy(b, a);
                this.int64add(a, T1, T2);
            }
            this.int64add(H[0], H[0], a);
            this.int64add(H[1], H[1], b);
            this.int64add(H[2], H[2], c);
            this.int64add(H[3], H[3], d);
            this.int64add(H[4], H[4], e);
            this.int64add(H[5], H[5], f);
            this.int64add(H[6], H[6], g);
            this.int64add(H[7], H[7], h);
        }

        // Represent the hash as an array of 32-bit dwords.
        var hash = new Array(16);
        for (i = 0; i < 8; i++) {
            hash[2 * i] = H[i].h;
            hash[2 * i + 1] = H[i].l;
        }
        return hash;
    }

    /*!
    * A JavaScript implementation of the RIPEMD-160 Algorithm
    * Version 2.2 Copyright Jeremy Lin, Paul Johnston 2000 - 2009.
    * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
    * Distributed under the BSD License
    * See http://pajhome.org.uk/crypt/md5 for details.
    * Also http://www.ocf.berkeley.edu/~jjlin/jsotp/
    */

    /*
    * These are the functions you'll usually want to call.
    * They take string arguments and return either hex or base-64 encoded strings.
    */
    static hex_rmd160(s) { return this.rstr2hex(this.rstr_rmd160(this.str2rstr_utf8(s))); }
    static b64_rmd160(s) { return this.rstr2b64(this.rstr_rmd160(this.str2rstr_utf8(s))); }
    static any_rmd160(s, e) { return this.rstr2any(this.rstr_rmd160(this.str2rstr_utf8(s)), e); }
    static hex_hmac_rmd160(k, d) { return this.rstr2hex(this.rstr_hmac_rmd160(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
    static b64_hmac_rmd160(k, d) { return this.rstr2b64(this.rstr_hmac_rmd160(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
    static any_hmac_rmd160(k, d, e) { return this.rstr2any(this.rstr_hmac_rmd160(this.str2rstr_utf8(k), this.str2rstr_utf8(d)), e); }


    /*
    * Perform a simple self-test to see if the VM is working.
    */
    static rmd160_vm_test() {
        return this.hex_rmd160("abc").toLowerCase() == "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc";
    }


    /*
    * Calculate the rmd160 of a raw string.
    */
    static rstr_rmd160(s) {
        return this.binl2rstr(this.binl_rmd160(this.rstr2binl(s), s.length * 8));
    }


    /*
    * Calculate the HMAC-rmd160 of a key and some data (raw strings).
    */
    static rstr_hmac_rmd160(key, data) {
        var bkey = this.rstr2binl(key);
        if (bkey.length > 16) {
            bkey = this.binl_rmd160(bkey, key.length * 8);
        }

        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        var hash = this.binl_rmd160(ipad.concat(this.rstr2binl(data)), 512 + data.length * 8);
        return this.binl2rstr(this.binl_rmd160(opad.concat(hash), 512 + 160));
    }

    /*
    * Calculate the RIPE-MD160 of an array of little-endian words, and a bit length.
    */
    static binl_rmd160(x, len) {
        // Append padding
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var h0 = 0x67452301;
        var h1 = 0xefcdab89;
        var h2 = 0x98badcfe;
        var h3 = 0x10325476;
        var h4 = 0xc3d2e1f0;

        for (var i = 0; i < x.length; i += 16) {
            var T;
            var A1 = h0, B1 = h1, C1 = h2, D1 = h3, E1 = h4;
            var A2 = h0, B2 = h1, C2 = h2, D2 = h3, E2 = h4;
            for (var j = 0; j <= 79; ++j) {
                T = this.safe_add(A1, this.rmd160_f(j, B1, C1, D1));
                T = this.safe_add(T, x[i + this.rmd160_r1[j]]);
                T = this.safe_add(T, this.rmd160_K1(j));
                T = this.safe_add(this.bit_rol(T, this.rmd160_s1[j]), E1);
                A1 = E1; E1 = D1; D1 = this.bit_rol(C1, 10); C1 = B1; B1 = T;
                T = this.safe_add(A2, this.rmd160_f(79 - j, B2, C2, D2));
                T = this.safe_add(T, x[i + this.rmd160_r2[j]]);
                T = this.safe_add(T, this.rmd160_K2(j));
                T = this.safe_add(this.bit_rol(T, this.rmd160_s2[j]), E2);
                A2 = E2; E2 = D2; D2 = this.bit_rol(C2, 10); C2 = B2; B2 = T;
            }
            T = this.safe_add(h1, this.safe_add(C1, D2));
            h1 = this.safe_add(h2, this.safe_add(D1, E2));
            h2 = this.safe_add(h3, this.safe_add(E1, A2));
            h3 = this.safe_add(h4, this.safe_add(A1, B2));
            h4 = this.safe_add(h0, this.safe_add(B1, C2));
            h0 = T;
        }
        return [h0, h1, h2, h3, h4];
    }

    static rmd160_f(j, x, y, z) {
        return (0 <= j && j <= 15) ? (x ^ y ^ z) :
            (16 <= j && j <= 31) ? (x & y) | (~x & z) :
                (32 <= j && j <= 47) ? (x | ~y) ^ z :
                    (48 <= j && j <= 63) ? (x & z) | (y & ~z) :
                        (64 <= j && j <= 79) ? x ^ (y | ~z) :
                            "rmd160_f: j out of range";
    }

    static rmd160_K1(j) {
        return (0 <= j && j <= 15) ? 0x00000000 :
            (16 <= j && j <= 31) ? 0x5a827999 :
                (32 <= j && j <= 47) ? 0x6ed9eba1 :
                    (48 <= j && j <= 63) ? 0x8f1bbcdc :
                        (64 <= j && j <= 79) ? 0xa953fd4e :
                            "rmd160_K1: j out of range";
    }


    static rmd160_K2(j) {
        return (0 <= j && j <= 15) ? 0x50a28be6 :
            (16 <= j && j <= 31) ? 0x5c4dd124 :
                (32 <= j && j <= 47) ? 0x6d703ef3 :
                    (48 <= j && j <= 63) ? 0x7a6d76e9 :
                        (64 <= j && j <= 79) ? 0x00000000 :
                            "rmd160_K2: j out of range";
    }


    static rmd160_r1 = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
        7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
        3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
        1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
        4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
    ];
    static rmd160_r2 = [
        5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
        6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
        15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
        8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
        12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
    ];
    static rmd160_s1 = [
        11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
        7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
        11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
        11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
        9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
    ];
    static rmd160_s2 = [
        8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
        9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
        9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
        15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
        8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
    ];
};

/* <helpers> */
const objectToQueryStringTemplate = `
    const objectToQueryString = (obj) => {
        return Object.keys(obj)
        .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
        .join('&');
    };
`;

const JHashTemplate = `
    class JHash {
        'use strict';
    
        /*
        * Configurable variables. You may need to tweak these to be compatible with
        * the server-side, but the defaults work in most cases.
        */
        static hexcase = 0;  // hex output format. 0 - lowercase; 1 - uppercase
        static b64pad  = ""; // base-64 pad character. "=" for strict RFC compliance
    
        /*!
        * Functions shared by multiple hashing libraries.
        */
    
        /*
        * Convert a raw string to a hex string.
        */
        static rstr2hex(input) {
        try { this.hexcase } catch(e) { this.hexcase=0; }
        var hex_tab = this.hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var output  = "";
        var x;
        for (var i = 0; i < input.length; i++) {
            x = input.charCodeAt(i);
            output += hex_tab.charAt((x >>> 4) & 0x0F)
                +  hex_tab.charAt( x        & 0x0F);
        }
        return output;
        }
    
        /*
        * Convert a raw string to a base-64 string.
        */
        static rstr2b64(input) {
        try { this.b64pad } catch(e) { this.b64pad=''; }
        var tab    = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var output = "";
        var len    = input.length;
        for (var i = 0; i < len; i += 3) {
            var triplet = (input.charCodeAt(i) << 16)
                        | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                        | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
            for (var j = 0; j < 4; j++) {
            if (i * 8 + j * 6 > input.length * 8) {
                output += this.b64pad;
            } else {
                output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
            }
            }
        }
        return output;
        }
    
        /*
        * Convert a raw string to an arbitrary string encoding.
        */
        static rstr2any(input, encoding) {
        var divisor = encoding.length;
        var i, j, q, x, quotient;
    
        // Convert to an array of 16-bit big-endian values, forming the dividend.
        var dividend = Array(Math.ceil(input.length / 2));
        for (i = 0; i < dividend.length; i++) {
            dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
        }
    
        /*
        * Repeatedly perform a long division. The binary array forms the dividend,
        * the length of the encoding is the divisor. Once computed, the quotient
        * forms the dividend for the next step. All remainders are stored for later use.
        */
        var full_length = Math.ceil(input.length * 8 / (Math.log(encoding.length) / Math.log(2)));
        var remainders  = Array(full_length);
        for (j = 0; j < full_length; j++) {
            quotient = Array();
            x        = 0;
            for (i = 0; i < dividend.length; i++) {
            x = (x << 16) + dividend[i];
            q = Math.floor(x / divisor);
            x -= q * divisor;
            if (quotient.length > 0 || q > 0) {
                quotient[quotient.length] = q;
            }
            }
            remainders[j] = x;
            dividend = quotient;
        }
    
        // Convert the remainders to the output string.
        var output = "";
        for (i = remainders.length - 1; i >= 0; i--) {
            output += encoding.charAt(remainders[i]);
        }
    
        return output;
        }
    
        /*
        * Encode a string as utf-8.
        * For efficiency, this assumes the input is valid utf-16.
        */
        static str2rstr_utf8(input) {
        var output = "";
        var i = -1;
        var x, y;
    
        while (++i < input.length) {
            // Decode utf-16 surrogate pairs
            x = input.charCodeAt(i);
            y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
            if (0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
            x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
            i++;
            }
    
            // Encode output as utf-8
            if (x <= 0x7F) {
            output += String.fromCharCode(x);
            } else if (x <= 0x7FF) {
            output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                            0x80 | ( x         & 0x3F));
            } else if (x <= 0xFFFF) {
            output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                            0x80 | ((x >>> 6 ) & 0x3F),
                                            0x80 | ( x         & 0x3F));
            } else if (x <= 0x1FFFFF) {
            output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                            0x80 | ((x >>> 12) & 0x3F),
                                            0x80 | ((x >>> 6 ) & 0x3F),
                                            0x80 | ( x         & 0x3F));
            }
        }
        return output;
        }
    
        /*
        * Encode a string as utf-16.
        */
        static str2rstr_utf16le(input) {
        var output = "";
        for (var i = 0; i < input.length; i++) {
            output += String.fromCharCode(input.charCodeAt(i)        & 0xFF,
                                        (input.charCodeAt(i) >>> 8) & 0xFF);
        }
        return output;
        }
    
        static str2rstr_utf16be(input) {
        var output = "";
        for (var i = 0; i < input.length; i++) {
            output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                        input.charCodeAt(i)        & 0xFF);
        }
        return output;
        }
        
        /*
        * Convert a raw string to an array of little-endian words.
        * Characters >255 have their high-byte silently ignored.
        */
        static rstr2binl(input) {
        var output = Array(input.length >> 2);
        for (var i = 0; i < output.length; i++) {
            output[i] = 0;
        }
        for (var i = 0; i < input.length * 8; i += 8) {
            output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
        }
        return output;
        }
     
        /*
        * Convert an array of little-endian words to a string.
        */
        static binl2rstr(input) {
        var output = "";
        for (var i = 0; i < input.length * 32; i += 8) {
            output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
        }
        return output;
        }
       
        /*
        * Convert a raw string to an array of big-endian words.
        * Characters >255 have their high-byte silently ignored.
        */
        static rstr2binb(input) {
        var output = Array(input.length >> 2);
        for (var i = 0; i < output.length; i++) {
            output[i] = 0;
        }
        for (var i = 0; i < input.length * 8; i += 8) {
            output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
        }
        return output;
        }
    
        /*
        * Convert an array of big-endian words to a string.
        */
        static binb2rstr(input) {
        var output = "";
        for (var i = 0; i < input.length * 32; i += 8) {
            output += String.fromCharCode((input[i>>5] >>> (24 - i % 32)) & 0xFF);
        }
        return output;
        }
    
        /*
        * Add integers, wrapping at 2^32. This uses 16-bit operations internally
        * to work around bugs in some JS interpreters.
        */
        static safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
        }
    
        /*
        * Bitwise rotate a 32-bit number to the left.
        */
        static bit_rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
        }
    
        /*
        * A constructor for 64-bit numbers.
        */
        static int64(h, l) {
        function int64(h, l) {
            this.h = h;
            this.l = l;
            // this.toString = this.int64toString;
        }
        return new int64(h, l);
        }
      
        /*
        * Copies src into dst, assuming both are 64-bit numbers.
        */
        static int64copy(dst, src) {
        dst.h = src.h;
        dst.l = src.l;
        }
    
        /*
        * Right-rotates a 64-bit number by shift.
        * Won't handle cases of shift>=32.
        * The static revrrot() is for that.
        */
        static int64rrot(dst, x, shift) {
        dst.l = (x.l >>> shift) | (x.h << (32-shift));
        dst.h = (x.h >>> shift) | (x.l << (32-shift));
        }
    
        /*
        * Reverses the dwords of the source and then rotates right by shift.
        * This is equivalent to rotation by 32+shift.
        */
        static int64revrrot(dst, x, shift) {
        dst.l = (x.h >>> shift) | (x.l << (32-shift));
        dst.h = (x.l >>> shift) | (x.h << (32-shift));
        }
    
        /*
        * Bitwise-shifts right a 64-bit number by shift.
        * Won't handle shift>=32, but it's never needed in SHA512.
        */
        static int64shr(dst, x, shift) {
        dst.l = (x.l >>> shift) | (x.h << (32-shift));
        dst.h = (x.h >>> shift);
        }
    
        /*
        * Adds two 64-bit numbers.
        * Like the original implementation, does not rely on 32-bit operations.
        */
        static int64add(dst, x, y) {
        var w0 = (x.l & 0xffff) + (y.l & 0xffff);
        var w1 = (x.l >>> 16) + (y.l >>> 16) + (w0 >>> 16);
        var w2 = (x.h & 0xffff) + (y.h & 0xffff) + (w1 >>> 16);
        var w3 = (x.h >>> 16) + (y.h >>> 16) + (w2 >>> 16);
        dst.l = (w0 & 0xffff) | (w1 << 16);
        dst.h = (w2 & 0xffff) | (w3 << 16);
        }
    
        /*
        * Same, except with 4 addends. Works faster than adding them one by one.
        */
        static int64add4(dst, a, b, c, d) {
        var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff);
        var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (w0 >>> 16);
        var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (w1 >>> 16);
        var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (w2 >>> 16);
        dst.l = (w0 & 0xffff) | (w1 << 16);
        dst.h = (w2 & 0xffff) | (w3 << 16);
        }
    
        /*
        * Same, except with 5 addends.
        */
        static int64add5(dst, a, b, c, d, e) {
        var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff) + (e.l & 0xffff);
        var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (e.l >>> 16) + (w0 >>> 16);
        var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (e.h & 0xffff) + (w1 >>> 16);
        var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (e.h >>> 16) + (w2 >>> 16);
        dst.l = (w0 & 0xffff) | (w1 << 16);
        dst.h = (w2 & 0xffff) | (w3 << 16);
        }
    
        /*!
        * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
        * Digest Algorithm, as defined in RFC 1321.
        * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
        * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
        * Distributed under the BSD License
        * See http://pajhome.org.uk/crypt/md5 for more info.
        */
    
        /*
        * These are the functions you'll usually want to call.
        * They take string arguments and return either hex or base-64 encoded strings.
        */
        static hex_md5(s)            { return this.rstr2hex(this.rstr_md5(this.str2rstr_utf8(s))); }
        static b64_md5(s)            { return this.rstr2b64(this.rstr_md5(this.str2rstr_utf8(s))); }
        static any_md5(s, e)         { return this.rstr2any(this.rstr_md5(this.str2rstr_utf8(s)), e); }
        static hex_hmac_md5(k, d)    { return this.rstr2hex(this.rstr_hmac_md5(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
        static b64_hmac_md5(k, d)    { return this.rstr2b64(this.rstr_hmac_md5(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
        static any_hmac_md5(k, d, e) { return this.rstr2any(this.rstr_hmac_md5(this.str2rstr_utf8(k), this.str2rstr_utf8(d)), e); }
    
    
        /*
        * Perform a simple self-test to see if the VM is working.
        */
        static md5_vm_test() {
        return this.hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
        }
    
    
        /*
        * Calculate the MD5 of a raw string.
        */
        static rstr_md5(s) {
        return this.binl2rstr(this.binl_md5(this.rstr2binl(s), s.length * 8));
        }
    
        /*
        * Calculate the HMAC-MD5, of a key and some data (raw strings).
        */
        static rstr_hmac_md5(key, data) {
        var bkey = this.rstr2binl(key);
        if (bkey.length > 16) {
            bkey = this.binl_md5(bkey, key.length * 8);
        }
    
        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
    
        var hash = this.binl_md5(ipad.concat(this.rstr2binl(data)), 512 + data.length * 8);
        return this.binl2rstr(this.binl_md5(opad.concat(hash), 512 + 128));
        }
    
        /*
        * Calculate the MD5 of an array of little-endian words, and a bit length.
        */
        static binl_md5(x, len) {
        // Append padding
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;
    
        var a =  1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d =  271733878;
    
        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;
    
            a = this.md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
            d = this.md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
            c = this.md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
            b = this.md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
            a = this.md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
            d = this.md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
            c = this.md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
            b = this.md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
            a = this.md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
            d = this.md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
            c = this.md5_ff(c, d, a, b, x[i+10], 17, -42063);
            b = this.md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
            a = this.md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
            d = this.md5_ff(d, a, b, c, x[i+13], 12, -40341101);
            c = this.md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
            b = this.md5_ff(b, c, d, a, x[i+15], 22,  1236535329);
    
            a = this.md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
            d = this.md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
            c = this.md5_gg(c, d, a, b, x[i+11], 14,  643717713);
            b = this.md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
            a = this.md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
            d = this.md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
            c = this.md5_gg(c, d, a, b, x[i+15], 14, -660478335);
            b = this.md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
            a = this.md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
            d = this.md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
            c = this.md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
            b = this.md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
            a = this.md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
            d = this.md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
            c = this.md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
            b = this.md5_gg(b, c, d, a, x[i+12], 20, -1926607734);
    
            a = this.md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
            d = this.md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
            c = this.md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
            b = this.md5_hh(b, c, d, a, x[i+14], 23, -35309556);
            a = this.md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
            d = this.md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
            c = this.md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
            b = this.md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
            a = this.md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
            d = this.md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
            c = this.md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
            b = this.md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
            a = this.md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
            d = this.md5_hh(d, a, b, c, x[i+12], 11, -421815835);
            c = this.md5_hh(c, d, a, b, x[i+15], 16,  530742520);
            b = this.md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);
    
            a = this.md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
            d = this.md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
            c = this.md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
            b = this.md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
            a = this.md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
            d = this.md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
            c = this.md5_ii(c, d, a, b, x[i+10], 15, -1051523);
            b = this.md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
            a = this.md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
            d = this.md5_ii(d, a, b, c, x[i+15], 10, -30611744);
            c = this.md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
            b = this.md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
            a = this.md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
            d = this.md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
            c = this.md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
            b = this.md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);
    
            a = this.safe_add(a, olda);
            b = this.safe_add(b, oldb);
            c = this.safe_add(c, oldc);
            d = this.safe_add(d, oldd);
        }
        return Array(a, b, c, d);
        }
    
    
        /*
        * These functions implement the four basic operations the algorithm uses.
        */
        static md5_cmn(q, a, b, x, s, t)   { return this.safe_add(this.bit_rol(this.safe_add(this.safe_add(a, q), this.safe_add(x, t)), s),b); }
        static md5_ff(a, b, c, d, x, s, t) { return this.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t); }
        static md5_gg(a, b, c, d, x, s, t) { return this.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t); }
        static md5_hh(a, b, c, d, x, s, t) { return this.md5_cmn(b ^ c ^ d, a, b, x, s, t); }
        static md5_ii(a, b, c, d, x, s, t) { return this.md5_cmn(c ^ (b | (~d)), a, b, x, s, t); }
    
        /*!
        * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
        * in FIPS 180-1
        * Version 2.2 Copyright Paul Johnston 2000 - 2009.
        * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
        * Distributed under the BSD License
        * See http://pajhome.org.uk/crypt/md5 for details.
        */
    
        /*
        * These are the functions you'll usually want to call.
        * They take string arguments and return either hex or base-64 encoded strings.
        */
        static hex_sha1(s)            { return this.rstr2hex(this.rstr_sha1(this.str2rstr_utf8(s))); }
        static b64_sha1(s)            { return this.rstr2b64(this.rstr_sha1(this.str2rstr_utf8(s))); }
        static any_sha1(s, e)         { return this.rstr2any(this.rstr_sha1(this.str2rstr_utf8(s)), e); }
        static hex_hmac_sha1(k, d)    { return this.rstr2hex(this.rstr_hmac_sha1(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
        static b64_hmac_sha1(k, d)    { return this.rstr2b64(this.rstr_hmac_sha1(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
        static any_hmac_sha1(k, d, e) { return this.rstr2any(this.rstr_hmac_sha1(this.str2rstr_utf8(k), this.str2rstr_utf8(d)), e); }
    
    
        /*
        * Perform a simple self-test to see if the VM is working.
        */
        static sha1_vm_test() {
        return this.hex_sha1("abc").toLowerCase() == "a9993e364706816aba3e25717850c26c9cd0d89d";
        }
    
    
        /*
        * Calculate the SHA1 of a raw string.
        */
        static rstr_sha1(s) {
        return this.binb2rstr(this.binb_sha1(this.rstr2binb(s), s.length * 8));
        }
    
    
        /*
        * Calculate the HMAC-SHA1 of a key and some data (raw strings).
        */
        static rstr_hmac_sha1(key, data) {
        var bkey = this.rstr2binb(key);
        if (bkey.length > 16) {
            bkey = this.binb_sha1(bkey, key.length * 8);
        }
    
        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
    
        var hash = this.binb_sha1(ipad.concat(this.rstr2binb(data)), 512 + data.length * 8);
        return this.binb2rstr(this.binb_sha1(opad.concat(hash), 512 + 160));
        }
    
    
        /*
        * Calculate the SHA-1 of an array of big-endian words, and a bit length.
        */
        static binb_sha1(x, len) {
        // Append padding
        x[len >> 5] |= 0x80 << (24 - len % 32);
        x[((len + 64 >> 9) << 4) + 15] = len;
    
        var w = Array(80);
        var a =  1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d =  271733878;
        var e = -1009589776;
    
        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;
            var olde = e;
    
            for (var j = 0; j < 80; j++) {
            if (j < 16) {
                w[j] = x[i + j];
            } else {
                w[j] = this.bit_rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
            }
            var t = this.safe_add(this.safe_add(this.bit_rol(a, 5), this.sha1_ft(j, b, c, d)), this.safe_add(this.safe_add(e, w[j]), this.sha1_kt(j)));
            e = d;
            d = c;
            c = this.bit_rol(b, 30);
            b = a;
            a = t;
            }
    
            a = this.safe_add(a, olda);
            b = this.safe_add(b, oldb);
            c = this.safe_add(c, oldc);
            d = this.safe_add(d, oldd);
            e = this.safe_add(e, olde);
        }
        return Array(a, b, c, d, e);
    
        }
    
    
        /*
        * Perform the appropriate triplet combination static for the current iteration.
        */
        static sha1_ft(t, b, c, d) {
        if (t < 20) { return (b & c) | ((~b) & d); }
        if (t < 40) { return b ^ c ^ d; }
        if (t < 60) { return (b & c) | (b & d) | (c & d); }
        return b ^ c ^ d;
        }
    
    
        /*
        * Determine the appropriate additive constant for the current iteration.
        */
        static sha1_kt(t) {
        return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
        }
    
    
        /*!
        * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
        * in FIPS 180-2
        * Version 2.2 Copyright Angel Marin, Paul Johnston 2000 - 2009.
        * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
        * Distributed under the BSD License
        * See http://pajhome.org.uk/crypt/md5 for details.
        * Also http://anmar.eu.org/projects/jssha2/
        */
    
        /*
        * These are the functions you'll usually want to call.
        * They take string arguments and return either hex or base-64 encoded strings.
        */
        static hex_sha256(s)            { return this.rstr2hex(this.rstr_sha256(this.str2rstr_utf8(s))); }
        static b64_sha256(s)            { return this.rstr2b64(this.rstr_sha256(this.str2rstr_utf8(s))); }
        static any_sha256(s, e)         { return this.rstr2any(this.rstr_sha256(this.str2rstr_utf8(s)), e); }
        static hex_hmac_sha256(k, d)    { return this.rstr2hex(this.rstr_hmac_sha256(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
        static b64_hmac_sha256(k, d)    { return this.rstr2b64(this.rstr_hmac_sha256(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
        static any_hmac_sha256(k, d, e) { return this.rstr2any(this.rstr_hmac_sha256(this.str2rstr_utf8(k), this.str2rstr_utf8(d)), e); }
    
    
        /*
        * Perform a simple self-test to see if the VM is working.
        */
        static sha256_vm_test() {
        return this.hex_sha256("abc").toLowerCase() == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
        }
    
    
        /*
        * Calculate the sha256 of a raw string.
        */
        static rstr_sha256(s) {
        return this.binb2rstr(this.binb_sha256(this.rstr2binb(s), s.length * 8));
        }
    
    
        /*
        * Calculate the HMAC-sha256 of a key and some data (raw strings).
        */
        static rstr_hmac_sha256(key, data) {
        var bkey = this.rstr2binb(key);
        if (bkey.length > 16) {
            bkey = this.binb_sha256(bkey, key.length * 8);
        }
    
        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
    
        var hash = this.binb_sha256(ipad.concat(this.rstr2binb(data)), 512 + data.length * 8);
        return this.binb2rstr(this.binb_sha256(opad.concat(hash), 512 + 256));
        }
    
    
        /*
        * Main sha256 function, with its support functions.
        */
        static sha256_S(X, n)      { return ( X >>> n ) | (X << (32 - n)); }
        static sha256_R(X, n)      { return ( X >>> n ); }
        static sha256_Ch(x, y, z)  { return ((x & y) ^ ((~x) & z)); }
        static sha256_Maj(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)); }
        static sha256_Sigma0256(x) { return (this.sha256_S(x, 2) ^ this.sha256_S(x, 13) ^ this.sha256_S(x, 22)); }
        static sha256_Sigma1256(x) { return (this.sha256_S(x, 6) ^ this.sha256_S(x, 11) ^ this.sha256_S(x, 25)); }
        static sha256_Gamma0256(x) { return (this.sha256_S(x, 7) ^ this.sha256_S(x, 18) ^ this.sha256_R(x, 3)); }
        static sha256_Gamma1256(x) { return (this.sha256_S(x, 17) ^ this.sha256_S(x, 19) ^ this.sha256_R(x, 10)); }
        static sha256_Sigma0512(x) { return (this.sha256_S(x, 28) ^ this.sha256_S(x, 34) ^ this.sha256_S(x, 39)); }
        static sha256_Sigma1512(x) { return (this.sha256_S(x, 14) ^ this.sha256_S(x, 18) ^ this.sha256_S(x, 41)); }
        static sha256_Gamma0512(x) { return (this.sha256_S(x, 1)  ^ this.sha256_S(x, 8) ^ this.sha256_R(x, 7)); }
        static sha256_Gamma1512(x) { return (this.sha256_S(x, 19) ^ this.sha256_S(x, 61) ^ this.sha256_R(x, 6)); }
    
        static sha256_K = new Array(1116352408, 1899447441, -1245643825, -373957723, 961987163, 1508970993, -1841331548, -1424204075, -670586216, 310598401, 607225278, 1426881987, 1925078388, -2132889090, -1680079193, -1046744716, -459576895, -272742522, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, -1740746414, -1473132947, -1341970488, -1084653625, -958395405, -710438585, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, -2117940946, -1838011259, -1564481375, -1474664885, -1035236496, -949202525, -778901479, -694614492, -200395387, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, -2067236844, -1933114872, -1866530822, -1538233109, -1090935817, -965641998);
    
        static binb_sha256(m, l) {
        var HASH = new Array(1779033703, -1150833019, 1013904242, -1521486534, 1359893119, -1694144372, 528734635, 1541459225);
        var W = new Array(64);
        var a, b, c, d, e, f, g, h;
        var i, j, T1, T2;
    
        // Append padding
        m[l >> 5] |= 0x80 << (24 - l % 32);
        m[((l + 64 >> 9) << 4) + 15] = l;
    
        for (i = 0; i < m.length; i += 16) {
            a = HASH[0];
            b = HASH[1];
            c = HASH[2];
            d = HASH[3];
            e = HASH[4];
            f = HASH[5];
            g = HASH[6];
            h = HASH[7];
    
            for (j = 0; j < 64; j++) {
            if (j < 16) {
                W[j] = m[j + i];
            } else {
                W[j] = this.safe_add(this.safe_add(this.safe_add(this.sha256_Gamma1256(W[j - 2]), W[j - 7]), this.sha256_Gamma0256(W[j - 15])), W[j - 16]);
            }
    
            T1 = this.safe_add(this.safe_add(this.safe_add(this.safe_add(h, this.sha256_Sigma1256(e)), this.sha256_Ch(e, f, g)), this.sha256_K[j]), W[j]);
            T2 = this.safe_add(this.sha256_Sigma0256(a), this.sha256_Maj(a, b, c));
            h = g;
            g = f;
            f = e;
            e = this.safe_add(d, T1);
            d = c;
            c = b;
            b = a;
            a = this.safe_add(T1, T2);
            }
    
            HASH[0] = this.safe_add(a, HASH[0]);
            HASH[1] = this.safe_add(b, HASH[1]);
            HASH[2] = this.safe_add(c, HASH[2]);
            HASH[3] = this.safe_add(d, HASH[3]);
            HASH[4] = this.safe_add(e, HASH[4]);
            HASH[5] = this.safe_add(f, HASH[5]);
            HASH[6] = this.safe_add(g, HASH[6]);
            HASH[7] = this.safe_add(h, HASH[7]);
        }
        return HASH;
        }
    
    
    
    
        /*!
        * A JavaScript implementation of the Secure Hash Algorithm, SHA-512, as defined
        * in FIPS 180-2
        * Version 2.2 Copyright Anonymous Contributor, Paul Johnston 2000 - 2009.
        * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
        * Distributed under the BSD License
        * See http://pajhome.org.uk/crypt/md5 for details.
        */
    
        /*
        * These are the functions you'll usually want to call.
        * They take string arguments and return either hex or base-64 encoded strings.
        */
        static hex_sha512(s)            { return this.rstr2hex(this.rstr_sha512(this.str2rstr_utf8(s))); }
        static b64_sha512(s)            { return this.rstr2b64(this.rstr_sha512(this.str2rstr_utf8(s))); }
        static any_sha512(s, e)         { return this.rstr2any(this.rstr_sha512(this.str2rstr_utf8(s)), e);}
        static hex_hmac_sha512(k, d)    { return this.rstr2hex(this.rstr_hmac_sha512(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
        static b64_hmac_sha512(k, d)    { return this.rstr2b64(this.rstr_hmac_sha512(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
        static any_hmac_sha512(k, d, e) { return this.rstr2any(this.rstr_hmac_sha512(this.str2rstr_utf8(k), this.str2rstr_utf8(d)), e);}
    
    
        /*
        * Perform a simple self-test to see if the VM is working.
        */
        static sha512_vm_test() {
        return this.hex_sha512("abc").toLowerCase() == "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" + "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f";
        }
    
    
        /*
        * Calculate the SHA-512 of a raw string.
        */
        static rstr_sha512(s) {
        return this.binb2rstr(this.binb_sha512(this.rstr2binb(s), s.length * 8));
        }
    
    
        /*
        * Calculate the HMAC-SHA-512 of a key and some data (raw strings).
        */
        static rstr_hmac_sha512(key, data) {
        var bkey = this.rstr2binb(key);
        if (bkey.length > 32) {
            bkey = this.binb_sha512(bkey, key.length * 8);
        }
    
        var ipad = Array(32), opad = Array(32);
        for (var i = 0; i < 32; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
    
        var hash = this.binb_sha512(ipad.concat(this.rstr2binb(data)), 1024 + data.length * 8);
        return this.binb2rstr(this.binb_sha512(opad.concat(hash), 1024 + 512));
        }
    
    
        /*
        * Calculate the SHA-512 of an array of big-endian dwords, and a bit length.
        */
        static sha512_k;
        static binb_sha512(x, len) {
        if (this.sha512_k == undefined) {
            // SHA512 constants
            this.sha512_k = new Array(
            this.int64(0x428a2f98, -685199838), this.int64(0x71374491, 0x23ef65cd),
            this.int64(-1245643825, -330482897), this.int64(-373957723, -2121671748),
            this.int64(0x3956c25b, -213338824), this.int64(0x59f111f1, -1241133031),
            this.int64(-1841331548, -1357295717), this.int64(-1424204075, -630357736),
            this.int64(-670586216, -1560083902), this.int64(0x12835b01, 0x45706fbe),
            this.int64(0x243185be, 0x4ee4b28c), this.int64(0x550c7dc3, -704662302),
            this.int64(0x72be5d74, -226784913), this.int64(-2132889090, 0x3b1696b1),
            this.int64(-1680079193, 0x25c71235), this.int64(-1046744716, -815192428),
            this.int64(-459576895, -1628353838), this.int64(-272742522, 0x384f25e3),
            this.int64(0xfc19dc6, -1953704523), this.int64(0x240ca1cc, 0x77ac9c65),
            this.int64(0x2de92c6f, 0x592b0275), this.int64(0x4a7484aa, 0x6ea6e483),
            this.int64(0x5cb0a9dc, -1119749164), this.int64(0x76f988da, -2096016459),
            this.int64(-1740746414, -295247957), this.int64(-1473132947, 0x2db43210),
            this.int64(-1341970488, -1728372417), this.int64(-1084653625, -1091629340),
            this.int64(-958395405, 0x3da88fc2), this.int64(-710438585, -1828018395),
            this.int64(0x6ca6351, -536640913), this.int64(0x14292967, 0xa0e6e70),
            this.int64(0x27b70a85, 0x46d22ffc), this.int64(0x2e1b2138, 0x5c26c926),
            this.int64(0x4d2c6dfc, 0x5ac42aed), this.int64(0x53380d13, -1651133473),
            this.int64(0x650a7354, -1951439906), this.int64(0x766a0abb, 0x3c77b2a8),
            this.int64(-2117940946, 0x47edaee6), this.int64(-1838011259, 0x1482353b),
            this.int64(-1564481375, 0x4cf10364), this.int64(-1474664885, -1136513023),
            this.int64(-1035236496, -789014639), this.int64(-949202525, 0x654be30),
            this.int64(-778901479, -688958952), this.int64(-694614492, 0x5565a910),
            this.int64(-200395387, 0x5771202a), this.int64(0x106aa070, 0x32bbd1b8),
            this.int64(0x19a4c116, -1194143544), this.int64(0x1e376c08, 0x5141ab53),
            this.int64(0x2748774c, -544281703), this.int64(0x34b0bcb5, -509917016),
            this.int64(0x391c0cb3, -976659869), this.int64(0x4ed8aa4a, -482243893),
            this.int64(0x5b9cca4f, 0x7763e373), this.int64(0x682e6ff3, -692930397),
            this.int64(0x748f82ee, 0x5defb2fc), this.int64(0x78a5636f, 0x43172f60),
            this.int64(-2067236844, -1578062990), this.int64(-1933114872, 0x1a6439ec),
            this.int64(-1866530822, 0x23631e28), this.int64(-1538233109, -561857047),
            this.int64(-1090935817, -1295615723), this.int64(-965641998, -479046869),
            this.int64(-903397682, -366583396), this.int64(-779700025, 0x21c0c207),
            this.int64(-354779690, -840897762), this.int64(-176337025, -294727304),
            this.int64(0x6f067aa, 0x72176fba), this.int64(0xa637dc5, -1563912026),
            this.int64(0x113f9804, -1090974290), this.int64(0x1b710b35, 0x131c471b),
            this.int64(0x28db77f5, 0x23047d84), this.int64(0x32caab7b, 0x40c72493),
            this.int64(0x3c9ebe0a, 0x15c9bebc), this.int64(0x431d67c4, -1676669620),
            this.int64(0x4cc5d4be, -885112138), this.int64(0x597f299c, -60457430),
            this.int64(0x5fcb6fab, 0x3ad6faec), this.int64(0x6c44198c, 0x4a475817));
        }
    
        // Initial hash values
        var H = new Array(
            this.int64(0x6a09e667, -205731576),
            this.int64(-1150833019, -2067093701),
            this.int64(0x3c6ef372, -23791573),
            this.int64(-1521486534, 0x5f1d36f1),
            this.int64(0x510e527f, -1377402159),
            this.int64(-1694144372, 0x2b3e6c1f),
            this.int64(0x1f83d9ab, -79577749),
            this.int64(0x5be0cd19, 0x137e2179));
    
        var T1 = this.int64(0, 0),
            T2 = this.int64(0, 0),
            a = this.int64(0,0),
            b = this.int64(0,0),
            c = this.int64(0,0),
            d = this.int64(0,0),
            e = this.int64(0,0),
            f = this.int64(0,0),
            g = this.int64(0,0),
            h = this.int64(0,0),
            // Temporary variables not specified by the document
            s0 = this.int64(0, 0),
            s1 = this.int64(0, 0),
            Ch = this.int64(0, 0),
            Maj = this.int64(0, 0),
            r1 = this.int64(0, 0),
            r2 = this.int64(0, 0),
            r3 = this.int64(0, 0);
            var j, i;
            var W = new Array(80);
            for (i=0; i<80; i++) {
            W[i] = this.int64(0, 0);
            }
    
            // Append padding to the source string. The format is described in the FIPS.
            x[len >> 5] |= 0x80 << (24 - (len & 0x1f));
            x[((len + 128 >> 10)<< 5) + 31] = len;
    
        for (i = 0; i<x.length; i+=32) {
            // 32 dwords is the block size
            this.int64copy(a, H[0]);
            this.int64copy(b, H[1]);
            this.int64copy(c, H[2]);
            this.int64copy(d, H[3]);
            this.int64copy(e, H[4]);
            this.int64copy(f, H[5]);
            this.int64copy(g, H[6]);
            this.int64copy(h, H[7]);
    
            for (j=0; j<16; j++) {
            W[j].h = x[i + 2*j];
            W[j].l = x[i + 2*j + 1];
            }
    
            for (j=16; j<80; j++) {
            // sigma1
            this.int64rrot(r1, W[j-2], 19);
            this.int64revrrot(r2, W[j-2], 29);
            this.int64shr(r3, W[j-2], 6);
            s1.l = r1.l ^ r2.l ^ r3.l;
            s1.h = r1.h ^ r2.h ^ r3.h;
            // sigma0
            this.int64rrot(r1, W[j-15], 1);
            this.int64rrot(r2, W[j-15], 8);
            this.int64shr(r3, W[j-15], 7);
            s0.l = r1.l ^ r2.l ^ r3.l;
            s0.h = r1.h ^ r2.h ^ r3.h;
    
            this.int64add4(W[j], s1, W[j-7], s0, W[j-16]);
            }
    
            for (j = 0; j < 80; j++) {
            // Ch
            Ch.l = (e.l & f.l) ^ (~e.l & g.l);
            Ch.h = (e.h & f.h) ^ (~e.h & g.h);
    
            // Sigma1
            this.int64rrot(r1, e, 14);
            this.int64rrot(r2, e, 18);
            this.int64revrrot(r3, e, 9);
            s1.l = r1.l ^ r2.l ^ r3.l;
            s1.h = r1.h ^ r2.h ^ r3.h;
    
            // Sigma0
            this.int64rrot(r1, a, 28);
            this.int64revrrot(r2, a, 2);
            this.int64revrrot(r3, a, 7);
            s0.l = r1.l ^ r2.l ^ r3.l;
            s0.h = r1.h ^ r2.h ^ r3.h;
    
            // Maj
            Maj.l = (a.l & b.l) ^ (a.l & c.l) ^ (b.l & c.l);
            Maj.h = (a.h & b.h) ^ (a.h & c.h) ^ (b.h & c.h);
    
            this.int64add5(T1, h, s1, Ch, this.sha512_k[j], W[j]);
            this.int64add(T2, s0, Maj);
    
            this.int64copy(h, g);
            this.int64copy(g, f);
            this.int64copy(f, e);
            this.int64add(e, d, T1);
            this.int64copy(d, c);
            this.int64copy(c, b);
            this.int64copy(b, a);
            this.int64add(a, T1, T2);
            }
            this.int64add(H[0], H[0], a);
            this.int64add(H[1], H[1], b);
            this.int64add(H[2], H[2], c);
            this.int64add(H[3], H[3], d);
            this.int64add(H[4], H[4], e);
            this.int64add(H[5], H[5], f);
            this.int64add(H[6], H[6], g);
            this.int64add(H[7], H[7], h);
        }
    
        // Represent the hash as an array of 32-bit dwords.
        var hash = new Array(16);
        for (i=0; i<8; i++) {
            hash[2*i] = H[i].h;
            hash[2*i + 1] = H[i].l;
        }
        return hash;
        }
    
        /*!
        * A JavaScript implementation of the RIPEMD-160 Algorithm
        * Version 2.2 Copyright Jeremy Lin, Paul Johnston 2000 - 2009.
        * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
        * Distributed under the BSD License
        * See http://pajhome.org.uk/crypt/md5 for details.
        * Also http://www.ocf.berkeley.edu/~jjlin/jsotp/
        */
    
        /*
        * These are the functions you'll usually want to call.
        * They take string arguments and return either hex or base-64 encoded strings.
        */
        static hex_rmd160(s)            { return this.rstr2hex(this.rstr_rmd160(this.str2rstr_utf8(s))); }
        static b64_rmd160(s)            { return this.rstr2b64(this.rstr_rmd160(this.str2rstr_utf8(s))); }
        static any_rmd160(s, e)         { return this.rstr2any(this.rstr_rmd160(this.str2rstr_utf8(s)), e); }
        static hex_hmac_rmd160(k, d)    { return this.rstr2hex(this.rstr_hmac_rmd160(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
        static b64_hmac_rmd160(k, d)    { return this.rstr2b64(this.rstr_hmac_rmd160(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); }
        static any_hmac_rmd160(k, d, e) { return this.rstr2any(this.rstr_hmac_rmd160(this.str2rstr_utf8(k), this.str2rstr_utf8(d)), e); }
    
    
        /*
        * Perform a simple self-test to see if the VM is working.
        */
        static rmd160_vm_test() {
        return this.hex_rmd160("abc").toLowerCase() == "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc";
        }
    
    
        /*
        * Calculate the rmd160 of a raw string.
        */
        static rstr_rmd160(s) {
        return this.binl2rstr(this.binl_rmd160(this.rstr2binl(s), s.length * 8));
        }
    
    
        /*
        * Calculate the HMAC-rmd160 of a key and some data (raw strings).
        */
        static rstr_hmac_rmd160(key, data) {
        var bkey = this.rstr2binl(key);
        if (bkey.length > 16) {
            bkey = this.binl_rmd160(bkey, key.length * 8);
        }
    
        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
    
        var hash = this.binl_rmd160(ipad.concat(this.rstr2binl(data)), 512 + data.length * 8);
        return this.binl2rstr(this.binl_rmd160(opad.concat(hash), 512 + 160));
        }
    
        /*
        * Calculate the RIPE-MD160 of an array of little-endian words, and a bit length.
        */
        static binl_rmd160(x, len) {
        // Append padding
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;
    
        var h0 = 0x67452301;
        var h1 = 0xefcdab89;
        var h2 = 0x98badcfe;
        var h3 = 0x10325476;
        var h4 = 0xc3d2e1f0;
    
        for (var i = 0; i < x.length; i += 16) {
            var T;
            var A1 = h0, B1 = h1, C1 = h2, D1 = h3, E1 = h4;
            var A2 = h0, B2 = h1, C2 = h2, D2 = h3, E2 = h4;
            for (var j = 0; j <= 79; ++j) {
            T = this.safe_add(A1, this.rmd160_f(j, B1, C1, D1));
            T = this.safe_add(T, x[i + this.rmd160_r1[j]]);
            T = this.safe_add(T, this.rmd160_K1(j));
            T = this.safe_add(this.bit_rol(T, this.rmd160_s1[j]), E1);
            A1 = E1; E1 = D1; D1 = this.bit_rol(C1, 10); C1 = B1; B1 = T;
            T = this.safe_add(A2, this.rmd160_f(79-j, B2, C2, D2));
            T = this.safe_add(T, x[i + this.rmd160_r2[j]]);
            T = this.safe_add(T, this.rmd160_K2(j));
            T = this.safe_add(this.bit_rol(T, this.rmd160_s2[j]), E2);
            A2 = E2; E2 = D2; D2 = this.bit_rol(C2, 10); C2 = B2; B2 = T;
            }
            T = this.safe_add(h1, this.safe_add(C1, D2));
            h1 = this.safe_add(h2, this.safe_add(D1, E2));
            h2 = this.safe_add(h3, this.safe_add(E1, A2));
            h3 = this.safe_add(h4, this.safe_add(A1, B2));
            h4 = this.safe_add(h0, this.safe_add(B1, C2));
            h0 = T;
        }
        return [h0, h1, h2, h3, h4];
        }
    
        static rmd160_f(j, x, y, z) {
        return ( 0 <= j && j <= 15) ? (x ^ y ^ z) :
            (16 <= j && j <= 31) ? (x & y) | (~x & z) :
            (32 <= j && j <= 47) ? (x | ~y) ^ z :
            (48 <= j && j <= 63) ? (x & z) | (y & ~z) :
            (64 <= j && j <= 79) ? x ^ (y | ~z) :
            "rmd160_f: j out of range";
        }
    
        static rmd160_K1(j) {
        return ( 0 <= j && j <= 15) ? 0x00000000 :
            (16 <= j && j <= 31) ? 0x5a827999 :
            (32 <= j && j <= 47) ? 0x6ed9eba1 :
            (48 <= j && j <= 63) ? 0x8f1bbcdc :
            (64 <= j && j <= 79) ? 0xa953fd4e :
            "rmd160_K1: j out of range";
        }
    
    
        static rmd160_K2(j) {
        return ( 0 <= j && j <= 15) ? 0x50a28be6 :
            (16 <= j && j <= 31) ? 0x5c4dd124 :
            (32 <= j && j <= 47) ? 0x6d703ef3 :
            (48 <= j && j <= 63) ? 0x7a6d76e9 :
            (64 <= j && j <= 79) ? 0x00000000 :
            "rmd160_K2: j out of range";
        }
    
    
        static rmd160_r1 = [
        0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
        7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
        3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
        1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
        4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13
        ];
        static rmd160_r2 = [
        5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
        6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
        15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
        8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
        12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11
        ];
        static rmd160_s1 = [
        11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
        7,  6,  8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
        11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
        11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
        9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6
        ];
        static rmd160_s2 = [
        8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
        9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
        9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
        15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
        8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11
        ];
    }
`;
/* </helpers> */

const getApiUrl = (env: EnvType) => {
    return binanceUrlSelector[env] || binanceUrlSelector['demo'];
};

const getAccount = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        proxyUrl: string,
        payload: {
            credentials: {
                apiKey: string,
                apiSecret: string,
            },
        },
    },
) => {
    const {
        env,
        proxyUrl,
        payload,
        source,
    } = params;

    const requestUrl = getApiUrl(env);

    let response = null as any;

    if (source === 'fetch') {

        const apiKey = payload.credentials?.apiKey
        const apiSecret = payload?.credentials.apiSecret;

        const queryString = objectToQueryString({
            timestamp: Date.now(),
            recvWindow: 60000,
        });

        const signature = JHash.hex_hmac_sha256(apiSecret, queryString);

        const proxyOptions = {
            method: 'POST',
            body: JSON.stringify({
                url: `${requestUrl}/v3/account` + '?' + queryString + '&signature=' + signature,
                method: 'GET',
                headers: {
                    'User-Agent': 'PostmanRuntime/7.29.2',
                    'X-MBX-APIKEY': apiKey,
                    'Content-Type': 'application/json',
                },
            }),
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const res = await fetch(proxyUrl, proxyOptions);
        const data = await res.json();

        if (data?.balances?.length > 0) {
            data.balances = data?.balances?.filter((item) => {
                const free = Number(item?.free);
                return free > 0
            });
        };

        const assets = data?.balances?.map((item) => item.asset);

        data.assets = assets;

        response = data;
    }

    if (source === 'lit-action') {
        const code = `
        ${JHashTemplate}

        const go = async () => {

            const apiKey = credentials.apiKey;
            const apiSecret = credentials.apiSecret;

            ${objectToQueryStringTemplate}

            const queryString = objectToQueryString({
                timestamp: Date.now(),
                recvWindow: 60000,
            });

            const signature = JHash.hex_hmac_sha256(apiSecret, queryString);

            const proxyUrl = '${proxyUrl}';

            const proxyOptions = {
                method: 'POST',
                body: JSON.stringify({
                    url: '${requestUrl}/v3/account' + '?' + queryString + '&signature=' + signature,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'PostmanRuntime/7.29.2',
                        'X-MBX-APIKEY': apiKey,
                        'Content-Type': 'application/json',
                    },
                }),
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            const response = await fetch(proxyUrl, proxyOptions);

            const data = await response.json();

            if (data?.balances?.length > 0) {
                data.balances = data?.balances?.filter((item) => {
                    const free = Number(item?.free);
                    return free > 0
                });
            };

            const assets = data?.balances?.map((item) => item.asset);

            data.assets = assets;

            Lit.Actions.setResponse({response: JSON.stringify(data)});

        };

        go();
    `;

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: payload,
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;
    }

    return response;
};

const getPortfolioAccount = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        proxyUrl: string,
        payload: {
            credentials: {
                apiKey: string,
                apiSecret: string,
            },
            defaultBaseCurrency: string,
        },
    },
) => {
    const {
        env,
        proxyUrl,
        payload,
        source,
    } = params;

    const requestUrl = getApiUrl(env);

    let response = null as any;

    const defaultBaseCurrency = payload?.defaultBaseCurrency || 'USDT';

    if (source === 'fetch') {

        const apiKey = payload.credentials?.apiKey
        const apiSecret = payload?.credentials.apiSecret;

        const queryString = objectToQueryString({
            timestamp: Date.now(),
            recvWindow: 60000,
        });

        const signature = JHash.hex_hmac_sha256(apiSecret, queryString);

        const proxyOptions = {
            method: 'POST',
            body: JSON.stringify({
                url: `${requestUrl}/v3/account` + '?' + queryString + '&signature=' + signature,
                method: 'GET',
                headers: {
                    'User-Agent': 'PostmanRuntime/7.29.2',
                    'X-MBX-APIKEY': apiKey,
                    'Content-Type': 'application/json',
                },
            }),
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const res = await fetch(proxyUrl, proxyOptions);
        const data = await res.json();

        if (data?.balances?.length > 0) {
            data.balances = data?.balances?.filter((item) => {
                const free = Number(item.free);
                return free > 0
            });

            data.balances = data?.balances?.map((item) => {
                const free = Number(item.free);
                const locked = Number(item.locked);
                item.free = free;
                item.locked = locked;
                return item;
            });

            let baseCurrencyBalance = 0;

            // to handle cases with USDT, BUSD, etc.
            if (defaultBaseCurrency.includes('USD')) {
                baseCurrencyBalance =
                    data?.balances?.filter((item) => item.asset.includes('USD'))?.reduce((acc, item) => {
                        return acc + Number(item.free);
                    }, 0) || 0;
            } else {
                baseCurrencyBalance =
                    data?.balances?.find((item) => item.asset === defaultBaseCurrency)?.free || 0;
                baseCurrencyBalance = Number(baseCurrencyBalance);
            };

            const assets = data?.balances?.map((item) => item.asset + defaultBaseCurrency);

            const getCurrentAssetPrice = await Promise.all(
                assets.map(async (symbol) => {
                    const url = `${requestUrl}/v3/ticker/price?symbol=` + symbol;
                    const options = {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'PostmanRuntime/7.29.2',
                            'Content-Type': 'application/json'
                        }
                    };
                    const request = await fetch(url, options);
                    const response = await request.json();
                    return response;
                })
            );

            const assetsWithPrice = data?.balances?.map((item) => {
                const symbol = item.asset + defaultBaseCurrency;
                const assetPrice = getCurrentAssetPrice.find((item) => item.symbol === symbol);
                const price = Number(assetPrice?.price) || 0;
                item.baseCurrencyPrice = price;
                item.baseCurrencyFree = price * item.free;
                item.baseCurrencyLocked = price * item.locked;
                return item;
            });

            const totalBaseCurrency = assetsWithPrice.reduce((acc, item) => {
                return acc + item.baseCurrencyFree;
            }, 0);

            data.baseCurrencyTotal = totalBaseCurrency + baseCurrencyBalance;
            data.baseCurrency = defaultBaseCurrency;

            data.portfolio = data.balances;
            delete data.balances;

            data.portfolio = data.portfolio.map((item) => {
                const baseCurrencyFree = Number(item.baseCurrencyFree || item.free);
                const baseCurrencyLocked = Number(item.baseCurrencyLocked || item.locked);
                item.baseCurrencyFree = baseCurrencyFree;
                item.baseCurrencyLocked = baseCurrencyLocked;
                return item;
            });
        };

        response = data;
    }

    if (source === 'lit-action') {
        const code = `
        ${JHashTemplate}

        const go = async () => {

        const apiKey = credentials.apiKey;
        const apiSecret = credentials.apiSecret;

        ${objectToQueryStringTemplate}

        const payload = {
            timestamp: Date.now(),
            recvWindow: 60000,
        };

        const queryString = objectToQueryString(payload);
        const signature = JHash.hex_hmac_sha256(apiSecret, queryString);

        const proxyUrl = '${proxyUrl}';

        const proxyOptions = {
            method: 'POST',
            body: JSON.stringify({
                url: '${requestUrl}/v3/account' + '?' + queryString + '&signature=' + signature,
                method: 'GET',
                headers: {
                    'User-Agent': 'PostmanRuntime/7.29.2',
                    'X-MBX-APIKEY': apiKey,
                    'Content-Type': 'application/json',
                },
            }),
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const response = await fetch(proxyUrl, proxyOptions);

        const data = await response.json();

        if (data?.balances?.length > 0) {
            data.balances = data?.balances?.filter((item) => {
                const free = Number(item.free);
                return free > 0
            });

            data.balances = data?.balances?.map((item) => {
                const free = Number(item.free);
                const locked = Number(item.locked);
                item.free = free;
                item.locked = locked;
                return item;
            });

            let baseCurrencyBalance = 0;
            
            // to handle cases with USDT, BUSD, etc.
            if('${defaultBaseCurrency}'.includes('USD')) {
                baseCurrencyBalance =
                    data?.balances?.filter((item) => item.asset.includes('USD'))?.reduce((acc, item) => {
                        return acc + Number(item.free);
                    }, 0) || 0;
            } else {
                baseCurrencyBalance = 
                    data?.balances?.find((item) => item.asset === '${defaultBaseCurrency}')?.free || 0;
                baseCurrencyBalance = Number(baseCurrencyBalance);
            };

            const assets = data?.balances?.map((item) => item.asset + '${defaultBaseCurrency}');

            const getCurrentAssetPrice = await Promise.all(
                assets.map(async (symbol) => {
                    const url = '${requestUrl}/v3/ticker/price?symbol=' + symbol;
                    const options = {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'PostmanRuntime/7.29.2',
                            'Content-Type': 'application/json'
                        }
                    };
                    const request = await fetch(url, options); 
                    const response = await request.json();
                    return response;
                })
            );

            const assetsWithPrice = data?.balances?.map((item) => {
                const symbol = item.asset + '${defaultBaseCurrency}';
                const assetPrice = getCurrentAssetPrice.find((item) => item.symbol === symbol);
                const price = Number(assetPrice?.price) || 0;
                item.baseCurrencyPrice = price;
                item.baseCurrencyFree = price * item.free;
                item.baseCurrencyLocked = price * item.locked;
                return item;
            });

            const totalBaseCurrency = assetsWithPrice.reduce((acc, item) => {
                return acc + item.baseCurrencyFree;
            }, 0);

            data.baseCurrencyTotal = totalBaseCurrency + baseCurrencyBalance;
            data.baseCurrency = '${defaultBaseCurrency}';
            
            data.portfolio = data.balances;
            delete data.balances;

            data.portfolio = data.portfolio.map((item) => {
                const baseCurrencyFree = Number(item.baseCurrencyFree || item.free);
                const baseCurrencyLocked = Number(item.baseCurrencyLocked || item.locked);
                item.baseCurrencyFree = baseCurrencyFree;
                item.baseCurrencyLocked = baseCurrencyLocked;
                return item;
            });
        };  

            Lit.Actions.setResponse({response: JSON.stringify(data)});

        };

        go();
    `;

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: payload,
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;
    }

    return response;
};

const getAssetPrice = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        symbol: string,
    }
) => {
    const {
        env,
        symbol,
        source,
    } = params;

    const requestUrl = getApiUrl(env);

    let response = null as any;

    if (source === 'fetch') {
        const url = `${requestUrl}/v3/ticker/price?symbol=${symbol}`;

        const options = {
            method: 'GET',
            headers: {
                'User-Agent': 'PostmanRuntime/7.29.2',
                'Content-Type': 'application/json',
            },
        }

        const res = await fetch(url, options);
        const data = await res.json();

        if (data?.symbol === symbol) {
            data.price = Number(data.price);
        }

        response = data;
    }

    if (source === 'lit-action') {
        const code = `

        const go = async () => {

            const url =
                '${requestUrl}/v3/ticker/price?symbol=${symbol}';

            const options = {
                method: 'GET',
                headers: {
                'User-Agent': 'PostmanRuntime/7.29.2',
                'Content-Type': 'application/json',
                },
            }

            const response = await fetch(url, options);

            const data = await response.json();

            if(data?.symbol === '${symbol}') {
                data.price = Number(data.price);
            }

            Lit.Actions.setResponse({response: JSON.stringify(data)});

        };

        go();
    `;

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: {
                symbol,
            },
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;
    }

    return response;
};

const getAssetInfo = async (
    network: string,
    pkpAuthSig: any,
    params: {
        source: FetcherSource,
        symbol: string,
    }
) => {
    const {
        symbol,
        source,
    } = params;

    let response = null as any;

    if (source === 'fetch') {

        const url =
            `https://www.binance.com/bapi/asset/v2/public/asset-service/product/get-product-by-symbol?symbol=${symbol}`;

        const options = {
            method: 'GET',
            headers: {
                'User-Agent': 'PostmanRuntime/7.29.2',
                'Content-Type': 'application/json',
            },
        }

        const res = await fetch(url, options);
        const data = await res.json();

        response = data;
    }

    if (source === 'lit-action') {

        const code = `

            const go = async () => {

                const url =
                    'https://www.binance.com/bapi/asset/v2/public/asset-service/product/get-product-by-symbol?symbol=${symbol}';

                const options = {
                    method: 'GET',
                    headers: {
                    'User-Agent': 'PostmanRuntime/7.29.2',
                    'Content-Type': 'application/json',
                    },
                }

                const response = await fetch(url, options);

                const data = await response.json();

                Lit.Actions.setResponse({response: JSON.stringify(data)});

            };

            go();
        `;

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: {
                symbol,
            },
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        const response = litActionCall?.response as any;
    }

    return response;

};

const placeOrder = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        proxyUrl: string,
        payload: {
            credentials: {
                apiKey: string,
                apiSecret: string,
            },
            form: {
                asset,
                direction,
                quantity,
            },
        }
    }
) => {

    const {
        env,
        proxyUrl,
        source,
    } = params;

    const requestUrl = getApiUrl(env);

    let response = null as any;

    if (source === 'fetch') {

        const apiKey = params?.payload?.credentials?.apiKey;
        const apiSecret = params?.payload?.credentials?.apiSecret;

        const side = params?.payload?.form?.direction?.toUpperCase();
        const symbol = params?.payload?.form?.asset?.toString();
        let quantity = params?.payload?.form?.quantity?.toString();

        let payload: any = {
            timestamp: Date.now(),
            recvWindow: 60000,
        };

        let queryString = objectToQueryString(payload);
        let signature = JHash.hex_hmac_sha256(apiSecret, queryString);

        if (side === 'SELL') {

            const accountInfoRequest = await fetch(proxyUrl, {
                method: 'POST',
                body: JSON.stringify({
                    url: `${requestUrl}/v3/account` + '?' + queryString + '&signature=' + signature,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'PostmanRuntime/7.29.2',
                        'X-MBX-APIKEY': apiKey,
                        'Content-Type': 'application/json',
                    },
                }),
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const accountInfo = await accountInfoRequest.json();

            accountInfo.balances = accountInfo?.balances?.filter((item) => {
                const free = Number(item?.free);
                return free > 0
            });

            accountInfo.balances = accountInfo?.balances?.map((item) => {
                const free = Number(item?.free);
                const locked = Number(item?.locked);
                item.free = free;
                item.locked = locked;
                return item;
            });

            const assetInfoToSell =
                accountInfo?.balances?.find(res => symbol.startsWith(res.asset));

            quantity = assetInfoToSell?.free?.toString() || quantity;
        }

        payload = {
            symbol,
            side,
            quantity,
            type: 'MARKET',
            timestamp: Date.now(),
            recvWindow: 60000,
        };

        queryString = objectToQueryString(payload);
        signature = JHash.hex_hmac_sha256(apiSecret, queryString);

        const proxyOptions = {
            method: 'POST',
            body: JSON.stringify({
                url: `${requestUrl}/v3/order` + '?' + queryString + '&signature=' + signature,
                method: 'POST',
                headers: {
                    'User-Agent': 'PostmanRuntime/7.29.2',
                    'X-MBX-APIKEY': apiKey,
                    'Content-Type': 'application/json',
                },
            }),
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const res = await fetch(proxyUrl, proxyOptions);
        const data = await res.json();

        response = {
            request: payload,
            response: data,
        };
    }

    if (source === 'lit-action') {

        const code = `
        ${JHashTemplate}

        const go = async () => {
  
            const apiKey = credentials.apiKey;
            const apiSecret = credentials.apiSecret;
          
            ${objectToQueryStringTemplate}

            const proxyUrl = '${proxyUrl}';

            const side = form.direction.toUpperCase();
            const symbol = form.asset.toString();
            let quantity = form.quantity.toString();

            let payload = {
                timestamp: Date.now(),
                recvWindow: 60000,
            };
      
            let queryString = objectToQueryString(payload);
            let signature = JHash.hex_hmac_sha256(apiSecret, queryString);

            if(side === 'SELL'){

                const accountInfoRequest = await fetch(proxyUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        url: '${requestUrl}/v3/account' + '?' + queryString + '&signature=' + signature,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'PostmanRuntime/7.29.2',
                            'X-MBX-APIKEY': apiKey,
                            'Content-Type': 'application/json',
                        },
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                const accountInfo = await accountInfoRequest.json();

                accountInfo.balances = accountInfo?.balances?.filter((item) => {
                    const free = Number(item?.free);
                    return free > 0
                });
    
                accountInfo.balances = accountInfo?.balances?.map((item) => {
                    const free = Number(item?.free);
                    const locked = Number(item?.locked);
                    item.free = free;
                    item.locked = locked;
                    return item;
                });

                const assetInfoToSell =
                  accountInfo?.balances?.find(res => symbol.startsWith(res.asset));

                quantity = assetInfoToSell.free?.toString() || quantity;
            }

            payload = {
              symbol,
              side,
              quantity,
              type: 'MARKET',
              timestamp: Date.now(),
              recvWindow: 60000,
            };
    
            queryString = objectToQueryString(payload);
            signature = JHash.hex_hmac_sha256(apiSecret, queryString);

            const proxyOptions = {
                method: 'POST',
                body: JSON.stringify({
                    url: '${requestUrl}/v3/order' + '?' + queryString + '&signature=' + signature,
                    method: 'POST',
                    headers: {
                        'User-Agent': 'PostmanRuntime/7.29.2',
                        'X-MBX-APIKEY': apiKey,
                        'Content-Type': 'application/json',
                    },
                }),
                headers: {
                    'Content-Type': 'application/json',
                }
            };
    
            const response = await fetch(proxyUrl, proxyOptions);
      
            const data = await response.json();
    
            Lit.Actions.setResponse({
                response: JSON.stringify({
                    request: payload,
                    response: data,
                })
            });

        };

        go();
    `

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: params?.payload,
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;
    }

    return response;

};

const getQtyWithSymbolPrecision = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        symbol: string,
        usdtAmount: number,
        proxyUrl: string,
    }
) => {
    const {
        env,
        symbol,
        usdtAmount,
        proxyUrl,
        source,
    } = params;

    const requestUrl = getApiUrl(env);

    let response = null as any;

    if (source === 'fetch') {

        let proxyOptions = {
            method: 'POST',
            body: JSON.stringify({
                url: `${requestUrl}/v3/exchangeInfo?symbol=${symbol}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'PostmanRuntime/7.29.2',
                    'Content-Type': 'application/json',
                },
            }),
            headers: {
                'Content-Type': 'application/json',
            }
        };

        let res = await fetch(proxyUrl, proxyOptions);
        let data = await res.json();

        if (data?.symbols?.length <= 0 || !data?.symbols) {
            response = {
                error: data?.msg || 'Symbol not found'
            };
            return response;
        };

        let quantityPrecision =
            data?.symbols
                ?.find((item) => item.symbol === symbol)?.filters
                ?.find((item) => item.filterType === 'LOT_SIZE')?.stepSize;

        quantityPrecision = Number(quantityPrecision);

        const getDecimalCount = (num) => {
            const numStr = String(num);
            const decimalIndex = numStr.indexOf('.');
            if (decimalIndex === -1) {
                return 0;
            } else {
                return numStr.length - decimalIndex - 1;
            }
        };

        const decimalPart = getDecimalCount(quantityPrecision);

        proxyOptions = {
            method: 'POST',
            body: JSON.stringify({
                url: `${requestUrl}/v3/ticker/price?symbol=${symbol}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'PostmanRuntime/7.29.2',
                    'Content-Type': 'application/json',
                },
            }),
            headers: {
                'Content-Type': 'application/json',
            }
        };

        response = await fetch(proxyUrl, proxyOptions);
        data = await response.json();

        const price = Number(data.price);

        let amount = usdtAmount / price;

        let quantity = Number(amount.toFixed(decimalPart));

        response = {
            quantity,
        };

    }

    if (source === 'lit-action') {
        const code = `
            const go = async () => {

                const proxyUrl = '${proxyUrl}';

                let proxyOptions = {
                    method: 'POST',
                    body: JSON.stringify({
                        url: '${requestUrl}/v3/exchangeInfo?symbol=${symbol}',
                        method: 'GET',
                        headers: {
                            'User-Agent': 'PostmanRuntime/7.29.2',
                            'Content-Type': 'application/json',
                        },
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    }
                };
        
                let response = await fetch(proxyUrl, proxyOptions);
                let data = await response.json();

                if(data?.symbols?.length <= 0 || !data?.symbols) {
                    Lit.Actions.setResponse({response: JSON.stringify({
                        error: data?.msg || 'Symbol not found'
                    })});
                    return;
                };

                let quantityPrecision = 
                    data?.symbols
                        ?.find((item) => item.symbol === '${symbol}')?.filters
                        ?.find((item) => item.filterType === 'LOT_SIZE')?.stepSize;

                quantityPrecision = Number(quantityPrecision);

                const getDecimalCount = (num) => {
                    const numStr = String(num);
                    const decimalIndex = numStr.indexOf('.');
                    if (decimalIndex === -1) {
                        return 0;
                    } else {
                        return numStr.length - decimalIndex - 1;
                    }
                };

                const decimalPart = getDecimalCount(quantityPrecision);

                proxyOptions = {
                    method: 'POST',
                    body: JSON.stringify({
                        url:  '${requestUrl}/v3/ticker/price?symbol=${symbol}',
                        method: 'GET',
                        headers: {
                            'User-Agent': 'PostmanRuntime/7.29.2',
                            'Content-Type': 'application/json',
                        },
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    }
                };
        
                response = await fetch(proxyUrl, proxyOptions);
                data = await response.json();

                const price =  Number(data.price);

                let amount = ${usdtAmount} / price;

                let quantity = Number(amount.toFixed(decimalPart));

                Lit.Actions.setResponse({response: JSON.stringify({
                    quantity,
                })});

            };

            go();
        `;

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: {},
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;
    }

    return response;
};

export {
    getAccount,
    getPortfolioAccount,
    placeOrder,
    getAssetPrice,
    getQtyWithSymbolPrecision,
    getAssetInfo,
};