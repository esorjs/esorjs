export function warn(message, context = {}, ...args) {
    logMessage("Warning", message, context, ...args);
}

export function error(error, context = {}) {
    const message = (typeof error === "string") ? error : error.message || "Unknown error";
    setTimeout(() => logMessage("Error", message, context), 0);
}

function logMessage(type, message, context = {}, ...args) {
    const details = {
        message,
        el: context.el,
        expression: context.expression,
        componentName: context.component?.constructor?.name,
        timestamp: new Date().toISOString(),
        additionalInfo: args
    };

    console.groupCollapsed(
        `%c[ESOR ${type}]: ${message}`,
        `color: ${type === "Error" ? "#FF0000" : "#FFA500"}; font-weight: bold;`
    );
    console.log(details);
    console.groupCollapsed("Stack Trace");
    console.trace();
    console.groupEnd();
    console.groupEnd();
}