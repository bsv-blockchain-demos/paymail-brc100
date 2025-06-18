/** @type {import('next').NextConfig} */

// rewrite .well-known/bsvalias => /api/paymail
const nextConfig = {
    async rewrites() {
        return [
        {
            source: "/.well-known/bsvalias",
            destination: "/api/paymail",
        },
        ];
    },
};

export default nextConfig;
