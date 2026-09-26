/* eslint-env jest */
// Workspace tile icon and color: persistence through the real migrations and
// the HTTP contract of the endpoints the UI uses. Runs against a throwaway
// SQLite database built with `prisma migrate deploy` from prisma/migrations.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const SERVER_DIR = path.resolve(__dirname, "../..");
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-icon-"));
const DB_URL = `file:${path.join(TMP_DIR, "test.db").replace(/\\/g, "/")}`;
process.env.WORKSPACE_ICON_TEST_DB_URL = DB_URL;
// Keep any file the endpoint modules touch inside the throwaway folder.
process.env.STORAGE_DIR = TMP_DIR;

jest.mock("../../utils/prisma", () => {
  const { PrismaClient } = require("@prisma/client");
  return new PrismaClient({
    datasources: { db: { url: process.env.WORKSPACE_ICON_TEST_DB_URL } },
  });
});
jest.mock("../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: jest.fn().mockResolvedValue() },
}));
// Stand-in for session auth: the test picks the mode and role per request.
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (request, response, next) => {
    const role = request.header("x-test-role");
    response.locals.multiUserMode = !!role;
    if (role)
      response.locals.user = {
        id: Number(request.header("x-test-user-id")),
        role,
      };
    next();
  },
}));
jest.mock("../../utils/middleware/validApiKey", () => ({
  validApiKey: (_request, _response, next) => next(),
}));

const express = require("express");
const bodyParser = require("body-parser");
const prisma = require("../../utils/prisma");
const { Workspace } = require("../../models/workspace");
const { workspaceEndpoints } = require("../../endpoints/workspaces");
const { apiWorkspaceEndpoints } = require("../../endpoints/api/workspace");

function buildDatabase() {
  fs.cpSync(
    path.join(SERVER_DIR, "prisma", "migrations"),
    path.join(TMP_DIR, "migrations"),
    { recursive: true }
  );
  const schema = fs
    .readFileSync(path.join(SERVER_DIR, "prisma", "schema.prisma"), "utf8")
    .replace(/url\s*=\s*"file:[^"]*"/, `url = "${DB_URL}"`);
  const schemaPath = path.join(TMP_DIR, "schema.prisma");
  fs.writeFileSync(schemaPath, schema);
  const result = spawnSync(
    process.execPath,
    [
      path.join(SERVER_DIR, "node_modules", "prisma", "build", "index.js"),
      "migrate",
      "deploy",
      "--schema",
      schemaPath,
    ],
    { cwd: TMP_DIR, encoding: "utf8" }
  );
  if (result.status !== 0)
    throw new Error(`migrate deploy failed: ${result.stderr || result.stdout}`);
}

let server;
let baseUrl;
let workspace;
let admin;
let member;

async function api(method, route, { body, role, userId } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (role) {
    headers["x-test-role"] = role;
    headers["x-test-user-id"] = String(userId);
  }
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json };
}

