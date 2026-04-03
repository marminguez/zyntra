export interface FreestyleErrorInfo {
  status: number;
  message: string;
}

function getStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;

  const candidate = err as {
    response?: { status?: unknown };
    status?: unknown;
  };

  const responseStatus = candidate.response?.status;
  if (typeof responseStatus === "number") return responseStatus;

  return typeof candidate.status === "number" ? candidate.status : undefined;
}

export function mapFreestyleError(err: unknown): FreestyleErrorInfo {
  const status = getStatusCode(err);
  const message = err instanceof Error ? err.message : "Unknown FreeStyle sync error";

  if (status === 401 || status === 403 || /status code 401|status code 403/i.test(message)) {
    return {
      status: 400,
      message:
        "LibreLink authentication failed. Verify email/password and ensure this account has LibreLinkUp sharing enabled.",
    };
  }

  return {
    status: 502,
    message,
  };
}
