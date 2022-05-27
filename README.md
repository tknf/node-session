# @tknf/node-session

## Get Started
### Install
```bash
yarn add @tknf/node-session
# or
npm install --save @tknf/node-session
```

### Use on express
```js
import express from "express";
import { } from "@tknf/node-session";

const MySession = new CookieSessionStorage({
  name: "MyCookieSession"
});

const app = express();

app.get("/", async (req, res) => {
  const session = await MySession.getSession(req.header("Cookie"));
  session.set("view", 1);
  return res.set("Set-Cookie", await MySession.commitSession(session))
});
```

### Create your session strategy
```js
import { Redis } from "ioredis";
import { SessionStorageFactory, isCookie, Cookie } from "@tknf/node-session";
import crypto from "crypto";

const expiresToSeconds = (expires) => {
  const now = new Date();
  const expiresDate = new Date(expires || Date.now());
  const secondsDelta = expiresDate.getSeconds() - now.getSeconds();
  return secondsDelta < 0 ? 0 : secondsDelta;
};

class RedisSessionFactory extends SessionStorageFactory {
  constructor(private redis) {
    super();
  }

  public async createData(data: SessionData, expires) {
    const id = crypto.randomBytes(20).toString("base64");
    await this.redis.pipeline().set(id, JSON.stringify(data)).expire(id, expiresToSeconds(expires)).exec();
    return id;
  }

  public async readData(id: string) {
    try {
      const data = await this.redis.get(id);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      return null;
    }
  }

  public async updateData(id: string, data: SessionData, expires) {
    await this.redis.pipeline().set(id, JSON.stringify(data)).expire(id, expiresToSeconds(expires)).exec();
  }

  public async deleteData(id: string) {
    await this.redis.pipeline().del(id).exec();
  }
}

export class RedisSessionStorage extends SessionStorage {
  private factory: SessionStorageFactory;

  constructor(redis: Redis, cookie) {
    super(cookie);
    this.cookie = isCookie(cookie) ? cookie : new Cookie(cookie.name, cookie);
    this.factory = new RedisSessionFactory(redis)
  }

  public async getSession(cookieHeader?: string | null, options?: CookieParseOptions) {
    const id = cookieHeader && (await this.cookie.parse(cookieHeader, options));
    const data = id && (await this.factory.readData(id));
    return new Session(data || {}, id || "");
  }

  public async commitSession(session: Session, options?: CookieSerializeOptions) {
    let { id, data } = session;
    if (id) {
      await this.factory.updateData(id, data, this.cookie.expires);
    } else {
      id = await this.factory.createData(data, this.cookie.expires);
    }
    return this.cookie.serialize(id, options);
  }

  public async destroySession(session: Session, options?: CookieSerializeOptions) {
    await this.factory.deleteData(session.id);
    return this.cookie.serialize("", {
      ...options,
      expires: new Date(0)
    });
  }
}
```