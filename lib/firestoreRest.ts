import { getAdminAccessToken, getFirebaseProjectId } from "./firebaseAdmin";

export type DocumentData = Record<string, any>;

export class Timestamp {
  private constructor(private readonly value: Date) {}

  static now(): Timestamp {
    return new Timestamp(new Date());
  }

  static fromDate(value: Date): Timestamp {
    return new Timestamp(new Date(value.getTime()));
  }

  static fromMillis(value: number): Timestamp {
    return new Timestamp(new Date(value));
  }

  toDate(): Date {
    return new Date(this.value.getTime());
  }

  toMillis(): number {
    return this.value.getTime();
  }

  toJSON(): string {
    return this.value.toISOString();
  }
}

type FilterOp = "==" | "<" | ">" | "<=" | ">=" | "!=";
type Direction = "asc" | "desc";

interface QueryFilter {
  field: string;
  op: FilterOp;
  value: unknown;
}

interface QueryOrder {
  field: string;
  direction: Direction;
}

interface FirestoreValue {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

interface FirestoreWrite {
  update?: FirestoreDocument;
  updateMask?: { fieldPaths: string[] };
  currentDocument?: { exists?: boolean; updateTime?: string };
  delete?: string;
}

export class FirestoreRestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function assertSafeSegment(value: string): void {
  if (!value || value === "." || value === ".." ||
    /[\/\\?#%\u0000-\u001f\u007f]/.test(value) ||
    new TextEncoder().encode(value).length > 1500) {
    throw new FirestoreRestError(400, "Identificador de documento inválido.");
  }
}

function assertResourcePath(path: string, document: boolean): void {
  const segments = path.split("/");
  segments.forEach(assertSafeSegment);
  if ((segments.length % 2 === 0) !== document) {
    throw new FirestoreRestError(400, "Ruta de documento inválida.");
  }
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (value instanceof Timestamp) return { timestampValue: value.toDate().toISOString() };
  if (value instanceof Date) return { timestampValue: value.toISOString() };

  switch (typeof value) {
    case "boolean":
      return { booleanValue: value };
    case "number":
      if (!Number.isFinite(value)) {
        return { doubleValue: value };
      }
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    case "string":
      return { stringValue: value };
    case "undefined":
      return { nullValue: null };
    case "object":
      if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(encodeValue) } };
      }

      return {
        mapValue: {
          fields: encodeFields(value as Record<string, unknown>),
        },
      };
    default:
      return { stringValue: String(value) };
  }
}

function encodeFields(value: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, fieldValue]) => fieldValue !== undefined)
      .map(([key, fieldValue]) => [key, encodeValue(fieldValue)]),
  );
}

function decodeValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value && value.timestampValue) {
    return Timestamp.fromDate(new Date(value.timestampValue));
  }
  if ("stringValue" in value) return value.stringValue ?? "";
  if ("arrayValue" in value) {
    return (value.arrayValue?.values ?? []).map(decodeValue);
  }
  if ("mapValue" in value) {
    return decodeFields(value.mapValue?.fields ?? {});
  }

  return undefined;
}

function decodeFields(fields: Record<string, FirestoreValue>): DocumentData {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
  );
}

function fieldPath(name: string): { fieldPath: string } {
  return { fieldPath: name };
}

function encodeFilter(filter: QueryFilter): Record<string, unknown> {
  if (filter.op === "==" && filter.value === null) {
    return {
      unaryFilter: {
        field: fieldPath(filter.field),
        op: "IS_NULL",
      },
    };
  }

  const opMap: Record<FilterOp, string> = {
    "==": "EQUAL",
    "<": "LESS_THAN",
    ">": "GREATER_THAN",
    "<=": "LESS_THAN_OR_EQUAL",
    ">=": "GREATER_THAN_OR_EQUAL",
    "!=": "NOT_EQUAL",
  };

  return {
    fieldFilter: {
      field: fieldPath(filter.field),
      op: opMap[filter.op],
      value: encodeValue(filter.value),
    },
  };
}

