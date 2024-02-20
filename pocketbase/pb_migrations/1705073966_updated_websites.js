/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vn1dnmn5ab19xid")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ggz2rkjy",
    "name": "primary_lang",
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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vn1dnmn5ab19xid")

  // remove
  collection.schema.removeField("ggz2rkjy")

  return dao.saveCollection(collection)
})
