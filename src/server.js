import http from "node:http";
import { json } from "./middlewares/json.js";
import { routes } from "./routes.js";
import { extractQueryParams } from "./utils/extract-query-params.js";

import { Transform } from "node:stream";

class CSVTransform extends Transform {
  _transform(chunk, encoding, callback) {
    try {
      const linesParse = chunk.toString().split("\n");

      linesParse.forEach(async (row) => {
        //Pular primeira linha do arquivo
        if (row === linesParse[0]) return;

        // Pular linhas em branco
        if (row.toString().trim() === "") return;

        // recuperar informações da linha
        const data = row.split(",");
        if (data.length != 2) return;

        const record = JSON.stringify({
          title: data[0].toString().trim(),
          description: data[1].toString().trim(),
        });

        // inclusão de dados em uma API:
        await fetch("http://localhost:3333/tasks", {
          method: "POST",
          body: record,
          headers: { "Content-Type": "application/json" },
        })
          .then((res) => {
            this.push({ success: true, data: record });
          })
          .catch((err) => {
            this.push({ success: false, data: record, error: err });
          });
      });

      // Chamando o callback para sinalizar que o processamento da linha foi concluído
      callback();
    } catch (error) {
      console.error("Erro ao processar o CSV:", error);
      callback(error);
    }
  }
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === "POST" && url === "/tasks/import-csv") {
    return req.pipe(new CSVTransform()).pipe(res);
  }

  await json(req, res);

  const route = routes.find((route) => {
    return route.method === method && route.path.test(url);
  });

  if (route) {
    const routeParams = req.url.match(route.path);

    const { query, ...params } = routeParams.groups;

    req.params = params;
    req.query = query ? extractQueryParams(query) : {};

    return route.handler(req, res);
  }

  return res.writeHead(404).end();
});

server.listen(3333);
