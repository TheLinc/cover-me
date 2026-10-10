import * as Sentry from "@sentry/nextjs";
import { sentryEnvironment } from "@/lib/sentry-env";

const environment = sentryEnvironment();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,

  sendDefaultPii: false,

  tracesSampleRate: environment === "development" ? 1.0 : 0.1,

  beforeSend(event) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
    }

    if (event.user?.email) {
      event.user = { id: event.user.id };
    }

    return event;
  },
});
