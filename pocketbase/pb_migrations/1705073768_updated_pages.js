/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("lpf28phe2kbvuql")

  collection.name = "website_pages"
  collection.indexes = [
    "CREATE INDEX `idx_056MxQK` ON `website_pages` (`website`)",
    "CREATE INDEX `idx_7KeO8Tz` ON `website_pages` (`path`)"
  ]

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("lpf28phe2kbvuql")

  collection.name = "pages"
  collection.indexes = [
    "CREATE INDEX `idx_056MxQK` ON `pages` (`website`)",
    "CREATE INDEX `idx_7KeO8Tz` ON `pages` (`path`)"
  ]

  return dao.saveCollection(collection)
})
