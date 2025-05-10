import { Request, Response, NextFunction } from 'express';
import { buildKubeConfig } from './dynamic-client.js';
import { KubeConfig } from '@kubernetes/client-node';

const H = {
    server: 'x-k8s-api-server',
    ca: 'x-k8s-ca-data',
    tok: 'x-k8s-token'
};

// Extend the Express Request type to include our custom locals property
declare global {
    namespace Express {
        interface Request {
            locals: Record<string, any>;
        }
    }
}

export const k8sCredMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiServer = req.get(H.server);
    const caData = req.get(H.ca);
    const token = req.get(H.tok);

    // Reject early if any header missing or obviously malformed
    if (!apiServer || !caData || !token ||
        token.length < 100 || !/^[A-Za-z0-9._-]+$/.test(token) || caData.length < 100) {
        return res.status(401).json({ error: 'Missing X-K8s-* headers' });
    }

    // Initialize locals if it doesn't exist
    if (!req.locals) {
        req.locals = {};
    }

    req.locals.k8sClient = buildKubeConfig({ apiServer, caData, token });
    next();
}; 