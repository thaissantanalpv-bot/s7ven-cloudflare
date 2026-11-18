import { supabase } from "@/integrations/supabase/client";

export type ConsentDetails = {
  client?: { name?: string; client_name?: string };
  redirect_uri?: string;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type Result = { data: ConsentDetails | null; error: { message: string } | null };
type OAuthConsent = {
  getAuthorizationDetails: (id: string) => Promise<Result>;
  approveAuthorization: (id: string) => Promise<Result>;
  denyAuthorization: (id: string) => Promise<Result>;
};
/** Small compatibility wrapper for the provider's beta consent API. */
export const oauthConsent = (supabase.auth as unknown as { oauth: OAuthConsent }).oauth;