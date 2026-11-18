import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const visits = client.db().collection('visits');

// Data otomatis terhapus setelah 90 hari
await visits.createIndex({ ts: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
// Untuk query "halaman terpopuler dalam rentang waktu"
await visits.createIndex({ path: 1, ts: -1 });

console.log(await visits.indexes());
await client.close();