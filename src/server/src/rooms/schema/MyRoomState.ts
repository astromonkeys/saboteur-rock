import { Schema, type } from "@colyseus/schema";

export class RoomState extends Schema {

  @type("string") code: string;

}
