import { isCookie, Cookie, CookieOptions, CookieParseOptions, CookieSerializeOptions } from "./cookies";

export interface SessionData {
  [name: string]: any;
}

export class Session {
  private store: Map<string, any>;
  constructor(private $initialData: SessionData = {}, private $id: string = "") {
    this.store = new Map<string, any>(Object.entries(this.$initialData));
  }

  get id() {
    return this.$id;
  }

  get data() {
    return Object.fromEntries(this.store);
  }

  public has(name: string) {
    return this.store.has(name) || this.store.has(flash(name));
  }

  public get(name: string) {
    if (this.store.has(name)) return this.store.get(name);

    const flashName = flash(name);
    if (this.store.has(flashName)) {
      const value = this.store.get(flashName);
      this.store.delete(flashName);
      return value;
    }
  }

  public set(name: string, value: any) {
    this.store.set(name, value);
  }

  public flash(name: string, value: any) {
    this.store.set(flash(name), value);
  }

  public unset(name: string) {
    this.store.delete(name);
  }
}

function flash(name: string): string {
  return `__Flash_${name}__`;
}

export interface CookieSessionStorageOptions {
  cookie?: CookieOptions & {
    name?: string;
  };
}

export abstract class SessionStorageFactory {
  public abstract cookie: Cookie;
  public abstract createData(data: SessionData, expires?: Date): Promise<string>;
  public abstract readData(id: string): Promise<SessionData | null>;
  public abstract updateData(id: string, data: SessionData, expires?: Date): Promise<void>;
  public abstract deleteData(id: string): Promise<void>;
}

export abstract class SessionStorage {
  public cookie: Cookie;
  constructor(_cookie: Cookie | (CookieOptions & { name?: string })) {
    this.cookie = isCookie(_cookie) ? _cookie : new Cookie(_cookie?.name || "_Session", _cookie);
  }

  public abstract getSession(cookieHeader?: string | null, options?: CookieParseOptions): Promise<Session>;
  public abstract commitSession(session: Session, options?: CookieSerializeOptions): Promise<string>;
  public abstract destroySession(session: Session, options?: CookieSerializeOptions): Promise<string>;
}

// Cookie

type StorageCookieOption = Cookie | (CookieOptions & { name?: string });

export class CookieSessionStorage extends SessionStorage {
  constructor(cookie: StorageCookieOption) {
    super(cookie);
    this.cookie = isCookie(cookie) ? cookie : new Cookie(cookie.name || "_Session", cookie);
  }

  public async getSession(cookieHeader?: string | null, options?: CookieParseOptions) {
    return new Session((cookieHeader && (await this.cookie.parse(cookieHeader, options))) || {});
  }

  public async commitSession(session: Session, options?: CookieSerializeOptions) {
    const serializedCookie = await this.cookie.serialize(session.data, options);
    if (serializedCookie.length > 4096) {
      throw new Error(`Cookie length will exceed browser maximum. Length: ${serializedCookie.length}`);
    }
    return serializedCookie;
  }

  public async destroySession(_session: Session, options?: CookieSerializeOptions) {
    return this.cookie.serialize("", {
      ...options,
      expires: new Date(0)
    });
  }
}
