import STATE from "./globals";

const STYLES = {
    info: { color: "#0066cc", icon: "ℹ️" },
    warn: { color: "#FFA500", icon: "⚠️" },
    error: { color: "#FF0000", icon: "🚫" },
};

const log = (type = "info", message = "", ...args) => {
    if (!STYLES[type]) type = "info";

    console.groupCollapsed(
        `%c[ESOR ${STYLES[type].icon}${capitalize(type)}] ${message}`,
        `color: ${STYLES[type].color}; font-weight: bold;`
    );

    console[type]({
        message,
        component: STATE.currentComponent?.constructor?.name || "Unknown",
        time: new Date().toISOString(),
        data: args.length ? args : undefined,
    });

    console[type === "error" ? "trace" : "debug"]();
    console.groupEnd();
};

const capitalize = (s) => (s ? str.charAt(0).toUpperCase() + s.slice(1) : "");

export const info = (...args) => log("info", ...args);
export const warn = (...args) => log("warn", ...args);
export const error = (...args) => log("error", ...args);
