import { KubeConfig } from '@kubernetes/client-node';

export interface RemoteCreds {
    apiServer: string;
    caData: string;
    token: string;
}

export const buildKubeConfig = (c: RemoteCreds): KubeConfig => {
    const kc = new KubeConfig();
    kc.loadFromOptions({
        clusters: [{
            name: 'remote',
            server: c.apiServer,
            caData: c.caData
        }],
        users: [{
            name: 'remote-user',
            token: c.token
        }],
        contexts: [{
            name: 'ctx',
            cluster: 'remote',
            user: 'remote-user'
        }],
        currentContext: 'ctx',
    });
    return kc;
}; 