import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = (() => {
  if (!supabaseUrl) return undefined;
  try {
    return new URL(supabaseUrl).hostname;
  } catch (error) {
    console.warn("Invalid NEXT_PUBLIC_SUPABASE_URL", error);
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  images: {
    domains: supabaseHostname ? [supabaseHostname] : [],
  },
};

export default nextConfig;