beforeAll(async () => {
  buildDatabase();

  admin = await prisma.users.create({
    data: { username: "icon-admin", password: "x", role: "admin" },
  });
  member = await prisma.users.create({
    data: { username: "icon-member", password: "x", role: "default" },
  });
  ({ workspace } = await Workspace.new("Intro to Ecology", admin.id));
  await prisma.workspace_users.create({
    data: { user_id: member.id, workspace_id: workspace.id },
  });

  const app = express();
  app.use(bodyParser.text());
  app.use(bodyParser.json());
  const router = express.Router();
  workspaceEndpoints(router);
  apiWorkspaceEndpoints(router);
  app.use("/api", router);
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
}, 120_000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("workspace icon persistence", () => {
  it("new workspaces default to initials and the accent (null, null)", async () => {
    const row = await Workspace.get({ id: workspace.id });
    expect(row.icon).toBeNull();
    expect(row.iconColor).toBeNull();
  });

  it("round-trips icon and color through every read path", async () => {
    const { workspace: updated, message } = await Workspace.update(
      workspace.id,
      { icon: "leaf", iconColor: "teal" }
    );
    expect(message).toBeNull();
    expect(updated).toMatchObject({ icon: "leaf", iconColor: "teal" });

    const expected = { icon: "leaf", iconColor: "teal" };
    expect(await Workspace.get({ id: workspace.id })).toMatchObject(expected);
    expect(
      await Workspace.getWithUser(member, { id: workspace.id })
    ).toMatchObject(expected);
    expect((await Workspace.where({ id: workspace.id }))[0]).toMatchObject(
      expected
    );
    expect(
      (await Workspace.whereWithUser(member, { id: workspace.id }))[0]
    ).toMatchObject(expected);
    expect(
      (await Workspace.whereWithUsers({ id: workspace.id }))[0]
    ).toMatchObject(expected);
  });

  it("switching back to initials keeps the color", async () => {
    await Workspace.update(workspace.id, { icon: "initials" });
    const row = await Workspace.get({ id: workspace.id });
    expect(row.icon).toBeNull();
    expect(row.iconColor).toBe("teal");
  });

  it("an invalid value leaves the stored row untouched", async () => {
    await Workspace.update(workspace.id, { icon: "flask", iconColor: "sky" });
    const result = await Workspace.update(workspace.id, {
      name: "Should not apply",
      icon: "flask",
      iconColor: "neon",
    });
    expect(result.workspace).toBeNull();
    const row = await Workspace.get({ id: workspace.id });
    expect(row).toMatchObject({
      name: "Intro to Ecology",
      icon: "flask",
      iconColor: "sky",
    });
  });

  it("Workspace.new refuses an invalid icon", async () => {
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    const { workspace: created, message } = await Workspace.new(
      "Bad Icon Workspace",
      null,
      { icon: "definitely-not-an-icon" }
    );
    logged.mockRestore();
    expect(created).toBeNull();
    expect(message).toMatch(/Invalid workspace icon/);
    expect(await Workspace.get({ name: "Bad Icon Workspace" })).toBeNull();
  });
});

describe("POST /workspace/:slug/update", () => {
  const route = () => `/workspace/${workspace.slug}/update`;

  beforeEach(async () => {
    await Workspace._update(workspace.id, { icon: null, iconColor: null });
  });

  it("lets an admin set icon and color and returns the stored row", async () => {
    const res = await api("POST", route(), {
      body: { icon: "graduation-cap", iconColor: "violet" },
      role: "admin",
      userId: admin.id,
    });
    expect(res.status).toBe(200);
    expect(res.json.message).toBeNull();
    expect(res.json.workspace).toMatchObject({
      icon: "graduation-cap",
      iconColor: "violet",
    });
  });

  it("works for anyone in single-user mode", async () => {
    const res = await api("POST", route(), { body: { icon: "atom" } });
    expect(res.status).toBe(200);
    expect(res.json.workspace.icon).toBe("atom");
  });

  it.each([
    [{ icon: "not-an-icon" }, /Invalid workspace icon "not-an-icon"/],
    [{ icon: 42 }, /Invalid workspace icon \(a number\)/],
    [{ icon: ["leaf"] }, /Invalid workspace icon \(an array\)/],
    [{ iconColor: "#00ff00" }, /Invalid workspace icon color "#00ff00"/],
    [
      { iconColor: { hex: "#000" } },
      /Invalid workspace icon color \(an object\)/,
    ],
  ])("rejects %j with a 400 and a clear message", async (body, message) => {
    const res = await api("POST", route(), {
      body,
      role: "admin",
      userId: admin.id,
    });
    expect(res.status).toBe(400);
    expect(res.json.workspace).toBeNull();
    expect(res.json.message).toMatch(message);
    const row = await Workspace.get({ id: workspace.id });
    expect(row.icon).toBeNull();
    expect(row.iconColor).toBeNull();
  });

  it("does not apply other fields sent alongside an invalid icon", async () => {
    const res = await api("POST", route(), {
      body: { name: "Renamed", icon: "bogus" },
      role: "admin",
      userId: admin.id,
    });
    expect(res.status).toBe(400);
    expect((await Workspace.get({ id: workspace.id })).name).toBe(
      "Intro to Ecology"
    );
  });

  it("refuses a default-role user in multi-user mode", async () => {
    const res = await api("POST", route(), {
      body: { icon: "leaf" },
      role: "default",
      userId: member.id,
    });
    expect(res.status).toBe(401);
    expect((await Workspace.get({ id: workspace.id })).icon).toBeNull();
  });
});

describe("workspace payloads the UI reads include icon and iconColor", () => {
  beforeAll(async () => {
    await Workspace._update(workspace.id, {
      icon: "microscope",
      iconColor: "green",
    });
    await prisma.workspace_threads.create({
      data: {
        name: "Ecology field notes",
        slug: "ecology-field-notes",
        workspace_id: workspace.id,
        user_id: member.id,
      },
    });
  });

  const expected = { icon: "microscope", iconColor: "green" };

  it.each([
    ["admin", () => admin.id],
    ["default", () => member.id],
  ])("GET /workspaces as %s", async (role, userId) => {
    const res = await api("GET", "/workspaces", { role, userId: userId() });
    expect(res.status).toBe(200);
    const row = res.json.workspaces.find((w) => w.id === workspace.id);
    expect(row).toMatchObject(expected);
  });

  it.each([
    ["admin", () => admin.id],
    ["default", () => member.id],
  ])("GET /workspace/:slug as %s", async (role, userId) => {
    const res = await api("GET", `/workspace/${workspace.slug}`, {
      role,
      userId: userId(),
    });
    expect(res.status).toBe(200);
    expect(res.json.workspace).toMatchObject(expected);
  });

  it("POST /workspace/search returns them on workspaces and thread workspaces", async () => {
    const res = await api("POST", "/workspace/search", {
      body: { searchTerm: "ecology" },
      role: "default",
      userId: member.id,
    });
    expect(res.status).toBe(200);
    expect(res.json.workspaces).toEqual([
      { slug: workspace.slug, name: "Intro to Ecology", ...expected },
    ]);
    expect(res.json.threads[0].workspace).toEqual({
      slug: workspace.slug,
      name: "Intro to Ecology",
      ...expected,
    });
  });
});

describe("developer API (/v1) applies the same rules", () => {
  beforeEach(async () => {
    await Workspace._update(workspace.id, { icon: null, iconColor: null });
  });

  it("POST /v1/workspace/:slug/update stores a valid icon", async () => {
    const res = await api("POST", `/v1/workspace/${workspace.slug}/update`, {
      body: { icon: "rocket", iconColor: "amber" },
    });
    expect(res.status).toBe(200);
    expect(res.json.workspace).toMatchObject({
      icon: "rocket",
      iconColor: "amber",
    });
  });

  it("POST /v1/workspace/:slug/update rejects an invalid color with a 400", async () => {
    const res = await api("POST", `/v1/workspace/${workspace.slug}/update`, {
      body: { iconColor: "magenta" },
    });
    expect(res.status).toBe(400);
    expect(res.json.message).toMatch(/Invalid workspace icon color "magenta"/);
    expect((await Workspace.get({ id: workspace.id })).iconColor).toBeNull();
  });

  it("POST /v1/workspace/new rejects an invalid icon and creates nothing", async () => {
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await api("POST", "/v1/workspace/new", {
      body: { name: "API Bad Icon", icon: "unicorn" },
    });
    logged.mockRestore();
    expect(res.status).toBe(400);
    expect(res.json.message).toMatch(/Invalid workspace icon "unicorn"/);
    expect(await Workspace.get({ name: "API Bad Icon" })).toBeNull();
  });

  it("POST /v1/workspace/new accepts an icon and color", async () => {
    const res = await api("POST", "/v1/workspace/new", {
      body: { name: "API Icon", icon: "books", iconColor: "sky" },
    });
    expect(res.status).toBe(200);
    expect(res.json.workspace).toMatchObject({
      name: "API Icon",
      icon: "books",
      iconColor: "sky",
    });
  });
});

describe("deleting a workspace reports a failed row delete", () => {
  it.each([
    ["DELETE /workspace/:slug", (slug) => `/workspace/${slug}`],
    ["DELETE /v1/workspace/:slug", (slug) => `/v1/workspace/${slug}`],
  ])("%s answers 500, not 200, and a retry deletes it", async (_, route) => {
    const { workspace: doomed } = await Workspace.new(
      `Delete Check ${route("x")}`,
      admin.id
    );
    const failing = jest
      .spyOn(Workspace, "delete")
      .mockResolvedValueOnce(false);
    const failed = await api("DELETE", route(doomed.slug));
    failing.mockRestore();
    expect(failed.status).toBe(500);
    expect(await Workspace.get({ id: doomed.id })).not.toBeNull();

    // The test vector database has no namespace for it; that is logged.
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    const retried = await api("DELETE", route(doomed.slug));
    logged.mockRestore();
    expect(retried.status).toBe(200);
    expect(await Workspace.get({ id: doomed.id })).toBeNull();
  });
});
