/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vn1dnmn5ab19xid")

  collection.indexes = [
    "CREATE INDEX `idx_EGvokPF` ON `websites` (\n  `url`,\n  `user`\n)",
    "CREATE INDEX `idx_4Xh7jXL` ON `websites` (`unique_code`)"
  ]

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vmskvmrg",
    "name": "unique_code",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wxmcpltu",
    "name": "cached_translates",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 2000000
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vn1dnmn5ab19xid")

  collection.indexes = [
    "CREATE INDEX `idx_EGvokPF` ON `websites` (\n  `url`,\n  `user`\n)"
  ]

  // remove
  collection.schema.removeField("vmskvmrg")

  // remove
  collection.schema.removeField("wxmcpltu")

  return dao.saveCollection(collection)
})
