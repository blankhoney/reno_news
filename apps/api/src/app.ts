import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions
} from "fastify";
import fastifyCookie from "@fastify/cookie";
import type { AuthLoginFailureReason, AuthUser } from "@reno-news/contracts";
import {
  BoardNotFoundError,
  createAuditRepository,
  createAuthRepository,
  createDigestEditionRepository,
  createFeedbackRepository,
  createFailureQueueRepository,
  createPersonalStateRepository,
  createRawEntryRepository,
  createReaderRepository,
  createSourceRepository,
  isUniqueViolation,
  type AuditRepository,
  type CreateSourceInput,
  type DigestEditionRepository,
  type FailureQueueRecord,
  type FeedbackRepository,
  type FailureQueueRepository,
  type PersonalStateRepository,
  type RawEntryRepository,
  type ReaderRepository,
  type SourceRepository,
  type UpdateSourceInput
} from "@reno-news/db";
import { createAuthService, type AuthService } from "./auth";

type AppDependencies = {
  authService?: AuthService;
  auditRepository?: AuditRepository;
  sourceRepository?: SourceRepository;
  rawEntryRepository?: RawEntryRepository;
  readerRepository?: ReaderRepository;
  personalStateRepository?: PersonalStateRepository;
  digestEditionRepository?: DigestEditionRepository;
  feedbackRepository?: FeedbackRepository;
  failureQueueRepository?: FailureQueueRepository;
};

type SourceParams = {
  id: string;
};

type DigestEditionKeyParams = {
  editionKey: string;
};

type ReaderItemsQuery = {
  board?: string;
};

type ReaderSearchQuery = {
  q: string;
  board?: string;
};

type ReaderRelatedItemsQuery = {
  limit?: number;
};

type ReaderDigestQuery = {
  board?: string;
  limit?: number;
};

type DigestEditionGenerateBody = {
  editionDate: string;
  boardSlug?: string;
  limit?: number;
};

type ReaderFeedbackBody = {
  feedbackType: "correction" | "quality_issue" | "duplicate" | "broken_link" | "rights_concern";
  message?: string;
};

type PersonalStateMutationBody = {
  itemId: number;
  active: boolean;
};

type ReadStatusMutationBody = {
  itemId: number;
  status: "unread" | "read";
};

type FeedbackReviewBody = {
  reviewStatus: "open" | "reviewed" | "dismissed" | "resolved";
  reviewNote?: string;
};

type FailureQueueQuery = {
  limit?: number;
};

type AuditEventsQuery = {
  limit?: number;
};

type RawEntryLifecycleBody = {
  action: "hide" | "restore";
};

type AuthLoginBody = {
  email: string;
  password: string;
};

type AdminRequest = FastifyRequest & {
  adminUser?: AuthUser;
};

type CurrentUserRequest = FastifyRequest & {
  currentUser?: AuthUser;
};

type TraceRequest = FastifyRequest & {
  traceRequestId?: string;
};

class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is required");
    this.name = "DatabaseNotConfiguredError";
  }
}

const sourceTypes = ["rss", "atom", "github", "arxiv"];
const saveLevels = ["metadata_only", "excerpt", "snapshot", "full_text"];
const rightsPolicies = [
  "blocked",
  "metadata_only",
  "private_allowed",
  "public_excerpt_allowed",
  "public_fulltext_allowed"
];
const translationPolicies = ["none", "private_only", "public_excerpt", "public_fulltext"];
const riskLevels = ["low", "medium", "high"];
const rawEntryLifecycleActions = ["hide", "restore"];
const feedbackReviewStatuses = ["open", "reviewed", "dismissed", "resolved"];
const readStatusValues = ["unread", "read"] as const;
const failureStages = ["source_ingest", "extraction", "model_call"] as const;
const feedbackTypes = [
  "correction",
  "quality_issue",
  "duplicate",
  "broken_link",
  "rights_concern"
];
const authSessionCookieName = "reno_news_session";
const requestIdHeaderName = "x-request-id";
const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const authLoginFailureStatuses: Record<AuthLoginFailureReason, number> = {
  invalid_credentials: 401,
  invite_required: 403,
  user_disabled: 403,
  session_expired: 401,
  rate_limited: 429
};

const sourcePolicySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    crawlEnabled: { type: "boolean" },
    fetchIntervalMinutes: { type: "integer", minimum: 1 },
    maxRequestsPerHour: { type: "integer", minimum: 1 },
    saveLevel: { type: "string", enum: saveLevels },
    rightsPolicy: { type: "string", enum: rightsPolicies },
    translationPolicy: { type: "string", enum: translationPolicies },
    riskLevel: { type: "string", enum: riskLevels }
  }
};

const createSourceBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["boardSlug", "sourceType", "title", "url"],
  properties: {
    boardSlug: { type: "string", minLength: 1 },
    sourceType: { type: "string", enum: sourceTypes },
    title: { type: "string", minLength: 1 },
    url: { type: "string", minLength: 1 },
    enabled: { type: "boolean" },
    policy: sourcePolicySchema
  }
};

const updateSourceBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: createSourceBodySchema.properties
};

const sourceParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "integer", minimum: 1 }
  }
};

const failureQueueQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 200 }
  }
};

const feedbackQuerySchema = failureQueueQuerySchema;

const readerRelatedItemsQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 12 }
  }
};

const readerDigestQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    board: { type: "string", minLength: 1 },
    limit: { type: "integer", minimum: 1, maximum: 24 }
  }
};

const digestEditionKeyParamsSchema = {
  type: "object",
  required: ["editionKey"],
  properties: {
    editionKey: { type: "string", minLength: 1 }
  }
};

const digestEditionGenerateBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["editionDate"],
  properties: {
    editionDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    boardSlug: { type: "string", minLength: 1 },
    limit: { type: "integer", minimum: 1, maximum: 24 }
  }
};

const readerSearchQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["q"],
  properties: {
    q: { type: "string", minLength: 1, pattern: "\\S" },
    board: { type: "string", minLength: 1 }
  }
};

const readerFeedbackBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["feedbackType"],
  properties: {
    feedbackType: { type: "string", enum: feedbackTypes },
    message: { type: "string", minLength: 1, maxLength: 2000, pattern: "\\S" }
  }
};

const personalStateMutationBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["itemId", "active"],
  properties: {
    itemId: { type: "integer", minimum: 1 },
    active: { type: "boolean" }
  }
};

const readStatusMutationBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["itemId", "status"],
  properties: {
    itemId: { type: "integer", minimum: 1 },
    status: { type: "string", enum: readStatusValues }
  }
};

const feedbackReviewBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["reviewStatus"],
  properties: {
    reviewStatus: { type: "string", enum: feedbackReviewStatuses },
    reviewNote: { type: "string", minLength: 1, maxLength: 2000, pattern: "\\S" }
  }
};

const rawEntryLifecycleBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: { type: "string", enum: rawEntryLifecycleActions }
  }
};

const authLoginBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password"],
  properties: {
    email: { type: "string", minLength: 3, pattern: "^[^\\s@]+@[^\\s@]+$" },
    password: { type: "string", minLength: 1 }
  }
};