function maskFor(data: Record<string, unknown>) {
  return { fieldPaths: Object.keys(data) };
}

function lastSegment(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? "";
}

function documentPathFromName(name: string): string {
  const marker = "/documents/";
  const index = name.indexOf(marker);
  return index >= 0 ? name.slice(index + marker.length) : name;
}

async function parseError(response: Response): Promise<FirestoreRestError> {
  let details: unknown = null;

  try {
    details = await response.json();
  } catch {
    try {
      details = await response.text();
    } catch {
      details = null;
    }
  }

  const message =
    details &&
    typeof details === "object" &&
    "error" in details &&
    (details as { error?: { message?: string } }).error?.message
      ? String((details as { error: { message: string } }).error.message)
      : `Firestore REST request failed with HTTP ${response.status}`;

  return new FirestoreRestError(response.status, message, details);
}

class FirestoreRestTransport {
  async projectId(): Promise<string> {
    return getFirebaseProjectId();
  }

  async databaseRoot(): Promise<string> {
    return `projects/${await this.projectId()}/databases/(default)`;
  }

  async documentsRoot(): Promise<string> {
    return `${await this.databaseRoot()}/documents`;
  }

  async request(
    path: string,
    init: RequestInit = {},
    allow404 = false,
  ): Promise<Response> {
    const token = await getAdminAccessToken();
    const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok && !(allow404 && response.status === 404)) {
      throw await parseError(response);
    }

    return response;
  }
}

const transport = new FirestoreRestTransport();

export class DocumentSnapshot<T extends DocumentData = DocumentData> {
  constructor(
    public readonly ref: DocumentReference<T>,
    private readonly document: FirestoreDocument | null,
  ) {}

  get exists(): boolean {
    return Boolean(this.document);
  }

  get id(): string {
    return this.ref.id;
  }

  data(): T | undefined {
    if (!this.document) return undefined;
    return decodeFields(this.document.fields ?? {}) as T;
  }
}

export class QueryDocumentSnapshot<T extends DocumentData = DocumentData>
  extends DocumentSnapshot<T> {
  constructor(
    ref: DocumentReference<T>,
    private readonly queryDocument: FirestoreDocument,
  ) {
    super(ref, queryDocument);
  }

  override data(): T {
    return decodeFields(this.queryDocument.fields ?? {}) as T;
  }
}

export class QuerySnapshot<T extends DocumentData = DocumentData> {
  constructor(public readonly docs: QueryDocumentSnapshot<T>[]) {}

  get empty(): boolean {
    return this.docs.length === 0;
  }

  get size(): number {
    return this.docs.length;
  }
}

export class DocumentReference<T extends DocumentData = DocumentData> {
  constructor(public readonly path: string) {
    assertResourcePath(path, true);
  }

  get id(): string {
    return lastSegment(this.path);
  }

  collection(name: string): CollectionReference {
    assertSafeSegment(name);
    return new CollectionReference(`${this.path}/${name}`);
  }

  async get(): Promise<DocumentSnapshot<T>> {
    const root = await transport.documentsRoot();
    const response = await transport.request(
      `${root}/${this.path}`,
      { method: "GET" },
      true,
    );

    if (response.status === 404) return new DocumentSnapshot<T>(this, null);
    return new DocumentSnapshot<T>(this, (await response.json()) as FirestoreDocument);
  }

