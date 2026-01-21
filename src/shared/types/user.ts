/**
 * User Entity
 * Represents a patient user in the system
 */
export interface User {
  id: string;
  mobile_number: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * User creation input (without auto-generated fields)
 */
export interface CreateUserInput {
  mobile_number: string;
}
