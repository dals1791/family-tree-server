export const mutations = `
    type Mutation {
        createFamily(name: String!, treeId: ID!): Family!
        updateFamily(id: ID!, name: String): Family!
        deleteFamily(id: ID!): Family

        createFamilyMember(
            firstName: String!
            lastName: String!
        ): FamilyMember
    }
`