  async set(data: T, options?: { merge?: boolean }): Promise<void> {
    const root = await transport.documentsRoot();
    const params = new URLSearchParams();

    if (options?.merge) {
      for (const key of Object.keys(data)) {
        params.append("updateMask.fieldPaths", key);
      }
    }

    const suffix = params.size ? `?${params.toString()}` : "";
    await transport.request(`${root}/${this.path}${suffix}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: encodeFields(data) }),
    });
  }

  async create(data: T): Promise<void> {
    const root = await transport.documentsRoot();
    await transport.request(
      `${root}/${this.path}?currentDocument.exists=false`,
      {
        method: "PATCH",
        body: JSON.stringify({ fields: encodeFields(data) }),
      },
    );
  }

  async update(data: Partial<T>): Promise<void> {
    const root = await transport.documentsRoot();
    const params = new URLSearchParams();
    params.set("currentDocument.exists", "true");

    for (const key of Object.keys(data)) {
      params.append("updateMask.fieldPaths", key);
    }

    await transport.request(`${root}/${this.path}?${params.toString()}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: encodeFields(data as DocumentData) }),
    });
  }

  async delete(): Promise<void> {
    const root = await transport.documentsRoot();
    await transport.request(`${root}/${this.path}`, { method: "DELETE" });
  }
}

class Query<T extends DocumentData = DocumentData> {
  constructor(
    protected readonly collectionPath: string,
    protected readonly filters: QueryFilter[] = [],
    protected readonly orders: QueryOrder[] = [],
    protected readonly queryLimit: number | null = null,
  ) {}

  where(field: string, op: FilterOp, value: unknown): Query<T> {
    return new Query<T>(
      this.collectionPath,
      [...this.filters, { field, op, value }],
      this.orders,
      this.queryLimit,
    );
  }

  orderBy(field: string, direction: Direction = "asc"): Query<T> {
    return new Query<T>(
      this.collectionPath,
      this.filters,
      [...this.orders, { field, direction }],
      this.queryLimit,
    );
  }

  limit(value: number): Query<T> {
    return new Query<T>(
      this.collectionPath,
      this.filters,
      this.orders,
      Math.max(0, Math.floor(value)),
    );
  }

  count(): {
    get: () => Promise<{ data: () => { count: number } }>;
  } {
    return {
      get: async () => {
        const snapshot = await this.get();
        return {
          data: () => ({ count: snapshot.size }),
        };
      },
    };
  }

  async get(): Promise<QuerySnapshot<T>> {
    const segments = this.collectionPath.split("/").filter(Boolean);
    const collectionId = segments.at(-1)!;
    const parentPath = segments.slice(0, -1).join("/");
    const root = await transport.documentsRoot();
    const endpoint = parentPath
      ? `${root}/${parentPath}:runQuery`
      : `${root}:runQuery`;

    const structuredQuery: Record<string, unknown> = {
      from: [{ collectionId }],
    };

    if (this.filters.length === 1) {
      structuredQuery.where = encodeFilter(this.filters[0]);
    } else if (this.filters.length > 1) {
      structuredQuery.where = {
        compositeFilter: {
          op: "AND",
          filters: this.filters.map(encodeFilter),
        },
      };
    }

    if (this.orders.length) {
      structuredQuery.orderBy = this.orders.map((order) => ({
        field: fieldPath(order.field),
        direction: order.direction === "desc" ? "DESCENDING" : "ASCENDING",
      }));
    }

    if (this.queryLimit !== null) {
      structuredQuery.limit = this.queryLimit;
    }

    const response = await transport.request(endpoint, {
      method: "POST",
      body: JSON.stringify({ structuredQuery }),
    });

    const rows = (await response.json()) as Array<{ document?: FirestoreDocument }>;
    const docs = rows
      .filter((row): row is { document: FirestoreDocument } => Boolean(row.document))
      .map((row) => {
        const path = documentPathFromName(row.document.name);
        return new QueryDocumentSnapshot<T>(
          new DocumentReference<T>(path),
          row.document,
        );
      });

    return new QuerySnapshot<T>(docs);
  }
}

export class CollectionReference<T extends DocumentData = DocumentData> extends Query<T> {
  constructor(path: string) {
    assertResourcePath(path, false);
    super(path);
  }

