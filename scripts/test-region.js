const pg = require('pg');

const configs = [
  {
    label: 'pooler-transaction-6543',
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.grdghxkowakgiqhybnrp',
    password: 'K3rnLabs2024Dev',
    database: 'postgres',
  },
  {
    label: 'pooler-session-5432',
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.grdghxkowakgiqhybnrp',
    password: 'K3rnLabs2024Dev',
    database: 'postgres',
  },
  {
    label: 'direct-5432',
    host: 'db.grdghxkowakgiqhybnrp.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'K3rnLabs2024Dev',
    database: 'postgres',
    family: 6,
  },
];

async function run() {
  for (const cfg of configs) {
    const { label, ...clientCfg } = cfg;
    const c = new pg.Client({ ...clientCfg, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
    try {
      await c.connect();
      const r = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' LIMIT 3");
      console.log('SUCCESS:', label, '| tables:', r.rows.map(x => x.tablename));
      await c.end();
      return;
    } catch(e) {
      console.log('FAIL:', label, '-', e.message.slice(0,80));
    }
  }
}
run();
