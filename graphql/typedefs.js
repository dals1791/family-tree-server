export const typeDefs = `
    type Family {
        id: ID! @id @unique
        name: String!
        members: [FamilyMember!]! @relationship(type: "BELONGS_TO", direction: IN)
    }
   
    type FamilyMember {
        id: ID! @id @unique
        firstName: String!
        lastName: String!
        birthDate: Date
        birthYear: Int
        deathDate: Date
        gender: Gender


        children: [FamilyMember!]! @relationship(type: "HAS_CHILD", direction: IN)
        parents: [FamilyMember!]! @relationship(type: "HAS_CHILD", direction: OUT)
        partners: [Partnership!]! @relationship(type: "IN_PARTNERSHIP", direction: OUT)
        families: [Family!]! @relationship(type: "BELONGS_TO", direction: OUT)
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
        DIVORCED
        SEPARATED
    }
`