  async list(limit = 250): Promise<QuerySnapshot<T>> {
    const root = await transport.documentsRoot();
    const safeLimit = Math.min(1000, Math.max(1, Math.floor(limit)));
    const params = new URLSearchParams({
      pageSize: String(safeLimit),
    });

    const response = await transport.request(
      `${root}/${this.collectionPath}?${params.toString()}`,
      { method: "GET" },
    );

    const body = (await response.json()) as {
      documents?: FirestoreDocument[];
    };

    const docs = (body.documents ?? []).map((document) => {
      const path = documentPathFromName(document.name);
      return new QueryDocumentSnapshot<T>(
        new DocumentReference<T>(path),
        document,
      );
    });

    return new QuerySnapshot<T>(docs);
  }

  doc(id: string = randomId()): DocumentReference<T> {
    assertSafeSegment(id);
    return new DocumentReference<T>(`${this.collectionPath}/${id}`);
  }

  async add(data: T): Promise<DocumentReference<T>> {
    const reference = this.doc();
    await reference.set(data);
    return reference;
  }
}

function writeForSet(
  reference: DocumentReference,
  data: DocumentData,
  options?: { merge?: boolean },
): FirestoreWrite {
  const write: FirestoreWrite = {
    update: {
      name: "",
      fields: encodeFields(data),
    },
  };

  if (options?.merge) write.updateMask = maskFor(data);
  (write as FirestoreWrite & { __path?: string }).__path = reference.path;
  return write;
}

function writeForUpdate(reference: DocumentReference, data: DocumentData): FirestoreWrite {
  return Object.assign(
    {
      update: {
        name: "",
        fields: encodeFields(data),
      },
      updateMask: maskFor(data),
      currentDocument: { exists: true },
    },
    { __path: reference.path },
  );
}

function writeForCreate(reference: DocumentReference, data: DocumentData): FirestoreWrite {
  return Object.assign(
    {
      update: {
        name: "",
        fields: encodeFields(data),
      },
      currentDocument: { exists: false },
    },
    { __path: reference.path },
  );
}

function writeForDelete(reference: DocumentReference): FirestoreWrite {
  return Object.assign(
    {
      delete: "",
    },
    { __path: reference.path },
  );
}

async function finalizeWrites(writes: FirestoreWrite[]): Promise<FirestoreWrite[]> {
  const root = await transport.documentsRoot();

  return writes.map((write) => {
    const path = (write as FirestoreWrite & { __path?: string }).__path ?? "";
    const { __path: _ignored, ...clean } = write as FirestoreWrite & { __path?: string };

    if (clean.update) clean.update.name = `${root}/${path}`;
    if (clean.delete !== undefined) clean.delete = `${root}/${path}`;

    return clean;
  });
}

export class WriteBatch {
  private readonly writes: FirestoreWrite[] = [];

  set(reference: DocumentReference, data: DocumentData, options?: { merge?: boolean }): this {
    this.writes.push(writeForSet(reference, data, options));
    return this;
  }

  create(reference: DocumentReference, data: DocumentData): this {
    this.writes.push(writeForCreate(reference, data));
    return this;
  }

  update(reference: DocumentReference, data: DocumentData): this {
    this.writes.push(writeForUpdate(reference, data));
    return this;
  }

  delete(reference: DocumentReference): this {
    this.writes.push(writeForDelete(reference));
    return this;
  }

  async commit(): Promise<void> {
    if (!this.writes.length) return;
    const databaseRoot = await transport.databaseRoot();
    await transport.request(`${databaseRoot}/documents:commit`, {
      method: "POST",
      body: JSON.stringify({ writes: await finalizeWrites(this.writes) }),
    });
  }
}


export class BulkWriter {
  private readonly writes: FirestoreWrite[] = [];

  delete(reference: DocumentReference): this {
    this.writes.push(writeForDelete(reference));
    return this;
  }

  update(reference: DocumentReference, data: DocumentData): this {
    this.writes.push(writeForUpdate(reference, data));
    return this;
  }

  set(reference: DocumentReference, data: DocumentData, options?: { merge?: boolean }): this {
    this.writes.push(writeForSet(reference, data, options));
    return this;
  }

