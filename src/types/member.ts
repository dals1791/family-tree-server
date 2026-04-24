export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type MemberStatus = 'UNCLAIMED' | 'INVITED' | 'CLAIMED';
export type PartnershipType = 'MARRIAGE' | 'DOMESTIC_PARTNERSHIP' | 'DIVORCED' | 'SEPARATED';

export interface Member {
  id: string;
  treeId: string;
  firstName: string;
  lastName?: string;
  maidenName?: string;
  gender?: Gender;
  birthDate?: string;   // ISO YYYY-MM-DD
  birthYear?: number;
  deathDate?: string;
  deathYear?: number;
  status: MemberStatus;
  claimedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberCreateInput {
  firstName: string;
  lastName?: string;
  maidenName?: string;
  gender?: Gender;
  birthDate?: string;
  birthYear?: number;
  deathDate?: string;
  deathYear?: number;
}

export interface MemberUpdateInput {
  firstName?: string;
  lastName?: string;
  maidenName?: string;
  gender?: Gender;
  birthDate?: string;
  birthYear?: number;
  deathDate?: string;
  deathYear?: number;
}
