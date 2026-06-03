import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const isProduction = process.env.NODE_ENV === "production";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function safeErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (!isProduction && error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requestKey(req: Request, bucket: string) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return `${bucket}:${forwardedFor || realIp || "local"}`;
}

export function checkRateLimit(req: Request, bucket: string, options: RateLimitOptions) {
  const now = Date.now();
  const key = requestKey(req, bucket);
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      limited: false,
      retryAfter: 0,
    };
  }

  current.count += 1;

  if (current.count > options.limit) {
    return {
      limited: true,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  return {
    limited: false,
    retryAfter: 0,
  };
}

export function rateLimitResponse(retryAfter: number) {
  return json(
    {
      ok: false,
      error: "Too many requests. Please try again shortly.",
      retryAfter,
    },
    429,
  );
}

export async function requireUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    if (!isProduction) {
      return {
        supabase: null,
        user: null,
        response: null,
      };
    }

    return {
      supabase: null,
      user: null,
      response: json(
        {
          ok: false,
          error: "Supabase is not configured on the server.",
        },
        500,
      ),
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
      response: json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        401,
      ),
    };
  }

  return {
    supabase,
    user,
    response: null,
  };
}
