export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkEnvironment } = await import("./instrumentation-node");
    checkEnvironment();
  }
}
