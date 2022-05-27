import { parse, serialize, CookieParseOptions, CookieSerializeOptions } from "cookie";
import { sign, unsign } from "cookie-signature";
import { decode, encode } from "./crypto";

export interface CookieSignatureOptions {
  secrets?: string[];
}

export type CookieOptions = CookieParseOptions & CookieSerializeOptions & CookieSignatureOptions;

export { CookieParseOptions, CookieSerializeOptions };

export class Cookie {
  private options: CookieOptions;
  constructor(public name: string, private $options: CookieOptions = {}) {
    this.options = {
      secrets: [],
      path: "/",
      ...$options
    };
  }

  get secrets() {
    return this.options.secrets || [];
  }

  get isSigned() {
    return this.secrets.length > 0;
  }

  get expires() {
    return typeof this.$options.maxAge !== "undefined"
      ? new Date(Date.now() + this.$options.maxAge * 1000)
      : this.$options.expires;
  }

  public async parse(cookieHeader: string | null, options?: CookieParseOptions) {
    if (!cookieHeader) return null;

    const { secrets, ...opts } = this.options;
    const cookies = parse(cookieHeader, {
      ...opts,
      ...options
    });
    return this.name in cookies
      ? cookies[this.name] === ""
        ? ""
        : await decodeCookieValue(cookies[this.name], this.secrets)
      : null;
  }

  public async serialize(value: any, options?: CookieSerializeOptions) {
    const { secrets, ...opts } = this.options;
    return serialize(this.name, value === "" ? "" : await encodeCookieValue(value, this.secrets), {
      ...opts,
      ...options
    });
  }
}

async function encodeCookieValue(value: any, secrets: string[]): Promise<string> {
  let encoded = encode(value);

  if (secrets.length > 0) {
    encoded = await sign(encoded, secrets[0]);
  }

  return encoded;
}

async function decodeCookieValue(value: string, secrets: string[]): Promise<any> {
  if (secrets.length > 0) {
    for (const secret of secrets) {
      const unsigned = await unsign(value, secret);
      if (unsigned !== false) {
        return decode(unsigned);
      }
    }

    return null;
  }

  return decode(value);
}

export function isCookie(value: any): value is Cookie {
  return (
    value !== null &&
    typeof value.name === "string" &&
    typeof value.isSigned === "boolean" &&
    typeof value.parse === "function" &&
    typeof value.serialize === "function"
  );
}
