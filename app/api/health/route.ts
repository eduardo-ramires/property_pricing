import { NextResponse } from "next/server";
import { createClient } from "redis";
import { prisma } from "@/lib/db/client";

async function checkDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}

async function checkRedis() {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  await client.ping();
  await client.disconnect();
}

export async function GET() {
  const [database, redis] = await Promise.allSettled([checkDatabase(), checkRedis()]);

  const status = {
    database: database.status === "fulfilled" ? "ok" : "error",
    redis: redis.status === "fulfilled" ? "ok" : "error",
  };

  const healthy = database.status === "fulfilled" && redis.status === "fulfilled";

  return NextResponse.json({ status: healthy ? "ok" : "degraded", ...status }, {
    status: healthy ? 200 : 503,
  });
}
