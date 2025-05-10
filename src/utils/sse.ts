import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response, NextFunction } from "express";
import { KubeConfig } from "@kubernetes/client-node";
import { buildKubeConfig, RemoteCreds } from "../saas/dynamic-client.js";

// Utility to extract K8s auth from headers
const extractK8sCredentials = (req: Request): KubeConfig | null => {
  const apiServer = req.get('x-k8s-api-server');
  const caData = req.get('x-k8s-ca-data');
  const token = req.get('x-k8s-token');

  // Validate headers
  if (!apiServer || !caData || !token ||
    token.length < 100 || !/^[A-Za-z0-9._-]+$/.test(token) ||
    caData.length < 100) {
    return null;
  }

  // Now we know all values are defined
  const credentials: RemoteCreds = {
    apiServer,
    caData,
    token
  };

  return buildKubeConfig(credentials);
};

// Extend the Express Request type to include our custom locals property
declare global {
  namespace Express {
    interface Request {
      locals: Record<string, any>;
    }
  }
}

export function startSSEServer(server: Server) {
  const app = express();

  // Apply JSON middleware
  app.use(express.json());

  // Currently just copying from docs & allowing for multiple transport connections: https://modelcontextprotocol.io/docs/concepts/transports#server-sent-events-sse
  // TODO: If exposed to web, then this will enable any client to connect to the server via http - so marked as UNSAFE until mcp has a proper auth solution.
  let transports: Array<SSEServerTransport> = [];

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.push(transport);
    await server.connect(transport);
  });

  app.post("/messages", (req, res) => {
    const transport = transports.find(
      (t) => t.sessionId === req.query.sessionId
    );

    if (transport) {
      // Store K8s client in request if headers are present
      const k8sClient = extractK8sCredentials(req);
      if (k8sClient) {
        // Initialize locals if it doesn't exist
        if (!req.locals) {
          req.locals = {};
        }
        req.locals.k8sClient = k8sClient;
      }

      transport.handlePostMessage(req, res);
    } else {
      res
        .status(404)
        .send("Not found. Must pass valid sessionId as query param.");
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port);
  console.log(
    `mcp-kubernetes-server is listening on port ${port}\nUse the following url to connect to the server:\n\http://localhost:${port}/sse`
  );
}
