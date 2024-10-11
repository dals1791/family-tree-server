export const queries = `
    type Query {
        getFamilies: [Family!]!
        getFamilyById(id: ID!): Family

        getFamilyMembers: [FamilyMember!]!
        getFamilyMemberById(id: ID!): FamilyMember
        getFamilyMembersByFamily(familyId: ID!): [FamilyMember!]!
    }
`
