import dotenv from 'dotenv'
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { Neo4jGraphQL } from '@neo4j/graphql'
import neo4j from 'neo4j-driver'
import { schema } from './graphql/index.js'

dotenv.config()

// Setup neo4j driver
const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PW)
)

const neoSchema = new Neo4jGraphQL({ typeDefs: schema, driver })
await neoSchema.checkNeo4jCompat()
const server = new ApolloServer({
    schema: await neoSchema.getSchema(),
})

const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => ({ req }),
    listen: { port: 4000 },
})

console.log(`🚀 Server ready at ${url}`)