  async close(): Promise<void> {
    if (!this.writes.length) return;

    const databaseRoot = await transport.databaseRoot();

    for (let index = 0; index < this.writes.length; index += 400) {
      const chunk = this.writes.slice(index, index + 400);
      await transport.request(`${databaseRoot}/documents:commit`, {
        method: "POST",
        body: JSON.stringify({ writes: await finalizeWrites(chunk) }),
      });
    }
  }
}

export class Transaction {
  private readonly writes: FirestoreWrite[] = [];

  constructor(private readonly transactionId: string) {}

  async get<T extends DocumentData>(
    reference: DocumentReference<T>,
  ): Promise<DocumentSnapshot<T>> {
    const root = await transport.documentsRoot();
    // batchGet preserves the transaction and also works in the Firestore emulator.
    const response = await transport.request(`${root}:batchGet`, {
      method: "POST",
      body: JSON.stringify({ documents: [`${root}/${reference.path}`], transaction: this.transactionId }),
    });
    const rows = (await response.json()) as Array<{ found?: FirestoreDocument; missing?: string }>;
    if (!Array.isArray(rows)) throw new FirestoreRestError(502, "Firestore returned an invalid transaction read.");
    const row = rows.find(item => item.found?.name === `${root}/${reference.path}` || item.missing === `${root}/${reference.path}`);
    if (!row) throw new FirestoreRestError(502, "Firestore returned an invalid transaction read.");
    return new DocumentSnapshot<T>(reference, row.found ?? null);
  }

  set(reference: DocumentReference, data: DocumentData, options?: { merge?: boolean }): this {
    this.writes.push(writeForSet(reference, data, options));
    return this;
  }

  create(reference: DocumentReference, data: DocumentData): this {
    this.writes.push(writeForCreate(reference, data));
    return this;
  }

  update(reference: DocumentReference, data: DocumentData): this {
    this.writes.push(writeForUpdate(reference, data));
    return this;
  }

  delete(reference: DocumentReference): this {
    this.writes.push(writeForDelete(reference));
    return this;
  }

  async commit(): Promise<void> {
    const databaseRoot = await transport.databaseRoot();
    await transport.request(`${databaseRoot}/documents:commit`, {
      method: "POST",
      body: JSON.stringify({
        transaction: this.transactionId,
        writes: await finalizeWrites(this.writes),
      }),
    });
  }
}

export class FirestoreRest {
  collection<T extends DocumentData = DocumentData>(path: string): CollectionReference<T> {
    return new CollectionReference<T>(path);
  }

  batch(): WriteBatch {
    return new WriteBatch();
  }

  bulkWriter(): BulkWriter {
    return new BulkWriter();
  }

  async runTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    let lastError: unknown = null;
    const retryDelaysMs = [90, 180, 360, 720, 1200];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const databaseRoot = await transport.databaseRoot();
      const begin = await transport.request(`${databaseRoot}/documents:beginTransaction`, {
        method: "POST",
        body: "{}",
      });
      const { transaction: transactionId } = (await begin.json()) as {
        transaction: string;
      };

      const transaction = new Transaction(transactionId);

      try {
        const result = await callback(transaction);
        await transaction.commit();
        return result;
      } catch (error) {
        lastError = error;

        try {
          await transport.request(`${databaseRoot}/documents:rollback`, {
            method: "POST",
            body: JSON.stringify({ transaction: transactionId }),
          });
        } catch {
          // Best-effort rollback only.
        }

        if (
          error instanceof FirestoreRestError &&
          (error.status === 409 ||
            error.status === 412 ||
            error.status === 429 ||
            error.status === 503) &&
          attempt < 5
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelaysMs[Math.min(attempt, retryDelaysMs.length - 1)]),
          );
          continue;
        }

        throw error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Firestore transaction failed.");
  }
}

let cachedDb: FirestoreRest | null = null;

export function getAdminDb(): FirestoreRest {
  if (!cachedDb) cachedDb = new FirestoreRest();
  return cachedDb;
}
