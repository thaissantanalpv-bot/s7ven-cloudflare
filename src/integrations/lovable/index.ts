// Compatibility adapter for the existing UI: OAuth now uses the independent Supabase project.
// Google must be enabled in Supabase Auth > Providers; otherwise use email/password.
import type { Provider } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: Provider, opts?: SignInOptions) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri ?? `${window.location.origin}/auth`,
          queryParams: opts?.extraParams,
        },
      });
      return { redirected: Boolean(data?.url), error };
    },
  },
};
