import { btoa, atob } from "@tknf/node-globals/dist/base64";

function myEscape(value: string): string {
  const str = value.toString();
  let result = "";
  let index = 0;
  let chr, code;
  while (index < str.length) {
    // eslint-disable-next-line
    chr = str.charAt(index++);
    if (/[\w*+\-./@]/.exec(chr)) {
      result += chr;
    } else {
      code = chr.charCodeAt(0);
      if (code < 256) {
        result += `%${hex(code, 2)}`;
      } else {
        result += `%u${hex(code, 4).toUpperCase()}`;
      }
    }
  }
  return result;
}

function hex(code: number, length: number): string {
  let result = code.toString(16);
  while (result.length < length) result = `0${result}`;
  return result;
}

// See: https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.unescape.js
function myUnescape(value: string): string {
  const str = value.toString();
  let result = "";
  let index = 0;
  let chr, part;
  while (index < str.length) {
    // eslint-disable-next-line
    chr = str.charAt(index++);
    if (chr === "%") {
      if (str.charAt(index) === "u") {
        part = str.slice(index + 1, index + 5);
        if (/^[\da-f]{4}$/i.exec(part)) {
          result += String.fromCharCode(parseInt(part, 16));
          index += 5;
          continue;
        }
      } else {
        part = str.slice(index, index + 2);
        if (/^[\da-f]{2}$/i.exec(part)) {
          result += String.fromCharCode(parseInt(part, 16));
          index += 2;
          continue;
        }
      }
    }
    result += chr;
  }
  return result;
}

export function encode(value: any): string {
  return btoa(myUnescape(encodeURIComponent(JSON.stringify(value))));
}

export function decode(value: string): any {
  try {
    return JSON.parse(decodeURIComponent(myEscape(atob(value))));
  } catch (error) {
    return {};
  }
}
