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
    VOUCH_SCHEMA: process.env.VOUCH_SCHEMA || "0xb6b4f5642693a970d1c43bfd55b34a6a32cdce692c390958f201a5f529eb6893",
    GRAPHQL_URL: process.env.GRAPHQL_URL || "https://base.easscan.org/graphql",
    CATEGORY: "Stamp",
    PLATFORM: "Zupass",
    CREDENTIAL_TYPE: "Ticket"
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