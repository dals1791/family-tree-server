import { typeDefs } from './typedefs.js'
import { queries } from './queries.js'
import { mutations } from './mutations.js'

export const schema = `
    ${typeDefs}
    ${queries}
`
