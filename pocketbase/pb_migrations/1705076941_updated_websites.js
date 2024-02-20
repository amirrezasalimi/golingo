/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vn1dnmn5ab19xid")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "phkdzvek",
    "name": "languages",
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

  // remove
  collection.schema.removeField("phkdzvek")

  return dao.saveCollection(collection)
})
