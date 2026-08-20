const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();

  const admin = client.db().admin();
  const dbs = await admin.listDatabases();
  console.log('=== Databases ===');
  dbs.databases.forEach(db => console.log(`- ${db.name}`));

  for (const dbInfo of dbs.databases) {
    if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;
    const db = client.db(dbInfo.name);
    const collections = await db.listCollections().toArray();
    console.log(`\n=== Collections in "${dbInfo.name}" ===`);
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
    }
  }

  await client.close();
}

main().catch(console.error);