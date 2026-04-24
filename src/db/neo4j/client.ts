import neo4j, { Driver } from 'neo4j-driver';

const NEO4J_URI = process.env['NEO4J_URI'];
const NEO4J_USERNAME = process.env['NEO4J_USERNAME'];
const NEO4J_PASSWORD = process.env['NEO4J_PASSWORD'];

if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
  throw new Error('Missing NEO4J_URI, NEO4J_USERNAME, or NEO4J_PASSWORD env vars');
}

export const driver: Driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
);

// Verify connectivity on startup
driver.verifyConnectivity()
  .then(() => console.log('Neo4j connected'))
  .catch((err) => {
    console.error('Neo4j connection failed:', err.message);
    process.exit(1);
  });
