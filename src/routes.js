import http from "node:http";
import { Transform } from "node:stream";
import { randomUUID } from "node:crypto";
import { Database } from "./database.js";
import { buildRoutePath } from "./utils/build-route-path.js";
import { z } from "zod";

const database = new Database();

class InverseNumberStream extends Transform {
  _transform(chunk, encoding, callback) {
    const transformed = Number(chunk.toString()) * -1;

    console.log(transformed);

    callback(null, Buffer.from(String(transformed)));
  }
}

export const routes = [
  {
    method: "GET",
    path: buildRoutePath("/tasks"),
    handler: (req, res) => {
      const { search } = req.query;

      const tasks = database.select(
        "tasks",
        search
          ? {
              title: search,
              description: search,
              completed_at: search,
              created_at: search,
              updated_at: search,
            }
          : null
      );

      return res.end(JSON.stringify(tasks));
    },
  },
  {
    method: "POST",
    path: buildRoutePath("/tasks"),
    handler: (req, res) => {
      const schemaBoby = z.object({
        title: z.string(),
        description: z.string(),
      });

      // validar body request
      const validateBodySchema = schemaBoby.safeParse(req.body);
      if (!validateBodySchema.success)
        return res.writeHead(400).end("Bad Request.");

      // recuperar dados do body
      const { title, description } = validateBodySchema.data;

      const datetime = new Date();
      const task = {
        id: randomUUID(),
        title,
        description,
        completed_at: "",
        created_at: datetime.toISOString(),
        updated_at: datetime.toISOString(),
      };

      database.insert("tasks", task);

      return res.writeHead(201).end();
    },
  },
  {
    method: "PUT",
    path: buildRoutePath("/tasks/:id"),
    handler: (req, res) => {
      // validar params request
      const schemaParams = z.object({
        id: z.string().uuid(),
      });
      const validateSchemaParams = schemaParams.safeParse(req.params);
      if (!validateSchemaParams.success)
        return res.writeHead(404).end("Invalid id.");

      // Recuperar ID do parametro do request
      const { id } = validateSchemaParams.data;

      // validar body request
      const schemaBoby = z.object({
        title: z.string(),
        description: z.string(),
      });
      const validateBodySchema = schemaBoby.safeParse(req.body);
      if (!validateBodySchema.success)
        return res.writeHead(400).end("Bad Request.");

      // recuperar dados do body
      const { title, description } = validateBodySchema.data;

      // verificar se o id passado é válido
      const task = database.selectFirstOrDefault("tasks", { id: id });
      if (!task) return res.writeHead(404).end("Task not found. Invalid id.");

      const datetime = new Date();

      database.update("tasks", id, {
        title,
        description,
        completed_at: task.completed_at,
        created_at: task.created_at,
        updated_at: datetime.toISOString(),
      });

      return res.writeHead(204).end();
    },
  },
  {
    method: "DELETE",
    path: buildRoutePath("/tasks/:id"),
    handler: (req, res) => {
      // validar params request
      const schemaParams = z.object({
        id: z.string().uuid(),
      });
      const validateSchemaParams = schemaParams.safeParse(req.params);
      if (!validateSchemaParams.success)
        return res.writeHead(404).end("Invalid id.");

      // Recuperar ID do parametro do request
      const { id } = validateSchemaParams.data;

      const task = database.selectFirstOrDefault("tasks", { id: id });
      if (!task) return res.writeHead(404).end("task not found! Invalid id");

      database.delete("tasks", id);

      return res.writeHead(204).end();
    },
  },
  {
    method: "PATCH",
    path: buildRoutePath("/tasks/:id/complete"),
    handler: (req, res) => {
      // validar params request
      const schemaParams = z.object({
        id: z.string().uuid(),
      });
      const validateSchemaParams = schemaParams.safeParse(req.params);
      if (!validateSchemaParams.success)
        return res.writeHead(400).end("Invalid id.");

      // Recuperar ID do parametro do request
      const { id } = validateSchemaParams.data;
      const task = database.selectFirstOrDefault("tasks", { id: id });
      if (!task) return res.writeHead(404).end("task not found! Invalid id");

      const datetime = new Date();
      database.update("tasks", id, {
        title: task.title,
        description: task.description,
        completed_at: datetime.toISOString(),
        created_at: task.created_at,
        updated_at: datetime.toISOString(),
      });

      return res.writeHead(204).end();
    },
  },
  // {
  //   method: "POST",
  //   path: buildRoutePath("/tasks/import-csv"),
  //   handler: async (req, res) => {
  //     if (
  //       !(req instanceof http.IncomingMessage) ||
  //       !(res instanceof http.ServerResponse)
  //     )
  //       return res.writeHead(404).end("Not Found");

  //     console.log("/tasks/import-csv");
  //     return req.pipe(new InverseNumberStream()).pipe(res);
  //   },
  // },
];
