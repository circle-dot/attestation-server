// Site name
export const siteName = "Stamp";

// navConfig.js
export const navSections = [
    // {
    //     label: "Home",
    //     href: "/",
    //     className: "transition-colors hover:text-foreground"
    // },
    {
        label: "Explorer",
        href: "/explorer",
        className: "transition-colors hover:text-foreground"
    },
];
export const EAS_CONFIG = {
    EAS_CONTRACT_ADDRESS: "0x4200000000000000000000000000000000000021",
    PRETRUST_SCHEMA: process.env.PRETRUST_SCHEMA || "0xe6428e26d2e2c1a92ac3f5b30014a228940017aa3e621e9f16f02f0ecb748de9",
    VOUCH_SCHEMA: process.env.VOUCH_SCHEMA || "0xa142412d946732a5a336236267a625ab2bc5c51b9d6f0703317bc979432ced66",
    GRAPHQL_URL: process.env.GRAPHQL_URL || "https://base-sepolia.easscan.org/graphql",
    CATEGORY: "Stamp",
    PLATFORM: "Zupass",
    CREDENTIAL_TYPE: "Ticket",
    VOUCHING_CONTRACT_ADDRESS: process.env.VOUCHING_CONTRACT_ADDRESS || "0x000000AbC3f5670c699C40BF8AEDb99A145524aE"
}

export const Zupass = {
    url: "https://zupass.org",
    issuer: "AgoraPass",
    zupass_title: "AgoraPass",
    zupass_display: "collectable",
    folder: "AGORATEST",
    zupass_image_url: "https://staging-pass.agora.city/AgoraLogo.png",
}

// Add this new configuration
export const ALLOWED_ORIGINS = [
    'https://staging-pass.agora.city',
    'https://pass.agora.city',
    'https://app.stamp.network',
];