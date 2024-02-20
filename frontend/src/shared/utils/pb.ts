import { POCKETBASE_HOST } from "../constants/constants";
import { TypedPocketBase } from "../models/entities/pocketbase-types";
import Pocketbase, { LocalAuthStore } from "pocketbase";
export const pb_client = new Pocketbase(POCKETBASE_HOST, new LocalAuthStore()) as TypedPocketBase;
export const pbInstance = () => new Pocketbase(POCKETBASE_HOST) as TypedPocketBase;
