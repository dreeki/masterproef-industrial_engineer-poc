import { Algebra } from "sparqlalgebrajs";
import { ActorQueryOperationTypedMediated, IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs } from "@comunica/bus-query-operation";
import { ActionContext, IActorTest } from "@comunica/core";
/**
 * A comunica Filter Geosparql Query Operation Actor.
 */
export declare class ActorQueryOperationFilterGeosparql extends ActorQueryOperationTypedMediated<Algebra.Filter> {
    constructor(args: IActorQueryOperationTypedMediatedArgs);
    testOperation(pattern: Algebra.Filter, context: ActionContext): Promise<IActorTest>;
    runOperation(pattern: Algebra.Filter, context: ActionContext): Promise<IActorQueryOperationOutputBindings>;
    private createExistenceResolver;
    private substitute;
    private substituteSingle;
}
