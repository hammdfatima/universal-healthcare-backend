import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as Phrases from "stoker/http-status-phrases";
import { ZodError } from "zod";
import { HttpError } from "~/lib/error";

const onError: ErrorHandler = (err, c) => {
  const env =
    c.env?.NODE_ENV ?? process.env.NODE_ENV ?? Bun.env.NODE_ENV ?? "development";
  const isProduction = env === "production";

  // HIPAA §3.2: never leak stack traces / raw error details to logs in production.
  if (isProduction) {
    console.error(`[error] ${err.name}: ${err.message}`);
  } else {
    console.error(err);
  }

  // 🧩 1. Handle validation errors from Zod (v4)
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        message: "Validation failed",
        ...(isProduction ? {} : { issues: err.issues }),
      },
      HttpStatusCodes.BAD_REQUEST as ContentfulStatusCode,
    );
  }

  // 🧩 2. Handle custom HttpError
  if (err instanceof HttpError) {
    return c.json(
      {
        success: false,
        message: err.message,
      },
      err.statusCode as ContentfulStatusCode,
    );
  }

  // 🧩 3. Handle other/unexpected errors
  const currentStatus = "status" in err ? err.status : c.res.status;
  const statusCode =
    currentStatus !== HttpStatusCodes.OK
      ? (currentStatus as StatusCode)
      : (HttpStatusCodes.INTERNAL_SERVER_ERROR as StatusCode);

  return c.json(
    {
      success: false,
      message: isProduction ? Phrases.INTERNAL_SERVER_ERROR : err.message || Phrases.INTERNAL_SERVER_ERROR,
      stack: isProduction ? undefined : err.stack,
    },
    statusCode as ContentfulStatusCode,
  );
};

export default onError;
