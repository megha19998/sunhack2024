export declare const currentDir: string;
export declare const contractConfig: {
    privateStateStoreName: string;
    zkConfigPath: string;
};
export interface Config {
    readonly logDir: string;
    readonly indexer: string;
    readonly indexerWS: string;
    readonly node: string;
    readonly proofServer: string;
}
export declare class DevnetLocalConfig implements Config {
    logDir: string;
    indexer: string;
    indexerWS: string;
    node: string;
    proofServer: string;
    constructor();
}
export declare class StandaloneConfig implements Config {
    logDir: string;
    indexer: string;
    indexerWS: string;
    node: string;
    proofServer: string;
    constructor();
}
export declare class DevnetRemoteConfig implements Config {
    logDir: string;
    indexer: string;
    indexerWS: string;
    node: string;
    proofServer: string;
    constructor();
}
