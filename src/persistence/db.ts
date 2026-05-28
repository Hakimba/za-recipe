import { Effect } from "effect"
import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import { RepoError } from "./RepoError.ts"

export const RECIPES_STORE = "recipes"
export const TEMPLATES_STORE = "templates"

export interface PizzaDB extends DBSchema {
  [RECIPES_STORE]: {
    key: string
    value: unknown
    indexes: { "by-updatedAt": string }
  }
  [TEMPLATES_STORE]: {
    key: string
    value: unknown
    indexes: { "by-updatedAt": string }
  }
}

export type DB = IDBPDatabase<PizzaDB>

const DB_NAME = "pizza-preferment"
const DB_VERSION = 1

export const openPizzaDB: Effect.Effect<DB, RepoError> = Effect.tryPromise({
  try: () =>
    openDB<PizzaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(RECIPES_STORE)) {
          const store = db.createObjectStore(RECIPES_STORE, { keyPath: "id" })
          store.createIndex("by-updatedAt", "updatedAt")
        }
        if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
          const store = db.createObjectStore(TEMPLATES_STORE, { keyPath: "id" })
          store.createIndex("by-updatedAt", "updatedAt")
        }
      },
    }),
  catch: (cause) =>
    new RepoError({ op: "openDB", cause, message: "Impossible d'ouvrir la base de données" }),
})
