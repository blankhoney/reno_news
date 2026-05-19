import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyServerOptions
} from "fastify";
import {
  BoardNotFoundError,
  createFailureQueueRepository,
  createRawEntryRepository,
  createReaderRepository,
  createSourceRepository,
  isUniqueViolation,
  type CreateSourceInput,
  type FailureQueueRepository,
  type RawEntryRepository,
  type ReaderRepository,
  type SourceRepository,
  type UpdateSourceInput
} from "@reno-news/db";

type AppDependencies = {
  sourceRepository?: SourceRepository;
  rawEntryRepository?: RawEntryRepository;
  readerRepository?: ReaderRepository;
  failureQueueRepository?: FailureQueueRepository;
};

type SourceParams = {
  id: string;
};

type ReaderItemsQuery = {
  board?: string;
};

type ReaderSearchQuery = {
  q: string;
  board?: string;
};

type FailureQueueQuery = {
  limit?: number;
};

type RawEntryLifecycleBody = {
  action: "hide" | "restore";
};

class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is required");
    this.name = "DatabaseNotConfiguredError";
  }
}

const sourceTypes = ["rss", "atom"];
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

const readerSearchQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["q"],
  properties: {
    q: { type: "string", minLength: 1, pattern: "\\S" },
    board: { type: "string", minLength: 1 }
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

export function buildApp(options: FastifyServerOptions = {}, dependencies: AppDependencies = {}) {
  const app = Fastify(options);
  const sourceRepository = dependencies.sourceRepository ?? sourceRepositoryFromEnvironment(app);
  const rawEntryRepository =
    dependencies.rawEntryRepository ?? rawEntryRepositoryFromEnvironment(app);
  const readerRepository = dependencies.readerRepository ?? readerRepositoryFromEnvironment(app);
  const failureQueueRepository =
    dependencies.failureQueueRepository ?? failureQueueRepositoryFromEnvironment(app);

  app.get("/healthz", async () => ({
    status: "ok",
    service: "api"
  }));

  app.get("/sources", async (_request, reply) => {
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
      schema: {
        body: createSourceBodySchema
      }
    },
    async (request, reply) => {
      try {
        const source = await sourceRepository.createSource(request.body as CreateSourceInput);
        return reply.code(201).send(source);
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.patch(
    "/sources/:id",
    {
      schema: {
        params: sourceParamsSchema,
        body: updateSourceBodySchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const source = await sourceRepository.updateSource(Number(id), request.body as UpdateSourceInput);

        if (!source) {
          return reply.code(404).send({ error: "Source not found" });
        }

        return source;
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get("/raw-entries", async (_request, reply) => {
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
      schema: {
        params: sourceParamsSchema,
        body: rawEntryLifecycleBodySchema
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params as SourceParams;
        const rawEntry = await rawEntryRepository.updateRawEntryLifecycle(
          Number(id),
          request.body as RawEntryLifecycleBody
        );

        if (!rawEntry) {
          return reply.code(404).send({ error: "Raw entry not found" });
        }

        return rawEntry;
      } catch (error) {
        return sendSourceError(reply, error);
      }
    }
  );

  app.get(
    "/admin/failures",
    {
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

  app.get("/reader/boards", async (_request, reply) => {
    try {
      const boards = await readerRepository.listReaderBoards();
      return { boards };
    } catch (error) {
      return sendSourceError(reply, error);
    }
  });

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
  getReaderItemDetail: async () => {
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
