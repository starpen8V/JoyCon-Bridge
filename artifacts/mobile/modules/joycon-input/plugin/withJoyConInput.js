// @ts-check
const path = require("path");

/**
 * Resolve @expo/config-plugins from the project context rather than relying on
 * Node's default upward walk (which fails in pnpm strict-isolation workspaces
 * and when loaded from EAS CLI's own module scope on Windows).
 *
 * Resolution order:
 *  1. artifacts/mobile/node_modules  — direct devDep, works with pnpm
 *  2. repo root node_modules          — hoisted / flat npm/yarn layout
 *  3. plain require                   — fallback for any other layout
 */
function loadConfigPlugins() {
  const candidates = [
    path.resolve(__dirname, "../../../"),        // artifacts/mobile
    path.resolve(__dirname, "../../../../../"),  // repo root
  ];
  for (const base of candidates) {
    try {
      return require(require.resolve("@expo/config-plugins", { paths: [base] }));
    } catch (_) {
      // try next candidate
    }
  }
  // last resort — works when node_modules is flat (npm/yarn)
  return require("@expo/config-plugins");
}

const { withMainActivity } = loadConfigPlugins();

/**
 * Config plugin: injects JoyCon gamepad event hooks into MainActivity.kt.
 * This is the only way to intercept dispatchGenericMotionEvent (analog sticks)
 * in Expo's managed workflow.
 */
module.exports = function withJoyConInput(config) {
  return withMainActivity(config, (mod) => {
    let src = mod.modResults.contents;

    // ── 1. Add imports (idempotent) ────────────────────────────────────────
    if (!src.includes("expo.modules.joyconinput.JoyConInputModule")) {
      src = src.replace(
        /^(import com\.facebook\.react\.ReactActivity)/m,
        [
          "import android.view.KeyEvent",
          "import android.view.MotionEvent",
          "import expo.modules.joyconinput.JoyConInputModule",
          "$1",
        ].join("\n")
      );
    }

    // ── 2. Add overrides before the final closing brace (idempotent) ───────
    if (!src.includes("JoyConInputModule.handleKeyEvent")) {
      const overrides = `
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    JoyConInputModule.handleKeyEvent(event)
    return super.dispatchKeyEvent(event)
  }

  override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean {
    JoyConInputModule.handleMotionEvent(event)
    return super.dispatchGenericMotionEvent(event)
  }`;

      // Insert just before the last closing brace of the class
      const lastBrace = src.lastIndexOf("}");
      src =
        src.substring(0, lastBrace) + overrides + "\n" + src.substring(lastBrace);
    }

    mod.modResults.contents = src;
    return mod;
  });
};
