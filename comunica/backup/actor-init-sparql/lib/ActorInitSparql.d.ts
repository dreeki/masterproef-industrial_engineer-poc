import { IActionInit, IActorOutputInit } from "@comunica/bus-init";
import { ActorInitSparql as ActorInitSparqlBrowser, IActorInitSparqlArgs } from "./ActorInitSparql-browser";
export { KEY_CONTEXT_INITIALBINDINGS, KEY_CONTEXT_QUERYFORMAT, KEY_CONTEXT_LENIENT, } from "./ActorInitSparql-browser";
/**
 * A comunica SPARQL Init Actor.
 */
export declare class ActorInitSparql extends ActorInitSparqlBrowser {
    constructor(args: IActorInitSparqlArgs);
    run(action: IActionInit): Promise<IActorOutputInit>;
    getScriptOutput(command: string, fallback: string): Promise<string>;
    isDevelopmentEnvironment(): boolean;
}
