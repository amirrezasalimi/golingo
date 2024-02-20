/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  collection.updateRule = "id = @request.auth.id && @request.data.texts:isset = false"

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "m2k4erbu",
    "name": "texts",
    "type": "number",
    "required": false,
    "presentable": true,
    "unique": false,
    "options": {
      "min": 0,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  collection.updateRule = "id = @request.auth.id"

  // remove
  collection.schema.removeField("m2k4erbu")

  return dao.saveCollection(collection)
})
