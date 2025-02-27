import fastify from "fastify";
import fastifyView from "@fastify/view";
import fastifyWebSocket from "@fastify/websocket";
import eta from "eta";
import { loadConfig } from "./utils";
import { handler as homeHandler } from "./routes/home";
import { handler as emailLangVariants } from "./routes/list-languages";
import { handler as emailHandler } from "./routes/email";
import logger from "node-color-log";
import { EVENT_NAME_NEED_REFRESH_WEBSOCKET } from "./const";
import { setupWatcher } from "./lib/watcher";

async function startServer() {
  const config = await loadConfig();

  const { inputFolder } = config;
  let websocket: WebSocket | undefined;

  const server = fastify({
    // logger: true,
  });
  server.register(fastifyView, {
    engine: {
      eta,
    },
  });
  server.register(fastifyWebSocket);

  server.register(async function () {
    server.get("/socket", { websocket: true }, (connection, req) => {
      websocket = connection.socket;
      connection.socket.on("message", (message: any) => {
        connection.socket.send("hi from server");
      });
      // Client disconnect
      connection.socket.on("close", () => {});
    });
  });

  // render list of email founded
  server.get("/", homeHandler);

  // render list of locales for 1 email
  server.get(`/${inputFolder}/:email`, emailLangVariants);

  // render 1 email for 1 language
  server.get(`/${inputFolder}/:email/:locale`, emailHandler);

  // inject config on each endpoint. Now we load with loadConfig in other parts.
  // Maybe we need to create a kind of wrapper or decorator...
  // server.addHook("onRequest", (request, reply, done) => {
  //   const ciccio = 3;
  //   (request.params as any).config = 3;
  //   done();
  // });

  const watcher = setupWatcher(config, {
    handleEditVariables: function (emailName, locale) {
      logger.info("new variables: need to refresh", emailName, locale);
      websocket?.send(EVENT_NAME_NEED_REFRESH_WEBSOCKET);
    },
    handleEmailChange: function (emailName) {
      logger.info("email changed: need to refresh", emailName);
      websocket?.send(EVENT_NAME_NEED_REFRESH_WEBSOCKET);
    },
    handleEditConfig: function () {
      logger.error(
        "Config changed, please stop and restart server. In the future this will be automatic"
      );
    },
  });

  server.addHook("onClose", (_, done) => {
    watcher.close();
    done();
  });

  const port = 8080;
  server.ready().then(() => {
    server.listen({ port }, (err, address) => {
      if (err) {
        logger.error(err);
        process.exit(1);
      }
      logger.info("load server with config:");
      console.log(config);
      logger.color("blue").log(`Server listening at http://localhost:${port}`);
    });
  });
}

startServer();
