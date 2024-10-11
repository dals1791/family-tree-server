export const typeDefs = `
    type Family {
        id: ID! @id @unique
        name: String!
        members: [FamilyMember!]! @relationship(type: "HAS_MEMBER", direction: OUT)
    }
   
    type FamilyMember {
        id: ID! @id @unique
        firstName: String!
        lastName: String!

        children: [FamilyMember!]! @relationship(type: "HAS_CHILD", direction: OUT)
        parents: [FamilyMember!]! @relationship(type: "HAS_CHILD", direction: IN)
        partners: [Partnership!]! @relationship(type: "IN_PARTNERSHIP", direction: OUT)
        families: [Family!]! @relationship(type: "HAS_MEMBER", direction: IN)
    }

    type Partnership {
        id: ID! @id @unique
        type: RelationshipType!
        startDate: Date
        endDate: Date
        partner: FamilyMember! @relationship(type: "IN_PARTNERSHIP", direction: IN)
    }

    enum Gender {
        MALE
        FEMALE
        OTHER
        PREFER_NOT_TO_SAY
    }

    enum RelationshipType {
        MARRIAGE
        DOMESTIC_PARTNERSHIP
        DATING
        DIVORCED
        SEPARATED
    }
`
