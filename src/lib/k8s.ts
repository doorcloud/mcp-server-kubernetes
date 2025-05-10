import { Request } from 'express';
import { KubeConfig } from '@kubernetes/client-node';
import { KubernetesManager } from '../utils/kubernetes-manager.js';

export const getClientFromRequest = (req: Request): KubeConfig => {
    const kc = (req.locals as { k8sClient?: KubeConfig })?.k8sClient;
    if (!kc) {
        const e: any = new Error('Kubernetes credentials not supplied');
        e.statusCode = 401;
        throw e;
    }
    return kc; // no kubeconfig fallback
};

export const getManagerFromRequest = (req: Request): KubernetesManager => {
    const kc = getClientFromRequest(req);
    return new KubernetesManager(kc);
}; 