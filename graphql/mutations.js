export const mutations = `
    type Mutation {
        createFamily(name: String!): Family!
            @cypher(
                statement: """
                CREATE (f:Family {
                    id: randomUUID(),
                    name: $name
                })
                 RETURN f
                """,
                columnName: "createFamily"
            )

        createFamilyMember(
            firstName: String!,
            lastName: String!,
            birthDate: Date,
            birthYear: Int,
            gender: Gender
        ): FamilyMember!
            @cypher(
                statement: """
                CREATE (fm:FamilyMember {
                    id: randomUUID(),
                    firstName: $firstName,
                    lastName: $lastName,
                    birthDate: date($birthDate),
                    birthYear: $birthYear,
                    gender: $gender
                })
                RETURN fm
                """,
                columnName: "createFamilyMember"
            )
                
        addFamilyMemberToFamily(familyMemberId: ID!, familyId: ID!): FamilyMember!
            @cypher(
                statement: """
                MATCH (fm:FamilyMember {id: $familyMemberId})
                MATCH (f:Family {id: $familyId})
                MERGE (fm)-[:BELONGS_TO]->(f)
                RETURN fm
                """,
                columnName: "addFamilyMemberToFamily"
            )

        addParentChild(parentId: ID!, childId: ID!): FamilyMember!
            @cypher(
                statement: """
                MATCH (parent:FamilyMember {id: $parentId})
                MATCH (child:FamilyMember {id: $childId})
                MERGE (parent)-[:HAS_CHILD]->(child)
                RETURN child
                """,
                columnName: "addParentChild"
            )

       createPartnership(
            partner1Id: ID!, 
            partner2Id: ID!, 
            type: RelationshipType!, 
            startDate: Date
        ): Partnership!
            @cypher(
                statement: """
                MATCH (m1:FamilyMember {id: $partner1Id})
                MATCH (m2:FamilyMember {id: $partner2Id})
                CREATE (p:Partnership {
                    id: randomUUID(),
                    type: $type,
                    startDate: date($startDate)
                })
                CREATE (m1)-[:IN_PARTNERSHIP]->(p)
                CREATE (m2)-[:IN_PARTNERSHIP]->(p)
                RETURN p
                """,
                columnName: "createPartnership"
            )
    }
`
