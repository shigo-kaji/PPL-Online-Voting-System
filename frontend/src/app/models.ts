export interface Voter {
  authenticated: boolean;
  id?: number;
  username?: string;
  is_staff?: boolean;
}

export interface Candidate {
  id: number;
  name: string;
  statement: string;
}

export type ElectionStatus = 'upcoming' | 'open' | 'closed';

export interface Election {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  status: ElectionStatus;
  has_voted: boolean;
  candidates: Candidate[];
}

export interface ElectionResults {
  election_id: number;
  total_votes: number;
  candidates: { candidate_id: number; name: string; votes: number }[];
}