export function buildApp(options: FastifyServerOptions = {}, dependencies: AppDependencies = {}) {
  const app = Fastify({
    ajv: {
      customOptions: {
        removeAdditional: false
      }
    },
    ...options
  });
  app.register(fastifyCookie);

  const authService = dependencies.authService ?? authServiceFromEnvironment(app);
  const auditRepository =
    dependencies.auditRepository ?? auditRepositoryFromEnvironment(app);
  const sourceRepository = dependencies.sourceRepository ?? sourceRepositoryFromEnvironment(app);
  const rawEntryRepository =
    dependencies.rawEntryRepository ?? rawEntryRepositoryFromEnvironment(app);
  const readerRepository = dependencies.readerRepository ?? readerRepositoryFromEnvironment(app);
  const personalStateRepository =
    dependencies.personalStateRepository ?? personalStateRepositoryFromEnvironment(app);
  const digestEditionRepository =
    dependencies.digestEditionRepository ?? digestEditionRepositoryFromEnvironment(app);
  const feedbackRepository =
    dependencies.feedbackRepository ?? feedbackRepositoryFromEnvironment(app);
  const failureQueueRepository =
    dependencies.failureQueueRepository ?? failureQueueRepositoryFromEnvironment(app);
  const requireAdmin = createRequireAdmin(authService);
  const requireCurrentUser = createRequireCurrentUser(authService);

  app.addHook("onRequest", async (request, reply) => {
    const requestId = traceIdFromHeader(request.headers[requestIdHeaderName]) ?? String(request.id);
    (request as TraceRequest).traceRequestId = requestId;
    reply.header(requestIdHeaderName, requestId);
    request.log.info(
      {
        event: "request.start",
        requestId,
        method: request.method,
        path: request.url
      },
      "request.start"
    );
  });

  app.get("/healthz", async () => ({
    status: "ok",
    service: "api"
  }));

  app.get("/metrics", async (_request, reply) => {
    try {
      const failures = await failureQueueRepository.listFailures({ limit: 1000 });
      return reply
        .header("content-type", "text/plain; version=0.0.4; charset=utf-8")
        .send(renderApiMetrics(failures));
    } catch (error) {
      return sendSourceError(reply, error);
    }
  });

  app.post(
    "/auth/login",
    {
      schema: {
        body: authLoginBodySchema
      }
    },
    async (request, reply) => {
      try {
        const { email, password } = request.body as AuthLoginBody;
        const result = await authService.login({
          email,
          password,
          userAgent: request.headers["user-agent"],
          ipAddress: request.ip
        });

        if (!result.ok) {
          await recordAuditEvent(auditRepository, request, {
            action: "auth.login_failed",
            objectType: "auth",
            metadata: { failureReason: result.error }
          });
          return reply.code(authLoginFailureStatuses[result.error]).send({ error: result.error });
        }

        await recordAuditEvent(auditRepository, request, {
          actor: result.user,
          action: "auth.login",
          objectType: "user",
          objectId: String(result.user.id),
          metadata: { outcome: "success" }
        });

        reply.setCookie(authSessionCookieName, result.sessionToken, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          expires: result.expiresAt
        });

        return reply.send({ user: result.user });
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get("/auth/me", async (request, reply) => {
    try {
      const sessionToken = request.cookies[authSessionCookieName];
      const user = await authService.currentUser(sessionToken);
      if (sessionToken && !user) {
        reply.clearCookie(authSessionCookieName, { path: "/" });
      }
      return { user };
    } catch (error) {
      return sendSourceError(reply, error);
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    try {
      const sessionToken = request.cookies[authSessionCookieName];
      const user = await authService.currentUser(sessionToken);
      await authService.logout(sessionToken);
      if (user) {
        await recordAuditEvent(auditRepository, request, {
          actor: user,
          action: "auth.logout",
          objectType: "user",
          objectId: String(user.id),
          metadata: { outcome: "success" }
        });
      }
      reply.clearCookie(authSessionCookieName, { path: "/" });
      return { status: "ok" };
    } catch (error) {
      return sendSourceError(reply, error);
    }
  });

  app.get("/sources", { preValidation: requireAdmin }, async (_request, reply) => {
    try {
      const sources = await sourceRepository.listSources();
      return { sources };
    } catch (error) {
      return sendSourceError(reply, error);
    }
  });

  app.get(
    "/sources/:id",
    {
      preValidation: requireAdmin,
      schema: {
        params: sourceParamsSchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const source = await sourceRepository.getSource(Number(id));

        if (!source) {
          return reply.code(404).send({ error: "Source not found" });
        }

        return source;
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.post(
    "/sources",
    {
      preValidation: requireAdmin,
      schema: {
        body: createSourceBodySchema
      }
    },
    async (request, reply) => {
      try {
        const source = await sourceRepository.createSource(request.body as CreateSourceInput);
        await recordAuditEvent(auditRepository, request, {
          actor: adminUserFromRequest(request),
          action: "source.create",
          objectType: "source",
          objectId: String(source.id),
          metadata: {
            boardSlug: source.boardSlug,
            sourceType: source.sourceType
          }
        });
        return reply.code(201).send(source);
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.patch(
    "/sources/:id",
    {
      preValidation: requireAdmin,
      schema: {
        params: sourceParamsSchema,
        body: updateSourceBodySchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const body = request.body as UpdateSourceInput;
        const source = await sourceRepository.updateSource(Number(id), body);

        if (!source) {
          return reply.code(404).send({ error: "Source not found" });
        }

        await recordAuditEvent(auditRepository, request, {
          actor: adminUserFromRequest(request),
          action: "source.update",
          objectType: "source",
          objectId: String(id),
          metadata: { fields: Object.keys(body) }
        });

        return source;
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get("/raw-entries", { preValidation: requireAdmin }, async (_request, reply) => {
    try {
      const rawEntries = await rawEntryRepository.listRawEntries();
      return { rawEntries };
    } catch (error) {
      return sendSourceError(reply, error);
    }
  });

  app.get(
    "/raw-entries/:id",
    {
      preValidation: requireAdmin,
      schema: {
        params: sourceParamsSchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const rawEntry = await rawEntryRepository.getRawEntry(Number(id));

        if (!rawEntry) {
          return reply.code(404).send({ error: "Raw entry not found" });
        }

        return rawEntry;
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.patch(
    "/raw-entries/:id",
    {
      preValidation: requireAdmin,
      schema: {
        params: sourceParamsSchema,
        body: rawEntryLifecycleBodySchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const body = request.body as RawEntryLifecycleBody;
        const rawEntry = await rawEntryRepository.updateRawEntryLifecycle(
          Number(id),
          body
        );

        if (!rawEntry) {
          return reply.code(404).send({ error: "Raw entry not found" });
        }

        await recordAuditEvent(auditRepository, request, {
          actor: adminUserFromRequest(request),
          action: `raw_entry.${body.action}`,
          objectType: "raw_entry",
          objectId: String(id),
          metadata: { action: body.action }
        });

        return rawEntry;
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get(
    "/admin/failures",
    {
      preValidation: requireAdmin,
      schema: {
        querystring: failureQueueQuerySchema
      }
    },
    async (request, reply) => {
      try {
        const query = request.query as FailureQueueQuery;
        const failures = await failureQueueRepository.listFailures({ limit: query.limit });
        return { failures };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get(
    "/admin/audit-events",
    {
      preValidation: requireAdmin,
      schema: {
        querystring: failureQueueQuerySchema
      }
    },
    async (request, reply) => {
      try {
        const query = request.query as AuditEventsQuery;
        const auditEvents = await auditRepository.listAuditEvents({ limit: query.limit });
        return { auditEvents };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get(
    "/admin/feedback",
    {
      preValidation: requireAdmin,
      schema: {
        querystring: feedbackQuerySchema
      }
    },
    async (request, reply) => {
      try {
        const query = request.query as FailureQueueQuery;
        const feedback = await feedbackRepository.listFeedback({ limit: query.limit });
        return { feedback };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.patch(
    "/admin/feedback/:id",
    {
      preValidation: requireAdmin,
      schema: {
        params: sourceParamsSchema,
        body: feedbackReviewBodySchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const body = request.body as FeedbackReviewBody;
        const feedback = await feedbackRepository.updateFeedbackReview(
          Number(id),
          body
        );

        if (!feedback) {
          return reply.code(404).send({ error: "Feedback not found" });
        }

        await recordAuditEvent(auditRepository, request, {
          actor: adminUserFromRequest(request),
          action: "feedback.review",
          objectType: "reader_feedback",
          objectId: String(id),
          metadata: { reviewStatus: body.reviewStatus }
        });

        return { feedback };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get(
    "/admin/digest-editions",
    {
      preValidation: requireAdmin
    },
    async (_request, reply) => {
      try {
        const editions = await digestEditionRepository.listDigestEditions();
        return { editions };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get(
    "/admin/digest-editions/:id",
    {
      preValidation: requireAdmin,
      schema: {
        params: sourceParamsSchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const edition = await digestEditionRepository.getDigestEditionById(Number(id));

        if (!edition) {
          return reply.code(404).send({ error: "Digest edition not found" });
        }

        return { edition };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.post(
    "/admin/digest-editions",
    {
      preValidation: requireAdmin,
      schema: {
        body: digestEditionGenerateBodySchema
      }
    },
    async (request, reply) => {
      try {
        const body = request.body as DigestEditionGenerateBody;
        const window = digestEditionWindowForDate(body.editionDate);

        if (!window) {
          return reply.code(400).send({ error: "Invalid edition date" });
        }

        const items = await readerRepository.listReaderDigestItems({
          boardSlug: body.boardSlug,
          limit: body.limit
        });
        const adminUser = adminUserFromRequest(request);

        if (!adminUser) {
          throw new Error("Admin user is required");
        }

        const edition = await digestEditionRepository.createDigestEdition({
          editionDate: body.editionDate,
          boardSlug: body.boardSlug,
          windowStartAt: window.windowStartAt,
          windowEndAt: window.windowEndAt,
          generatedByUserId: adminUser.id,
          items
        });

        return reply.code(201).send({ edition });
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get("/reader/boards", async (_request, reply) => {
    try {
      const boards = await readerRepository.listReaderBoards();
      return { boards };
    } catch (error) {
      return sendSourceError(reply, error);
    }
  });

  app.get(
    "/reader/personal-state",
    {
      preValidation: requireCurrentUser
    },
    async (request, reply) => {
      try {
        return await personalStateRepository.getPersonalState({
          userId: currentUserFromRequest(request).id
        });
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get(
    "/reader/digest",
    {
      schema: {
        querystring: readerDigestQuerySchema
      }
    },
    async (request, reply) => {
      try {
        const query = request.query as ReaderDigestQuery;
        const items = await readerRepository.listReaderDigestItems({
          boardSlug: query.board,
          limit: query.limit
        });
        return { items };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get(
    "/reader/digest-editions/:editionKey",
    {
      schema: {
        params: digestEditionKeyParamsSchema
      }
    },
    async (request, reply) => {
      try {
        const { editionKey } = request.params as DigestEditionKeyParams;
        const edition = await digestEditionRepository.getDigestEditionByKey(editionKey);

        if (!edition) {
          return reply.code(404).send({ error: "Digest edition not found" });
        }

        return { edition };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.put(
    "/reader/personal-state/saved",
    {
      preValidation: requireCurrentUser,
      schema: {
        body: personalStateMutationBodySchema
      }
    },
    async (request, reply) => {
      try {
        const body = request.body as PersonalStateMutationBody;
        return await personalStateRepository.setSavedItem({
          userId: currentUserFromRequest(request).id,
          itemId: body.itemId,
          active: body.active
        });
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.put(
    "/reader/personal-state/read-later",
    {
      preValidation: requireCurrentUser,
      schema: {
        body: personalStateMutationBodySchema
      }
    },
    async (request, reply) => {
      try {
        const body = request.body as PersonalStateMutationBody;
        return await personalStateRepository.setReadLaterItem({
          userId: currentUserFromRequest(request).id,
          itemId: body.itemId,
          active: body.active
        });
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.put(
    "/reader/personal-state/read-status",
    {
      preValidation: requireCurrentUser,
      schema: {
        body: readStatusMutationBodySchema
      }
    },
    async (request, reply) => {
      try {
        const body = request.body as ReadStatusMutationBody;
        return await personalStateRepository.setReadStatus({
          userId: currentUserFromRequest(request).id,
          itemId: body.itemId,
          status: body.status
        });
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get("/reader/items", async (request, reply) => {
    try {
      const query = request.query as ReaderItemsQuery;
      const items = await readerRepository.listReaderItems({ boardSlug: query.board });
      return { items };
    } catch (error) {
      return sendSourceError(reply, error);
    }
  });

  app.get(
    "/reader/search",
    {
      schema: {
        querystring: readerSearchQuerySchema
      }
    },
    async (request, reply) => {
      try {
        const query = request.query as ReaderSearchQuery;
        const items = await readerRepository.searchReaderItems({
          query: query.q,
          boardSlug: query.board
        });
        return { items };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.post(
    "/reader/items/:id/feedback",
    {
      schema: {
        params: sourceParamsSchema,
        body: readerFeedbackBodySchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const body = request.body as ReaderFeedbackBody;
        const feedback = await feedbackRepository.createFeedback({
          rawEntryId: Number(id),
          feedbackType: body.feedbackType,
          message: body.message
        });

        if (!feedback) {
          return reply.code(404).send({ error: "Reader item not found" });
        }

        return reply.code(201).send({ feedback });
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get(
    "/reader/items/:id/related",
    {
      schema: {
        params: sourceParamsSchema,
        querystring: readerRelatedItemsQuerySchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const query = request.query as ReaderRelatedItemsQuery;
        const items = await readerRepository.listRelatedReaderItems({
          id: Number(id),
          limit: query.limit
        });

        if (!items) {
          return reply.code(404).send({ error: "Reader item not found" });
        }

        return { items };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get(
    "/reader/items/:id",
    {
      schema: {
        params: sourceParamsSchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const item = await readerRepository.getReaderItemDetail(Number(id));

        if (!item) {
          return reply.code(404).send({ error: "Reader item not found" });
        }

        return { item };
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  return app;
}

function traceIdFromHeader(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !requestIdPattern.test(candidate)) {
    return undefined;
  }
  return candidate;
}

function renderApiMetrics(failures: FailureQueueRecord[]): string {
  const countsByStage = new Map<(typeof failureStages)[number], number>(
    failureStages.map((stage) => [stage, 0])
  );

  for (const failure of failures) {
    countsByStage.set(failure.failureStage, (countsByStage.get(failure.failureStage) ?? 0) + 1);
  }

  const lines = [
    "# HELP reno_news_api_up API service health as seen by the metrics endpoint.",
    "# TYPE reno_news_api_up gauge",
    "reno_news_api_up 1",
    "# HELP reno_news_api_failure_queue_backlog Current failure queue backlog.",
    "# TYPE reno_news_api_failure_queue_backlog gauge",
    `reno_news_api_failure_queue_backlog ${failures.length}`
  ];

  for (const stage of failureStages) {
    lines.push(
      `reno_news_api_failure_queue_backlog{stage="${stage}"} ${countsByStage.get(stage) ?? 0}`
    );
  }

  lines.push(
    "# HELP reno_news_api_ingest_failures Current source ingest failures in the failure queue.",
    "# TYPE reno_news_api_ingest_failures gauge",
    `reno_news_api_ingest_failures ${countsByStage.get("source_ingest") ?? 0}`,
    "# HELP reno_news_api_model_failures Current model call failures in the failure queue.",
    "# TYPE reno_news_api_model_failures gauge",
    `reno_news_api_model_failures ${countsByStage.get("model_call") ?? 0}`,
    "# HELP reno_news_api_backup_offhost_contract_configured Off-host backup contract is present in this build.",
    "# TYPE reno_news_api_backup_offhost_contract_configured gauge",
    "reno_news_api_backup_offhost_contract_configured 1",
    "# HELP reno_news_api_disk_usage_guard_configured Disk usage guard contract is present in this build.",
    "# TYPE reno_news_api_disk_usage_guard_configured gauge",
    "reno_news_api_disk_usage_guard_configured 1"
  );

  return `${lines.join("\n")}\n`;
}

function createRequireAdmin(authService: AuthService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const sessionToken = request.cookies[authSessionCookieName];
      const user = await authService.currentUser(sessionToken);

      if (!user) {
        if (sessionToken) {
          reply.clearCookie(authSessionCookieName, { path: "/" });
        }
        return reply.code(401).send({ error: "authentication_required" });
      }

      if (user.role !== "admin") {
        return reply.code(403).send({ error: "admin_required" });
      }

      (request as AdminRequest).adminUser = user;
    } catch (error) {
      return sendSourceError(reply, error);
    }
  };
}

function createRequireCurrentUser(authService: AuthService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const sessionToken = request.cookies[authSessionCookieName];
      const user = await authService.currentUser(sessionToken);

      if (!user) {
        if (sessionToken) {
          reply.clearCookie(authSessionCookieName, { path: "/" });
        }
        return reply.code(401).send({ error: "authentication_required" });
      }

      (request as CurrentUserRequest).currentUser = user;
    } catch (error) {
      return sendSourceError(reply, error);
    }
  };
}

function adminUserFromRequest(request: FastifyRequest): AuthUser | null {
  return (request as AdminRequest).adminUser ?? null;
}

function currentUserFromRequest(request: FastifyRequest): AuthUser {
  const user = (request as CurrentUserRequest).currentUser;
  if (!user) {
    throw new Error("Current user is required");
  }
  return user;
}

function traceIdFromRequest(request: FastifyRequest): string {
  return (request as TraceRequest).traceRequestId ?? String(request.id);
}

function digestEditionWindowForDate(editionDate: string): {
  windowStartAt: string;
  windowEndAt: string;
} | null {
  const windowEnd = new Date(`${editionDate}T00:00:00.000Z`);
  if (
    Number.isNaN(windowEnd.getTime()) ||
    windowEnd.toISOString().slice(0, 10) !== editionDate
  ) {
    return null;
  }

  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);

  return {
    windowStartAt: windowStart.toISOString(),
    windowEndAt: windowEnd.toISOString()
  };
}

async function recordAuditEvent(
  auditRepository: AuditRepository,
  request: FastifyRequest,
  input: {
    actor?: AuthUser | null;
    action: string;
    objectType: string;
    objectId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await auditRepository.recordAuditEvent({
    actorUserId: input.actor?.id ?? null,
    actorRole: input.actor?.role ?? null,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId ?? null,
    requestId: traceIdFromRequest(request),
    metadata: input.metadata ?? {}
  });
}

function sourceRepositoryFromEnvironment(app: FastifyInstance): SourceRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return unconfiguredSourceRepository;
  }

  const repository = createSourceRepository(databaseUrl);

  app.addHook("onClose", async () => {
    await repository.close();
  });

  return repository;
}

function authServiceFromEnvironment(app: FastifyInstance): AuthService {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return unconfiguredAuthService;
  }

  const repository = createAuthRepository(databaseUrl);
  const service = createAuthService(repository);

  app.addHook("onClose", async () => {
    await repository.close();
  });

  return service;
}

function auditRepositoryFromEnvironment(app: FastifyInstance): AuditRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return unconfiguredAuditRepository;
  }

  const repository = createAuditRepository(databaseUrl);

  app.addHook("onClose", async () => {
    await repository.close();
  });

  return repository;
}

function rawEntryRepositoryFromEnvironment(app: FastifyInstance): RawEntryRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return unconfiguredRawEntryRepository;
  }

  const repository = createRawEntryRepository(databaseUrl);

  app.addHook("onClose", async () => {
    await repository.close();
  });

  return repository;
}

function readerRepositoryFromEnvironment(app: FastifyInstance): ReaderRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return unconfiguredReaderRepository;
  }

  const repository = createReaderRepository(databaseUrl);

  app.addHook("onClose", async () => {
    await repository.close();
  });

  return repository;
}

function personalStateRepositoryFromEnvironment(app: FastifyInstance): PersonalStateRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return unconfiguredPersonalStateRepository;
  }

  const repository = createPersonalStateRepository(databaseUrl);

  app.addHook("onClose", async () => {
    await repository.close();
  });

  return repository;
}

function digestEditionRepositoryFromEnvironment(app: FastifyInstance): DigestEditionRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return unconfiguredDigestEditionRepository;
  }

  const repository = createDigestEditionRepository(databaseUrl);

  app.addHook("onClose", async () => {
    await repository.close();
  });

  return repository;
}

function feedbackRepositoryFromEnvironment(app: FastifyInstance): FeedbackRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return unconfiguredFeedbackRepository;
  }

  const repository = createFeedbackRepository(databaseUrl);

  app.addHook("onClose", async () => {
    await repository.close();
  });

  return repository;
}

function failureQueueRepositoryFromEnvironment(app: FastifyInstance): FailureQueueRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return unconfiguredFailureQueueRepository;
  }

  const repository = createFailureQueueRepository(databaseUrl);

  app.addHook("onClose", async () => {
    await repository.close();
  });

  return repository;
}

const unconfiguredSourceRepository: SourceRepository = {
  listSources: async () => {
    throw new DatabaseNotConfiguredError();
  },
  getSource: async () => {
    throw new DatabaseNotConfiguredError();
  },
  createSource: async () => {
    throw new DatabaseNotConfiguredError();
  },
  updateSource: async () => {
    throw new DatabaseNotConfiguredError();
  },
  listEnabledSourcePolicies: async () => {
    throw new DatabaseNotConfiguredError();
  }
};

const unconfiguredAuthService: AuthService = {
  login: async () => {
    throw new DatabaseNotConfiguredError();
  },
  currentUser: async () => null,
  logout: async () => undefined
};

const unconfiguredAuditRepository: AuditRepository = {
  recordAuditEvent: async () => undefined,
  listAuditEvents: async () => {
    throw new DatabaseNotConfiguredError();
  },
  close: async () => undefined
};

const unconfiguredRawEntryRepository: RawEntryRepository = {
  listRawEntries: async () => {
    throw new DatabaseNotConfiguredError();
  },
  getRawEntry: async () => {
    throw new DatabaseNotConfiguredError();
  },
  updateRawEntryLifecycle: async () => {
    throw new DatabaseNotConfiguredError();
  },
  close: async () => undefined
};

const unconfiguredReaderRepository: ReaderRepository = {
  listReaderBoards: async () => {
    throw new DatabaseNotConfiguredError();
  },
  listReaderItems: async () => {
    throw new DatabaseNotConfiguredError();
  },
  searchReaderItems: async () => {
    throw new DatabaseNotConfiguredError();
  },
  listRelatedReaderItems: async () => {
    throw new DatabaseNotConfiguredError();
  },
  listReaderDigestItems: async () => {
    throw new DatabaseNotConfiguredError();
  },
  getReaderItemDetail: async () => {
    throw new DatabaseNotConfiguredError();
  },
  close: async () => undefined
};

const unconfiguredPersonalStateRepository: PersonalStateRepository = {
  getPersonalState: async () => {
    throw new DatabaseNotConfiguredError();
  },
  setSavedItem: async () => {
    throw new DatabaseNotConfiguredError();
  },
  setReadLaterItem: async () => {
    throw new DatabaseNotConfiguredError();
  },
  setReadStatus: async () => {
    throw new DatabaseNotConfiguredError();
  },
  close: async () => undefined
};

const unconfiguredDigestEditionRepository: DigestEditionRepository = {
  createDigestEdition: async () => {
    throw new DatabaseNotConfiguredError();
  },
  listDigestEditions: async () => {
    throw new DatabaseNotConfiguredError();
  },
  getDigestEditionById: async () => {
    throw new DatabaseNotConfiguredError();
  },
  getDigestEditionByKey: async () => {
    throw new DatabaseNotConfiguredError();
  },
  close: async () => undefined
};

const unconfiguredFeedbackRepository: FeedbackRepository = {
  createFeedback: async () => {
    throw new DatabaseNotConfiguredError();
  },
  listFeedback: async () => {
    throw new DatabaseNotConfiguredError();
  },
  updateFeedbackReview: async () => {
    throw new DatabaseNotConfiguredError();
  },
  close: async () => undefined
};

const unconfiguredFailureQueueRepository: FailureQueueRepository = {
  listFailures: async () => {
    throw new DatabaseNotConfiguredError();
  },
  close: async () => undefined
};

function sendSourceError(reply: FastifyReply, error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return reply.code(503).send({ error: "Database not configured" });
  }

  if (error instanceof BoardNotFoundError) {
    return reply.code(400).send({ error: error.message });
  }

  if (isUniqueViolation(error)) {
    return reply.code(409).send({ error: "Source already exists" });
  }

  throw error;
}
