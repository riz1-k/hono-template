import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import * as jwt from "hono/jwt";

import { db } from "@/server/db";
import { refreshTokens, users } from "@/server/db/schema";

import { COOKIE_NAME, cookieOptions } from "../configs/cookie";
import { env } from "../configs/env";

export type TPayload = Pick<
  typeof users.$inferSelect,
  "id" | "email" | "role"
> & {};

const jwtExpiration = new Date(Date.now() + 60 * 60 * 24 * 1000);

export async function generateJWT(user: TPayload) {
  return await jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(jwtExpiration.getTime() / 1000),
    },
    env.JWT_SECRET
  );
}

export async function setJWTCookie(c: Context, user: TPayload) {
  const jwt = await generateJWT(user);
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
  await db.insert(refreshTokens).values({
    token: jwt,
    userId: user.id,
    expiresAt: jwtExpiration,
  });
  await setSignedCookie(c, COOKIE_NAME, jwt, env.JWT_SECRET, cookieOptions);
}

export const verifyAuth = createMiddleware<{
  Variables: {
    user: TPayload;
  };
}>(async (c, next) => {
  const token = await getSignedCookie(c, env.JWT_SECRET, COOKIE_NAME);
  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const storedToken = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.token, token),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!storedToken) {
    return c.json({ message: "Refresh Token Not Found" }, 401);
  }

  if (new Date() > storedToken.expiresAt) {
    await signOut(c, storedToken.user);
    return c.json({ message: "Refresh Token Expired" }, 401);
  }

  c.set("user", storedToken.user);
  return next();
});

export async function signOut(c: Context, user: TPayload) {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
  deleteCookie(c, COOKIE_NAME, cookieOptions);
}
