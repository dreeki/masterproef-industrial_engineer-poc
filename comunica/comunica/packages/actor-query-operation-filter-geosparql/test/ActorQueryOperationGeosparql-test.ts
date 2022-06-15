import {ActorQueryOperation} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ActorQueryOperationGeosparql} from "../lib/ActorQueryOperationGeosparql";

describe('ActorQueryOperationGeosparql', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQueryOperationGeosparql module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationGeosparql).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationGeosparql constructor', () => {
      expect(new (<any> ActorQueryOperationGeosparql)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryOperationGeosparql);
      expect(new (<any> ActorQueryOperationGeosparql)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationGeosparql objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationGeosparql)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationGeosparql instance', () => {
    let actor: ActorQueryOperationGeosparql;

    beforeEach(() => {
      actor = new ActorQueryOperationGeosparql({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
