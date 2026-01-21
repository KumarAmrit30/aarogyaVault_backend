/**
 * ABHA Link Entity
 * Represents the linkage between a user and their ABHA number
 */
export interface ABHALink {
  id: string;
  user_id: string;
  abha_number: string;
  linked_at: Date;
  status: 'pending' | 'linked' | 'failed';
}

/**
 * ABHA Link creation input
 */
export interface CreateABHALinkInput {
  user_id: string;
  abha_number: string;
}
